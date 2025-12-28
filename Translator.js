const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath = "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath = "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

// Rate Limit
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
			throw new Error(`Rate limit exceeded (RPM). Please wait ${waitTime}s.`);
		}
		stats.minuteCount++;
		localStorage.setItem('gemini_rate_stats', JSON.stringify(stats));
		console.log(`[Lyrics+] RPM: ${stats.minuteCount}`);
		return stats;
	}
}

// Retry & Queue
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
		if (this.isProcessing) {
			console.log(`[Queue] Waiting - already processing, queue length: ${this.queue.length}`);
			return;
		}
		if (this.queue.length === 0) return;

		this.isProcessing = true;
		console.log(`[Queue] Processing started, queue length: ${this.queue.length}`);
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

// Translation Styles
const TRANSLATION_STYLES = {
	"smart_adaptive": { name: "Smart Adaptive (Recommended)", description: "AI auto-detects song genre." },
	"poetic_standard": { name: "Poetic & Romantic", description: "Best for Ballads and Pop." },
	"youth_story": { name: "Youthful & Narrative", description: "Best for J-Pop and Anime." },
	"street_bold": { name: "Bold & Street", description: "Best for Rap and Hip-Hop." },
	"vintage_classic": { name: "Vintage & Classic", description: "Best for Classic and Retro tracks." },
	"literal_study": { name: "Literal (Linguistic)", description: "Best for language learning." }
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

	// Gemini/Gemma (Official API) Prompt Builder
	static buildGemma3Prompt({ artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default', wantSmartPhonetic = false }) {
		const lines = text.split('\n');
		const lineCount = lines.length;
		const linesJson = JSON.stringify(lines);

		if (wantSmartPhonetic) {
			return `Task: Phonetic Transcription (Karaoke System).
Input lines: ${lineCount}
Rules: 
1. Output JSON Array of exactly ${lineCount} strings.
2. Transcription Standards:
   - Japanese: Hepburn Romaji with macrons for long vowels (chōonpu: ā, ē, ī, ō, ū, e.g., "東京" → "tōkyō").
   - Korean: Revised Romanization with word spacing (e.g., "사랑해요" → "sarang haeyo").
   - Chinese: Pinyin with tone marks and word spacing (e.g., "我爱你" → "wǒ ài nǐ").
3. Keep punctuation/English unchanged.
4. Romanize sound effects (e.g., "Ah" not "Tiếng hét").
5. All lowercase, NO capitalization at the beginning of lines.
6. Convert numbers to words in their respective languages:
   - Japanese: "1" → "ichi", "3つ" → "mittsu"
   - Korean: "1" → "il/hana", "100" → "baek"
   - Chinese: "1" → "yī", "100" → "bǎi"
Input: ${linesJson}
Output JSON:`;
		}

		const STYLE_DESC = {
			"smart_adaptive": {
				name: "Smart Adaptive",
				description: "Natural Vietnamese. Complete sentences. Focus on grammatical smoothness without altering the original meaning.",
			},
			"poetic_standard": {
				name: "Poetic & Romantic",
				description: "Poetic & Emotional. Uses metaphorical words and particles (vương, nỡ, đành) to enhance the mood.",
			},
			"youth_story": {
				name: "Youthful & Narrative",
				description: "Storytelling Style. Clear dialogue-like sentences.",
			},
			"street_bold": {
				name: "Bold & Street",
				description: "Strong & Direct. Focus on rhythm and attitude.",
			},
			"vintage_classic": {
				name: "Vintage & Classic",
				description: "Elegant. Uses Sino-Vietnamese vocabulary.",
			},
			"literal_study": {
				name: "Literal (Linguistic)",
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
   - **ALLOWED (Syntactic Expansion):** You MAY add "Functional Particles" to fix grammar/flow.
     - *Examples:* "đang", "đã", "sẽ", "vẫn", "cứ", "lại", "mà", "thì", "là", "những", "cái", "nỗi".
     - *Why:* These words make the sentence complete without changing the story.
     - *Case:* "Look at me" -> "Hãy nhìn vào anh" (Added "Hãy", "vào" -> OK).

   - **FORBIDDEN (Semantic Expansion):** You MUST NOT add "Descriptive Adjectives/Adverbs" that are not in the source.
     - *Examples:* "buồn bã", "vội vàng", "thật chậm", "xinh đẹp", "trống trải".
     - *Why:* These words invent new facts/emotions.
     - *Case:* "Look at me" -> "Hãy nhìn vào anh thật đắm đuối" (Added "thật đắm đuối" -> HALLUCINATION -> STOP).

2. **Grammar & Flow**:
   - Aim for full, spoken-style Vietnamese sentences (Chủ ngữ + Vị ngữ).
   - **Avoid rigid "Người mà..." structure** for relative clauses. Use natural phrasing (e.g., "Em, người chỉ biết khóc, vẫn còn" instead of "Người chỉ biết khóc như em, vẫn còn").
   - **Sentence Cohesiveness**: If a sentence is split across lines (enjambment), translate naturally as a whole flow. Avoid adding commas at the end of lines if the sentence continues.

3. **Vocal Sounds & Exclamations**:
   - **Do NOT translate** vocal sounds like "Ah", "Oh", "Woo", "Yeah", "La la la". 
   - Keep Japanese exclamations like "Aa" as "Aa" (do NOT translate to "Ôi").

4. **Accuracy Check**:
   - If the source is "Kicking off the covers" (Đá chăn), translated output must imply "Kick" + "Cover". Do not add "vội vàng" (hurriedly) unless the lyrics say "hurriedly".

CRITICAL FORMATTING RULES:
1. **LINE COUNT MUST BE EXACTLY ${lineCount}**.
   - Check your output array length BEFORE finishing.
2. **ONE-TO-ONE MAPPING**: 
   - Never merge or split lines.
3. OUTPUT: Return ONLY a valid JSON String Array.

Input JSON:
${linesJson}`;
	}

	static extractGeminiJson(text) {
		let raw = String(text || "").trim();
		raw = raw.replace(/```[a-z]*\n?/gim, "").replace(/```/g, "").trim();

		function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

		// JSON Parse
		let parsed = safeParse(raw);
		if (!parsed || !Array.isArray(parsed)) {
			const start = raw.indexOf("[");
			const end = raw.lastIndexOf("]");
			if (start !== -1 && end > start) {
				parsed = safeParse(raw.slice(start, end + 1));
			}
		}

		if (Array.isArray(parsed)) {
			console.log(`[Lyrics+] Parsed ${parsed.length} lines via JSON`);
			return { vi: parsed, phonetic: parsed.join('\n') };
		}

		// Fallback to Delimiter/Numbered List
		console.warn("[Lyrics+] JSON parse failed, trying fallback...");
		const hasDelimiter = raw.includes("|||");
		const hasNumberedLines = /^\d+\.\s+/m.test(raw);

		if (hasDelimiter || hasNumberedLines) {
			let normalized = raw.replace(/\n+(\d+\.)/g, '|||$1');
			const parts = normalized.split("|||").map(p => p.trim()).filter(Boolean);
			const result = [];

			parts.forEach(part => {
				const match = part.match(/^(\d+)\.\s*(.*)/s);
				if (match) {
					result[parseInt(match[1], 10) - 1] = match[2].trim();
				} else if (result.length === 0) {
					result.push(part);
				}
			});

			const cleaned = result.filter(item => item !== undefined && item !== null);
			if (cleaned.length > 0) {
				console.log(`[Lyrics+] Parsed ${cleaned.length} lines via Fallback`);
				return { vi: cleaned, phonetic: cleaned.join('\n') };
			}
		}

		// Raw split
		const rawLines = raw.split('\n').filter(l => l.trim());
		return { vi: rawLines, phonetic: rawLines.join('\n') };
	}

	static buildMinimalFallbackPrompt({ artist, title, text }) {
		const lines = text.split('\n');
		const linesJson = JSON.stringify(lines);
		return `Translate to Vietnamese. Output valid JSON Array of ${lines.length} strings. 1:1 mapping. No merging.
Input: ${linesJson}
Output JSON:`;
	}

	// Proxy API Prompt

	static buildProxyVietnamesePrompt({ artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default' }) {
		const lines = text.split('\n');
		const lineCount = lines.length;

		const STYLE_INSTRUCTIONS = {
			"smart_adaptive": {
				role: `**ROLE:** You are a sophisticated music AI. Your task is to AUTO-ANALYZE the lyrics to choose the most fitting Vietnamese tone.`,
				style: `**AUTO-DETECT PROCESS:**
1. **Analyze Vibe:**
   - Aggressive/Edgy (Rap/Rock) → "Street" tone
   - Sweet/Yearning (Ballad/Pop) → "Romantic" tone
   - Fresh/Nostalgic (J-Pop/Indie) → "Youth" tone
   - Philosophical/Classic (Old songs) → "Vintage" tone

2. **Core Principles:**
   - **Natural:** Translate so readers think this is original Vietnamese, not a translation.
   - **Flexible:** Keep cultural terms (Sensei, Oppa) intact or handle elegantly.`,
				pronounSuggestion: null
			},

			"poetic_standard": {
				role: `**ROLE:** You are a Vietnamese lyricist (like Phan Mạnh Quỳnh). You don't just translate, you "poetize" for melody.`,
				style: `**STYLE:**
1. **Technique "Internalization":** Describe inner feelings, not just actions.
   - "I wait for you" → "Lòng anh mòn mỏi ngóng trông"
2. **Words:** Prefer melodic, imagery-rich Vietnamese. Avoid mundane words.`,
				pronounSuggestion: "Anh - Em"
			},

			"youth_story": {
				role: `**ROLE:** You are a Light Novel/Anime translator (like Shinkai Makoto's works).`,
				style: `**STYLE:**
1. **Technique "Show, Don't Tell":** Translate small actions for storytelling.
   - "Cry" → "Nước mắt khẽ rơi"
2. **Atmosphere:** Keep nostalgic, innocent mood. Preserve Japanese imagery (cicadas, rooftops, trains).`,
				pronounSuggestion: "Tớ - Cậu"
			},

			"street_bold": {
				role: `**ROLE:** You are an Underground Rapper/Battle Rapper. Words are your weapon.`,
				style: `**STYLE:**
1. **Technique "Flow & Impact":** Short, punchy. Sentences must have "force" (punchlines).
2. **Words:** Strong words: "Điên cuồng", "Bùng cháy", "Tan nát". Slang allowed.
   - NO sappy words like "lệ rơi", "vấn vương". Use "nước mắt", "ám ảnh".`,
				pronounSuggestion: "Tôi - Bạn"
			},

			"vintage_classic": {
				role: `**ROLE:** You are a pre-war poet or Trịnh/Bolero songwriter. You love fading beauty and philosophy.`,
				style: `**STYLE:**
1. **Technique "Sino-Vietnamese":** Use Hán Việt for depth.
   - "Sad" → "Sầu bi/U hoài"; "Die" → "Tàn phai"; "Forever" → "Thiên thu"
2. **Imagery:** Use nature metaphors (clouds, wind, moon, dust).`,
				pronounSuggestion: "Ta - Người"
			},

			"literal_study": {
				role: `**ROLE:** You are a linguistics professor. Goal is ACCURACY and EDUCATION.`,
				style: `**STYLE:**
1. **Principle "Faithfulness":** Literal meaning. No added emotions.
2. **Idioms:** Translate actual meaning. "Break a leg" → "Chúc may mắn".`,
				pronounSuggestion: "Tôi - Bạn"
			}
		};

		const styleObj = STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS['smart_adaptive'];

		let pronounSection = "";
		if (pronounKey === 'default') {
			// Auto Mode
			pronounSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 PRONOUN MODE: FULL CREATIVE FREEDOM (HIGHEST PRIORITY) 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ COMPLETELY IGNORE any pronoun suggestions in the style section below.
✅ You have FULL FREEDOM to choose ANY Vietnamese pronouns.

**ANALYSIS REQUIRED:**
1. Song theme: Love? Friendship? Family? Self-reflection? Anger?
2. Relationship: Couple? Friends? Parent-child? Strangers? Enemies?
3. Tone: Sweet? Aggressive? Nostalgic? Philosophical?
4. Age/Generation: Young? Adult? Elder?

**CHOOSE FREELY FROM:**
Tôi, Anh, Em, Tớ, Cậu, Mình, Ta, Người, Tao, Mày, Chúng ta, Bạn, Mẹ, Con, etc.

**PRIORITY:** Natural Vietnamese flow > Style suggestions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
		} else if (pronounKey && PRONOUN_MODES[pronounKey]?.value) {
			pronounSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRONOUN OVERRIDE (MANDATORY - HIGHEST PRIORITY) 🔒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST use pronouns: "${PRONOUN_MODES[pronounKey].value}" for ALL ${lineCount} lines.
- If monologue (no second person), use only the first pronoun from the pair.
- This overrides ALL other pronoun suggestions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
		} else if (styleObj.pronounSuggestion) {
			pronounSection = `
**PRONOUNS:** Suggest "${styleObj.pronounSuggestion}" (flexible based on context).

`;
		}

		return {
			system: `${pronounSection}${styleObj.role}

${styleObj.style}

**GOLDEN RULES (IMMUTABLE):**
1. Output MUST be array of EXACTLY ${lineCount} elements.
2. 1 source line = 1 translated line. NEVER split/merge.
3. Empty lines → empty string "".
4. Keep labels [Intro], [Chorus], (Instrumental) unchanged.

**ANTI-HALLUCINATION:**
- ALLOWED: Grammatical particles (đang, đã, sẽ, vẫn, mà, thì, là)
- FORBIDDEN: Added adjectives/adverbs not in source (buồn bã, vội vàng, thật chậm)

**NATURAL FLOW RULES:**
1. **No fragmented commas**: Avoid placing commas at the end of lines if the sentence continues to the next line.
2. **Relative Clauses**: Avoid "Người mà...". Use natural phrasing.
3. **Vocal Sounds**: Keep "Ah", "Oh", "Aa" unchanged. Do NOT translate to "Ôi".`,

			user: `Translate lyrics to Vietnamese.

**Song:** ${artist} - ${title}

**Input (${lineCount} lines):**
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

**Output:** JSON with key "translations" containing array of ${lineCount} Vietnamese strings.`
		};
	}

	static buildProxyPhoneticPrompt({ artist, title, text }) {
		const lines = text.split('\n');
		const lineCount = lines.length;

		return {
			system: `You are a phonetic transcription system for Karaoke.

RULES:
- Japanese: Hepburn Romaji with macrons for long vowels (chōonpu: ā, ē, ī, ō, ū)
- Korean: Revised Romanization with word spacing (sarang haeyo, not saranghaeyo)
- Chinese: Pinyin with tone marks and word spacing (wǒ ài nǐ)
- Keep English/punctuation unchanged
- All lowercase, NO capitalization at the beginning of lines
- Convert numbers to words (Japanese: ichi, Korean: hana/il, Chinese: yī)
- Output EXACTLY ${lineCount} lines`,

			user: `Romanize: "${artist} - ${title}"

${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

JSON output: {"phonetics": [array of ${lineCount} strings]}`
		};
	}

	static promote(key) {
		if (key.includes(':gemini_romaji')) geminiQueuePhonetic.promote(key);
		else geminiQueueTranslation.promote(key);
	}

	static async callGemini({ apiKey, artist, title, text, styleKey, pronounKey, wantSmartPhonetic, _isRetry, priority, taskId }) {
		const startTime = Date.now();
		const lineCount = text.split('\n').length;

		console.group(`[Lyrics+] ${wantSmartPhonetic ? 'Phonetic' : 'Translation'} Request`);
		console.log(`Song: ${artist} - ${title} (${lineCount} lines)`);

		// Determine API mode
		const apiMode = CONFIG?.visual?.["gemini:api-mode"] || "official";
		const proxyEndpoint = CONFIG?.visual?.["gemini:proxy-endpoint"] || "http://localhost:8317/v1/chat/completions";

		let endpoint, body, headers;

		if (apiMode === "proxy") {
			// CLI Proxy API mode 
			const proxyModel = CONFIG?.visual?.["gemini:proxy-model"] || "gemini-3-flash-preview";
			const proxyApiKey = CONFIG?.visual?.["gemini:proxy-api-key"] || "proxypal-local";
			endpoint = proxyEndpoint;
			headers = {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${proxyApiKey}`
			};

			// Build prompts for Gemini Proxy
			let proxyPrompt;
			if (_isRetry) {
				// Fallback
				proxyPrompt = {
					system: "You are a translator. Output valid JSON only.",
					user: Translator.buildMinimalFallbackPrompt({ artist, title, text })
				};
			} else if (wantSmartPhonetic) {
				proxyPrompt = Translator.buildProxyPhoneticPrompt({ artist, title, text });
			} else {
				proxyPrompt = Translator.buildProxyVietnamesePrompt({ artist, title, text, styleKey, pronounKey });
			}

			body = {
				model: proxyModel,
				messages: [
					{ role: "system", content: proxyPrompt.system },
					{ role: "user", content: proxyPrompt.user }
				],
				temperature: 0.5,
				max_tokens: 4000,
				response_format: { type: "json_object" }
			};
			console.log(`[Gemini Proxy] Using: ${endpoint} (Model: ${proxyModel}, JSON Mode: ON)`);
		} else {
			// Official API mode
			if (!apiKey?.trim()) throw new Error("Missing API key");
			endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${encodeURIComponent(apiKey)}`;
			headers = {
				"Content-Type": "application/json",
				"User-Agent": "Spicetify-LyricsPlus/1.0"
			};
			// Build Gemini/Gemma prompt
			const gemma3Prompt = _isRetry
				? Translator.buildMinimalFallbackPrompt({ artist, title, text })
				: Translator.buildGemma3Prompt({ artist, title, text, styleKey, pronounKey, wantSmartPhonetic });

			body = {
				contents: [{ parts: [{ text: gemma3Prompt }] }],
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
			console.log(`[Lyrics+] Using Official API`);
		}

		try {
			const selectedQueue = wantSmartPhonetic ? geminiQueuePhonetic : geminiQueueTranslation;
			const disableQueue = CONFIG?.visual?.["gemini:disable-queue"] === true;

			// Function to make the actual request
			const makeRequest = async () => {
				const res = await fetchWithRetry(async () => {
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout
					try {
						const response = await fetch(endpoint, {
							method: "POST",
							headers,
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

				// Parse response based on API mode
				let raw;
				if (apiMode === "proxy") {
					// OpenAI-compatible response format with JSON mode
					if (!data?.choices?.length) throw new Error("No choices returned from proxy");
					raw = data.choices[0]?.message?.content;
				} else {
					// Google API response format
					if (!data?.candidates?.length) throw new Error("No candidates returned");
					const candidate = data.candidates[0];
					if (candidate?.finishReason === "SAFETY") {
						throw new Error("Translation blocked by safety filters.");
					}
					raw = candidate?.content?.parts?.[0]?.text;
				}

				if (!raw) throw new Error("Empty response content");

				console.log(`[Gemini] Raw Response:`, raw);

				// Parse JSON response
				let result;
				if (apiMode === "proxy") {
					// Proxy mode returns structured JSON with translations/phonetics keys
					try {
						// Strip markdown code blocks if present
						let cleanRaw = raw.trim();
						if (cleanRaw.startsWith('```')) {
							cleanRaw = cleanRaw.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
						}
						const parsed = JSON.parse(cleanRaw);
						if (wantSmartPhonetic && parsed.phonetics) {
							result = { vi: parsed.phonetics, phonetic: parsed.phonetics.join('\n') };
						} else if (parsed.translations) {
							result = { vi: parsed.translations, phonetic: parsed.translations.join('\n') };
						} else if (Array.isArray(parsed)) {
							result = { vi: parsed, phonetic: parsed.join('\n') };
						} else {
							throw new Error("Invalid JSON structure");
						}
						console.log(`[Gemini Proxy] Parsed ${result.vi.length} lines via JSON mode`);
					} catch (e) {
						console.warn(`[Gemini Proxy] JSON parse failed, falling back:`, e);
						result = Translator.extractGeminiJson(raw);
					}
				} else {
					result = Translator.extractGeminiJson(raw);
				}
				const duration = Date.now() - startTime;

				// Validation logic
				let resultCount = 0;
				if (wantSmartPhonetic) {
					const content = Array.isArray(result.phonetic) ? result.phonetic.join('\n') : result.phonetic;
					resultCount = content ? content.split('\n').length : 0;
					if (Array.isArray(result.phonetic)) result.phonetic = result.phonetic.join('\n');
				} else {
					resultCount = Array.isArray(result.vi) ? result.vi.length : 0;
				}

				console.log(`[Lyrics+] Completed in ${duration}ms. Lines: ${resultCount}/${lineCount} ${resultCount === lineCount ? 'OK' : 'MISMATCH'}`);
				console.groupEnd();
				return { ...result, duration };
			};

			// Execute with or without queue based on setting
			if (disableQueue) {
				// Bypass queue - run directly (parallel)
				console.log(`[Lyrics+] Queue disabled - running parallel request`);
				return await makeRequest();
			} else {
				// Use queue for rate limiting
				return await selectedQueue.add(makeRequest, priority, taskId);
			}

		} catch (error) {
			console.error(`Gemma Error: ${error.message}`);
			console.groupEnd();

			// Retry logic
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

	// External Scripts
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
