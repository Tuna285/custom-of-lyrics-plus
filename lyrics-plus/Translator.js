const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath = "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath = "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

class Translator {
	constructor(lang, isUsingNetease = false) {
		this.finished = {
			ja: false,
			ko: false,
			zh: false,
		};
		this.isUsingNetease = isUsingNetease;
		this.initializationPromise = null;

		this.applyKuromojiFix();
		// Start initialization asynchronously but don't await in constructor
		this.initializationPromise = this.initializeAsync(lang);
	}

	/**
	 * Async initialization method that can be awaited
	 * @param {string} lang - Language code
	 * @returns {Promise<void>}
	 */
	async initializeAsync(lang) {
		try {
			await this.injectExternals(lang);
			await this.createTranslator(lang);
		} catch (error) {
			console.error(`Failed to initialize translator for language ${lang}:`, error);
			throw error;
		}
	}

	static buildGeminiPrompt({ artist, title, text, wantSmartPhonetic = false }) {
		const lineCount = text.split('\n').length;
		
		if (wantSmartPhonetic) {
			return `You are a linguistics expert specializing in CJK phonetic transcription. Your task is to detect the language of the lyrics and transcribe them to the correct phonetic system.

**Instructions**:

1.  **Line Integrity**: The output MUST contain exactly ${lineCount} lines. Each transcribed line must correspond to the original line's position. Do not add, merge, or remove lines.

2.  **Language Detection & Transcription**:
    - **If Japanese**: Transcribe to **Hepburn Romaji**.
        - Use macrons for long vowels (e.g., とうきょう → Tōkyō).
        - Particles: は→wa, へ→e, を→o.
        - Syllabic 'ん' before vowel/y -> n' (e.g., しんや → shin'ya).
    - **If Korean**: Transcribe to **Revised Romanization (Romaja)**.
    - **If Chinese**: Transcribe to **Hanyu Pinyin** with tone marks.

3.  **Preserve Content**:
    - Leave all non-CJK text (English, numbers) and punctuation unchanged.
    - Preserve empty lines.

**Verification**:
- [ ] Output has exactly ${lineCount} lines.
- [ ] Language correctly identified and transcribed.
- [ ] Non-CJK text and punctuation are preserved.

**Song Info**:
- Artist: ${artist}
- Title: ${title}

**Output Format**:
- Respond with ONLY a single, raw JSON object.
- Do NOT use markdown code fences.
- JSON schema: {"phonetic": "transcribed_lyrics_with_\\n_for_newlines", "detected_language": "ja|ko|zh"}

**Input Lyrics**:
----
${text}
----`;
		}
// Default to Vietnamese translation
return `Bạn là một chuyên gia dịch thuật lời bài hát, một người kể chuyện bằng âm nhạc, có kỹ năng bậc thầy trong việc tạo ra các phiên bản tiếng Việt vừa nên thơ, giàu cảm xúc, vừa giữ được nhịp điệu để có thể hát theo. Nhiệm vụ của bạn là dịch lời bài hát được cung cấp, cân bằng giữa biểu đạt nghệ thuật và độ chính xác kỹ thuật cần thiết cho phụ đề đồng bộ.

**--- QUY TẮC VÀNG (BẤT DI BẤT DỊCH) ---**

**TOÀN VẸN SỐ DÒNG TUYỆT ĐỐI:**
- Output của bạn BẮT BUỘC phải có số dòng chính xác bằng với input: **${lineCount} dòng**.
- Đây là quy tắc quan trọng nhất. Một bản dịch sáng tạo sẽ trở nên vô dụng nếu nó phá vỡ đồng bộ hóa thời gian của phụ đề.
- **TUYỆT ĐỐI KHÔNG GỘP, TÁCH, hay BỎ QUA DÒNG VÌ BẤT KỲ LÝ DO NÀO.**
- Một dòng trống trong input phải là một dòng trống trong output.
- Một dòng chỉ có một từ phải được dịch thành một dòng.

**--- MỤC TIÊU NGHỆ THUẬT & DỊCH THUẬT ---**

**1. KỂ LẠI CÂU CHUYỆN (RETELL THE STORY):**
   - **Quan trọng nhất:** Trước khi dịch từng dòng, hãy đọc lướt toàn bộ lời bài hát để nắm bắt CÂU CHUYỆN TỔNG THỂ, thông điệp và hành trình cảm xúc của nhân vật.
   - Bản dịch của bạn phải tạo ra một dòng chảy liền mạch, mỗi câu hát phải là sự tiếp nối tự nhiên của câu trước đó, cùng nhau dệt nên một câu chuyện hoàn chỉnh.

**2. ƯU TIÊN CẢM XÚC VÀ CHẤT THƠ (PRIORITIZE EMOTION & POETRY):**
   - Vượt ra ngoài giới hạn của dịch nghĩa đen. Hãy nắm bắt linh hồn, tâm trạng và sắc thái tinh tế của bản gốc.
   - Sử dụng từ ngữ tiếng Việt giàu hình ảnh, trau chuốt và gần gũi với văn phong thơ ca, âm nhạc Việt Nam. Lời dịch phải đẹp khi đọc và tự nhiên khi cất lên thành tiếng hát.

**3. ĐẢM BẢO TÍNH NHẠC ĐIỆU (ENSURE SINGABILITY & RHYTHM):**
   - Dù không bắt buộc phải có vần điệu, lời dịch phải có nhịp điệu và dòng chảy mượt mà.
   - Tránh sử dụng những từ ngữ trúc trắc, gượng ép. Hãy đọc thầm lại câu dịch để chắc chắn rằng nó trôi chảy một cách tự nhiên.

**4. TÔN TRỌNG SẮC THÁI GỐC (RESPECT THE ORIGINAL NUANCE):**
   - Xử lý các thành ngữ, ẩn dụ và yếu tố văn hóa một cách khéo léo. Tìm những cách diễn đạt tương đương trong tiếng Việt nếu có thể.
   - Đảm bảo giọng điệu (ví dụ: vui, buồn, giận dữ) của bản dịch khớp với bản gốc.

**--- VÍ DỤ VỀ CẤU TRÚC ĐÚNG ---**

**INPUT (5 dòng):**
Hello world

How are you?
Oh...
(Yeah)

**OUTPUT ĐÚNG (5 dòng, bảo toàn cấu trúc):**
["Xin chào thế giới", "", "Bạn có khoẻ không?", "Ôi...", "(Yeah)"]

**--- BƯỚC TỰ KIỂM TRA CUỐI CÙNG ---**
Trước khi đưa ra output cuối cùng, bạn BẮT BUỘC phải tự hỏi: "Output của mình đã có chính xác ${lineCount} phần tử trong mảng chưa?" Nếu chưa, bạn phải sửa lại.

**THÔNG TIN BÀI HÁT:**
- Nghệ sĩ: ${artist}
- Tên bài hát: ${title}

**ĐỊNH DẠNG OUTPUT:**
- Chỉ trả lời bằng một đối tượng JSON thô duy nhất.
- KHÔNG sử dụng ký tự markdown.
- Cấu trúc JSON: {"vi": ["dòng dịch 1", "dòng dịch 2", ...]}

**LỜI BÀI HÁT CẦN DỊCH:**
----
${text}
----`}

	static extractGeminiJson(text) {
		function safeParse(s) {
			try {
				return JSON.parse(s);
			} catch {
				return null;
			}
		}
		function decodeJsonString(s) {
			if (typeof s !== "string") return "";
			return s
				.replace(/\\n/g, "\n")
				.replace(/\\t/g, "\t")
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, "\\");
		}
		// Normalize and strip common artefacts (code fences, language tags, stray 'json' lines)
		let raw = String(text || "").trim();
		// Remove any ```json / ``` fences anywhere, not only at edges
		raw = raw.replace(/```[a-z]*\n?/gim, "").replace(/```/g, "");
		// Drop standalone 'json' lines
		raw = raw.replace(/^\s*json\s*$/gim, "");
		// First attempt: direct JSON
		let parsed = safeParse(raw);
		if (!parsed) {
			// Second attempt: extract the largest {...} block
			const start = raw.indexOf("{");
			const end = raw.lastIndexOf("}");
			if (start !== -1 && end !== -1 && end > start) {
				parsed = safeParse(raw.slice(start, end + 1));
			}
		}
		if (!parsed) {
			// Third attempt: regex pull of JSON string values (handle both string and array formats)
			const mVi = raw.match(/"vi"\s*:\s*"([\s\S]*?)"\s*[},]/);
			const mViArray = raw.match(/"vi"\s*:\s*(\[[\s\S]*?\])\s*[},]/);
			const mPhonetic = raw.match(/"phonetic"\s*:\s*"([\s\S]*?)"\s*[},]/);
			const mPhoneticArray = raw.match(/"phonetic"\s*:\s*(\[[\s\S]*?\])\s*[},]/);
			
			if (mVi || mPhonetic || mViArray || mPhoneticArray) {
				return { 
					vi: mViArray ? JSON.parse(mViArray[1]) : decodeJsonString(mVi?.[1] || ""),
					phonetic: mPhoneticArray ? JSON.parse(mPhoneticArray[1]) : decodeJsonString(mPhonetic?.[1] || "")
				};
			}
		}
		if (parsed && (parsed.vi !== undefined || parsed.phonetic !== undefined)) {
			// Handle both string and array formats
			const normalizeField = (field) => {
				if (Array.isArray(field)) {
					return field; // Keep arrays as-is
				}
				if (typeof field === 'string') {
					return decodeJsonString(field); // Decode strings
				}
				return field;
			};

			return { 
				vi: normalizeField(parsed.vi),
				phonetic: normalizeField(parsed.phonetic)
			};
		}
		// Fallback: treat entire text as Vietnamese and unescape \n
		const fallback = String(text || "").replace(/\\n/g, "\n");
		return { vi: fallback };
	}

	static async callGemini({ apiKey, artist, title, text, wantSmartPhonetic = false }) {
		// Enhanced validation
		if (!apiKey?.trim()) throw new Error("Missing or invalid Gemini API key");
		if (!text?.trim()) throw new Error("No text provided for translation");

		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
		const prompt = Translator.buildGeminiPrompt({ artist, title, text, wantSmartPhonetic });
		
		const body = {
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			generationConfig: { 
				temperature: 0.1, // Lower temperature for more consistent results
				maxOutputTokens: 4096,
				candidateCount: 1
			},
		};

		try {
			// Add timeout support
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

			const res = await fetch(endpoint, {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					"User-Agent": "Spicetify-LyricsPlus/1.0"
				},
				body: JSON.stringify(body),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// Enhanced error handling
			if (!res.ok) {
				const errorText = await res.text().catch(() => 'Unknown error');
				switch (res.status) {
					case 401:
						throw new Error("Invalid API key. Please check your Gemini API key.");
					case 403:
						throw new Error("API access forbidden. Verify your API key permissions.");
					case 429:
						throw new Error("Rate limit exceeded. Please wait before retrying.");
					case 500:
					case 502:
					case 503:
						throw new Error("Gemini service temporarily unavailable. Please try again later.");
					default:
						throw new Error(`API request failed (${res.status}): ${errorText}`);
				}
			}

			const data = await res.json();
			
			// Validate response structure
			if (!data?.candidates?.length) {
				throw new Error("No translation candidates returned from API");
			}

			const raw = data.candidates[0]?.content?.parts?.[0]?.text;
			if (!raw) {
				throw new Error("Empty response from translation API");
			}

			return Translator.extractGeminiJson(raw);
		} catch (error) {
			if (error.name === 'AbortError') {
				throw new Error("Translation request timed out. Please try again.");
			}
			// Re-throw with more context
			throw new Error(`Gemini translation failed: ${error.message}`);
		}
	}

	includeExternal(url) {
		return new Promise((resolve, reject) => {
			const existingScript = document.querySelector(`script[src="${url}"]`);
			if (existingScript) {
				// If script already exists, resolve immediately; readiness is ensured by waitForGlobals when needed
				if (existingScript.dataset) existingScript.dataset.loaded = existingScript.dataset.loaded || 'true';
				return resolve();
			}

			const script = document.createElement("script");
			script.setAttribute("type", "text/javascript");
			script.setAttribute("src", url);
			
			script.addEventListener('load', () => {
				script.dataset.loaded = 'true';
				resolve();
			});
			
			script.addEventListener('error', () => {
				reject(new Error(`Failed to load script: ${url}`));
			});
			
			document.head.appendChild(script);
		});
	}

	async injectExternals(lang) {
		const langCode = lang?.slice(0, 2);
		try {
			switch (langCode) {
				case "ja":
					await Promise.all([
						this.includeExternal(kuromojiPath),
						this.includeExternal(kuroshiroPath)
					]);
					break;
				case "ko":
					await this.includeExternal(aromanize);
					break;
				case "zh":
					// OpenCC is required
					await this.includeExternal(openCCPath);
					// Prefer pinyin-pro (tones). Preload non-blockingly; tiny-pinyin as backup.
					this.includeExternal(pinyinProPath).catch(() => {});
					this.includeExternal(tinyPinyinPath).catch(() => {});
					break;
			}
		} catch (error) {
			console.error(`Failed to load external scripts for language ${langCode}:`, error);
			throw error;
		}
	}

	async awaitFinished(language) {
		const langCode = language?.slice(0, 2);
		// Wait for any in-flight initial initialization
		if (this.initializationPromise) {
			await this.initializationPromise;
		}
		// If the requested language is not yet initialized, initialize it now
		if (langCode && !this.finished[langCode]) {
			await this.injectExternals(language);
			await this.createTranslator(language);
		}
	}

	/**
	 * Fix an issue with kuromoji when loading dict from external urls
	 * Adapted from: https://github.com/mobilusoss/textlint-browser-runner/pull/7
	 */
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
				
				// Wait for libraries to be available with timeout
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

	/**
	 * Wait for global variables to become available
	 * @param {string[]} globalNames - Array of global variable names to wait for
	 * @param {number} timeoutMs - Timeout in milliseconds
	 * @returns {Promise<void>}
	 */
	async waitForGlobals(globalNames, timeoutMs = 5000) {
		const startTime = Date.now();
		
		return new Promise((resolve, reject) => {
			const checkGlobals = () => {
				const allAvailable = globalNames.every(name => typeof window[name] !== 'undefined');
				
				if (allAvailable) {
					resolve();
					return;
				}
				
				if (Date.now() - startTime > timeoutMs) {
					reject(new Error(`Timeout waiting for globals: ${globalNames.join(', ')}`));
					return;
				}
				
				setTimeout(checkGlobals, 50);
			};
			
			checkGlobals();
		});
	}

	static normalizeRomajiString(s) {
		if (typeof s !== "string") return "";
		return s
			// Replace macrons with ASCII-only long vowels
			.replace(/ō/g, "ou")
			.replace(/ū/g, "uu")
			.replace(/ā/g, "aa")
			.replace(/ī/g, "ii")
			.replace(/ē/g, "ee")
			// Normalize multiple spaces
			.replace(/\s{2,}/g, " ")
			.trim();
	}

	async romajifyText(text, target = "romaji", mode = "spaced") {
		// Ensure initialization is complete
		await this.awaitFinished("ja");

		const out = await this.kuroshiro.convert(text, {
			to: target,
			mode: mode,
			romajiSystem: "hepburn",
		});
		return Translator.normalizeRomajiString(out);
	}

	async convertToRomaja(text, target) {
		// Ensure initialization is complete
		await this.awaitFinished("ko");

		if (target === "hangul") return text;
		if (!this.Aromanize || typeof this.Aromanize.hangulToLatin !== "function") {
			throw new Error("Korean converter not initialized");
		}
		return this.Aromanize.hangulToLatin(text, "rr-translit");
	}

	async convertChinese(text, from, target) {
		// Ensure initialization is complete
		await this.awaitFinished("zh");

		const converter = this.OpenCC.Converter({
			from: from,
			to: target,
		});

		return converter(text);
	}

	async loadPinyinPro() {
		if (typeof pinyinPro !== "undefined") return true;
		const urls = [
			pinyinProPath,
			"https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.js",
			"https://unpkg.com/pinyin-pro@3.19.7/dist/index.min.js",
			"https://unpkg.com/pinyin-pro@3.19.7/dist/index.js",
			"https://fastly.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js",
			"https://fastly.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.js",
		];
		for (const url of urls) {
			try {
				await this.includeExternal(url);
				await this.waitForGlobals(["pinyinPro"], 8000);
				return true;
			} catch {}
		}
		return false;
	}

	async loadTinyPinyin() {
		if (typeof TinyPinyin !== "undefined") return true;
		const urls = [
			tinyPinyinPath,
			"https://unpkg.com/tiny-pinyin/dist/tiny-pinyin.min.js",
			"https://fastly.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js",
		];
		for (const url of urls) {
			try {
				await this.includeExternal(url);
				await this.waitForGlobals(["TinyPinyin"], 8000);
				return true;
			} catch {}
		}
		return false;
	}

	async convertToPinyin(text, options = {}) {
		try {
			// Try tiny-pinyin first (highest availability, no tones)
			if (await this.loadTinyPinyin()) {
				return TinyPinyin.convertToPinyin(text || "");
			}
			// Then try pinyin-pro (tones)
			if (await this.loadPinyinPro()) {
				const toneType = options.toneType || "mark"; // mark | num | none
				const type = options.type || "string"; // string | array
				const nonZh = options.nonZh || "consecutive"; // keep non-Chinese intact
				return pinyinPro.pinyin(text || "", { toneType, type, nonZh });
			}
			// As a last resort, return original text
			return text || "";
		} catch {
			// Graceful fallback: never break conversion pipeline
			return text || "";
		}
	}

}
