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
        role: `You are an acclaimed Vietnamese Songwriter, Lyricist & Lyrical Translator. Your goal is to create an authentic, emotionally resonant V-Pop translation that stays 100% faithful to the source meaning and imagery while flowing naturally like genuine song lyrics.
CORE PRINCIPLE (FAITHFUL LYRICAL TRANSLATION):
Prioritize Semantic & Imagery Fidelity together with Natural Poetic Flow. The listener reads your translation while listening to the original music to understand and feel the song. Never translate rigidly like a machine, but NEVER distort meaning, drop core symbols, or fabricate filler details to force a rhyme.`,
        style: `STRATEGY: "FAITHFUL LYRICAL ADAPTATION & NATURAL PROSODY"
1) Natural Prosody & Vocal Breath (Thay vì đếm âm tiết cơ học):
   - Create natural, flowing Vietnamese lyric phrasing that breathes with the song's emotional pacing.
   - Never translate a short, punchy original line into an overly wordy sentence.
   - Melodic Flow means natural Vietnamese sentence cadence (nhịp 2/2, 3/3, 4/4) and smooth tone harmony (tránh gắt âm, cưỡng âm cuối câu). It DOES NOT mean altering the original text or dropping words to match foreign syllable counts.

2) Symbolic Anchor & Zero Hallucination (Bảo toàn hình tượng & Không bịa đặt):
   - Sacred Visual Imagery: If the source highlights a specific concrete image (e.g., "tấm lưng" - 背中, "đèn đuôi xe", "đêm mưa", "ngã tư", "pháo hoa"), that symbol MUST be preserved in the translation. NEVER discard a central motif just to make a rhyme.
   - Zero Hallucination: Do NOT invent extra actions, storylines, or fake emotional declarations not found in the original lyrics.

3) Natural Vocabulary & Subject-Predicate Flow:
   - Prefer natural, emotionally resonant modern Vietnamese vocabulary. Avoid heavy, stiff, or archaic Sino-Vietnamese (Hán-Việt) terms unless requested.
   - Coherent Subject-Predicate Flow: Preserve clear actor-action relationships. Do NOT drop subjects arbitrarily so that lines become floating, severed verb phrases without a clear actor.
   - Avoid mechanical repetition of pronouns on every line, but ALWAYS maintain grammatical clarity on who is feeling or acting.

4) CJK & J-Pop Narrative, Grammar & Enjambment:
   - Identify character dynamics and persona (Boku/Kimi -> Tớ-Cậu / Anh-Em; Watashi/Anata -> Em-Anh / Tôi-Cậu; Ore/Omae -> Anh-Em / Tao-Mày). Maintain locked persona throughout.
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
     * 私 (Watashi) / あなた (Anata): Mature, polite or female perspective -> "Em - Anh" or "Tôi - Cậu".
     * 俺 (Ore) / お前 (Omae): Direct, bold youth/rivalry -> "Anh - Em", "Tao - Mày" or "Tôi - Cậu".
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
PRONOUN & PERSONA DISCIPLINE (INTELLIGENT CONTEXT-AWARE SYSTEM):
${trackContext ? `${trackContext}\n` : ''}
CORE PRINCIPLE: Vietnamese pronoun selection dictates the entire emotional authenticity of the song. The AI MUST determine the singer's gender/identity and relationship dynamics based on the Artist name, lyrics, and song theme.

1) SINGER GENDER & POV ANCHORING (HIGHEST PRIORITY):
- Cross-reference the artist name ("${artist || 'Artist'}") to determine biological/vocal perspective:
  * FEMALE ARTIST IN ROMANCE (e.g., Aimer, YOASOBI/ikura, milet, Yorushika/suis, ZUTOMAYO/ACAね, IU, Taeyeon, Taylor Swift, Billie Eilish, Adele, Olivia Rodrigo, G.E.M...):
    -> First-person (I/me) MUST be "Em", Second-person (you) MUST be "Anh" (or "Tớ - Cậu" for youthful indie/teen-pop).
    -> ABSOLUTE RULE: A female singer singing a romantic song MUST NEVER call herself "Anh" and refer to a male lover as "Em".
  * MALE ARTIST IN ROMANCE (e.g., Kenshi Yonezu, Fujii Kaze, Eve, Radwimps, Ed Sheeran, Bruno Mars, The Weeknd, Châu Kiệt Luân, Vũ., Hoàng Dũng...):
    -> First-person MUST be "Anh", Second-person MUST be "Em" (or "Tớ - Cậu" for youthful/school theme).
  * YOUTH / FRIENDSHIP / COMING-OF-AGE (School life, anime adventure, innocent dreams, camaraderie):
    -> Regardless of singer gender, use "Tớ - Cậu" or "Mình - Cậu".
  * INTROSPECTIVE / MONOLOGUE / PHILOSOPHICAL (Self-reflection, depression, society, solitude):
    -> Use "Tôi" or "Ta" (or maintain neutral phrasing without forcing a second-person pronoun).
  * STREET / HIP-HOP / CONFLICT / DISS TRACK (Eminem, Kendrick Lamar, Rap, battle):
    -> Use "Tao - Mày" or "Tôi - Ông".
  * DUET / FEATURING SONGS:
    -> If the track features both male and female vocalists, adapt dynamically: male verses use "Anh - Em", female verses use "Em - Anh".

2) MULTI-LANGUAGE SOURCE CLUES (ENGLISH, KOREAN, CHINESE, JAPANESE):
- ENGLISH (I / You, Me / My): English pronouns are gender-neutral. ALWAYS use the Artist persona and song emotion to resolve "I - You" into the appropriate Vietnamese pair (Female -> Em-Anh; Male -> Anh-Em; Youth -> Tớ-Cậu; Rap -> Tao-Mày).
- KOREAN (나/너, 저/당신, 그대, 오빠, 누나):
  * 나 (Na) / 너 (Neo): Casual/intimate -> Anchor to singer gender: Female -> "Em - Anh"; Male -> "Anh - Em"; Youth -> "Tớ - Cậu".
  * 그대 (Geudae) / 당신 (Dangsin): Poetic ballad/OST -> "Anh - Em" or "Em - Anh" or "Ta - Người".
  * 오빠 (Oppa) -> "Anh" (singer is female); 누나 (Noona) -> "Chị" (singer is male).
- CHINESE (我/你, 宝贝, 亲爱的, 姑娘):
  * 我 (Wǒ) / 你 (Nǐ): Anchor to singer gender (Female -> "Em - Anh", Male -> "Anh - Em").
  * Cổ phong / Kiếm hiệp / Phim cổ trang: "Ta - Chàng" / "Thiếp - Chàng" / "Ta - Nàng" / "Ta - Ngươi" according to narrative context.
- JAPANESE (僕, 私, 俺, あなた, 君, お前):
  * CRITICAL J-POP BOKU (僕) LAW: Female lyricists and vocalists in J-Pop/Anime (YOASOBI, LiSA, suis, Aimer...) very frequently use "僕" (Boku) as a gender-neutral or poetic persona. DO NOT automatically assume "僕" means the singer is male! If the artist is female, "僕" addressing a lover MUST be translated as "Em", NOT "Anh"!
  * 俺 (Ore) / お前 (Omae): Strong masculine -> "Anh - Em", "Tao - Mày", or "Tôi - Cậu".

3) SENTENCE TYPE PRESERVATION & ANTI-FORCING LAW:
- DO NOT force pronouns or artificial subjects/predicates into lines that have none!
  * Atmospheric & Scenery Lines (Bầu trời, đêm mưa, gió lạnh, đường phố): Translate pure imagery without fabricating "Anh/Em". Example: "Blue sky" -> "Bầu trời xanh" (NEVER invent "Anh nhìn bầu trời xanh").
  * Noun Phrases & Poetic Impressions: Example: "雨の夜" -> "Đêm mưa rơi" (NEVER invent "Đêm mưa rơi nhớ em"). Example: "Sweet memories" -> "Ký ức ngọt ngào" (NEVER invent "Anh nhớ ký ức ngọt ngào").
  * Impersonal / Internal Reflections: Example: "It's midnight already" -> "Đã nửa đêm rồi" (Keep impersonal; do not force second-person address).
- Action Lines with Subjects: Clearly maintain Subject-Verb-Object (S-V-O) logic. Do NOT drop pronouns so aggressively that sentences become floating, headless verb fragments.
- When pronouns are used, stick strictly to the locked pair throughout the song. DO NOT force pronouns into lines that are purely scenery, noun phrases, or impersonal reflections.
- AVOID "Tôi - Bạn" unless strictly formal/educational. It sounds stiff and unmusical in Vietnamese songs.
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

[REGISTER & PERSONA LOCK]
1. ANTI-PERSONA: Absolutely DO NOT use the tone, vocabulary, or tropes of translated Chinese web novels, Wuxia, Xianxia, or literal textbook translations (e.g., avoid "nhổ một tiếng", "ái tình", "thiên thu"). Do NOT translate structurally like a robot (e.g., repeating "[Noun] + dùng để + [Verb]").
2. TARGET PERSONA: You are a professional modern V-Pop/Indie lyricist (e.g., style of Chillies, Ngọt, Vũ., Hoàng Dũng). Your language must be natural, conversational yet poetic, grounded in reality, and deeply singable.

[CONTEMPORARY V-POP DICTION & ANTI-CLICHÉ LAW]
Avoid archaic, artificial, or formulaic literary clichés (từ ngữ ước lệ sáo rỗng thời Thơ Mới / tiểu thuyết cũ):
- Motion & Sensation: Avoid theatrical clichés like "chao nghiêng", "khẽ khàng", "nỉ non" -> Use natural, grounded words like "chao đảo", "nghiêng ngả", "lung lay", "nhẹ nhàng", "lặng lẽ", "thì thầm".
- Perception & Cognitive Verbs: Avoid archaic pseudo-poetic compounds like "tỏ tường", "thấu suốt", "thấu tỏ", "thấu triệt" -> Use everyday pure Vietnamese structures: [Verb] + [ra / rõ / được / thấy] (e.g., "hiểu ra", "nhận rõ", "biết được", "thấy rõ").
- Academic & Abstract Nouns: When encountering abstract, biological, or philosophical terms in J-Pop (e.g., 細胞, 美学, 煩悩), paraphrase them into relatable human emotional states without changing the core imagery.

[MELODIC ALIGNMENT & DYNAMIC EQUIVALENCE]
1. Natural Phrasing: Shape the Vietnamese phrasing to match the natural breath and emotional pacing of the song.
2. Tonal Flow (Tránh Cưỡng Âm): Avoid stacking heavy/sharp tones (thanh trắc: sắc, nặng) awkwardly at phrase endings.
3. Imagery Integrity: Transcreate actions for emotional resonance, but preserve original intensity without over-dramatizing.

[MASTERCLASS EXEMPLARS (FEW-SHOT)]
- Example 1 (Handling Raw Actions): 転んで足元つばを吐いた -> Vấp ngã giữa đời, bực dọc buông tiếng thở dài.
- Example 2 (Restraint on Surreal Imagery): 雀の啄む逆さ富士 -> Đàn sẻ nhỏ mổ xuống bóng Phú Sĩ in ngược.`;
}

/**
 * Builds the flow and punctuation section of the prompt.
 * @returns {string}
 */
function buildTranslationFlowPunctuation() {
    return `FLOW & PUNCTUATION:
1) Use natural Vietnamese phrasing.
2) If a sentence continues to the next line (Enjambment), do NOT end the current line with a comma.
3) Map emotional interjections to "Ah". Do not use "Ôi". Keep vocal sounds (Yeah, La la, Oh, Ah) unchanged.
4) You may reorder phrases WITHIN a line for natural Vietnamese word order, but preserve meaning.`;
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
In <thought>, outline in 1-2 brief sentences the artist persona, singer gender/POV, locked pronoun pair (e.g., Em-Anh for female artist in romance, Anh-Em for male artist in romance, Tớ-Cậu for youth/anime), and anchor core imagery/motifs (never drop key symbols or force end-rhyme that alters meaning).
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
        role: `You are an acclaimed English Songwriter, Lyricist & Lyrical Translator. Your goal is to create an authentic, emotionally resonant contemporary English translation that stays 100% faithful to the source meaning and imagery while flowing naturally like genuine song lyrics.
CORE PRINCIPLE (FAITHFUL LYRICAL TRANSLATION):
Prioritize Semantic & Imagery Fidelity together with Natural Poetic Flow. The listener reads your translation while listening to the original music to understand and feel the song. Never translate rigidly like a machine, but NEVER distort meaning, drop core symbols, or fabricate filler details to force a rhyme.`,
        style: `STRATEGY: "FAITHFUL LYRICAL TRANSLATION & CONTEMPORARY PROSODY"
1) Natural Cadence & Vocal Prosody (No Syllable-Counting Trap):
   - Match the emotional cadence, breath pacing, and natural rhythm of contemporary English lyrics.
   - Melodic Flow means natural phrasing and evocative diction. It DOES NOT mean discarding key words or altering meaning to force an artificial syllable count or end-rhyme scheme (AABB/ABAB).

2) Symbolic Anchor & Zero Hallucination:
   - Sacred Visual Imagery: If the source highlights a specific concrete image (e.g., "looking at someone's back" in Senaka, "taillights", "crossroad", "rain"), that symbol MUST be preserved in the translation. NEVER drop a central motif to create a rhyme (e.g., never replace "back" with "goodbye").
   - Zero Hallucination: Do NOT invent filler lines, fake narrative twists, or clichéd pop fillers ("baby", "oh yeah", "under the sky") not found in the original lyrics.

3) Natural Diction & Sentence Type Preservation:
   - Use evocative, natural contemporary English songwriting vocabulary. Avoid robotic translationese.
   - Atmospheric / Scenery lines (e.g., "Blue sky", "Rainy night"): Preserve as pure evocative imagery. DO NOT fabricate artificial subjects (never invent "I see the blue sky").
   - Action lines: Maintain clear subject-verb agreement and logical flow.

4) CJK / Foreign Cultural Metaphors:
   - Accurately adapt East Asian cultural idioms, seasonal motifs (cherry blossoms, cicadas, fireworks), and unexpressed emotions into resonant English poetic language rather than awkward literal dictionary glosses.
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

[ANTI-MACHINE & NATURAL SONGWRITING LAW]
1. ANTI-PERSONA: Do NOT write like a robotic machine translator, textbook, or dry subtitle.
2. TARGET PERSONA: Sound like an authentic contemporary singer-songwriter. Lines should feel like genuine song lyrics.

[SENTENCE TYPE PRESERVATION]
- Atmospheric / Scenery lines (e.g., "Bầu trời xanh", "雨の夜"): Translate as pure imagery. DO NOT invent fake subjects ("I see...").
- Action lines: Keep clean Subject-Verb-Object clarity.`;
}

function buildTranslationFlowPunctuationEN() {
    return `FLOW & PUNCTUATION:
1) Use natural English song lyric phrasing and standard capitalization.
2) Enjambment: When a sentence carries over to the next line, ensure the two lines flow seamlessly together.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, La la) cleanly.`;
}

const STYLE_INSTRUCTIONS_JA = {
    "smart_adaptive": {
        role: `You are an acclaimed Japanese Lyricist & Lyrical Translator (作詞家・訳詞家). Your goal is to translate foreign lyrics into natural, singable, and evocative J-Pop lyrics while staying 100% faithful to the source meaning and imagery.
CORE PRINCIPLE: 原文の持つ情景、比喩、感情の核（コア）を100%忠実に継承しつつ、J-Popの洗練された詩的表現（自然なメロディと言葉の調和）へと昇華させる。韻や字数合わせのために原詩の重要モチーフを切り捨てたり、存在しない描写を捏造することは厳禁。`,
        style: `STRATEGY: "FAITHFUL J-POP LYRICISM & POETIC RESONANCE"
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

[ANTI-MACHINE & NATURAL SONGWRITING LAW]
1. ANTI-PERSONA: Do NOT produce dry translationese (直訳調・翻訳調を排斥). Lines must feel like real J-Pop lyrics.
2. SENTENCE TYPE PRESERVATION: Atmospheric/scenery lines must be pure imagery (体言止め). NEVER invent fake subjects.`;
}

function buildTranslationFlowPunctuationJA() {
    return `FLOW & PUNCTUATION:
1) Natural Japanese lyric phrasing without full stops (。) at line endings.
2) Enjambment: Ensure multi-line thoughts flow smoothly into the next line.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, ララ) naturally.`;
}

const STYLE_INSTRUCTIONS_KO = {
    "smart_adaptive": {
        role: `You are a professional Korean Lyricist & Lyrical Translator (작사가 및 가사 번역가). Your goal is to translate foreign lyrics into natural, singable, and emotionally resonant Korean lyrics while staying 100% faithful to the source meaning and imagery.
CORE PRINCIPLE: 원곡의 핵심 메시지, 감정선, 상징적 심상을 100% 온전히 보존하면서, K-Pop / K-Ballad 특유의 서정적이고 입에 감기는 노랫말로 번역한다. 각운이나 글자 수를 맞추기 위해 원문의 중요 상징을 누락하거나 허구의 내용을 지어내서는 안 된다.`,
        style: `STRATEGY: "FAITHFUL K-POP LYRICISM & MELODIC FLOW"
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

[ANTI-MACHINE & NATURAL SONGWRITING LAW]
1. ANTI-PERSONA: Do NOT write robotic machine translations (번역투 배제). Sound like an authentic K-Pop lyricist.
2. SENTENCE TYPE PRESERVATION: Atmospheric/scenery lines must stay as evocative imagery. NEVER invent fake subjects ("내가", "난").`;
}

function buildTranslationFlowPunctuationKO() {
    return `FLOW & PUNCTUATION:
1) Natural Korean lyric spacing and rhythmic phrasing.
2) Enjambment: Seamless transition across connected lines.
3) Vocal ad-libs: Keep interjections (Oh, Yeah, Ah, 라라) naturally.`;
}

const STYLE_INSTRUCTIONS_ZH = {
    "smart_adaptive": {
        role: `You are an acclaimed Chinese Lyricist & Lyrical Translator (华语作词人、译词人). Your goal is to translate foreign lyrics into natural, singable, and poetic Chinese lyrics (Mandopop style) while staying 100% faithful to the source meaning and imagery.
CORE PRINCIPLE: 忠实传承原曲的情感内核与核心意象，以优美流畅、富有乐感的华语流行歌词语言呈现。绝不可为了强行押韵或凑字数而删减原曲重要意象或随意编造虚假情节。`,
        style: `STRATEGY: "FAITHFUL MANDOPOP LYRICISM & POETIC CADENCE"
1) 核心意象忠实保全 (Symbolic Anchor & Zero Hallucination):
   - 必须完整保留原词中的关键视觉与象征意象（如：背影、尾灯、雨夜、十字路口等），不可为了叶韵而遗漏核心词汇。
   - 严禁为了凑字数而凭空捏造原词不存在的叙事或套话。
2) 优美乐感与自然语感 (Natural Prosody):
   - 摒弃生硬机翻腔，运用华语歌词自然的起承转合与长短句节奏，使歌词读来顺畅入耳。
3) 意境白描与句式保全 (Sentence Type Preservation):
   - 纯风景与意境白描绝不强行添加虚假主语（如“我看见”），保持诗意留白。`,
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
2. 杜绝虚构与填充 (Zero Hallucination): 切勿任意添加原词没有的套路性修辞或无意义填充词。
3. 意境优先，自然押韵: 押韵必须建立在意义精准的基础之上，绝不容许为韵害意。

[ANTI-MACHINE & NATURAL SONGWRITING LAW]
1. ANTI-PERSONA: Do NOT write rigid machine translations (摒弃机翻腔和生硬直译). Sound like an authentic Mandopop lyricist.
2. SENTENCE TYPE PRESERVATION: Atmospheric/scenery lines must stay as poetic imagery (意境白描). NEVER invent fake subjects ("我看见").`;
}

function buildTranslationFlowPunctuationZH() {
    return `FLOW & PUNCTUATION:
1) Natural Chinese lyric phrasing, balanced line cadence, no periods at line ends.
2) Enjambment: Seamless phrasing across line breaks.
3) Vocal ad-libs: Preserve interjections (Oh, Yeah, Ah, 啦啦) naturally.`;
}

const STYLE_INSTRUCTIONS_UK = {
    "smart_adaptive": {
        role: `You are a professional Ukrainian Songwriter, Poet & Lyrical Translator (Український автор пісень, поет та перекладач). Your goal is to translate foreign lyrics into melodic, singable, and emotionally rich Ukrainian lyrics while staying 100% faithful to the source meaning and imagery.
CORE PRINCIPLE: Prioritize Semantic & Imagery Fidelity together with Natural Melodic Flow (милозвучність української мови). The listener reads your translation while listening to the original music to understand and feel the song. Never translate rigidly like a machine, but NEVER distort meaning, drop core symbols, or fabricate filler details to force a rhyme.`,
        style: `STRATEGY: "FAITHFUL UKRAINIAN LYRICISM & MELODIC FLOW"
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

[ANTI-MACHINE & NATURAL SONGWRITING LAW]
1. ANTI-PERSONA: Do NOT write robotic machine translations. Sound like an authentic Ukrainian singer-songwriter.
2. SENTENCE TYPE PRESERVATION: Atmospheric/scenery lines must stay as pure imagery. NEVER fabricate artificial subjects ("Я бачу").`;
}

function buildTranslationFlowPunctuationUK() {
    return `FLOW & PUNCTUATION:
1) Natural Ukrainian lyric phrasing and standard capitalization.
2) Enjambment: Flow seamlessly across line breaks.
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
 * Builds the translation system prompt.
 * @param {number} lineCount - Number of lines in the lyrics
 * @param {string} styleKey - The chosen style key
 * @param {string} pronounKey - The chosen pronoun mode key
 * @param {"json" | "tags"} mode - Output format mode
 * @param {"off" | "low" | "medium" | "high"} effort - Reasoning effort level
 * @param {string} [targetLang="vi"] - Target language code
 * @param {string} [artist=""] - Artist name
 * @param {string} [title=""] - Song title
 * @returns {string} The full system prompt string
 */
function buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, mode, effort = "low", targetLang = "vi", artist = "", title = "") {
    const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
    const styleObj = (langModule.styles && langModule.styles[styleKey]) || STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS.smart_adaptive;
    const pronounSection = (langModule.hasPronouns && langModule.buildPronounSection)
        ? langModule.buildPronounSection(pronounKey, styleObj, artist, title)
        : "";
    const outputBlock = langModule.buildOutputTagsBlock
        ? (mode === "json" ? langModule.buildOutputJsonBlock(lineCount) : langModule.buildOutputTagsBlock(lineCount))
        : (mode === "json" ? buildTranslationOutputJsonBlock(lineCount) : buildTranslationOutputTagsBlock(lineCount, langModule.name));
    const thinkingLabel = mode === "json" ? "JSON object" : "tags";

    const parts = [
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
     * @returns {{ system: string, user: string }}
     */
    buildPromptEngPrompt({ artist, title, text, styleKey = "smart_adaptive", pronounKey = "default", wantSmartPhonetic = false, wantFurigana = false, reasoningEffort = "low", targetLang = "vi" }) {
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
        const systemPrompt = buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, "tags", reasoningEffort, targetLang, artist, title);
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
CRITICAL: Every line must be translated to ${langName}. Even if the input is in English, French, Japanese, or any language, DO NOT output or copy the original foreign text.
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
CRITICAL: Every line must be translated to ${langName}. Even if the input is in English, French, Japanese, or any language, DO NOT output or copy the original foreign text.
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
     * @returns {{ system: string, user: string }}
     */
    buildJsonSchemaTranslationPrompt({ artist, title, text, styleKey = "smart_adaptive", pronounKey = "default", reasoningEffort = "low", targetLang = "vi" }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const langModule = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.vi;
        const systemPrompt = buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, "json", reasoningEffort, targetLang, artist, title);
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

