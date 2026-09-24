// Prompts.js - Centralized Prompt Engineering Logic

const TRANSLATION_STYLES = {
    "smart_adaptive": { name: "Smart Adaptive (Recommended)", description: "AI auto-detects genre & delivers faithful lyrical translation." },
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

const STYLE_INSTRUCTIONS = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator. Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative Vietnamese.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
Prioritize Semantic & Imagery Fidelity together with Natural Poetic Cadence. The listener reads your subtitles while listening to the original audio in real time. NEVER domesticate, censor, or flatten foreign songs into generic Vietnamese acoustic ballad / indie pop tropes. Never distort meaning, drop core symbols, or fabricate filler details to force a rhyme.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & TEMPORAL CADENCE"
1) Natural Prosody & Vocal Breath (Thay vì đếm âm tiết cơ học):
   - Create natural, evocative Vietnamese lyric phrasing that breathes with the original song's emotional pacing.
   - Never translate a short, punchy original line into an overly wordy sentence.
   - Match the song's energy and artistic intent: maintain raw intensity for rock/alt, introspective restraint for indie/literature, and dynamic punch for electronic. It DOES NOT mean altering the original text or dropping words to match foreign syllable counts.

2) Symbolic Anchor & Zero Hallucination (Bảo toàn hình tượng & Không bịa đặt):
   - Sacred Visual Imagery: If the source highlights a specific concrete image (e.g., "tấm lưng" - 背中, "đèn đuôi xe", "đêm mưa", "ngã tư", "pháo hoa"), that symbol MUST be preserved in the translation. NEVER discard a central motif just to make a rhyme.
   - Zero Hallucination: Do NOT invent extra actions, storylines, or fake emotional declarations not found in the original lyrics.

3) Natural Vocabulary & Subject-Predicate Flow:
   - Prefer natural, emotionally resonant modern Vietnamese vocabulary. Avoid heavy, stiff, or archaic Sino-Vietnamese (Hán-Việt) terms unless requested.
   - Coherent Subject-Predicate Flow: Preserve clear actor-action relationships. Do NOT drop subjects arbitrarily so that lines become floating, severed verb phrases without a clear actor.
   - Avoid mechanical repetition of pronouns on every line, but ALWAYS maintain grammatical clarity on who is feeling or acting.

4) CJK & J-Pop Narrative, Grammar & Enjambment:
   - Identify character dynamics and persona (Boku/Kimi -> Tớ-Cậu / Anh-Em; Watashi/Anata -> Em-Anh / Tớ-Cậu (hoặc Mình-Cậu); Ore/Omae -> Anh-Em / Tao-Mày). Maintain locked persona throughout.
   - Japanese/Korean modify nouns before the noun (連体修飾) and often spread one sentence across multiple lines (enjambment). Ingest the full multi-line sentence before translating so each line feels natural and connected, not broken or nonsensical.
   - Accurately decode cultural subtext and imagery (seasonal motifs, fleeting youth, unexpressed feelings) rather than literal dictionary glosses.

5) Metaphors & Imagery Transcreation:
   - Never translate foreign idioms literally if they lose meaning ("Plastic love" -> "Tình giả dối", "Same temperature" -> "Hơi ấm tương đồng").
   - Rhyme is welcome ONLY when it occurs naturally without altering meaning. Forced end-rhyme that sacrifices meaning or imagery is strictly forbidden.`,
        pronounSuggestion: null
    },

    "poetic_standard": {
        role: `You are a Poet & Lyrical Adapter. Your goal is to make the Vietnamese lyrics sound beautiful, romantic, and singable.`,
        style: `STRATEGY: "POETIC IMAGERY"
1) Vocabulary: Use "Musically poetic" words.
   - Examples: "Vương vấn" (lingering), "Tương tư" (longing), "Ngóng chờ" (awaiting).
   - "Sky" -> "Bầu trời" or "Khoảng trời" depending on mood.
   - "Miss you" -> "Nhớ thương" / "Hoài mong".

2) Flow & Rhythm:
   - Avoid dry/logical sentences. Use particles like "nhé, hỡi, a, ư" naturally.
   - Constraint: Do NOT be cheesy (sến). Keep it elegant.`,
        pronounSuggestion: "Anh - Em"
    },

    "youth_story": {
        role: `You are a Storyteller & Lyricist specializing in Anime, J-Pop, and Youth/Coming-of-Age music. Your goal is to transcreate the lyrics into vibrant, heartfelt Vietnamese that captures the youthful narrative and emotional subtext.`,
        style: `STRATEGY: "YOUTH NARRATIVE & CULTURAL SUBTEXT"
1) Tone & Persona:
   - Youthful, sincere, introspective, and nostalgic.
   - Japanese Pronoun Anchoring: Recognize character relationships from pronouns:
     * 僕 (Boku) / 君 (Kimi): Gentle, introspective youth/friendship/innocent romance -> Translate as "Tớ - Cậu" (or "Anh - Em" for clear romance).
     * 私 (Watashi) / あなた (Anata): Mature, polite or female perspective -> "Em - Anh" or "Tớ - Cậu" (or "Mình - Cậu").
     * 俺 (Ore) / お前 (Omae): Direct, bold youth/rivalry -> "Anh - Em", "Tao - Mày" or "Tớ - Cậu".
   - Maintain absolute consistency in pronoun persona across the entire track.

2) Enjambment & Relative Clauses (Mệnh đề bổ nghĩa & Câu vắt dòng):
   - Japanese often places long modifying clauses before nouns (連体修飾) and splits a single grammatical sentence across 2 or more lyric lines.
   - Grasp the entire sentence meaning before translating each line. Ensure natural Vietnamese clause ordering without producing dangling, incomplete, or grammatically severed phrases.

3) J-Pop Metaphors & Cultural Subtext:
   - Decode cultural motifs naturally:
     * 桜 (sakura/cherry blossom) -> season of graduation, youth parting, new beginnings.
     * 花火 (hanabi/fireworks) -> fleeting summer youth, ephemeral romance.
     * 青い (aoi/blue) -> innocence, youth, inexperience.
     * 茜色 (akane-iro/madder red dusk) -> nostalgic sunset, yearning.
     * 雨 (ame/rain) -> unspoken sorrow, solitude, tears.
   - Transcreate onomatopoeia/mimetic words (Gitaigo/Giongo) into vivid, musical Vietnamese verbs/adjectives (e.g. ぎゅっと -> ôm chặt/siết nhẹ, ふわり -> nhẹ trôi/bồng bềnh, ドキドキ -> xốn xang/thổn thức, ざらざら -> thô ráp/xót xa) rather than clumsy literal descriptions.

4) Vocabulary Balance:
   - Use accessible, emotional pure-Vietnamese and common musical terms ("thanh xuân", "rực rỡ", "ngốc nghếch").
   - Avoid heavy, archaic, or stiff Sino-Vietnamese (avoid: "u hoài", "thiên thu", "ái tình", "sầu bi").`,
        pronounSuggestion: "Tớ - Cậu"
    },

    "street_bold": {
        role: `You are a Rapper/Hip-hop Adapting Specialist. Your goal is ATTITUDE and FLOW.`,
        style: `STRATEGY: "IMPACT & RHYTHM"
1) Vocabulary: Strong, punchy, colloquial.
   - Use current slang if appropriate (but not cringe).
   - Example: "I don't care" -> "Kệ xác", "Mặc kệ", "Chẳng quan tâm".
   - Avoid polite particles (ạ, dạ, thưa) unless sarcastic.

2) Structure:
   - Short sentences. Drop unnecessary pronouns if the subject is clear to increase speed.
   - Focus on the rhyme scheme sensation.`,
        pronounSuggestion: "Tao - Mày"
    },

    "vintage_classic": {
        role: `You are a Classic Songwriter (Nhạc Trịnh/Bolero style). Your goal is ELEGANCE and TIMELESSNESS.`,
        style: `STRATEGY: "CLASSICAL ELEGANCE"
1) Vocabulary: High usage of Sino-Vietnamese (Hán Việt) is encouraged.
   - "Sadness" -> "U hoài", "Sầu bi".
   - "Forever" -> "Thiên thu", "Vạn kiếp".
   - "Love" -> "Ái tình", "Tình duyên".

2) Tone: Formal, slow, contemplative.
   - Avoid modern slang absolutely.`,
        pronounSuggestion: "Ta - Người"
    },

    "literal_study": {
        role: `You are a Linguistics Professor. Goal is EDUCATIONAL ACCURACY.`,
        style: `STRATEGY: "STRICT PRECISION"
1) Principle: Translate EXACTLY what is written.
   - NO rewording for flow.
   - NO changing metaphors.
   - Example: "Plastic love" -> "Tình yêu nhựa" (Correct for this mode).
   - Example: "It's raining cats and dogs" -> "Trời mưa chó và mèo" (Add note: "Idiom for heavy rain" if possible, otherwise literal).

2) Purpose: Help the user understand the grammatical structure of the original language.`,
        pronounSuggestion: "Tôi - Bạn"
    }
};

/** Shared: tag + JSON phonetic prompts */
const PHONETIC_ROLE = `You are a precise phonetic transcription engine for karaoke / sing-along. Transliterate pronunciation only—never translate meaning or add glosses.`;

const PHONETIC_TRANSCRIPTION_STANDARDS = `TRANSCRIPTION STANDARDS (follow strictly; stay consistent within the song):

[ZERO UNTRANSLITERATED CJK LAW — CRITICAL]:
- Every single Kanji, Hiragana, Katakana, and Hangul character MUST be transliterated into Latin alphabet characters.
- NEVER leave untransliterated CJK characters in the output (e.g., leaving "くれ" or "愛" instead of "kure" / "ai").
- The output text must contain 0% CJK characters.

JAPANESE — Modified Hepburn (lyric/karaoke style)
- Use macrons for long vowels when standard: ā ē ī ō ū (e.g. tōkyō, kōen). For おう / おお / うう patterns, prefer ō / ū over ou/uu when the vowel is clearly long in singing.
- Katakana prolonged sound ー: lengthen the preceding vowel (e.g. ゲーム → gēmu).
- Sokuon っ: double the next consonant (がっこう → gakkō; いっぽん → ippon).
- Sokuon っ representing a glottal stop or sharp cut-off at the end of a word or line: transcribe as an apostrophe ' (e.g. あっ → a', 痛っ → ita').
- Nasal ん (n): always romanize as 'n'. If followed by a vowel (a, i, u, e, o) or semi-vowel 'y' (ya, yu, yo), insert an apostrophe (e.g. shin'ya, hon'yaku) to avoid blending with the next syllable (e.g. shinya -> しにゃ).
- Particles (when written as は / へ / を): wa / e / o respectively.
- Transcribe ぢ (ji) and づ (zu) based on pronunciation as 'ji' and 'zu' (not 'di', 'du', or 'dji', 'dzu').
- Small kana ゃゅょ: yōon as units (きゃ kya, しゃ sha, ぎゃ gya—not *kiya).
- Kanji & Ateji/Giga readings (CRITICAL): Pay attention to artistic readings in Japanese lyrics. If a Kanji is artistically meant to be read differently (e.g., 宇宙 read as sora, 今日 read as ima, or 地球 read as hoshi), use the sung pronunciation (Ateji/Giga) rather than the standard dictionary reading. Pick readings that fit the song's context.

KOREAN — Revised Romanization of Korean (2000), lowercase
- Space-separated words. If the source has no spaces, split at natural word/phrase boundaries for sing-along (readable chunks, not one giant unspaced syllable string).
- Pronoun 네가 (you): Always romanize as "niga" (matching the sung pronunciation to distinguish it from 내가 "naega" -> I/me).
- Possessive particle 의: Romanize as "e" when functioning as possessive and pronounced as "e" in the track.
- Apply standard batchim, liaison, and assimilation rules for singable flow:
  * Liaison: batchim consonant followed by a vowel moves to that vowel's syllable (e.g. 있어요 → isseoyo, 읽어 → ilgeo, 같이 → gachi, 꽃i → kkochi).
  * Nasalization: ㅂ/ㅍ before ㄴ/ㅁ → m (e.g. 십년 → simnyeon); ㄷ/ㅅ/ㅈ/ㅊ/ㅌ before ㄴ/ㅁ → n (e.g. 있는 → inneun); ㄱ/ㅋ/ㄲ before ㄴ/ㅁ → ng (e.g. 국물 → gungmul).
  * Liquid assimilation: ㄴ before or after ㄹ → l (e.g. 신라 → silla, 칼날 → kallal).
  * Palatalization: ㄷ followed by 이 → ji (e.g. 굳이 → guji); ㅌ followed by 이 → chi (e.g. 같이 → gachi).
  * Final consonants (when not followed by vowel): ㄷ, ㅅ, ㅈ, ㅊ, ㅌ, ㅎ → t (e.g. 꽃 → kkot); ㅂ, ㅍ → p (e.g. 앞 → ap); ㄱ, ㅋ, ㄲ → k (e.g. 책 → chaek).
- Do not invent English; romanize Hangul only.

CHINESE — Hànyǔ Pīnyīn with tone marks
- Place tone marks on the nucleus vowel per standard rules (priority: a > o > e; with iu use mark on u; with ui on i).
- Neutral tone (轻声): Do not add tone marks to neutral tone syllables (e.g. de for possessive 的, ma for question 吗, ba for suggestion 吧, zhe for 着).
- For 多音字 (polyphonic characters like 得, 地, 和, 行), choose the reading and tone that fits the phrase in context; keep tones accurate for singing.
- For "一" (yī) and "不" (bù), apply tone sandhi rules based on actual sung pronunciation.
- ü after j/q/x; y/w where pinyin requires them.

MIXED & SYMBOLS
- Romanize CJK; leave plain Latin/English words as-is (case unchanged per line rules below).
- Arabic digits: read aloud per the dominant script on that fragment (JP: Japanese reading, KR: Sino-Korean or native per convention, CN: Mandarin)—use hyphens between digit-groups if needed (e.g. 2000 → ni-sen / i-cheon / liǎngqiān style).
- Keep structural punctuation and brackets as in the source: 【】「」『』() [] — romanize only the text inside quotes/brackets.
- Interjections and fillers (ああ, らら, ララ, 어어): romanize phonetically; keep imported English interjections (Yeah, Oh) unchanged.`;

/**
 * Builds the pronoun instructions section of the prompt.
 * @param {string} pronounKey - The chosen pronoun key
 * @param {object} styleObj - The style configuration object
 * @param {string} [artist=""] - Artist name for persona & gender anchoring
 * @param {string} [title=""] - Song title for context
 * @returns {string}
 */
function buildPronounSection(pronounKey, styleObj, artist = "", title = "") {
    if (pronounKey === "default") {
        const trackContext = (artist || title) ? `Track Context: "${artist}${title ? ` - ${title}` : ''}"` : '';
        return `
PRONOUN & RELATIONSHIP SELECTION (LYRICS-FIRST & NARRATIVE-DRIVEN):
${trackContext ? `${trackContext}\n` : ''}
CORE PRINCIPLE: In Vietnamese music, pronouns define the emotional soul and authenticity of the song. Understand the ENTIRE song lyrics, story, and relationship dynamic first to select the natural persona:

1) ROMANCE & LOVE SONGS (Love, longing, heartbreak, romantic confession, couples):
- In Vietnamese songs, romance MUST ALWAYS use natural couple pronouns: "Anh - Em" or "Em - Anh" (or "Tớ - Cậu" for youth/school romance).
- Vocal Perspective:
  * Female singer addressing a partner -> "Em - Anh" (First-person: "Em", Second-person: "Anh").
    (Note: In Japanese lyrics, female singers often use "僕" (boku) poetically; translate as "Em - Anh", not "Anh").
  * Male singer addressing a partner -> "Anh - Em" (First-person: "Anh", Second-person: "Em").
  * If the artist gender is unknown or ambiguous -> Default to standard Vietnamese lyrical convention: "Anh - Em".
- ABSOLUTE BAN ON "TÔI YÊU BẠN": In any love song or romantic line, NEVER translate "I love you" / "君が好き" / "사랑해" as "Tôi yêu bạn" or "Tôi nhớ bạn". This sounds robotic and completely unmusical in Vietnamese songs.

2) OTHER GENRES & RELATIONSHIPS:
- Youth / School / Camaraderie / Anime: Use "Tớ - Cậu" or "Mình - Cậu".
- Introspective Monologue (Solitary reflection, existential despair, no partner addressed): Use "Ta" or "Tôi" (keep subjects implicit where natural).
- Street / Rap / Hip-Hop / Diss: Use "Tao - Mày".
- True Duets (Clear alternating male and female singing lines): Male parts use "Anh - Em", female parts use "Em - Anh".

3) SINGLE PERSONA LOCK (MANDATORY):
- Choose EXACTLY ONE pronoun pair for the entire track and LOCK IT consistently from the first line to the last line.
- NEVER mix, swap, or alternate personas across different verses, choruses, or lines.

4) RESPECT SCENERY & NO-PRONOUN LINES:
- Do NOT force pronouns into lines that have none (pure imagery, weather, scenery like "bầu trời xanh", "đêm mưa rơi"). Maintain natural Subject-Verb-Object clarity on action lines.
`;
    }
    if (pronounKey && PRONOUN_MODES[pronounKey] && PRONOUN_MODES[pronounKey].value) {
        const pair = PRONOUN_MODES[pronounKey].value.split(" - ");
        const first = pair[0];
        const second = pair[1];
        return `
PRONOUN LOCK (MANDATORY — HIGHEST PRIORITY):
- First person (I/me/my/tôi) → "${first}"
- Second person (you/your/bạn) → "${second}"
- Example: "I love you" → "${first} yêu ${second}"
- DO NOT swap or use any other pronouns. This is a hard rule.
- If monologue (no second person), use only "${first}".
- DO NOT force pronouns into purely scenery lines, noun phrases, or impersonal descriptions where no pronoun exists in the original.
- Maintain coherent grammatical subject-predicate agreement across all lines. Do NOT produce dangling or subjectless fragments.
`;
    }
    if (styleObj.pronounSuggestion) {
        return `PRONOUNS: Suggest "${styleObj.pronounSuggestion}" (flexible based on context).\n\n`;
    }
    return "";
}

/**
 * Builds the translation guardrails section of the prompt.
 * @returns {string}
 */
function buildTranslationGuardrails() {
    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Before translating line by line, you MUST ingest the entire lyrics from the first line to the last line as a unified emotional story:
1. Understand the Story Arc: Grasp the narrative journey (Intro/Verse context -> Chorus emotional climax -> Outro resolution).
2. Contextual Cohesion: Every individual line MUST harmonize with the overarching story. Never translate lines in isolation or produce disconnected sentence fragments.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs: Core visual symbols, metaphors, and titular imagery (e.g., "tấm lưng" - 背中, "đèn đuôi xe", "đêm mưa", "ngã tư", "pháo hoa") MUST be 100% preserved. Never omit or substitute them for the sake of rhyme or meter.
2. Zero Hallucination & Filler: Do NOT inject invented storylines, secondary actions, or clichéd fillers ("người hỡi", "em ơi", "trong đêm vắng") not present in the source text.
3. Meaning Over Rhyme: Rhyme is secondary; poetic meaning and imagery are supreme. Never compromise the author's message or emotional intent for an end-rhyme.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: Absolutely DO NOT rewrite the song in the style of generic Vietnamese acoustic ballad / indie pop (e.g., do NOT turn Japanese rock/indie lyrics into melancholy V-Pop clichés like "buông tiếng thở dài", "lạc lối giữa đời", "vương vấn tình ta"). DO NOT use the tropes of translated Chinese web novels, Wuxia, Xianxia, or literal textbook translations.
2. TARGET PERSONA: You are an expert Lyrical Subtitle Translator channeling the ORIGINAL ARTIST's unique voice, world, and literary style. Preserve the author's exact tone—whether raw, existential, detached, frantic, or bittersweet.
3. BAN ON MECHANICAL "TÔI - BẠN" IN ROMANCE: In love songs and intimate emotional lyrics, NEVER translate romantic lines into "Tôi yêu bạn" or "Tôi nhớ bạn". It sounds robotic and destroys emotional intimacy. Use organic relationship pairs: "Anh - Em", "Em - Anh", or "Tớ - Cậu". ("Tôi - Bạn" is only acceptable for public/educational contexts or when explicitly selected by the user).
4. HARD BAN ON FORBIDDEN AI TICS: Absolutely NEVER use "chao nghiêng" (hoặc "khẽ chao nghiêng") and "khẽ khàng" under any circumstances. These are forbidden lazy clichés. Use natural, grounded words instead (e.g. lững lờ, chao đảo, nghiêng ngả, nhẹ nhàng, lặng lẽ, khẽ).

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
When words, phrases, or chants are repeated in the source (whether within the same line like "ano kaze ano kaze", "itai itai itai", "aoi aoi aoi", "fukaku fukaku", or across adjacent lines):
1. Exact Lexical Repetition: You MUST replicate the exact same repetition using the exact same Vietnamese word ("Cơn gió ấy, cơn gió ấy"; "Đau đớn, đau đớn, đau đớn"; "Xanh thẳm, xanh thẳm, xanh thẳm"; "Sâu thẳm, sâu thẳm").
2. NO Synonym Substitution: NEVER substitute synonyms to avoid repetition (e.g., FORBIDDEN to change "cơn gió ấy, cơn gió ấy" into "cơn gió ấy, làn gió ấy"). The listener hears identical words and expects identical visual subtitles.
3. NO Collapsing or Omission: NEVER collapse repeated chants into a single occurrence.
4. NO Dangling Tails / Padding: NEVER push repeated words to the end of a line as trailing stubs (e.g., "..., phía trước") or invent extra words ("..., cơn say") to fill meter.

[TEMPORAL PROGRESSION & TOPIC-COMMENT (DỊCH XUÔI DÒNG THỜI GIAN)]
1. Left-to-Right Temporal Sync: The listener reads subtitles while listening in real time. The order of ideas in the translation MUST follow the audio's progression from left to right as closely as Vietnamese grammar allows.
2. Topic-Comment Structure (Khởi ngữ): For Japanese/Korean lines where the topicalized noun/object comes first (e.g. "行く末を 行く末を 越えてゆくことが今"), place the topic at the beginning of the Vietnamese sentence ("Tương lai ấy, tương lai ấy, giờ đây ta sẽ vượt qua"). NEVER invert the sentence in a way that drags the repeated topic into a dangling comma fragment at the tail.
3. Imagery Integrity: Preserve the original intensity and visceral impact of the artist's actions without over-dramatizing or softening them.

[MASTERCLASS EXEMPLARS (FEW-SHOT)]
- Example 1 (Visceral Actions — No Ballad Softening): 転んで足元つばを吐いた -> Vấp ngã rồi nhổ một bãi nước bọt xuống chân. (Preserve the raw visceral frustration; NEVER soften into polite clichés like 'buông tiếng thở dài').
- Example 2 (Repetition Fidelity & Audiovisual Sync): あの風 あの風 懐かしいとお前が言った -> Cơn gió ấy, cơn gió ấy, cậu bảo rằng thật hoài niệm. (Keep exact word repetition so ear and eye align).
- Example 3 (Topic-Comment / Avoiding Dangling Tails): 行く末を 行く末を 越えてゆくことが今 -> Tương lai ấy, tương lai ấy, giờ đây ta sẽ vượt qua. (Use topic-comment; NEVER invert into a broken tail like 'vượt qua, phía trước').
- Example 4 (Chant Preservation): 痛い 痛い 痛い -> Đau đớn, đau đớn, đau đớn. / 青い 青い 青い -> Xanh thẳm, xanh thẳm, xanh thẳm. (Preserve the 3-beat emotional chant 100%).
- Example 5 (Restraint on Surreal Imagery): 雀の啄む逆さ富士 -> Đàn sẻ nhỏ mổ xuống bóng Phú Sĩ in ngược.`;
}

/**
 * Builds the flow and punctuation section of the prompt.
 * @returns {string}
 */
function buildTranslationFlowPunctuation() {
    return `FLOW & PUNCTUATION:
1) Use natural Vietnamese phrasing that flows left-to-right with the singing rhythm.
2) If a sentence continues to the next line (Enjambment), do NOT end the current line with a comma.
3) Map emotional interjections to "Ah". Do not use "Ôi". Keep vocal sounds (Yeah, La la, Oh, Ah) unchanged.
4) Do NOT create dangling fragments or trailing comma-stubs at the end of lines.`;
}

/**
 * Builds thinking-process rules calibrated to the user-chosen reasoning effort.
 *
 *   off / low   → "budget" set: strict anti-redraft rules. Designed for weaker or
 *                  no-budget thinking models (Gemma 4 31B, local 7-13B) that tend to
 *                  spin Pass 3 / Pass 4 audits and burn tokens without adding quality.
 *   medium      → "balanced" set: keep output hygiene + the targeted-revision / no-redraft
 *                  rules, but drop the "trust first instinct / short deliberation" nudge so
 *                  the model is free to deliberate before committing.
 *   high        → "unleashed" set: only output hygiene (tag format, single final reply,
 *                  direct-from-source). No restrictions on reasoning depth, revision passes,
 *                  or re-examining lines — top-tier models on high effort should be allowed
 *                  to use their full thinking budget.
 * @param {string} finalOutputLabel - The name of the final output format (e.g. "JSON object" or "tags")
 * @param {"off" | "low" | "medium" | "high"} effort - Reasoning effort level
 * @param {string} [langName="Vietnamese"] - Target language name
 * @returns {string}
 */
function buildTaskThinkingRules(finalOutputLabel, effort = "low", langName = "Vietnamese") {
    const hygiene = `1) Visible reply must be ONLY the required ${finalOutputLabel}. No filler, no commentary.
2) Do not output draft lines in the final output. The final output must start directly with the translation tags or JSON object.
3) The final ${finalOutputLabel} must appear once and comprise the entire message.
4) Translate the source DIRECTLY to ${langName}.
5) **DELIVERABLE POSITION & TAGGING — CRITICAL.** If you output any reasoning, you MUST wrap it entirely inside <thought>...</thought> tags at the very beginning of your response. NEVER place translation tags inside <thought>...</thought>.`;

    if (effort === "off") {
        return `THINKING PROCESS RULES (STRICT — NO DELIBERATION):
${hygiene}
6) Skip deliberation entirely. Write the ${finalOutputLabel} immediately.`;
    }

    const depthStr = effort === "high" ? "Deep Deliberation" : (effort === "medium" ? "Medium Effort" : "Concise Planning");

    return `THINKING PROCESS RULES (${depthStr}):
${hygiene}

[PRE-FLIGHT REASONING GUIDE (CONCISE)]
In <thought>, outline in 1-2 brief sentences the song narrative and relationship dynamic, singer gender/POV, locked pronoun pair (e.g., Em-Anh for female singer in romance, Anh-Em for male singer in romance, Tớ-Cậu for youth/friendship), and anchor core imagery/motifs (never drop key symbols or force end-rhyme that alters meaning).
*Strict Constraint:* Keep reasoning ultra-concise (< 60 words). Never list lines, draft line-by-line translations, or write long essays in thought. Start outputting translation tags/JSON immediately after </thought>.`;
}

/**
 * Builds the thinking process rules for phonetic transcription.
 * @param {string} finalOutputLabel - The name of the final output format
 * @returns {string}
 */
function buildPhoneticTaskThinkingRules(finalOutputLabel, effort = "low") {
    const hygiene = `1) Visible reply must be ONLY the required ${finalOutputLabel}. No filler, no commentary, no thinking.
2) Do not output chain-of-thought, scratchpad lists, or draft lines in the final output. The final output must start directly with the transcription tags (or JSON object) unless reasoning is active.
3) The final ${finalOutputLabel} must appear once and comprise the entire message.
4) Do not translate, explain, or add parentheses/notes—romanization only.
5) Produce the romanization/transcription for each line ONCE in the FINAL REPLY.
6) **DELIVERABLE POSITION & TAGGING — CRITICAL.** If you output any reasoning, thinking process, or planning in the main response stream, you MUST wrap it entirely inside <thought>...</thought> tags at the very beginning of your response, and close </thought> before writing the first tag (e.g. <1>). NEVER place transcription tags inside <thought>...</thought>. If your model has a native reasoning channel (where thoughts are sent separately from the response content), use that and start your main reply directly with the first tag/JSON without any preamble.
7) **NO LINE-BY-LINE DRAFTS IN REASONING:** Absolutely DO NOT write draft transliterations, list romanized lines, or draft specific line transcriptions inside the reasoning block. Keep your reasoning to a general, high-level overview (script rules, language detection, custom readings) in 2-4 sentences max. The actual romanized lines must ONLY appear in the final tags/JSON.`;

    if (effort === "off") {
        return `PHONETIC OUTPUT DISCIPLINE (STRICT — NO DELIBERATION):
1) Visible reply must be ONLY the required ${finalOutputLabel}. No filler, no commentary, no thinking.
2) Do not output chain-of-thought, scratchpad lists, or reasoning tags in the reply.
3) Skip deliberation entirely. Write the ${finalOutputLabel} immediately.`;
    }

    return `PHONETIC REASONING GUIDE:
Use your thinking space to plan the romanization/transcription:
1. **Script Detection:** Confirm the source language (Japanese, Korean, or Chinese) and the corresponding transcription system (Hepburn, Revised Romanization, or Pinyin).
2. **Key Pronunciation Rules:**
   - For Japanese: Locate any Kanji with custom/artistic readings (Ateji/Giga) or particles (は/へ/を) and lock their correct phonetic spelling.
   - For Korean: Locate consonant clusters and apply liaison/assimilation rules.
   - For Chinese: Identify polyphonic characters (多音字) and choose the reading fitting the context.
3. **Pacing & Line Audit:** Match each source line index to ensure 1:1 mapping with no line merges.

${hygiene}`;
}

/**
 * Builds the tag-based output format section for translation.
 * @param {number} lineCount - Number of lines
 * @param {string} [langName="Vietnamese"] - Target language name
 * @returns {string}
 */
function buildTranslationOutputTagsBlock(lineCount, langName = "Vietnamese") {
    return `OUTPUT FORMAT (COMPACT TAGS — STRICT):
<1>[${langName} translation of line 1]</1>
<2>[${langName} translation of line 2]</2>
...
<${lineCount}>[${langName} translation of line ${lineCount}]</${lineCount}>

MAPPING RULES:
1) 1 source line = 1 output tag. NEVER split, merge, or reorder lines.
2) Output EXACTLY ${lineCount} tags from <1> to <${lineCount}>.
3) Empty/whitespace-only source line → empty tag: <5></5>
4) Keep tags/labels exactly as-is: [Intro], [Chorus], (Instrumental), etc.
5) Mirror quotation marks (「」, "", '') EXACTLY. Do NOT auto-close unclosed quotes.

FORBIDDEN OUTPUT SHAPES (HARD — these will BREAK the parser):
- Do NOT wrap output in JSON. No \`{"translations": [...]}\`, no \`["...", "..."]\` array.
- Do NOT use markdown code fences (\`\`\`...\`\`\`) around tags.
- Do NOT prefix lines with numbers ("1. ...", "2. ..."). Use ONLY the <n>...</n> tag form.
- Do NOT add field labels before tags (no "translations:", no "output:").
- If reasoning/thinking is disabled, the very first character of your reply MUST be \`<\` (the opening of <1>). If reasoning is active, tags must start immediately after the closing \`</thought>\` or \`</think>\` tag.`;
}

/**
 * Builds the JSON-based output format section for translation.
 * @param {number} lineCount - Number of lines
 * @returns {string}
 */
function buildTranslationOutputJsonBlock(lineCount) {
    return `OUTPUT FORMAT (STRICT — JSON ONLY):
1) Return ONLY valid JSON (no markdown, no code fences, no extra text).
2) Output MUST be a single JSON Object with key "translations".
3) "translations" MUST be an array of EXACTLY ${lineCount} strings.
4) Do not include any other keys.

MAPPING RULES:
1) 1 source line = 1 output line. NEVER split, merge, or reorder lines.
2) Empty/whitespace-only source line -> output "" (empty string).
3) Keep tags/labels exactly as-is: [Intro], [Chorus], (Instrumental), etc.
4) CRITICAL: Mirror quotation marks (「」, "", '') EXACTLY.
   - If source has "「" start but NO "」" end -> Output must ALSO have "「" start and NO "」" end.
   - Do NOT auto-close quotes if the source line doesn't close them.
   - Preserve multi-line quote separation.`;
}

/**
 * Modular Target Language Registry
 * -------------------------------------------------------------
 * HOW TO ADD A NEW TARGET LANGUAGE IN THE FUTURE:
 * Simply add a new language profile object below (e.g. 'en', 'ja', 'es').
 * Each language module encapsulates its own:
 *  - code: ISO 639-1 code ('vi', 'en', ...)
 *  - name: Display name in the UI ('Tiếng Việt', 'English', ...)
 *  - label: Full label for settings
 *  - hasPronouns: boolean (true if language uses complex pronoun mapping like Vietnamese)
 *  - pronouns: Pronoun options object or null
 *  - styles: Style instructions object (role & strategy per style)
 *  - guardrails: Custom linguistic rules & guidelines
 *  - flowPunctuation: Punctuation & phrasing rules
 *  - userPromptPreamble: Function returning user instruction for prompt engineering mode
 *  - jsonSchemaUserPrompt: Function returning user instruction for JSON schema mode
 *  - fallbackInstruction: String for fallback prompt
 * -------------------------------------------------------------
 */
const STYLE_INSTRUCTIONS_EN = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator. Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative English.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
Prioritize Semantic & Imagery Fidelity together with Natural Poetic Cadence. The listener reads your subtitles while listening to the original audio in real time. NEVER domesticate, censor, or flatten foreign songs into generic Western pop or singer-songwriter clichés. Never distort meaning, drop core symbols, or fabricate filler details to force a rhyme.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & TEMPORAL CADENCE"
1) Natural Cadence & Vocal Prosody (No Syllable-Counting Trap):
   - Match the emotional cadence, breath pacing, and natural rhythm of contemporary lyrics without domesticating the artist's unique tone.
   - Melodic Flow means natural phrasing and evocative diction. It DOES NOT mean discarding key words or altering meaning to force an artificial syllable count or end-rhyme scheme.

2) Symbolic Anchor & Zero Hallucination:
   - Sacred Visual Imagery: If the source highlights a specific concrete image (e.g., "looking at someone's back" in Senaka, "taillights", "crossroad", "rain"), that symbol MUST be preserved in the translation. NEVER drop a central motif to create a rhyme.
   - Zero Hallucination: Do NOT invent filler lines, fake narrative twists, or clichéd pop fillers ("baby", "oh yeah", "under the sky") not found in the original lyrics.

3) Natural Diction & Sentence Type Preservation:
   - Use evocative, natural contemporary English vocabulary. Avoid robotic translationese.
   - Atmospheric / Scenery lines (e.g., "Blue sky", "Rainy night"): Preserve as pure evocative imagery. DO NOT fabricate artificial subjects (never invent "I see the blue sky").
   - Action lines: Maintain clear subject-verb agreement and logical flow.

4) Cultural Metaphors & Nuance:
   - Accurately adapt cultural idioms, seasonal motifs, and unexpressed emotions into resonant English poetic language rather than awkward literal dictionary glosses.
   - Transcreate onomatopoeia/mimetic words into vivid verbs and sensory descriptions.`,
        pronounSuggestion: null
    },

    "poetic_standard": {
        role: `You are a Poet & Musical Lyricist. Your goal is to make the English lyrics sound elegant, romantic, and deeply lyrical.`,
        style: `STRATEGY: "POETIC & ROMANTIC IMAGERY"
1) Vocabulary: Use rich, evocative, and musical phrasing.
2) Flow & Cadence: Smooth, graceful, and expressive cadence. Avoid dry or academic expressions.`,
        pronounSuggestion: null
    },

    "youth_story": {
        role: `You are an English Lyricist specializing in Anime, J-Pop/K-Pop, and Youth/Coming-of-Age storytelling.`,
        style: `STRATEGY: "YOUTH NARRATIVE & ANIME EMOTION"
1) Tone: Sincere, vibrant, introspective, nostalgic, and full of youthful longing and determination.
2) Narrative Continuity: Capture the emotional story arc across verse, pre-chorus, and chorus climaxes. Keep the perspective heartfelt and direct.`,
        pronounSuggestion: null
    },

    "street_bold": {
        role: `You are a Hip-Hop/Rap Adapter and Lyricist specializing in urban music.`,
        style: `STRATEGY: "IMPACT, ATTITUDE & FLOW"
1) Diction: Direct, punchy, rhythmic, and authentic contemporary urban phrasing.
2) Pacing: Tight cadence, syncopation, and sharp rhythmic delivery.`,
        pronounSuggestion: null
    },

    "vintage_classic": {
        role: `You are a Classical English Songwriter. Your goal is timeless elegance and enduring poetic beauty.`,
        style: `STRATEGY: "CLASSICAL ELEGANCE"
1) Diction: Formal, contemplative, timeless literary English.
2) Tone: Restrained, dignified, and emotionally profound.`,
        pronounSuggestion: null
    },

    "literal_study": {
        role: `You are a Linguistic Translator. Goal is direct educational accuracy.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Principle: Translate with direct grammatical and semantic equivalence to help language learners understand the exact structure and meaning of the source text.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsEN() {
    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story. Never translate lines in complete isolation.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs: Core visual symbols, metaphors, and titular imagery (e.g., "looking at someone's back", "taillights", "crossroad", "rain") MUST be 100% preserved. Never omit or substitute them for the sake of rhyme or meter.
2. Zero Hallucination & Filler: Do NOT inject invented storylines, secondary actions, or clichéd fillers ("baby", "under the sky", "holding you tight") not present in the source text.
3. Meaning Over Rhyme: Rhyme is secondary; poetic meaning and imagery are supreme. Never compromise the author's message or emotional intent for an end-rhyme.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: Absolutely DO NOT rewrite the song into generic Western pop, acoustic ballad, or radio tropes. Preserve the original artist's distinct worldview, tone, and intensity.
2. TARGET PERSONA: You are an expert Lyrical Subtitle Translator channeling the ORIGINAL ARTIST's unique voice—whether raw, existential, detached, frantic, or bittersweet.

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
When words, phrases, or chants are repeated in the source (within the same line or across adjacent lines):
1. Exact Lexical Repetition: You MUST replicate the repetition using the exact same English word ("That wind, that wind"; "It hurts, it hurts, it hurts"; "Deeply, deeply").
2. NO Synonym Substitution: NEVER swap repeated words with synonyms to "avoid repetition" (e.g., FORBIDDEN to change "that wind, that wind" into "that wind, that breeze"). The listener hears identical audio and expects identical visual subtitles.
3. NO Collapsing or Omission: NEVER collapse repeated chants into a single occurrence.
4. NO Dangling Tails / Padding: NEVER push repeated words to the end of a line as dangling comma stubs (e.g., "..., ahead") or invent filler words to pad meter.

[TEMPORAL PROGRESSION & AUDION-VISUAL SYNC]
1. Left-to-Right Temporal Sync: The listener reads subtitles while listening in real time. The order of ideas in the translation MUST follow the audio's progression from left to right as closely as English grammar allows.
2. Sentence Structure: When translating from languages with inverted word order, avoid leaving severed trailing fragments at the end of lines.
3. Atmospheric / Scenery lines: Translate as pure imagery. DO NOT invent fake subjects ("I see...").
4. Action lines: Keep clean Subject-Verb-Object clarity.`;
}

function buildTranslationFlowPunctuationEN() {
    return `FLOW & PUNCTUATION:
1) Use natural English song lyric phrasing that flows left-to-right with the singing rhythm.
2) Enjambment: When a sentence carries over to the next line, ensure the two lines flow seamlessly together without trailing comma-stubs.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, La la) cleanly.`;
}

const STYLE_INSTRUCTIONS_JA = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (訳詞・字幕翻訳の専門家). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative Japanese.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
原文の持つ世界観、情景、感情の核（コア）を100%忠実に継承し、リアルタイムで原曲を聴くリスナーのための字幕として昇華させる。原曲の持ち味を損なうような過度なJ-Pop風の脚色や、意味の改変、重要モチーフの省略、押韻のための捏造は厳禁。`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & TEMPORAL CADENCE"
1) 象徴的モチーフの完全保持 (Symbolic Anchor & Zero Hallucination):
   - 原詩の中心的イメージ（例：背中、雨、夕暮れ、交差点など）を絶対に削らず、過不足なく日本語の詩行に織り込む。
   - 字数合わせや耳ざわりの良さだけのために、原詩にない余計な状況説明や語句（「ねえ」「いつも」など）を勝手に補わない。
2) 自然なプロソディと歌唱性 (Natural Prosody):
   - 機械的な直訳を排し、息継ぎやメロディの息づかいに寄り添う自然な日本語のリズム（体言止めや情緒的語彙）を構築する。
3) 情景描写と主語の規律 (Sentence Type Preservation):
   - 純粋な情景描写には不要な主語（「私は」「僕が見る」）を捏造せず、体言止めや詩的余韻で表現する。`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are a Japanese Ballad Lyricist & Poet. Your goal is elegant, deeply romantic, and moving lyrics.`,
        style: `STRATEGY: "ELEGANT & POETIC"
1) Diction: Expressive, graceful, and emotionally rich Japanese phrasing (情緒豊かで美しい言葉選び).
2) Flow: Smooth, gentle melodic pacing suitable for ballads and emotional themes.`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are a J-Pop Lyricist specializing in Anime, Youth, and Coming-of-Age storytelling.`,
        style: `STRATEGY: "YOUTH & ANIME NARRATIVE"
1) Tone: Heartfelt, vibrant, nostalgic, and direct (青春の切なさ、疾走感、前向きな希望).
2) Storytelling: Maintain strong emotional narrative arc across verses and chorus.`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are a Japanese Hip-Hop / Rock Lyricist.`,
        style: `STRATEGY: "RHYTHMIC & PUNCHY"
1) Diction: Sharp, rhythmic, urban, and authentic contemporary Japanese flow (リズミカルで力強いストリート表現).`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classical Japanese Songwriter (歌謡曲 / 文学調).`,
        style: `STRATEGY: "CLASSICAL & LITERARY"
1) Diction: Dignified, timeless, contemplative Japanese literary style (格調高い文学的表現).`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are a Japanese Linguistic Translator. Goal is direct educational accuracy.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsJA() {
    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. 原詩モチーフの死守: タイトルや歌詞の鍵となる具体的イメージ（背中、雨、交差点、シグナル等）は100%保持すること。押韻や音数調整のためにこれらを削ったり別の比喩に差し替えることを固く禁じる。
2. 捏造・水増しの排除 (Zero Hallucination): 原詩にない架空のストーリーや安易なフィラーを勝手に追加しない。
3. 直訳調の排斥と自然な歌言葉: 翻訳調（〜すること、〜によって）を排し、本物のJ-Pop詞としての自然な響きを持たせる。

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: 汎用的なJ-Popの定型句に落とし込まず、原曲アーティスト固有の世界観とトーン（荒々しさ、哲学性、倦怠感、疾走感など）をそのまま尊重すること。
2. TARGET PERSONA: 原曲作者の声を日本語で代弁する字幕翻訳家として振る舞うこと。

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
原詩の中で同一の語句やリフレインが繰り返されている場合（例: あの風 あの風 / 痛い 痛い 痛い）:
1. 同一語句での反復必須: 「類語への置き換えによる反復回避」は厳禁。必ず同一の日本語語句を同じ回数繰り返すこと。
2. 1回への圧縮や省略の禁止: リスナーは耳で繰り返しを聴いているため、視覚的にも同じ反復を維持すること。
3. 行末の不自然なぶら下がりや埋め合わせ言葉の禁止。

[TEMPORAL PROGRESSION & AUDION-VISUAL SYNC]
1. 時間軸の左から右への同期: リアルタイムで歌を聴きながら読む字幕であるため、可能な限り音楽の時間軸に沿った語順で表現すること。
2. 情景描写は体言止め等で純粋なイメージとして訳し、架空の主語を捏造しない。`;
}

function buildTranslationFlowPunctuationJA() {
    return `FLOW & PUNCTUATION:
1) Natural Japanese lyric phrasing without full stops (。) at line endings, flowing smoothly with the music.
2) Enjambment: Ensure multi-line thoughts flow smoothly into the next line.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, ララ) naturally.`;
}

const STYLE_INSTRUCTIONS_KO = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (가사 자막 번역 전문가). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative Korean.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
원곡의 고유한 예술적 세계관, 감정선, 상징적 심상을 100% 온전히 보존하면서, 실시간으로 음악을 감상하는 청자를 위한 가사 자막으로 번역한다. 특정 K-Pop 관습에 억지로 맞추기 위해 원문의 중요 상징을 누락하거나 허구의 내용을 지어내서는 안 된다.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & TEMPORAL CADENCE"
1) 상징적 심상 보존 (Symbolic Anchor & Zero Hallucination):
   - 원곡의 핵심 시각적 이미지(예: 뒷모습, 빗소리, 교차로, 붉은 불빛 등)를 절대 빠뜨리지 않고 온전히 담아낸다.
   - 글자 수를 채우기 위해 원곡에 없는 감정이나 서사를 지어내지 않는다.
2) 자연스러운 노랫말 리듬 (Natural Prosody):
   - 기계적인 직역투(번역투)를 배제하고, 노래로 불렀을 때 호흡이 자연스럽게 이어지도록 서정적 어휘와 종결어미를 선택한다.
3) 문장 유형 보존:
   - 배경/풍경 묘사에는 불필요한 인위적 주어('내가', '난')를 덧붙이지 않고 명사형 종결이나 시적 여운으로 묘사한다.`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are a Korean Ballad Lyricist & Poet.`,
        style: `STRATEGY: "POETIC & DEEPLY EMOTIONAL"
1) Diction: Warm, lyrical, and resonant Korean phrasing (서정적이고 울림 있는 한국어 표현).`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are a K-Pop / Indie Lyricist specializing in Youth and Coming-of-Age themes.`,
        style: `STRATEGY: "YOUTH & SINCERE NARRATIVE"
1) Tone: Heartfelt, relatable, and emotive storytelling (청춘의 설렘과 아련함을 담은 가사).`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are a Korean Hip-Hop / Rap Lyricist.`,
        style: `STRATEGY: "PUNCHY & RHYTHMIC FLOW"
1) Diction: Sharp, rhythmic, urban Korean phrasing and rhyme schemes.`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classical Korean Lyricist (가요 / 문학적 가사).`,
        style: `STRATEGY: "CLASSICAL & DIGNIFIED"
1) Diction: Timeless, poetic, and literary Korean style.`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are a Korean Linguistic Translator.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsKO() {
    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. 원곡 상징의 완전한 보존: 가사의 핵심 모티프와 심상(뒷모습, 비, 신호등 등)은 절대 누락하거나 임의로 바꾸지 않는다. 운율보다 의미와 심상 보존이 우선한다.
2. 허구적 내용 추가 금지 (Zero Hallucination): 원곡에 없는 부차적 상황이나 상투적 추임새를 억지로 끼워 넣지 않는다.
3. 번역투 배제: 딱딱한 직역투를 배제하고 한국어 노랫말의 감정선을 살린다.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: 천편일률적인 K-Pop/가요 유행어에 맞추지 말고, 원곡 아티스트 고유의 톤과 정서(거친 질감, 철학적 사유, 고독, 질주감 등)를 원형 그대로 존중할 것.
2. TARGET PERSONA: 원곡의 영혼을 한국어로 전하는 자막 번역가로서 기능할 것.

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
원곡에서 특정 단어나 후렴구가 반복될 경우 (예: 그 바람 그 바람 / 아파 아파 아파):
1. 동일 어휘 반복 필수: "반복 회피를 위한 유의어 교체" 엄격히 금지. 반드시 동일한 한국어 단어로 동일하게 반복할 것.
2. 축약 및 생략 금지: 귀로 들리는 반복 리듬과 눈으로 보는 자막을 일치시킬 것.
3. 행 끝에 불필요한 군더더기 어휘나 꼬리 표현을 덧붙이지 말 것.

[TEMPORAL PROGRESSION & AUDION-VISUAL SYNC]
1. 시간축 좌우 흐름 일치: 음악을 실시간으로 들으며 읽는 자막이므로 가능한 한 호흡과 어순의 흐름을 음악의 진행에 맞출 것.
2. 배경/풍경 묘사: 인위적 주어('내가', '난')를 지어내지 말고 순수한 심상으로 묘사할 것.`;
}

function buildTranslationFlowPunctuationKO() {
    return `FLOW & PUNCTUATION:
1) Natural Korean lyric spacing and rhythmic phrasing flowing seamlessly with the song.
2) Enjambment: Seamless transition across connected lines without awkward trailing commas.
3) Vocal ad-libs: Keep interjections (Oh, Yeah, Ah, 라라) naturally.`;
}

const STYLE_INSTRUCTIONS_ZH = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (专业歌词字幕翻译专家). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative Chinese.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
忠实传达原曲作者的独特艺术世界观、情感内核与核心意象，服务于听众实时听歌对照的字幕体验。严禁为了套用华语流行（Mandopop）套路或强行押韵而删改原曲风格、歪曲意象或臆造虚假叙事。`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & TEMPORAL CADENCE"
1) 核心意象忠实保全 (Symbolic Anchor & Zero Hallucination):
   - 必须完整保留原词中的关键视觉与象征意象（如：背影、尾灯、雨夜、十字路口等），绝不可为了叶韵而遗漏核心词汇。
   - 严禁为了凑字数而凭空捏造原词不存在的叙事、套话或感叹词。
2) 现代歌词语感与自然律动 (Natural Prosody):
   - 摒弃生硬机翻腔，运用现代华语歌词自然的起承转合与长短句节奏，与原曲听觉节拍自然呼应。
   - 严禁过度文绉绉地滥用四字成语，抹杀原曲现代独立音乐/摇滚的先锋质感。
3) 意境白描与句式保全 (Sentence Type Preservation):
   - 纯风景与意境白描绝不强行添加虚假主语（如“我看见”），保持原诗的留白与张力。`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are a Chinese Poet & Ballad Lyricist.`,
        style: `STRATEGY: "ELEGANT & POETIC"
1) Diction: Beautiful, moving, and evocative phrasing (优美深情、富有诗意).`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are a Chinese Lyricist specializing in Pop, Indie, and Youth themes.`,
        style: `STRATEGY: "YOUTH & EMOTIVE STORYTELLING"
1) Tone: Sincere, vibrant, and touching narrative storytelling (青春感性、真实动人).`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are a Chinese Hip-Hop / Rap Lyricist.`,
        style: `STRATEGY: "PUNCHY, RHYTHMIC & URBAN"
1) Diction: Sharp, rhythmic, and authentic contemporary Chinese urban phrasing.`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classical Chinese Lyricist (古风 / 经典时代曲).`,
        style: `STRATEGY: "CLASSICAL & REFINED"
1) Diction: Refined, timeless, literary Chinese poetic diction (典雅悠远、辞藻洗练).`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are a Chinese Linguistic Translator.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsZH() {
    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. 核心意象绝对保全: 歌词中的关键象征意象（如背影、雨丝、车灯等）必须100%准确还原，严禁因押韵而删除或歪曲核心词义。
2. 杜绝虚构与填充 (Zero Hallucination): 切勿任意添加原词没有的套路性修辞、抒情俗套或无意义填充词。
3. 意境优先，自然押韵: 押韵必须建立在意义与原作者意图精准的基础之上，绝不容许为韵害意。

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: 严禁套用平庸的传统华语流行情歌套路，坚决尊重原曲创作者的独特文风（无论是冷峻、哲学、自省、狂乱还是哀伤）。
2. TARGET PERSONA: 作为传达原作者灵魂的歌词字幕翻译专家。

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
原词出现同一词汇/呼号重复时（例如: 那阵风 那阵风 / 好痛 好痛 好痛 / 湛蓝 湛蓝 湛蓝）:
1. 严格使用相同词汇重复: 严禁为了所谓“行文多变”或“对仗”而擅自替换为近义词（例如严禁将“那阵风 那阵风”翻译为“那阵风 那缕风”）。听众耳中听到的是相同的音，字幕眼见也必须保持相同。
2. 严禁压缩合并: 严禁将多次反复的呐喊压缩成单一词汇。
3. 严禁行末断裂拖挂: 严禁将重复词置于句尾变成断裂的逗号碎屑尾巴。

[TEMPORAL PROGRESSION & AUDION-VISUAL SYNC]
1. 时间轴听觉同步: 歌词是从左至右随音乐播放实时阅读的字幕，语义走向应尽可能贴合演唱者发声的时间顺序。
2. 意境白描: 纯风景描写保持意境留白，严禁捏造虚假主语（“我看见”）。`;
}

function buildTranslationFlowPunctuationZH() {
    return `FLOW & PUNCTUATION:
1) Natural Chinese lyric phrasing that breathes with the song, balanced line cadence, no periods (。) at line ends.
2) Enjambment: Seamless phrasing across line breaks without unnatural trailing comma fragments.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, 啦啦) naturally.`;
}

const STYLE_INSTRUCTIONS_UK = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (Експертний перекладач субтитрів пісень). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative Ukrainian.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
Prioritize Semantic & Imagery Fidelity together with Natural Melodic Flow (милозвучність української мови). The listener reads your subtitles while listening to the original audio in real time. NEVER domesticate, censor, or flatten foreign songs into generic radio pop or sentimental clichés. Never distort meaning, drop core symbols, or fabricate filler details to force a rhyme.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & TEMPORAL CADENCE"
1) Symbolic Anchor & Zero Hallucination:
   - Sacred Visual Imagery: If the source highlights a specific concrete image (e.g., "someone's back", "taillights", "rain", "crossroad"), that symbol MUST be preserved in Ukrainian. NEVER drop a central motif to force a rhyme.
   - Zero Hallucination: Do NOT invent extra actions, storylines, or clichéd fillers not present in the original lyrics.
2) Natural Prosody & Vocal Breath:
   - Create natural, flowing Ukrainian lyric phrasing that breathes with the song's emotional pacing.
   - Melodic Flow means natural phrasing and evocative diction. It DOES NOT mean altering the original text or dropping words to match foreign syllable counts.
3) Sentence Type Preservation:
   - Scenery lines: Preserve as pure imagery without fabricating artificial subjects ("Я бачу").`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are a Ukrainian Poet and Ballad Lyricist.`,
        style: `STRATEGY: "LYRICAL & ROMANTIC"
1) Diction: Elegant, poetic, and deeply touching phrasing (Витончена поетична мова).`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are a Ukrainian Lyricist specializing in Indie, Pop, and Youth storytelling.`,
        style: `STRATEGY: "YOUTH & SINCERE NARRATIVE"
1) Tone: Sincere, vibrant, and heartfelt youthful narrative.`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are a Ukrainian Hip-Hop / Rock Lyricist.`,
        style: `STRATEGY: "PUNCHY & RHYTHMIC"
1) Diction: Direct, rhythmic, and authentic contemporary phrasing.`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classical Ukrainian Songwriter.`,
        style: `STRATEGY: "CLASSICAL & DIGNIFIED"
1) Diction: Dignified, timeless, and culturally rich Ukrainian poetic style.`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are a Ukrainian Linguistic Translator.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsUK() {
    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs: Core visual symbols, metaphors, and titular imagery (e.g., "looking at someone's back", "taillights", "rain", "crossroad") MUST be preserved in Ukrainian. Never omit or substitute them for the sake of rhyme or meter.
2. Zero Hallucination & Filler: Do NOT inject invented storylines, secondary actions, or clichéd fillers not present in the source text.
3. Meaning Over Rhyme: Rhyme is secondary; poetic meaning and imagery are supreme. Never compromise the author's message for an end-rhyme.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: Absolutely DO NOT rewrite the song into generic pop tropes. Preserve the original artist's unique voice, atmosphere, and intensity.
2. TARGET PERSONA: You are an expert Lyrical Subtitle Translator channeling the ORIGINAL ARTIST's voice.

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
When words or chants are repeated in the source (e.g., within the same line or across lines):
1. Exact Lexical Repetition: Replicate the repetition using the exact same Ukrainian word. Never swap with synonyms to avoid repetition.
2. NO Collapsing or Omission: Keep the repetition 100% intact to mirror the audio beat.
3. NO Dangling Tails: Do not leave severed comma fragments at the end of lines.

[TEMPORAL PROGRESSION & AUDION-VISUAL SYNC]
1. Left-to-Right Temporal Flow: Align sentence progression with the audio delivery for real-time subtitle reading.
2. Sentence Type Preservation: Atmospheric/scenery lines must stay as pure imagery. NEVER fabricate artificial subjects ("Я бачу").`;
}

function buildTranslationFlowPunctuationUK() {
    return `FLOW & PUNCTUATION:
1) Natural Ukrainian lyric phrasing and standard capitalization flowing with the audio rhythm.
2) Enjambment: Flow seamlessly across line breaks without trailing comma fragments.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, Ла-ла) cleanly.`;
}

const TARGET_LANGUAGES = {
    vi: {
        code: "vi",
        name: "Tiếng Việt",
        label: "Tiếng Việt (Vietnamese)",
        hasPronouns: true,
        pronouns: PRONOUN_MODES,
        styles: STYLE_INSTRUCTIONS,
        buildPronounSection: (pronounKey, styleObj, artist, title) => buildPronounSection(pronounKey, styleObj, artist, title),
        buildGuardrails: () => buildTranslationGuardrails(),
        buildFlowPunctuation: () => buildTranslationFlowPunctuation(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Vietnamese"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Vietnamese.\nCRITICAL: Every single line MUST be translated into Vietnamese. Even if the original text is in English, Spanish, French, Japanese, Korean, Chinese, or Latin/Romaji, DO NOT copy or output the original untranslated text. You MUST output a 100% poetic Vietnamese translation for each line.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Vietnamese.\nCRITICAL: Every single line MUST be translated into Vietnamese. Even if the original text is in English, Japanese, Korean, Chinese, or Latin/Romaji, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Vietnamese."
    },
    en: {
        code: "en",
        name: "English",
        label: "English",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_EN,
        buildPronounSection: () => "",
        buildGuardrails: () => buildTranslationGuardrailsEN(),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationEN(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "English"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable, and poetic English.\nCRITICAL: Every single line MUST be translated into English. Even if the original text is in Japanese, Korean, Chinese, Spanish, French, or Vietnamese, DO NOT copy or output the original foreign text. You MUST output a 100% poetic English translation for each line.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable English.\nCRITICAL: Every single line MUST be translated into English. Even if the original text is in Japanese, Korean, Chinese, or Vietnamese, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to English."
    },
    ja: {
        code: "ja",
        name: "Japanese",
        label: "日本語 (Japanese)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_JA,
        buildPronounSection: () => "",
        buildGuardrails: () => buildTranslationGuardrailsJA(),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationJA(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Japanese"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Japanese (日本語).\nCRITICAL: Every single line MUST be translated into Japanese. Even if the original text is in English, Korean, Chinese, Spanish, French, or Vietnamese, DO NOT copy or output the original foreign text. You MUST output a 100% poetic Japanese translation for each line.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Japanese (日本語).\nCRITICAL: Every single line MUST be translated into Japanese. Even if the original text is in English, Korean, Chinese, or Vietnamese, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Japanese."
    },
    ko: {
        code: "ko",
        name: "Korean",
        label: "한국어 (Korean)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_KO,
        buildPronounSection: () => "",
        buildGuardrails: () => buildTranslationGuardrailsKO(),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationKO(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Korean"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Korean (한국어).\nCRITICAL: Every single line MUST be translated into Korean. Even if the original text is in English, Japanese, Chinese, Spanish, French, or Vietnamese, DO NOT copy or output the original foreign text. You MUST output a 100% poetic Korean translation for each line.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Korean (한국어).\nCRITICAL: Every single line MUST be translated into Korean. Even if the original text is in English, Japanese, Chinese, or Vietnamese, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Korean."
    },
    zh: {
        code: "zh",
        name: "Chinese",
        label: "中文 (Chinese)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_ZH,
        buildPronounSection: () => "",
        buildGuardrails: () => buildTranslationGuardrailsZH(),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationZH(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Chinese"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Chinese (中文).\nCRITICAL: Every single line MUST be translated into Chinese. Even if the original text is in English, Japanese, Korean, Spanish, French, or Vietnamese, DO NOT copy or output the original foreign text. You MUST output a 100% poetic Chinese translation for each line.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Chinese (中文).\nCRITICAL: Every single line MUST be translated into Chinese. Even if the original text is in English, Japanese, Korean, or Vietnamese, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Chinese."
    },
    uk: {
        code: "uk",
        name: "Ukrainian",
        label: "Українська (Ukrainian)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_UK,
        buildPronounSection: () => "",
        buildGuardrails: () => buildTranslationGuardrailsUK(),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationUK(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Ukrainian"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable, and poetic Ukrainian (Українська).\nCRITICAL: Every single line MUST be translated into Ukrainian. Even if the original text is in English, Japanese, Korean, Chinese, Spanish, French, or Vietnamese, DO NOT copy or output the original foreign text. You MUST output a 100% poetic Ukrainian translation for each line.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Ukrainian (Українська).\nCRITICAL: Every single line MUST be translated into Ukrainian. Even if the original text is in English, Japanese, Korean, Chinese, or Vietnamese, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Ukrainian."
    }
};

/**
 * Formats objective track metadata into a clean, unpadded bullet list.
 * @param {object|null} meta - Track metadata object
 * @returns {string}
 */
function formatTrackMetadata(meta) {
    if (!meta) return "";
    const items = [];
    if (meta.title) items.push(`• Title: ${meta.title}`);
    if (meta.artist) items.push(`• Artist: ${meta.artist}`);
    if (meta.album) items.push(`• Album: ${meta.album}`);
    if (meta.year) items.push(`• Year: ${meta.year}`);
    if (meta.isExplicit !== undefined && meta.isExplicit !== null) {
        items.push(`• Content: ${meta.isExplicit ? "Explicit" : "Clean"}`);
    }
    if (meta.tempo) items.push(`• Tempo: ${meta.tempo} BPM`);
    if (meta.tonality) items.push(`• Tonality: ${meta.tonality}`);
    if (items.length === 0) return "";
    return `TRACK METADATA:\n${items.join("\n")}`;
}

/**
 * Builds the translation system prompt.
 * @param {number} lineCount - Number of lines in the lyrics
 * @param {string} styleKey - The chosen style key
 * @param {string} pronounKey - The chosen pronoun mode key
 * @param {"json" | "tags"} mode - Output format mode
 * @param {"off" | "low" | "medium" | "high"} effort - Reasoning effort level
 * @param {string} [targetLang="vi"] - Target language code
 * @param {string} [artist=""] - Artist name
 * @param {string} [title=""] - Song title
 * @param {object|null} [trackMetadata=null] - Factual track metadata
 * @returns {string} The full system prompt string
 */
function buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, mode, effort = "low", targetLang = "vi", artist = "", title = "", trackMetadata = null) {
    const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
    const styleObj = (langModule.styles && langModule.styles[styleKey]) || STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS.smart_adaptive;
    const pronounSection = (langModule.hasPronouns && langModule.buildPronounSection)
        ? langModule.buildPronounSection(pronounKey, styleObj, artist, title)
        : "";
    const outputBlock = langModule.buildOutputTagsBlock
        ? (mode === "json" ? langModule.buildOutputJsonBlock(lineCount) : langModule.buildOutputTagsBlock(lineCount))
        : (mode === "json" ? buildTranslationOutputJsonBlock(lineCount) : buildTranslationOutputTagsBlock(lineCount, langModule.name));
    const thinkingLabel = mode === "json" ? "JSON object" : "tags";

    const metaObj = trackMetadata ? { title, artist, ...trackMetadata } : (artist || title ? { artist, title } : null);
    const metaBlock = formatTrackMetadata(metaObj);

    const parts = [
        metaBlock,
        pronounSection ? pronounSection.trimEnd() : "",
        styleObj.role,
        styleObj.style,
        outputBlock,
        langModule.buildGuardrails ? langModule.buildGuardrails() : buildTranslationGuardrails(),
        langModule.buildFlowPunctuation ? langModule.buildFlowPunctuation() : buildTranslationFlowPunctuation(),
        buildTaskThinkingRules(thinkingLabel, effort, langModule.name || "Vietnamese")
    ];

    if (mode === "tags" && effort === "off") {
        parts.push("Start DIRECTLY with <1>. No preamble or filler.");
    }

    return parts.filter(Boolean).join("\n\n");
}

const Prompts = {
    languages: TARGET_LANGUAGES,
    getLanguage(code) {
        return TARGET_LANGUAGES[code] || TARGET_LANGUAGES.vi;
    },
    styles: TRANSLATION_STYLES,
    pronouns: PRONOUN_MODES,

    /**
     * Builds the tagged translation or phonetic prompt configuration.
     * @param {object} options
     * @param {string} options.artist - Artist name
     * @param {string} options.title - Track title
     * @param {string} options.text - Lyrics source string (separated by newlines)
     * @param {string} [options.styleKey] - Style instruction key
     * @param {string} [options.pronounKey] - Pronoun mode key
     * @param {boolean} [options.wantSmartPhonetic] - True if requesting phonetic prompt
     * @param {boolean} [options.wantFurigana] - True if Japanese Furigana is requested
     * @param {"off" | "low" | "medium" | "high"} [options.reasoningEffort] - Level of reasoning effort
     * @param {string} [options.targetLang="vi"] - Target language code
     * @param {object|null} [options.trackMetadata] - Factual track metadata
     * @returns {{ system: string, user: string }}
     */
    buildPromptEngPrompt({ artist, title, text, styleKey = "smart_adaptive", pronounKey = "default", wantSmartPhonetic = false, wantFurigana = false, reasoningEffort = "low", targetLang = "vi", trackMetadata = null }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const taggedInput = lines.map((l, i) => `<${i + 1}>${l}</${i + 1}>`).join("\n");

        if (wantSmartPhonetic) {
            if (wantFurigana) {
                const furiganaCore = `You are a Japanese Furigana transcriber. Output valid XML tags only.
Wrap Japanese Kanji characters with HTML <ruby> tags to show their Hiragana readings.

OUTPUT FORMAT (STRICT — TAGS):
<1>[furigana line 1]</1>
<2>[furigana line 2]</2>
...
<${lineCount}>[furigana line ${lineCount}]</${lineCount}>

EXAMPLES:
Source: 新しい朝が来た
Target: <ruby>新<rt>あたら</rt></ruby>しい<ruby>朝<rt>あさ</rt></ruby>が<ruby>来<rt>き</rt></ruby>た

Source: 星になる
Target: <ruby>星<rt>ほし</rt></ruby>になる

RULES:
1. Output EXACTLY ${lineCount} tags from <1> to <${lineCount}>.
2. Only wrap Kanji with <ruby>[Kanji]<rt>[Hiragana reading]</rt></ruby>. Do NOT wrap Hiragana, Katakana, English, or punctuation.
3. Keep line structure, punctuation, and English text unchanged.
4. Do not translate, explain, or add notes.
5. Empty/whitespace-only source line → empty tag: <5></5>
6. ${reasoningEffort === "off" ? "Start DIRECTLY with <1>. NO preamble, NO thinking, NO explanation." : "If reasoning/thinking is active, tags must start immediately after the closing thought block."}

${buildPhoneticTaskThinkingRules("furigana tags (<1>...</1>)", reasoningEffort)}`;

                return {
                    system: furiganaCore,
                    user: `Generate Furigana tags for: "${artist} - ${title}".
CRITICAL: Do NOT translate. Output Japanese text with <ruby> tags for Kanji only.

Input (${lineCount} lines):
${taggedInput}

Output (${lineCount} tags):`
                };
            }

            const phoneticCore = `${PHONETIC_ROLE}

${PHONETIC_TRANSCRIPTION_STANDARDS}

OUTPUT FORMAT (STRICT — TAGS):
<1>[romanized line 1]</1>
<2>[romanized line 2]</2>
...
<${lineCount}>[romanized line ${lineCount}]</${lineCount}>

RULES:
1. Output EXACTLY ${lineCount} tags from <1> to <${lineCount}>.
2. CJK romanization: all lowercase. Latin/English fragments: keep original casing as in the source line.
3. Keep line structure: punctuation, repeat markers, and segment labels ([Chorus], (TV size)) unchanged; only transliterate singable text.
4. Do not translate, explain, or add parentheses/notes—romanization only.
5. Numbers: spoken form per dominant script on that span (see STANDARDS).
6. Empty/whitespace-only source line → empty tag: <5></5>
7. Mirror quotation marks (「」, "", '') EXACTLY. Do NOT auto-close unclosed quotes.
8. ZERO UNTRANSLITERATED CJK: Every single Kanji, Kana, Hangul, or Hanzi character MUST be transliterated into Latin alphabet. ZERO CJK characters allowed in output tags.
9. ${reasoningEffort === "off" ? "Start DIRECTLY with <1>. NO preamble, NO thinking, NO explanation." : "If reasoning/thinking is active, tags must start immediately after the closing thought block."}

${buildPhoneticTaskThinkingRules("romanization tags (<1>...</1>)", reasoningEffort)}`;

            return {
                system: phoneticCore,
                user: `Romanize lyrics for: "${artist} - ${title}".
CRITICAL: Do NOT translate the lyrics. Output the pronunciation (phonetic transcription) only (Romaji for Japanese, Romaja/Revised Romanization for Korean, Pinyin for Chinese). Every CJK character MUST be fully transliterated with ZERO Japanese/Korean/Chinese characters remaining.

Input (${lineCount} lines):
${taggedInput}

Output (${lineCount} tags):`
            };
        }

        const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
        const systemPrompt = buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, "tags", reasoningEffort, targetLang, artist, title, trackMetadata);
        const userPromptIntro = langModule.userPromptPreamble
            ? langModule.userPromptPreamble(artist, title)
            : `Translate lyrics to natural, singable ${langModule.name || "Vietnamese"}.\nCRITICAL: Every single line MUST be translated into ${langModule.name || "Vietnamese"}.\n\nSong: ${artist} - ${title}`;

        return {
            system: systemPrompt,
            user: `${userPromptIntro}

Input (${lineCount} lines):
${taggedInput}

Output (${lineCount} tags):`
        };
    },

    /**
     * Builds fallback JSON translation prompt.
     * @param {object} options
     * @param {string} options.artist
     * @param {string} options.title
     * @param {string} options.text
     * @param {boolean} [options.wantSmartPhonetic]
     * @param {boolean} [options.wantFurigana]
     * @param {string} [options.targetLang="vi"]
     * @returns {string}
     */
    buildMinimalFallbackPrompt({ artist, title, text, wantSmartPhonetic = false, wantFurigana = false, targetLang = "vi" }) {
        const lines = text.split("\n");
        const linesJson = JSON.stringify(lines);
        if (wantSmartPhonetic) {
            if (wantFurigana) {
                return `Generate Japanese Furigana. Output valid JSON Array of ${lines.length} strings containing Japanese Kanji wrapped in HTML <ruby> tags for their Hiragana readings. No translation.
Input: ${linesJson}
Output JSON:`;
            }
            return `Romanize lyrics. Output valid JSON Array of ${lines.length} strings containing only the pronunciation (Romaji/Romaja/Pinyin). 1:1 mapping. No translation.
CRITICAL: Every CJK character MUST be fully converted to Latin alphabet. ZERO untransliterated Japanese/Korean/Chinese characters allowed.
Input: ${linesJson}
Output JSON:`;
        }
        const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
        const langName = langModule.name || "Vietnamese";
        return `Translate to ${langName}. Output valid JSON Array of ${lines.length} strings. 1:1 mapping. No merging.
CRITICAL: Every line must be translated to ${langName}. Even if the input is in English, French, Japanese, or any language, DO NOT output or copy the original foreign text.${targetLang === "vi" ? "\nFor love/romantic songs, use natural couple pronouns ('Anh - Em' / 'Em - Anh' / 'Tớ - Cậu'); NEVER output 'tôi yêu bạn'." : ""}
Input: ${linesJson}
Output JSON:`;
    },

    /**
     * Builds fallback tags translation/phonetic prompt.
     * @param {object} options
     * @param {string} options.artist
     * @param {string} options.title
     * @param {string} options.text
     * @param {boolean} [options.wantSmartPhonetic]
     * @param {boolean} [options.wantFurigana]
     * @param {string} [options.targetLang="vi"]
     * @returns {string}
     */
    buildMinimalFallbackTagsPrompt({ artist, title, text, wantSmartPhonetic = false, wantFurigana = false, targetLang = "vi" }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const taggedInput = lines.map((l, i) => `<${i + 1}>${l}</${i + 1}>`).join("\n");
        if (wantSmartPhonetic) {
            if (wantFurigana) {
                return `Generate Japanese Furigana. Output EXACTLY ${lineCount} XML tags (<1>...</1> to <${lineCount}>...</${lineCount}>) containing Japanese Kanji wrapped in HTML <ruby> tags for their Hiragana readings. No translation.
Input:
${taggedInput}
Output:`;
            }
            return `Romanize lyrics. Output EXACTLY ${lineCount} XML tags (<1>...</1> to <${lineCount}>...</${lineCount}>) containing only the pronunciation (Romaji/Romaja/Pinyin). 1:1 mapping. No translation.
CRITICAL: Every CJK character MUST be fully converted to Latin alphabet. ZERO untransliterated Japanese/Korean/Chinese characters allowed.
Input:
${taggedInput}
Output:`;
        }
        const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
        const langName = langModule.name || "Vietnamese";
        return `Translate to ${langName}. Output EXACTLY ${lineCount} XML tags (<1>...</1> to <${lineCount}>...</${lineCount}>). 1:1 mapping. No merging.
CRITICAL: Every line must be translated to ${langName}. Even if the input is in English, French, Japanese, or any language, DO NOT output or copy the original foreign text.${targetLang === "vi" ? "\nFor love/romantic songs, use natural couple pronouns ('Anh - Em' / 'Em - Anh' / 'Tớ - Cậu'); NEVER output 'tôi yêu bạn'." : ""}
Input:
${taggedInput}
Output:`;
    },

    /**
     * Builds structured translation prompt for JSON schema mode.
     * @param {object} options
     * @param {string} options.artist
     * @param {string} options.title
     * @param {string} options.text
     * @param {string} [options.styleKey]
     * @param {string} [options.pronounKey]
     * @param {"off" | "low" | "medium" | "high"} [options.reasoningEffort]
     * @param {string} [options.targetLang="vi"]
     * @param {object|null} [options.trackMetadata]
     * @returns {{ system: string, user: string }}
     */
    buildJsonSchemaTranslationPrompt({ artist, title, text, styleKey = "smart_adaptive", pronounKey = "default", reasoningEffort = "low", targetLang = "vi", trackMetadata = null }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
        const systemPrompt = buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, "json", reasoningEffort, targetLang, artist, title, trackMetadata);
        const userPromptIntro = langModule.jsonSchemaUserPrompt
            ? langModule.jsonSchemaUserPrompt(artist, title, lineCount)
            : `Translate lyrics to natural, singable ${langModule.name || "Vietnamese"}.\nCRITICAL: Every single line MUST be translated into ${langModule.name || "Vietnamese"}. Even if the original text is in English, Japanese, Korean, Chinese, or Latin/Romaji, DO NOT copy or output the original untranslated text.\n\nSong: ${artist} - ${title}`;

        return {
            system: systemPrompt,
            user: `${userPromptIntro}

Input (${lineCount} lines):
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Output: A single JSON object with key "translations" only. The "translations" value must be an array of exactly ${lineCount} ${langModule.name || "Vietnamese"} strings.`
        };
    },

    /**
     * Builds structured phonetic prompt for JSON schema mode.
     * @param {object} options
     * @param {string} options.artist
     * @param {string} options.title
     * @param {string} options.text
     * @param {boolean} [options.wantFurigana]
     * @param {"off" | "low" | "medium" | "high"} [options.reasoningEffort]
     * @returns {{ system: string, user: string }}
     */
    buildJsonSchemaPhoneticPrompt({ artist, title, text, wantFurigana = false, reasoningEffort = "low" }) {
        const lines = text.split("\n");
        const lineCount = lines.length;

        if (wantFurigana) {
            return {
                system: `You are a Japanese Furigana transcriber. Wrap Japanese Kanji characters with HTML <ruby> tags to show their Hiragana readings.
OUTPUT FORMAT (STRICT — JSON ONLY):
1. Output MUST be JSON with key "phonetics" only (no other keys, no markdown fences).
2. "phonetics" MUST be an array of EXACTLY ${lineCount} strings.
3. 1 source line = 1 string. NEVER split, merge, or reorder lines.
4. Empty/whitespace-only source line → "".
5. Wrap Kanji with <ruby>[Kanji]<rt>[Hiragana reading]</rt></ruby>. Do NOT wrap Hiragana, Katakana, English, or punctuation.
6. Keep punctuation, English, and line structure unchanged. No translation, no notes.
7. Example: "新しい朝が来た" -> "<ruby>新<rt>あたら</rt></ruby>しい<ruby>朝<rt>あさ</rt></ruby>が<ruby>来<rt>き</rt></ruby>た".

${buildPhoneticTaskThinkingRules('JSON object (key "phonetics" only)', reasoningEffort)}`,

                user: `Generate Furigana for: "${artist} - ${title}".
CRITICAL: Do NOT translate the lyrics. Output Japanese text with <ruby> tags for Kanji only.

Input (${lineCount} lines):
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Output: JSON with key "phonetics" containing array of ${lineCount} Furigana strings.`
            };
        }

        return {
            system: `${PHONETIC_ROLE}

${PHONETIC_TRANSCRIPTION_STANDARDS}

OUTPUT FORMAT (STRICT — JSON ONLY):
1. Output MUST be JSON with key "phonetics" only (no other keys, no markdown fences).
2. "phonetics" MUST be an array of EXACTLY ${lineCount} strings.
3. 1 source line = 1 string. NEVER split, merge, or reorder lines.
4. Empty/whitespace-only source line → "".
5. CJK romanization: all lowercase. Latin/English in source: keep original casing.
6. Keep punctuation and structural markers; transliterate singable CJK only (no translation, no glosses).
7. Numbers: spoken form per STANDARDS for JP/KR/CN.
8. Mirror quotation marks (「」, "", '') EXACTLY. Do NOT auto-close unclosed quotes.
9. ZERO UNTRANSLITERATED CJK: Every CJK character MUST be transliterated into Latin characters. The array must contain ZERO untransliterated CJK characters.

${buildPhoneticTaskThinkingRules('JSON object (key "phonetics" only)', reasoningEffort)}`,

            user: `Romanize lyrics for: "${artist} - ${title}".
CRITICAL: Do NOT translate the lyrics. Output the pronunciation (phonetic transcription) only (Romaji for Japanese, Romaja/Revised Romanization for Korean, Pinyin for Chinese). Every CJK character MUST be fully converted to Latin alphabet with ZERO untransliterated Japanese/Korean/Chinese characters remaining.

Input (${lineCount} lines):
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Output: JSON with key "phonetics" containing array of ${lineCount} romanized strings.`
        };
    }
};

// Register in namespace (also exposes to global scope for backward compatibility)
if (window.LyricsPlus?.register) {
    window.LyricsPlus.register('Prompts', Prompts);
} else {
    window.LyricsPlus = window.LyricsPlus || {};
    window.LyricsPlus.Prompts = Prompts;
    window.Prompts = Prompts;
}

