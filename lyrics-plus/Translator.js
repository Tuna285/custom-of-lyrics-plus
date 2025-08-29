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
			return `You are a meticulous Japanese linguistics expert. Your sole mission is to accurately transcribe the following Japanese lyrics into standard Hepburn romanization, following the strictest academic and practical rules for musical contexts.
		
		**NON-NEGOTIABLE DIRECTIVES**:
		
		1.  **EXACT LINE-FOR-LINE TRANSCRIPTION**: The output MUST contain exactly ${lineCount} lines. Do not merge, split, or alter the line structure in any way.
		
		2.  **STRICT HEPBURN SYSTEM RULES**:
			*   **Consonants**: Always use 'shi', 'chi', 'tsu', 'fu', 'ji' (not 'si', 'ti', 'tu', 'hu', 'zi').
			*   **Sokuon (っ)**: Double the consonant that follows it (e.g., ずっと → zutto, いっぱい → ippai).
			*   **Syllabic "n" (ん)**: Use "n'". Place an apostrophe before a vowel or 'y' to prevent ambiguity (e.g., しんや → shin'ya, ほんい → hon'i). Otherwise, it's just 'n' (e.g., あんない → annai).
			*   **Particles**: Transcribe particles based on their pronunciation, not their spelling:
				*   'は' as a particle is **wa**.
				*   'へ' as a particle is **e**.
				*   'を' as a particle is **o**.
		
		3.  **LONG VOWEL REPRESENTATION (ASCII-ONLY)**:
			*   **NO MACRONS**: Absolutely do not use macrons (e.g., ō, ū). The output must be pure ASCII.
			*   Transcribe based on the original hiragana spelling:
				*   おう → **ou** (e.g., ありがとう → arigatou)
				*   おお → **oo** (e.g., とおい → tooi)
				*   うう → **uu** (e.g., くうき → kuuki)
				*   えい → **ei** (e.g., せんせい → sensei)
				*   Other long vowels are represented by double letters (e.g., いい → ii, ああ → aa).
		
		4.  **PRESERVE ALL PUNCTUATION AND NON-JAPANESE TEXT**:
			*   All punctuation (commas, periods, question marks, etc.) must be kept in their original positions.
			*   Any non-Japanese text (e.g., English words, numbers) must be left exactly as-is.
		
		5.  **ABSOLUTELY AVOID**:
			*   Translations, interpretations, or explanations.
			*   Any annotations or comments.
			*   HTML tags or any formatting other than newlines.
		
		**SONG INFO**:
		- Artist: ${artist}
		- Title: ${title}
		
		**OUTPUT FORMAT**:
		- Respond with ONLY a single, raw JSON object.
		- Do NOT use markdown code fences (like \`\`\`json).
		- The JSON schema MUST be exactly: {"romaji": "romanized_lyrics_as_a_single_string_with_\\n_for_newlines"}
		
		**INPUT LYRICS**:
		----
		${text}
		----`;
		}
// Default to Vietnamese translation
return `You are a professional lyricist and artistic translator, specializing in adapting Japanese songs into beautiful, singable Vietnamese lyrics. Your primary goal is to create a complete, soulful Vietnamese work that preserves the original's essence while feeling natural to a Vietnamese audience.

**GOLDEN RULES OF TRANSLATION**:

1.  **ABSOLUTE LINE-COUNT INTEGRITY**: The output MUST have exactly ${lineCount} lines. Do NOT merge, split, omit, or add any lines. Each original line must have a corresponding translated line.

2.  **CAPTURE THE SOUL OF THE SONG**: Go beyond literal meaning. Capture the core emotion, atmosphere, subtext, and tone of the original lyrics. Use the song info for context. The translation must evoke the same feelings as the original.

3.  **MUSICALITY AND POETRY (CRUCIAL)**:
    *   The lyrics must be poetic and flow naturally with a song's rhythm. Use rich, evocative Vietnamese.
    *   Pay attention to rhyme and meter where possible, but prioritize natural phrasing over forced rhymes.
    *   Avoid literal, "word-for-word" translations that sound awkward or flat ("ngang phè").

4.  **INTELLIGENT HANDLING OF MIXED LANGUAGES (EXTREMELY IMPORTANT)**:
    *   **Your default and primary action is to TRANSLATE EVERYTHING into natural Vietnamese**, including English words or phrases found within the Japanese lyrics. The goal is a seamless, purely Vietnamese lyrical piece.
    *   **Do NOT keep English words as-is**. This is the most common mistake and creates a jarring, unnatural experience.
    *   **Handle "Wasei-eigo" (Japanese-made English)**: Translate these words based on their actual meaning and nuance in the Japanese context, not their literal English definition.
    *   **EXAMPLE**:
        *   Original Japanese: "君からの「I love you」"
        *   Bad translation (unnatural): 'Anh muốn nghe "I love you" từ em'
        *   **Excellent translation (natural & poetic)**: 'Anh muốn nghe lời yêu từ trái tim em'

5.  **NO EXTRA CONTENT**: Do NOT add any of your own explanations, annotations, or labels like "[Điệp khúc]", "[Verse 2]", etc.

**SONG INFO**:
- Artist: ${artist}
- Title: ${title}

**OUTPUT FORMAT**:
- Respond with ONLY a single, raw JSON object.
- Do NOT use markdown code fences (like \`\`\`json).
- The JSON schema MUST be exactly: {"vi": "translated_lyrics_as_a_single_string_with_\\n_for_newlines"}

**INPUT LYRICS**:
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
