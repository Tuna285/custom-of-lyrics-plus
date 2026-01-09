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
        // Compact tag format for strict line anchoring (prevents merging/shifting)
        const taggedInput = lines.map((l, i) => `<${i + 1}>${l}</${i + 1}>`).join('\n');

        if (wantSmartPhonetic) {
            return `Task: Phonetic Transcription (Karaoke System).
Total lines: ${lineCount}

OUTPUT FORMAT:
<1>[romanized line 1]</1>
<2>[romanized line 2]</2>
...
<${lineCount}>[romanized line ${lineCount}]</${lineCount}>

Rules:
1. Output EXACTLY ${lineCount} numbered tags from <1> to <${lineCount}>.
2. Transcription Standards:
   - Japanese: Hepburn Romaji with macrons (ā, ē, ī, ō, ū). Example: "東京" → "tōkyō"
   - Korean: Revised Romanization with word spacing. Example: "사랑해요" → "sarang haeyo"
   - Chinese: Pinyin with tone marks. Example: "我爱你" → "wǒ ài nǐ"
3. Keep punctuation/English unchanged.
4. Romanize sound effects (e.g., "Ah" not "Tiếng hét").
5. All lowercase, NO capitalization.
6. Empty input → empty tag: <5></5>
7. Mirror quotation marks (「」, "", '') EXACTLY. Do NOT auto-close unclosed quotes.

Input (${lineCount} lines):
${taggedInput}

Output (${lineCount} tags):`;
        }

        const STYLE_DESC = {
            "smart_adaptive": {
                name: "Smart Adaptive",
                description: "Natural Vietnamese. You may REPHRASE metaphors/idioms to fit the context (e.g., 'plastic voice' → 'giọng hát vô hồn', NOT 'giọng nhựa'). Prioritize EMOTIONAL IMPACT over literal accuracy while keeping the original meaning.",
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
            const pair = PRONOUN_MODES[pronounKey].value.split(" - ");
            const first = pair[0]; // e.g., "Anh"
            const second = pair[1]; // e.g., "Em"
            pronoun = `PRONOUN LOCK (MANDATORY):
- First person (I/me/my) → "${first}"
- Second person (you/your) → "${second}"
- Example: "I love you" → "${first} yêu ${second}"
- DO NOT swap or use any other pronouns. This is a hard rule.`;
        }

        return `You are a Vietnamese Lyrics Adapter.
Song: "${artist} - ${title}"
Style: ${style}
Pronoun: ${pronoun}

CRITICAL: LINE-BY-LINE MAPPING
- Input has ${lineCount} lines in <N>...</N> tags
- Output MUST have exactly ${lineCount} matching tags
- <N> input → <N> output. NEVER merge, split, or skip lines.

OUTPUT FORMAT:
<1>[Vietnamese translation of line 1]</1>
<2>[Vietnamese translation of line 2]</2>
...
<${lineCount}>[Vietnamese translation of line ${lineCount}]</${lineCount}>

RULES:
1) Empty input → empty tag: <5></5>
2) Keep tags as-is: [Intro], [Chorus], (Instrumental)
3) Keep English phrases unchanged. Translate CJK to Vietnamese.
4) Map emotional interjections (嗚呼, 呜呼, 아) to "Ah". Do NOT use "Than ôi" or "Ôi".
5) NO hallucination: Don't add imagery, emotions, or details not in source.
6) Start directly with <1>. NO preamble text.
7) STRICTLY output ${lineCount} tags from <1> to <${lineCount}>.
8) Mirror quotation marks (「」, "", '') EXACTLY. Do NOT auto-close unclosed quotes.

EXAMPLE (3-line input):
Input:
<1>君を愛してる</1>
<2></2>
<3>I love you</3>

Output:
<1>Anh yêu em</1>
<2></2>
<3>I love you</3>

Input (${lineCount} lines):
${taggedInput}

Output (${lineCount} tags):`;
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
                role: `**ROLE:** You are a professional Vietnamese Songwriter & Adapter. Your goal is to **rewrite** the lyrics into Vietnamese so they sound like an authentic V-Pop song.
**CORE PRINCIPLE:** Prioritize **Emotional Impact** and **Flow** over literal dictionary definitions. If a literal translation sounds stiff or weird in Vietnamese, you MUST rephrase it to capture the *feeling*.`,
                style: `**STRATEGY: "TRANSCREATION > TRANSLATION"**
1) **Handle Metaphors intelligently (CRITICAL):**
   - NEVER translate idioms/metaphors word-for-word if they sound unnatural.
   - *Example 1:* "Plastic love/voice"
     - ❌ BAD: "Tình yêu nhựa" / "Giọng nói nhựa" (Nonsense)
     - ✅ GOOD: "Tình yêu giả tạo" / "Thanh âm vô hồn"
   - *Example 2:* "Same temperature"
     - ❌ BAD: "Cùng một nhiệt độ" (Sounds like physics)
     - ✅ GOOD: "Hơi ấm tương đồng" (Poetic interpretation)

2) **Vocabulary Selection:**
   - Use poetic/musical vocabulary ("Hành trang" instead of "Hành lý" if fitting).
   - Avoid "Google Translate" style phrasing.
   - *Example:* "Too much luggage to get through the night" -> "Hành trang quá nặng nề để vượt qua đêm thâu".

3) **Sentence Structure:**
   - Don't just translate Subject-Verb-Object rigidly.
   - Feel free to inversion (đảo ngữ) for emphasis (e.g., "Lạnh giá nơi này" sounds better than "Nơi này lạnh giá").`,
                pronounSuggestion: null
            },

            "poetic_standard": {
                role: `**ROLE:** You are a Poet & Lyrical Adapter. Your goal is to make the Vietnamese lyrics sound beautiful, romantic, and singable.`,
                style: `**STRATEGY: "POETIC IMAGERY"**
1) **Vocabulary:** Use "Musically poetic" words.
   - *Examples:* "Vương vấn" (lingering), "Tương tư" (longing), "Ngóng chờ" (awaiting).
   - "Sky" -> "Bầu trời" or "Khoảng trời" depending on mood.
   - "Miss you" -> "Nhớ thương" / "Hoài mong".

2) **Flow & Rhythm:**
   - Avoid dry/logical sentences. Use particles like "nhé, hỡi, a, ư" naturally.
   - *Constraint:* Do NOT be cheesy (sến). Keep it elegant.`,
                pronounSuggestion: "Anh - Em"
            },

            "youth_story": {
                role: `**ROLE:** You are a Storyteller for Anime/Indie music. Your goal is to translate a "Coming-of-age" story.`,
                style: `**STRATEGY: "SLICE OF LIFE"**
1) **Tone:** Youthful, direct, sincere, and slightly nostalgic.
   - Avoid complex Sino-Vietnamese words. Use pure Vietnamese (Thuần Việt).
   - *Examples:* "Thanh xuân", "Rực rỡ", "Ngốc nghếch".

2) **Imagery:**
   - Preserve specific nouns (School, Train, Sunset, Uniform) as they are core to the genre.
   - *Example:* "After school" -> "Tan trường", "On the way home" -> "Đường về".`,
                pronounSuggestion: "Tớ - Cậu"
            },

            "street_bold": {
                role: `**ROLE:** You are a Rapper/Hip-hop Adapting Specialist. Your goal is ATTITUDE and FLOW.`,
                style: `**STRATEGY: "IMPACT & RHYTHM"**
1) **Vocabulary:** Strong, punchy, colloquial.
   - Use current slang if appropriate (but not cringe).
   - *Example:* "I don't care" -> "Kệ xác", "Mặc kệ", "Chẳng quan tâm".
   - Avoid polite particles (ạ, dạ, thưa) unless sarcastic.

2) **Structure:**
   - Short sentences. Drop unnecessary pronouns if the subject is clear to increase speed.
   - Focus on the rhyme scheme sensation (even if you can't rhyme perfectly in translation, keep the rhythm).`,
                pronounSuggestion: "Tao - Mày"
            },

            "vintage_classic": {
                role: `**ROLE:** You are a Classic Songwriter (Nhạc Trịnh/Bolero style). Your goal is ELEGANCE and TIMELESSNESS.`,
                style: `**STRATEGY: "CLASSICAL ELEGANCE"**
1) **Vocabulary:** High usage of Sino-Vietnamese (Hán Việt) is encouraged for atmosphere.
   - "Sadness" -> "U hoài", "Sầu bi".
   - "Forever" -> "Thiên thu", "Vạn kiếp".
   - "Love" -> "Ái tình", "Tình duyên".

2) **Tone:** Formal, slow, contemplative.
   - Avoid modern slang absolutely.`,
                pronounSuggestion: "Ta - Người"
            },

            "literal_study": {
                role: `**ROLE:** You are a Linguistics Professor. Goal is EDUCATIONAL ACCURACY.`,
                style: `**STRATEGY: "STRICT PRECISION"**
1) **Principle:** Translate EXACTLY what is written.
   - NO rewording for flow.
   - NO changing metaphors.
   - *Example:* "Plastic love" -> "Tình yêu nhựa" (Correct for this mode).
   - *Example:* "It's raining cats and dogs" -> "Trời mưa chó và mèo" (Add note: "Idiom for heavy rain" if possible, otherwise literal).

2) **Purpose:** Help the user understand the grammatical structure of the original language.`,
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
            const pair = PRONOUN_MODES[pronounKey].value.split(" - ");
            const first = pair[0]; // e.g., "Anh"
            const second = pair[1]; // e.g., "Em"
            pronounSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRONOUN OVERRIDE (MANDATORY - HIGHEST PRIORITY) 🔒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRONOUN LOCK (MANDATORY):
- First person (I/me/my) → "${first}"
- Second person (you/your) → "${second}"
- Example: "I love you" → "${first} yêu ${second}"
- DO NOT swap or use any other pronouns. This is a hard rule.
- If monologue (no second person), use only "${first}".
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
7. Number translation: Convert numbers to romanized words (2000 → "ni-sen" JP, "i-cheon" KR, "liǎngqiān" CN).
8. Mirror quotation marks (「」, "", '') EXACTLY. Do NOT auto-close unclosed quotes.`,

            user: `Romanize lyrics for: "${artist} - ${title}"

**Input (${lineCount} lines):**
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

**Output:** JSON with key "phonetics" containing array of ${lineCount} romanized strings.`
        };
    }
};
