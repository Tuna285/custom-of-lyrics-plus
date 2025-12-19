const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath = "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath = "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

//Rate Limit
const RATE_LIMITS = {
	RPM: 30,
	RESET_TIME: 60000
};

class GeminiRateLimiter {
	static getStats() {
		const now = Date.now();
		let stats = JSON.parse(localStorage.getItem('gemini_rate_stats') || '{"minuteWindowStart": 0, "minuteCount": 0}');
		if (now - stats.minuteWindowStart > RATE_LIMITS.RESET_TIME) {
			stats.minuteWindowStart = now;
			stats.minuteCount = 0;
		}
		return stats;
	}

	static incrementAndCheck() {
		const stats = this.getStats();
		if (stats.minuteCount >= RATE_LIMITS.RPM) {
			const waitTime = Math.ceil((RATE_LIMITS.RESET_TIME - (Date.now() - stats.minuteWindowStart)) / 1000);
			throw new Error(`Quá tốc độ (RPM). Vui lòng đợi ${waitTime}s. (${stats.minuteCount}/${RATE_LIMITS.RPM})`);
		}
		stats.minuteCount++;
		localStorage.setItem('gemini_rate_stats', JSON.stringify(stats));
		console.log(`[Gemma 3] RPM: ${stats.minuteCount}/${RATE_LIMITS.RPM}`);
		return stats;
	}
}

//Retry & Queue
async function fetchWithRetry(fn, retries = 3, baseDelay = 1000) {
	try {
		return await fn();
	} catch (error) {
		if (retries === 0) throw error;
		if (error.status >= 400 && error.status < 500 && error.status !== 429) throw error;
		const delay = baseDelay * 2;
		console.warn(`[Retry] Operation failed, retrying in ${delay}ms... (${retries} left)`, error.message);
		await new Promise(resolve => setTimeout(resolve, delay));
		return fetchWithRetry(fn, retries - 1, delay);
	}
}

class RequestQueue {
	constructor() {
		this.queue = [];
		this.isProcessing = false;
	}

	add(requestFn, priority = false, key = null) {
		return new Promise((resolve, reject) => {
			const item = { requestFn, resolve, reject, key };
			priority ? this.queue.unshift(item) : this.queue.push(item);
			this.process();
		});
	}

	promote(key) {
		if (!key) return;
		const index = this.queue.findIndex(item => item.key === key);
		if (index > 0) {
			const [item] = this.queue.splice(index, 1);
			this.queue.unshift(item);
			console.log(`[Queue] Promoted task: ${key}`);
		}
	}

	async process() {
		if (this.isProcessing || this.queue.length === 0) return;
		this.isProcessing = true;
		const { requestFn, resolve, reject } = this.queue.shift();

		try {
			try { GeminiRateLimiter.incrementAndCheck(); }
			catch (e) {
				console.warn("[Queue] Rate limited, waiting 5s...");
				await new Promise(r => setTimeout(r, 5000));
				this.queue.unshift({ requestFn, resolve, reject });
				this.isProcessing = false;
				this.process();
				return;
			}
			const result = await requestFn();
			resolve(result);
		} catch (e) { reject(e); }
		finally {
			await new Promise(r => setTimeout(r, 1000));
			this.isProcessing = false;
			this.process();
		}
	}
}

const geminiQueueTranslation = new RequestQueue();
const geminiQueuePhonetic = new RequestQueue();

//Translation Styles
const TRANSLATION_STYLES = {
	"smart_adaptive": { name: "Tự Động Thông Minh (Khuyên dùng)", description: "AI tự phân tích thể loại." },
	"poetic_standard": { name: "Trữ tình & Lãng mạn", description: "Phù hợp Ballad, Pop." },
	"youth_story": { name: "Thanh xuân & Tự sự", description: "Phù hợp J-Pop, Anime." },
	"street_bold": { name: "Cá tính & Mạnh mẽ", description: "Phù hợp Rap, Hip-hop." },
	"vintage_classic": { name: "Cổ điển & Suy tư", description: "Phù hợp nhạc Trịnh, Bolero." },
	"literal_study": { name: "Sát nghĩa (Học thuật)", description: "Dành cho người học ngoại ngữ." }
};

const PRONOUN_MODES = {
	"default": { value: null, name: "Auto (Theo nội dung)" },
	"anh_em": { value: "Anh - Em", name: "Anh - Em" },
	"em_anh": { value: "Em - Anh", name: "Em - Anh" },
	"to_cau": { value: "Tớ - Cậu", name: "Tớ - Cậu" },
	"minh_ban": { value: "Tôi - Cậu", name: "Tôi - Cậu" },
	"toi_ban": { value: "Tôi - Bạn", name: "Tôi - Bạn" },
	"toi_em": { value: "Tôi - Em", name: "Tôi - Em" },
	"ta_nguoi": { value: "Ta - Người", name: "Ta - Người" },
	"tao_may": { value: "Tao - Mày", name: "Tao - Mày" }
};

class Translator {
	constructor(lang, isUsingNetease = false) {
		this.finished = { ja: false, ko: false, zh: false };
		this.isUsingNetease = isUsingNetease;
		this.initializationPromise = null;
		this.applyKuromojiFix();
		this.initializationPromise = this.initializeAsync(lang);
	}

	async initializeAsync(lang) {
		try {
			await this.injectExternals(lang);
			await this.createTranslator(lang);
		} catch (error) {
			console.error(`Failed to initialize translator for language ${lang}:`, error);
			throw error;
		}
	}

//Gemini (Gemma 3) API Methods
	static buildGeminiPrompt({ artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default', wantSmartPhonetic = false }) {
		const lines = text.split('\n');
		const lineCount = lines.length;
		const linesJson = JSON.stringify(lines);

		if (wantSmartPhonetic) {
			return `Task: Phonetic Transcription (Karaoke System).
Input lines: ${lineCount}
Rules: 
1. Output JSON Array of exactly ${lineCount} strings.
2. Transcription Standards:
   - Japanese: Hepburn Romaji (wa, o, e).
   - Korean: Revised Romanization (Romaja).
   - Chinese: Pinyin with tone marks.
3. Keep punctuation/English unchanged.
4. Romanize sound effects (e.g., "Ah" not "Tiếng hét").
Input: ${linesJson}
Output JSON:`;
		}

		const STYLE_DESC = {
			"smart_adaptive": {
				name: "Tự Động Thông Minh",
				description: "Natural Vietnamese. Complete sentences. Focus on grammatical smoothness without altering the original meaning.",
			},
			"poetic_standard": {
				name: "Trữ Tình & Lãng Mạn",
				description: "Poetic & Emotional. Uses metaphorical words and particles (vương, nỡ, đành) to enhance the mood.",
			},
			"youth_story": {
				name: "Thanh Xuân & Tự Sự",
				description: "Storytelling Style. Clear dialogue-like sentences.",
			},
			"street_bold": {
				name: "Cá Tính & Mạnh Mẽ",
				description: "Strong & Direct. Focus on rhythm and attitude.",
			},
			"vintage_classic": {
				name: "Cổ Điển & Suy Tư",
				description: "Elegant. Uses Sino-Vietnamese vocabulary.",
			},
			"literal_study": {
				name: "Sát Nghĩa (Học Thuật)",
				description: "Literal meaning. Strict accuracy.",
			}
		};

		const styleObj = STYLE_DESC[styleKey] || STYLE_DESC.smart_adaptive;
		const style = typeof styleObj === 'string' ? styleObj : styleObj.description;

		let pronoun = "Auto-detect based on lyrics context.";
		if (pronounKey !== 'default' && PRONOUN_MODES[pronounKey]) {
			pronoun = `FORCE use pronouns: "${PRONOUN_MODES[pronounKey].value}".`;
		}

		return `Context: You are a professional Lyricist adapting songs into Vietnamese.
Target: "${artist} - ${title}"
Style: ${style}
Pronoun: ${pronoun}

CORE TRANSLATION RULES (THE "GOLDEN RATIO" PROTOCOL):

1. **RULE OF EXPANSION: Syntactic YES, Semantic NO**.
   - **ALLOWED (Syntactic Expansion):** You MAY add "Functional Particles" to fix grammar/flow (e.g., "đang", "đã", "sẽ", "vẫn", "cứ", "lại", "mà", "thì", "là").
   - **FORBIDDEN (Semantic Expansion):** You MUST NOT add "Descriptive Adjectives" not in source (e.g., do NOT add "buồn bã", "vội vàng" if source doesn't have them).

2. **Grammar & Flow**:
   - Aim for full, spoken-style Vietnamese sentences. Reorder words if necessary for natural syntax.

3. **Accuracy Check**:
   - Translate meaning accurately. Do not hallucinate new lyrics.

CRITICAL FORMATTING RULES (FATAL ERROR PREVENTION):
1. **LINE COUNT LOCK (${lineCount} lines)**:
   - You received ${lineCount} lines. You MUST return exactly ${lineCount} items.
   - **Double-check** your count. Mismatch = Failure.

2. **NO SPLITTING / NO MERGING (CRITICAL)**:
   - **NEVER SPLIT A LINE**: Even if the source line is very long, translate it into **ONE single string** in the array. Do not break it into two sentences.
   - **NEVER MERGE**: Keep short lines separate exactly as in input.
   - **Preserve "♪"**: If a line is just "♪", output "♪".

3. **OUTPUT FORMAT**:
   - Return ONLY the valid JSON String Array.

Input JSON:
${linesJson}`;
	}

	static promote(key) {
		if (key.includes(':gemini_romaji')) geminiQueuePhonetic.promote(key);
		else geminiQueueTranslation.promote(key);
	}

	static async callGemini({ apiKey, artist, title, text, styleKey, pronounKey, wantSmartPhonetic, _isRetry, priority, taskId }) {
		const startTime = Date.now();
		const lineCount = text.split('\n').length;

		console.group(`[Gemma 3] ${wantSmartPhonetic ? 'Phonetic' : 'Translation'} Request`);
		console.log(`Song: ${artist} - ${title} (${lineCount} lines)`);

		if (!apiKey?.trim()) throw new Error("Missing API key");
		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${encodeURIComponent(apiKey)}`;

		const prompt = _isRetry
			? Translator.buildMinimalFallbackPrompt({ artist, title, text })
			: Translator.buildGeminiPrompt({ artist, title, text, styleKey, pronounKey, wantSmartPhonetic });

		const body = {
			contents: [{ parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.5,
				topP: 0.95,
				topK: 40,
				maxOutputTokens: 3000
			},
			safetySettings: [
				{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
				{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
				{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
				{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
			]
		};

		try {
			const selectedQueue = wantSmartPhonetic ? geminiQueuePhonetic : geminiQueueTranslation;

			return await selectedQueue.add(async () => {
				const res = await fetchWithRetry(async () => {
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 60000);
					try {
						const response = await fetch(endpoint, {
							method: "POST",
							headers: { "Content-Type": "application/json", "User-Agent": "Spicetify-LyricsPlus/1.0" },
							body: JSON.stringify(body),
							signal: controller.signal
						});
						if (!response.ok) {
							const error = new Error(`HTTP ${response.status}`);
							error.status = response.status;
							throw error;
						}
						return response;
					} finally { clearTimeout(timeoutId); }
				});

				const data = await res.json();
				if (!data?.candidates?.length) throw new Error("No candidates returned");

				const candidate = data.candidates[0];
				if (candidate?.finishReason === "SAFETY") {
					throw new Error("Translation blocked by safety filters.");
				}

				const raw = candidate?.content?.parts?.[0]?.text;
				if (!raw) throw new Error("Empty response content");

				console.log(`[Gemma 3] Raw Response:`, raw);
				const result = Translator.extractGeminiJson(raw);
				const duration = Date.now() - startTime;

				//Validation logic
				let resultCount = 0;
				if (wantSmartPhonetic) {
					const content = Array.isArray(result.phonetic) ? result.phonetic.join('\n') : result.phonetic;
					resultCount = content ? content.split('\n').length : 0;
					if (Array.isArray(result.phonetic)) result.phonetic = result.phonetic.join('\n');
				} else {
					resultCount = Array.isArray(result.vi) ? result.vi.length : 0;
				}

				console.log(`[Gemma 3] Completed in ${duration}ms. Lines: ${resultCount}/${lineCount} ${resultCount === lineCount ? 'OK' : 'MISMATCH'}`);
				console.groupEnd();
				return { ...result, duration };

			}, priority, taskId);

		} catch (error) {
			console.error(`Gemma Error: ${error.message}`);
			console.groupEnd();

			//Retry logic
			if (error.name !== 'AbortError' && !_isRetry) {
				console.warn("Retrying with minimal prompt...");
				return Translator.callGemini({
					apiKey, artist, title, text,
					styleKey: 'literal_study', pronounKey: 'default',
					wantSmartPhonetic, _isRetry: true
				});
			}
			throw error;
		}
	}

	//External Scripts
	includeExternal(url) {
		return new Promise((resolve, reject) => {
			const existingScript = document.querySelector(`script[src="${url}"]`);
			if (existingScript) {
				if (existingScript.dataset) existingScript.dataset.loaded = existingScript.dataset.loaded || 'true';
				return resolve();
			}
			const script = document.createElement("script");
			script.setAttribute("type", "text/javascript");
			script.setAttribute("src", url);
			script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); });
			script.addEventListener('error', () => { reject(new Error(`Failed to load script: ${url}`)); });
			document.head.appendChild(script);
		});
	}

	async injectExternals(lang) {
		const langCode = lang?.slice(0, 2);
		try {
			switch (langCode) {
				case "ja": await Promise.all([this.includeExternal(kuromojiPath), this.includeExternal(kuroshiroPath)]); break;
				case "ko": await this.includeExternal(aromanize); break;
				case "zh":
					await this.includeExternal(openCCPath);
					this.includeExternal(pinyinProPath).catch(() => { });
					this.includeExternal(tinyPinyinPath).catch(() => { });
					break;
			}
		} catch (error) { console.error(`Failed to load externals for ${langCode}`, error); throw error; }
	}

	async awaitFinished(language) {
		const langCode = language?.slice(0, 2);
		if (this.initializationPromise) await this.initializationPromise;
		if (langCode && !this.finished[langCode]) {
			await this.injectExternals(language);
			await this.createTranslator(language);
		}
	}

	applyKuromojiFix() {
		if (typeof XMLHttpRequest.prototype.realOpen !== "undefined") return;
		XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;
		XMLHttpRequest.prototype.open = function (method, url, bool) {
			if (url.indexOf(dictPath.replace("https://", "https:/")) === 0) {
				this.realOpen(method, url.replace("https:/", "https://"), bool);
			} else {
				this.realOpen(method, url, bool);
			}
		};
	}

	async createTranslator(lang) {
		const langCode = lang.slice(0, 2);
		switch (langCode) {
			case "ja":
				if (this.kuroshiro) return;
				await this.waitForGlobals(['Kuroshiro', 'KuromojiAnalyzer'], 10000);
				this.kuroshiro = new Kuroshiro.default();
				await this.kuroshiro.init(new KuromojiAnalyzer({ dictPath }));
				this.finished.ja = true;
				break;
			case "ko":
				if (this.Aromanize) return;
				await this.waitForGlobals(['Aromanize'], 5000);
				this.Aromanize = Aromanize;
				this.finished.ko = true;
				break;
			case "zh":
				if (this.OpenCC) return;
				await this.waitForGlobals(['OpenCC'], 5000);
				this.OpenCC = OpenCC;
				this.finished.zh = true;
				break;
		}
	}

	async waitForGlobals(globalNames, timeoutMs = 5000) {
		const startTime = Date.now();
		return new Promise((resolve, reject) => {
			const checkGlobals = () => {
				if (globalNames.every(name => typeof window[name] !== 'undefined')) { resolve(); return; }
				if (Date.now() - startTime > timeoutMs) { reject(new Error(`Timeout waiting for globals: ${globalNames.join(', ')}`)); return; }
				setTimeout(checkGlobals, 50);
			};
			checkGlobals();
		});
	}

	static normalizeRomajiString(s) {
		if (typeof s !== "string") return "";
		return s.replace(/\s{2,}/g, " ").trim();
	}

	async romajifyText(text, target = "romaji", mode = "spaced") {
		await this.awaitFinished("ja");
		const out = await this.kuroshiro.convert(text, { to: target, mode: mode, romajiSystem: "hepburn" });
		return Translator.normalizeRomajiString(out);
	}

	async convertToRomaja(text, target) {
		await this.awaitFinished("ko");
		if (target === "hangul") return text;
		if (!this.Aromanize || typeof this.Aromanize.hangulToLatin !== "function") throw new Error("Korean converter not initialized");
		return this.Aromanize.hangulToLatin(text, "rr-translit");
	}

	async convertChinese(text, from, target) {
		await this.awaitFinished("zh");
		const converter = this.OpenCC.Converter({ from: from, to: target });
		return converter(text);
	}

	async loadPinyinPro() {
		if (typeof pinyinPro !== "undefined") return true;
		try {
			await this.includeExternal(pinyinProPath);
			await this.waitForGlobals(["pinyinPro"], 8000);
			return true;
		} catch { return false; }
	}

	async loadTinyPinyin() {
		if (typeof TinyPinyin !== "undefined") return true;
		try {
			await this.includeExternal(tinyPinyinPath);
			await this.waitForGlobals(["TinyPinyin"], 8000);
			return true;
		} catch { return false; }
	}

	async convertToPinyin(text, options = {}) {
		try {
			if (await this.loadTinyPinyin()) return TinyPinyin.convertToPinyin(text || "");
			if (await this.loadPinyinPro()) {
				const { toneType = "mark", type = "string", nonZh = "consecutive" } = options;
				return pinyinPro.pinyin(text || "", { toneType, type, nonZh });
			}
			return text || "";
		} catch { return text || ""; }
	}
}
