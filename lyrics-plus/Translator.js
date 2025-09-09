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

	static buildGeminiPrompt({ artist, title, text, wantRomaji = false, wantSmartPhonetic = false }) {
		const lineCount = text.split('\n').length;
		
		if (wantSmartPhonetic) {
			return `You are a world-class linguistics expert specializing in CJK (Chinese, Japanese, Korean) phonetic transcription. Your mission is to automatically detect the language of the lyrics and transcribe them into the appropriate phonetic system with perfect accuracy.

**CRITICAL STRUCTURAL REQUIREMENTS**:

1. **ABSOLUTE LINE-COUNT INTEGRITY**: The output MUST contain exactly ${lineCount} lines. This is NON-NEGOTIABLE.
   - Count each line carefully, including empty lines
   - Do NOT merge, split, omit, or add any lines
   - If original has 5 lines, output must have exactly 5 lines

2. **STRICT LINE-BY-LINE ALIGNMENT**: Each transcribed line MUST correspond to the original line at the SAME position.
   - Line 1 of original → Line 1 of transcription
   - Line 2 of original → Line 2 of transcription
   - And so on...

**AUTOMATIC LANGUAGE DETECTION & PHONETIC TRANSCRIPTION**:

3. **LANGUAGE DETECTION**: Analyze the lyrics to determine if they are:
   - **Japanese** (Hiragana, Katakana, Kanji) → Use **Hepburn Romaji**
   - **Korean** (Hangul) → Use **Revised Romanization (Romaja)**
   - **Chinese** (Simplified/Traditional Chinese characters) → Use **Hanyu Pinyin**

4. **LANGUAGE-SPECIFIC RULES**:

   **FOR JAPANESE (Hepburn Romaji)**:
   - **Consonants**: Use 'shi', 'chi', 'tsu', 'fu', 'ji' (not 'si', 'ti', 'tu', 'hu', 'zi')
   - **Sokuon (っ)**: Double the consonant (e.g., ずっと → zutto, いっぱい → ippai)
   - **Syllabic "n" (ん)**: Use "n'" before vowels/y (e.g., しんや → shin'ya), otherwise 'n'
   - **Particles**: は→wa, へ→e, を→o
   - **Long vowels**: Use macrons (¯) for better readability:
     - おう→ō, おお→ō, うう→ū, えい→ē, いい→ī, ああ→ā
     - Examples: ありがとう → arigatō, とおい → tōi, くうき → kūki
   - **Katakana**: Transcribe as romaji with macrons (e.g., コーヒー → kōhī)

   **FOR KOREAN (Revised Romanization)**:
   - **Consonants**: ㄱ→g/k, ㄷ→d/t, ㅂ→b/p, ㅈ→j, ㅅ→s, ㅎ→h
   - **Vowels**: ㅏ→a, ㅓ→eo, ㅗ→o, ㅜ→u, ㅡ→eu, ㅣ→i
   - **Diphthongs**: ㅑ→ya, ㅕ→yeo, ㅛ→yo, ㅠ→yu, ㅐ→ae, ㅔ→e
   - **Final consonants**: ㄱ→k, ㄴ→n, ㄷ→t, ㄹ→l, ㅁ→m, ㅂ→p, ㅅ→t, ㅇ→ng
   - **Double consonants**: ㄲ→kk, ㄸ→tt, ㅃ→pp, ㅆ→ss, ㅉ→jj

   **FOR CHINESE (Hanyu Pinyin)**:
   - **Tones**: Use tone marks (ā, á, ǎ, à) for better readability
   - **Consonants**: zh, ch, sh, r, z, c, s, j, q, x, g, k, h, d, t, n, l, b, p, m, f
   - **Vowels**: a, o, e, i, u, ü
   - **Compound vowels**: ai, ei, ao, ou, an, en, ang, eng, ong, ia, ie, iao, iu, ian, in, iang, ing, iong, ua, uo, uai, ui, uan, un, uang, ueng, üe, üan, ün
   - **Special cases**: 儿化音 (erhua) → add 'r' (e.g., 花儿 → huār)

5. **PRESERVE ALL PUNCTUATION AND NON-CJK TEXT**:
   - All punctuation must be kept in original positions
   - Any non-CJK text (English, numbers, symbols) must be left exactly as-is
   - Empty lines must be preserved as empty lines

6. **QUALITY CONTROL CHECKLIST**:
   - [ ] Output has exactly ${lineCount} lines
   - [ ] Each line corresponds to its original position
   - [ ] No lines are missing or added
   - [ ] Phonetic transcription is accurate for detected language
   - [ ] All punctuation and non-CJK text preserved

**SONG INFO**:
- Artist: ${artist}
- Title: ${title}

**OUTPUT FORMAT**:
- Respond with ONLY a single, raw JSON object
- Do NOT use markdown code fences
- JSON schema: {"phonetic": "transcribed_lyrics_with_\\n_for_newlines", "detected_language": "ja|ko|zh"}

**INPUT LYRICS**:
----
${text}
----`;
		}
		
		if (wantRomaji) {
			return `You are a meticulous Japanese linguistics expert. Your sole mission is to accurately transcribe the following Japanese lyrics into standard Hepburn romanization, following the strictest academic and practical rules for musical contexts.

**CRITICAL STRUCTURAL REQUIREMENTS**:

1. **ABSOLUTE LINE-COUNT INTEGRITY**: The output MUST contain exactly ${lineCount} lines. This is NON-NEGOTIABLE.
   - Count each line carefully, including empty lines
   - Do NOT merge, split, omit, or add any lines
   - If original has 5 lines, output must have exactly 5 lines

2. **STRICT LINE-BY-LINE ALIGNMENT**: Each transcribed line MUST correspond to the original line at the SAME position.
   - Line 1 of original → Line 1 of transcription
   - Line 2 of original → Line 2 of transcription
   - And so on...

**STRICT HEPBURN SYSTEM RULES**:

3. **CONSONANTS**: Always use 'shi', 'chi', 'tsu', 'fu', 'ji' (not 'si', 'ti', 'tu', 'hu', 'zi').

4. **SOKUON (っ)**: Double the consonant that follows it (e.g., ずっと → zutto, いっぱい → ippai).

5. **SYLLABIC "N" (ん)**: Use "n'". Place an apostrophe before a vowel or 'y' to prevent ambiguity (e.g., しんや → shin'ya, ほんい → hon'i). Otherwise, it's just 'n' (e.g., あんない → annai).

6. **PARTICLES**: Transcribe particles based on their pronunciation, not their spelling:
   - 'は' as a particle is **wa**
   - 'へ' as a particle is **e**
   - 'を' as a particle is **o**

7. **LONG VOWEL REPRESENTATION (WITH MACRONS)**:
   - **USE MACRONS**: Use macrons (¯) to indicate long vowels for better readability.
   - Transcribe based on the original hiragana spelling:
     - おう → **ō** (e.g., ありがとう → arigatō)
     - おお → **ō** (e.g., とおい → tōi)
     - うう → **ū** (e.g., くうき → kūki)
     - えい → **ē** (e.g., せんせい → sensē)
     - いい → **ī** (e.g., いい → ī)
     - ああ → **ā** (e.g., ああ → ā)

8. **KATAKANA**: Transcribe as romaji with macrons (e.g., コーヒー → kōhī, パーティー → pātī)

9. **PRESERVE ALL PUNCTUATION AND NON-JAPANESE TEXT**:
   - All punctuation (commas, periods, question marks, etc.) must be kept in their original positions
   - Any non-Japanese text (e.g., English words, numbers) must be left exactly as-is
   - Empty lines must be preserved as empty lines

10. **QUALITY CONTROL CHECKLIST**:
    - [ ] Output has exactly ${lineCount} lines
    - [ ] Each line corresponds to its original position
    - [ ] No lines are missing or added
    - [ ] Romaji transcription follows Hepburn system
    - [ ] All punctuation and non-Japanese text preserved

**SONG INFO**:
- Artist: ${artist}
- Title: ${title}

**OUTPUT FORMAT**:
- Respond with ONLY a single, raw JSON object
- Do NOT use markdown code fences
- JSON schema: {"romaji": "romanized_lyrics_with_\\n_for_newlines"}

**INPUT LYRICS**:
----
${text}
----`;
		}
// Default to Vietnamese translation
return `You are a world-class lyricist and artistic translator, a poet who bridges cultures through music. Your task is to reincarnate a song into a soulful, beautiful, and singable Vietnamese masterpiece. Your output must be flawless both artistically and structurally.

**CRITICAL STRUCTURAL REQUIREMENTS (ZERO TOLERANCE FOR VIOLATIONS)**:

1. **ABSOLUTE LINE-COUNT INTEGRITY**: The output MUST have exactly ${lineCount} lines. This is NON-NEGOTIABLE.
   - Count each line carefully, including empty lines
   - Do NOT merge, split, omit, or add any lines
   - If original has 5 lines, output must have exactly 5 lines
   - **CRITICAL**: Missing even ONE line will cause ALL subsequent lines to be misaligned

2. **STRICT LINE-BY-LINE SEMANTIC ALIGNMENT**: Each translated line MUST correspond to the original line at the SAME position.
   - Line 1 of original → Line 1 of translation
   - Line 2 of original → Line 2 of translation
   - And so on...
   - **CRITICAL**: If you skip a line, ALL following lines will be wrong

3. **PRESERVE ALL LINE TYPES**:
   - Empty lines: Keep as empty lines
   - Single words: Keep as single lines
   - Repetitive sounds: Keep as separate lines
   - Punctuation-only lines: Keep as separate lines
   - **CRITICAL**: Even if a line seems "unimportant", you MUST translate it

4. **MANDATORY LINE-BY-LINE VERIFICATION**:
   - Before finalizing, count your output lines
   - Verify each line position matches the original
   - If line count doesn't match, you MUST fix it
   - **CRITICAL**: Double-check that no lines are missing

**ARTISTIC & LINGUISTIC EXCELLENCE**:

5. **EMOTIONAL FIDELITY**: Capture the core emotion, atmosphere, and tone of the original lyrics.

6. **POETIC MASTERY**:
   - Use rich, evocative Vietnamese vocabulary
   - Maintain musical flow and rhythm
   - Create natural, singable phrases
   - Avoid choppy or awkward constructions

7. **LINGUISTIC INTELLIGENCE**:
   - Translate English phrases naturally into Vietnamese
   - Preserve symbolic proper nouns when appropriate
   - Transform onomatopoeia into vivid Vietnamese expressions
   - Handle idioms with cultural sensitivity

**SPECIAL HANDLING FOR PROBLEMATIC CASES**:

8. **HANDLING DIFFICULT LINES**:
   - If a line is hard to translate, still provide a translation (don't skip it)
   - Use placeholder translations like "..." or "[untranslatable]" if absolutely necessary
   - Never leave a line completely empty
   - **CRITICAL**: Always maintain the line count

9. **REPETITIVE OR SIMILAR LINES**:
   - Even if lines look similar, translate each one separately
   - Don't assume lines are identical - check carefully
   - Each line must have its own translation
   - **CRITICAL**: Preserve the exact number of repetitions

10. **EMPTY OR MINIMAL LINES**:
    - Empty lines: Keep as empty lines (just \n)
    - Single punctuation: Translate appropriately
    - Single words: Translate each word
    - **CRITICAL**: Don't merge minimal lines together

**QUALITY CONTROL CHECKLIST**:
- [ ] **CRITICAL**: Output has exactly ${lineCount} lines (count manually)
- [ ] **CRITICAL**: Each line corresponds to its original position (verify line by line)
- [ ] **CRITICAL**: No lines are missing or added (double-check)
- [ ] **CRITICAL**: All empty lines are preserved as empty lines
- [ ] **CRITICAL**: All repetitive lines are translated separately
- [ ] Translation is poetic and natural
- [ ] Vietnamese flows smoothly and musically
- [ ] **FINAL CHECK**: Re-count output lines before submitting

**SONG INFO**:
- Artist: ${artist}
- Title: ${title}

**OUTPUT FORMAT**:
- Respond with ONLY a single, raw JSON object
- Do NOT use markdown code fences
- JSON schema: {"vi": "translated_lyrics_with_\\n_for_newlines"}

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
			const mPhonetic = raw.match(/"phonetic"\s*:\s*"([\s\S]*?)"\s*[},]/);
			if (mVi || mRo || mPhonetic) {
				return { 
					romaji: decodeJsonString(mRo?.[1] || ""), 
					vi: decodeJsonString(mVi?.[1] || ""),
					phonetic: decodeJsonString(mPhonetic?.[1] || "")
				};
			}
		}
		if (parsed && (parsed.romaji !== undefined || parsed.vi !== undefined || parsed.phonetic !== undefined)) {
			return { 
				romaji: decodeJsonString(parsed.romaji), 
				vi: decodeJsonString(parsed.vi),
				phonetic: decodeJsonString(parsed.phonetic)
			};
		}
		// Fallback: treat entire text as Vietnamese and unescape \n
		const fallback = String(text || "").replace(/\\n/g, "\n");
		return { romaji: "", vi: fallback };
	}

	static async callGemini({ apiKey, artist, title, text, wantRomaji = false, wantSmartPhonetic = false }) {
		// Enhanced validation
		if (!apiKey?.trim()) throw new Error("Missing or invalid Gemini API key");
		if (!text?.trim()) throw new Error("No text provided for translation");

		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
		const prompt = Translator.buildGeminiPrompt({ artist, title, text, wantRomaji, wantSmartPhonetic });
		
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
