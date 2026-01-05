// Prompts.js - Centralized Prompt Engineering Logic

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

const Prompts = {
    styles: TRANSLATION_STYLES,
    pronouns: PRONOUN_MODES,

    buildGemma3Prompt({ artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default', wantSmartPhonetic = false }) {
        const lines = text.split('\n');
        const lineCount = lines.length;
        // Numbered list format for better line anchoring (prevents shifting)
        const numberedInput = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');

        if (wantSmartPhonetic) {
            return `Task: Phonetic Transcription (Karaoke System).
Total lines: ${lineCount}

Rules:
1. Output a NUMBERED LIST matching input line numbers exactly.
2. Transcription Standards:
   - Japanese: Hepburn Romaji with macrons (ā, ē, ī, ō, ū). Example: "東京" → "tōkyō"
   - Korean: Revised Romanization with word spacing. Example: "사랑해요" → "sarang haeyo"
   - Chinese: Pinyin with tone marks. Example: "我爱你" → "wǒ ài nǐ"
3. Keep punctuation/English unchanged.
4. Romanize sound effects (e.g., "Ah" not "Tiếng hét").
5. All lowercase, NO capitalization.
6. Numbers → romanized words: "2000" → "ni-sen" (JP), "i-cheon" (KR), "liǎngqiān" (CN)

Input (${lineCount} lines):
${numberedInput}

Output (${lineCount} lines, numbered 1-${lineCount}):`;
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

        let pronoun = "AUTO: Prefer neutral phrasing. If pronoun needed, keep consistent throughout.";
        if (pronounKey !== 'default' && PRONOUN_MODES[pronounKey]) {
            pronoun = `FORCE pronouns: "${PRONOUN_MODES[pronounKey].value}".`;
        }

        return `You are a Vietnamese Lyrics Adapter.
Song: "${artist} - ${title}"
Style: ${style}
Pronoun: ${pronoun}

CRITICAL: LINE-BY-LINE MAPPING
- Input has ${lineCount} numbered lines (1-${lineCount})
- Output MUST have exactly ${lineCount} numbered lines
- Line N input → Line N output. NEVER merge, split, or shift lines.

OUTPUT FORMAT (NUMBERED LIST):
1. [Vietnamese translation of line 1]
2. [Vietnamese translation of line 2]
...
${lineCount}. [Vietnamese translation of line ${lineCount}]

RULES:
1) Empty input line → empty output (just the number, e.g., "5. ")
2) Keep tags as-is: [Intro], [Chorus], (Instrumental)
3) Keep English phrases unchanged. Translate CJK to Vietnamese.
4) Map emotional interjections (e.g., 嗚呼, 呜呼, 아) to "Ah". Do NOT use archaic words like "Than ôi" or "Ôi". Keep vocal sounds (Yeah, La la, Oh) unchanged.
5) NO hallucination: Don't add imagery, emotions, or details not in source.
6) NO conversational fillers. Do NOT say "Here is the translation". Start directly with "1. ".
7) STRICTLY preserve line count. If line 5 is empty input, output "5. " (empty).

EXAMPLE (3-line input):
Input:
1. 君を愛してる
2. 
3. I love you

Output:
1. Anh yêu em
2. 
3. I love you

Input (${lineCount} lines):
${numberedInput}

Output (${lineCount} lines):`;
    },

    buildMinimalFallbackPrompt({ artist, title, text }) {
        const lines = text.split('\n');
        const linesJson = JSON.stringify(lines);
        return `Translate to Vietnamese. Output valid JSON Array of ${lines.length} strings. 1:1 mapping. No merging.
Input: ${linesJson}
Output JSON:`;
    },

    buildProxyVietnamesePrompt({ artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default' }) {
        const lines = text.split('\n');
        const lineCount = lines.length;

        const STYLE_INSTRUCTIONS = {
            "smart_adaptive": {
                role: `**ROLE:** You are a Vietnamese Lyrics Adapter. Your goal is natural equivalence: the Vietnamese line should carry the same weight as the source, without inventing new details.`,
                style: `**STRATEGY: "NUANCE OVER ADDITION"**
1) **Word choice > adjective stacking**:
   - Do NOT add emotion adjectives. Choose verbs/nouns that already imply the tone.
   - Bad: "Anh đi bộ buồn bã" → Good: "Anh lê bước"
   - Bad: "Nhìn chằm chằm đầy tình yêu" → Good: "Ngắm nhìn" / "dõi theo"

2) **Modern & natural Vietnamese**:
   - Prefer natural song vocabulary ("khát khao", "mơ mộng", "yêu thương").
   - Avoid stiff archaic Sino‑Vietnamese ("ngưỡng vọng", "ái tình") unless the source is explicitly classical.`,
                pronounSuggestion: null
            },

            "poetic_standard": {
                role: `**ROLE:** You are a Vietnamese lyricist. Make the Vietnamese singable and lyrical, but stay semantically faithful.`,
                style: `**STYLE (TIGHT):**
1) You MAY use lyrical phrasing via word choice and particles, but you MUST NOT invent new imagery or emotions.
2) Prefer poetic verbs/nouns (ngóng, mong, vương vấn) over adding extra descriptors.
3) Keep it smooth, not ornate.`,
                pronounSuggestion: "Anh - Em"
            },

            "youth_story": {
                role: `**ROLE:** You are translating a coming‑of‑age song (anime/indie). Keep it youthful and clear.`,
                style: `**STYLE (TIGHT):**
1) Prefer light, natural phrasing.
2) Preserve proper nouns / culture words as-is when needed.
3) Do NOT add new scenes/objects (rain, trains, sunsets) unless present in the source.`,
                pronounSuggestion: "Tớ - Cậu"
            },

            "street_bold": {
                role: `**ROLE:** You translate rap/rock with punchy Vietnamese while staying faithful.`,
                style: `**STYLE (TIGHT):**
1) Short, punchy, high-impact.
2) Prefer strong verbs/nouns over extra intensifiers.
3) Slang is allowed if it does NOT add new meaning.`,
                pronounSuggestion: "Tôi - Bạn"
            },

            "vintage_classic": {
                role: `**ROLE:** You translate classic songs with elegant Vietnamese while preserving meaning.`,
                style: `**STYLE (TIGHT):**
1) You MAY use Hán‑Việt vocabulary for tone (u hoài, thiên thu), but only if it matches the source meaning.
2) Do NOT invent new nature metaphors (moon, wind, dust) unless they exist in the source.`,
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
            pronounSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 PRONOUN MODE: ANALYZE & LOCK (CONSISTENT CREATIVITY) 🧠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**STEP 1: ANALYZE CONTEXT (AI DECISION)**
Scan the lyrics and determine the relationship dynamic:
1. **Relationship:** Lovers? Friends? Family? Rivals? Strangers?
2. **Tone:** Intimate? Formal? Aggressive? Nostalgic?
3. **Clues:** Look for "Aishiteru/Love" (Romance) vs "Tomodachi/Friend" (Platonic).

**STEP 2: SELECT & LOCK (CRITICAL RULE)**
Based on Step 1, select **ONE** primary pronoun pair and **STICK TO IT** for the entire song.
- **Romance:** Lock to "Anh - Em" (or "Em - Anh").
- **Friendship/Youth:** Lock to "Tớ - Cậu" (or "Mình - Cậu").
- **Conflict/Rap:** Lock to "Tao - Mày" (or "Tôi - Ông").
- **Solitary/General:** Lock to "Ta - Người" (or "Tôi - Người").

**STEP 3: AVOID "ROBOTIC" PHRASING**
- ⚠️ **AVOID "Tôi - Bạn"** unless the song is a formal letter or strictly detached. It sounds unnatural in Vietnamese music.
- **Preference:** If ambiguous between Friendship/Love, lean towards "Anh - Em" or "Tớ - Cậu" (Emotional) rather than "Tôi - Bạn" (Neutral).

**SUMMARY:** Analyze freely -> Pick ONE pair -> Use consistently 100%.
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

**🛡️ OUTPUT FORMAT (STRICT):**
1) Return ONLY valid JSON (no markdown, no code fences, no extra text).
2) Output MUST be a single JSON Object with key "translations".
3) "translations" MUST be an array of EXACTLY ${lineCount} strings.
4) Do not include any other keys.

**MAPPING RULES (STRICT):**
1) 1 source line = 1 output line. NEVER split, merge, or reorder lines.
2) Empty/whitespace-only source line -> output "" (empty string).
3) Keep tags/labels exactly as-is: [Intro], [Chorus], (Instrumental), etc.
4) CRITICAL: Mirror quotation marks (「」, "", '') EXACTLY.
   - If source has "「" start but NO "」" end -> Output must ALSO have "「" start and NO "」" end.
   - Do NOT auto-close quotes if the source line doesn't close them.
   - Preserve multi-line quote separation.

**TIGHT HYBRID GUARDRAILS (SEMANTIC PRECISION):**
1) NO new facts or imagery (rain, tears, sunsets, colors, places, extra events) unless explicitly present.
2) NO intensifiers unless explicit (don't add: rất/quá/thật/đầy/cực...).
3) NO emotion adjectives unless explicit (don't add: buồn bã/chán chường/cô đơn/đau đớn...).
4) Prefer nuanced verbs/nouns over adding descriptors.
5) Idioms & interjections ONLY: translate the function minimally (no extra emotion words).
6) No explanations. No parentheses like "(meaning: ...)".

**FLOW & PUNCTUATION:**
1) Avoid rigid "Người mà...". Use natural Vietnamese phrasing.
2) If a sentence continues to the next line, do NOT end the current line with a comma.
3) Map emotional interjections (嗚呼, 呜呼, 아) to "Ah". Do not use "Ôi"/"Than ôi". Keep vocal sounds (Yeah, La la, Oh, Ah) unchanged.
4) You may reorder phrases WITHIN a line for natural Vietnamese word order, but you MUST preserve meaning.`,

            user: `Translate lyrics to Vietnamese.

**Song:** ${artist} - ${title}

**Input (${lineCount} lines):**
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

**Output:** A single JSON object with key "translations" only. The "translations" value must be an array of exactly ${lineCount} Vietnamese strings.`
        };
    },

    buildProxyPhoneticPrompt({ artist, title, text }) {
        const lines = text.split('\n');
        const lineCount = lines.length;

        return {
            system: `**ROLE:** You are a fast phonetic transcription engine for Karaoke display.

**TRANSCRIPTION STANDARDS:**
- Japanese: Hepburn Romaji (ā, ē, ī, ō, ū for long vowels)
- Korean: Revised Romanization with spaces (sarang haeyo)
- Chinese: Pinyin with tone marks (wǒ ài nǐ)
- Mixed text: Romanize CJK, keep English as-is

**GOLDEN RULES (IMMUTABLE):**
1. Output MUST be JSON with key "phonetics".
2. "phonetics" MUST be array of EXACTLY ${lineCount} strings.
3. 1 source line = 1 romanized line. NEVER split/merge.
4. Empty lines → empty string "".
5. All lowercase. NO capitalization.
6. Keep punctuation and English unchanged.
7. Number translation: Convert numbers to romanized words (2000 → "ni-sen" JP, "i-cheon" KR, "liǎngqiān" CN).`,

            user: `Romanize lyrics for: "${artist} - ${title}"

**Input (${lineCount} lines):**
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

**Output:** JSON with key "phonetics" containing array of ${lineCount} romanized strings.`
        };
    }
};
