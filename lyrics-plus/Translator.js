const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";

const dictPath = "https:/cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

class Translator {
	constructor(lang, isUsingNetease = false) {
		this.finished = {
			ja: false,
			ko: false,
			zh: false,
		};
		this.isUsingNetease = isUsingNetease;

		this.applyKuromojiFix();
		this.injectExternals(lang);
		this.createTranslator(lang);
	}

	static buildGeminiPrompt({ artist, title, text, wantRomaji = false }) {
		const lineCount = text.split('\n').length;
		
		if (wantRomaji) {
			return `You are a professional Japanese linguist specializing in Hepburn romanization for music lyrics.

**TASK**: Convert these Japanese lyrics to accurate Hepburn romaji.

**CRITICAL REQUIREMENTS**:
1. **EXACT LINE COUNT**: Output must have exactly ${lineCount} lines - no merging or splitting
2. **Hepburn Standard**: Use proper Hepburn romanization rules
    - Use 'shi', 'chi', 'tsu', 'ji', 'fu'.
    - Represent sokuon (っ) by doubling the following consonant (e.g., かった → katta).
    - Use "n'" before a vowel or 'y' to avoid ambiguity (e.g., shin'ya).
    - Preserve punctuation and spacing; keep non‑Japanese words as is.
3. **Long vowels**: Do NOT use macrons. Use ASCII-only sequences:
    - おう/おお → 'ou' or 'oo' as appropriate by spelling; うう → 'uu'.
4. **No Extra Content**: Do NOT add any translations, explanations, or comments.

SONG INFO:
- Artist: ${artist}
- Title: ${title}

OUTPUT FORMAT:
- Respond with ONLY a single JSON object.
- Do not use markdown code fences (like \`\`\`json).
- The JSON schema must be: {"romaji": "romanized_lyrics_as_single_string_with_newlines"}

EXAMPLE:
- Input: "失ってしまった"
- Good Output: {"romaji": "ushinatte shimatta"}
- Bad Output: {"romaji": "I lost it"} (This is a translation, not romaji)

INPUT LYRICS:
----
${text}
----`;
		}
		// Default to Vietnamese translation
		return `You are an expert lyric translator, specializing in Japanese to Vietnamese. Your task is to translate the following song lyrics into natural, poetic, and emotionally resonant Vietnamese.

RULES:
1.  **Line-for-Line Translation**: The number of lines in your output MUST exactly match the number of lines in the input text. Do NOT merge, split, or omit lines.
2.  **Preserve Meaning and Emotion**: Capture the original tone, emotion, and nuance. The translation should feel like a real song, not a literal word-for-word translation.
3.  **Handle Mixed Languages**: If a line contains non-Japanese text (e.g., English words), keep that text as is.
4.  **No Extra Content**: Do NOT add any explanations, annotations, or comments like "[Chorus]".

SONG INFO:
- Artist: ${artist}
- Title: ${title}

OUTPUT FORMAT:
- Respond with ONLY a single JSON object.
- Do not use markdown code fences (like \`\`\`json).
- The JSON schema must be: {"vi": "translated_lyrics_as_single_string_with_newlines"}

EXAMPLE:
- Input: "夏の終わり"
- Good Output: {"vi": "Khi mùa hạ tàn"} (Poetic, natural)
- Bad Output: {"vi": "Kết thúc của mùa hè"} (Too literal)

INPUT LYRICS:
----
${text}
----`;
	}

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
			// Third attempt: regex pull of JSON string values
			const mVi = raw.match(/"vi"\s*:\s*"([\s\S]*?)"\s*[},]/);
			const mRo = raw.match(/"romaji"\s*:\s*"([\s\S]*?)"\s*[},]/);
			if (mVi || mRo) {
				return { romaji: decodeJsonString(mRo?.[1] || ""), vi: decodeJsonString(mVi?.[1] || "") };
			}
		}
		if (parsed && (parsed.romaji !== undefined || parsed.vi !== undefined)) {
			return { romaji: decodeJsonString(parsed.romaji), vi: decodeJsonString(parsed.vi) };
		}
		// Fallback: treat entire text as Vietnamese and unescape \n
		const fallback = String(text || "").replace(/\\n/g, "\n");
		return { romaji: "", vi: fallback };
	}

	static async callGemini({ apiKey, artist, title, text, wantRomaji = false }) {
		// Enhanced validation
		if (!apiKey?.trim()) throw new Error("Missing or invalid Gemini API key");
		if (!text?.trim()) throw new Error("No text provided for translation");

		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
		const prompt = Translator.buildGeminiPrompt({ artist, title, text, wantRomaji });
		
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
		if (!document.querySelector(`script[src="${url}"]`)) {
			const script = document.createElement("script");
			script.setAttribute("type", "text/javascript");
			script.setAttribute("src", url);
			document.head.appendChild(script);
		}
	}

	injectExternals(lang) {
		switch (lang?.slice(0, 2)) {
			case "ja":
				this.includeExternal(kuromojiPath);
				this.includeExternal(kuroshiroPath);
				break;
			case "ko":
				this.includeExternal(aromanize);
				break;
			case "zh":
				this.includeExternal(openCCPath);
				break;
		}
	}

	async awaitFinished(language) {
		return new Promise((resolve) => {
			const interval = setInterval(() => {
				this.injectExternals(language);
				this.createTranslator(language);

				const lan = language.slice(0, 2);
				if (this.finished[lan]) {
					clearInterval(interval);
					resolve();
				}
			}, 100);
		});
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
		switch (lang.slice(0, 2)) {
			case "ja":
				if (this.kuroshiro) return;
				if (typeof Kuroshiro === "undefined" || typeof KuromojiAnalyzer === "undefined") {
					await Translator.#sleep(50);
					return this.createTranslator(lang);
				}

				this.kuroshiro = new Kuroshiro.default();
				this.kuroshiro.init(new KuromojiAnalyzer({ dictPath })).then(
					function () {
						this.finished.ja = true;
					}.bind(this)
				);

				break;
			case "ko":
				if (this.Aromanize) return;
				if (typeof Aromanize === "undefined") {
					await Translator.#sleep(50);
					return this.createTranslator(lang);
				}

				this.Aromanize = Aromanize;
				this.finished.ko = true;
				break;
			case "zh":
				if (this.OpenCC) return;
				if (typeof OpenCC === "undefined") {
					await Translator.#sleep(50);
					return this.createTranslator(lang);
				}

				this.OpenCC = OpenCC;
				this.finished.zh = true;
				break;
		}
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
		if (!this.finished.ja) {
			await Translator.#sleep(100);
			return this.romajifyText(text, target, mode);
		}

		const out = await this.kuroshiro.convert(text, {
			to: target,
			mode: mode,
			romajiSystem: "hepburn",
		});
		return Translator.normalizeRomajiString(out);
	}

	async convertToRomaja(text, target) {
		if (!this.finished.ko) {
			await Translator.#sleep(100);
			return this.convertToRomaja(text, target);
		}

		if (target === "hangul") return text;
		return Aromanize.hangulToLatin(text, "rr-translit");
	}

	async convertChinese(text, from, target) {
		if (!this.finished.zh) {
			await Translator.#sleep(100);
			return this.convertChinese(text, from, target);
		}

		const converter = this.OpenCC.Converter({
			from: from,
			to: target,
		});

		return converter(text);
	}

	/**
	 * Async wrapper of `setTimeout`.
	 *
	 * @param {number} ms
	 * @returns {Promise<void>}
	 */
	static async #sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
