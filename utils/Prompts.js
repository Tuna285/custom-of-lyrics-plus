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

3) Natural Vocabulary, Sentence Type & Subject-Predicate Flow:
   - Prefer natural, emotionally resonant modern Vietnamese vocabulary. Avoid heavy, stiff, or archaic Sino-Vietnamese (Hán-Việt) terms unless requested.
   - Atmospheric / Scenery lines (Câu tả cảnh / Danh ngữ - 体言止め): Preserve as pure evocative imagery (e.g., "Bầu trời xanh thẳm", "Đêm mưa rơi"). DO NOT fabricate artificial subjects (never invent "Anh thấy bầu trời xanh" or "Tớ nhìn đêm mưa").
   - Action & Emotional lines: Preserve clear actor-action relationships. Do NOT drop subjects arbitrarily when translating verb-heavy lines so that they become floating, severed verb phrases without a clear actor.
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
        role: `You are a Poet & Lyrical Adapter. Your goal is to make the Vietnamese lyrics sound beautiful, romantic, and singable while remaining faithful to the source imagery.`,
        style: `STRATEGY: "POETIC IMAGERY"
1) Vocabulary: Use evocative, musically poetic Vietnamese diction.
   - Examples: "Hoài mong" (longing), "Tương tư" (yearning), "Ngóng chờ" (awaiting).
   - "Sky" -> "Bầu trời" or "Khoảng trời" depending on mood.
   - "Miss you" -> "Nhớ thương" / "Hoài mong".

2) Flow & Rhythm:
   - Use soft, melodic phrasing and natural modal particles ("nhé, chăng, ư") only where the original tone invites them.
   - Constraint: Do NOT be cheesy (sến) and never inject clichéd filler vocatives ("người hỡi", "em ơi") not present in the source. Keep it elegant.`,
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
  * Check BOTH the performing artist's persona (Artist name in Track Context / Track Metadata) AND the whole-song narrative—do NOT flip the singer's gender over a single figurative line, costume detail, or quoted phrase.
  * Female singer addressing a partner -> "Em - Anh" (First-person: "Em", Second-person: "Anh").
    (Note: In Japanese lyrics, female singers often use "僕" (boku) poetically; translate as "Em - Anh", not "Anh").
  * Male singer addressing a partner -> "Anh - Em" (First-person: "Anh", Second-person: "Em").
  * If the artist gender is unknown or ambiguous -> Default to standard Vietnamese lyrical convention: "Anh - Em".
- ABSOLUTE BAN ON "TÔI YÊU BẠN": In any love song or romantic line, NEVER translate "I love you" / "君が好き" / "사랑해" as "Tôi yêu bạn" or "Tôi nhớ bạn". This sounds robotic and completely unmusical in Vietnamese songs.

2) OTHER GENRES & RELATIONSHIPS:
- Youth / School / Anime / Consoling a friend: Use "Tớ - Cậu" or "Tôi - Cậu".
- Introspective Monologue / Literary Self-Dialogue: Use "Ta - Ngươi" when confronting an inner self/instinct (e.g., "俺 / お前"), or "Ta" / "Tôi" for solitary reflection (keep subjects implicit where natural).
- Street / Rap / Hip-Hop / Diss: Use "Tao - Mày".
- True Duets (Clear alternating male and female singing lines): Male parts use "Anh - Em", female parts use "Em - Anh".

3) SINGLE PERSONA LOCK & GENERIC "YOU" EXCEPTION (MANDATORY):
- Choose EXACTLY ONE relational pronoun pair for speaker <-> addressee and LOCK IT consistently from first line to last line. NEVER swap personas for the addressed partner.
- Generic / Impersonal "You" Exception: When a reflective line clearly uses "you" universally for people in general or the human condition rather than addressing the partner directly (e.g., "you bleed just to know you're alive"), render it impersonally ("người ta", "ta", "ai đó", or subjectless Vietnamese) instead of forcing the partner pronoun there.

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
- DO NOT swap or use any other pronouns for the addressed person. This is a hard rule.
- If monologue (no second person), use only "${first}".
- DO NOT force pronouns into purely scenery lines, noun phrases, impersonal descriptions, or universal truths where "you" means people in general rather than the addressee.
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
 * @param {string} [styleKey="smart_adaptive"] - The chosen translation style key
 * @returns {string}
 */
function buildTranslationGuardrails(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. Read the entire lyrics first to understand grammatical relationships across lines, especially multi-line relative clauses (連体修飾) and enjambments.
2. Direct Semantic Precision: Prioritize accurate, transparent meaning and grammatical structure so language learners can map each Vietnamese phrase back to the source line.
3. Repetition Fidelity: When words or phrases are repeated in the source, repeat the exact same Vietnamese word without synonym substitution or omission.
4. Zero Hallucination: Do NOT add filler words or invented context.`;
    }

    const isVintage = styleKey === "vintage_classic";
    const hanVietBanRule = isVintage
        ? `4. HARD BAN ON FORBIDDEN AI CLICHÉS: Absolutely NEVER use "chao nghiêng" (hoặc "khẽ chao nghiêng") or "khẽ khàng".`
        : `4. ANTI-KANJI-TO-HÁN-VIỆT CALQUE (CRITICAL FOR JP/ZH): NEVER map Japanese Kanji or Chinese characters mechanically into stiff Sino-Vietnamese (Hán-Việt) cognates based on character form. Grasp the living, spoken meaning first, then render in natural, grounded modern Vietnamese (thuần Việt).
5. HARD BAN ON FORBIDDEN AI TICS & HEAVY HÁN-VIỆT: Absolutely NEVER use these lazy clichés or heavy Hán-Việt terms in modern lyrics: "chao nghiêng", "khẽ chao nghiêng", "khẽ khàng", "thấu tỏ", "tỏ tường", "vương vấn", "tâm can", "lệ nhòa", "thế nhân", "trần thế", "nhân thế", "nơi chốn", "buông tiếng thở dài". Use natural everyday thuần Việt instead (nhẹ nhàng, khẽ, hiểu rõ, bận lòng, rơi lệ, nơi/chốn, đời...).`;

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Before translating line by line, ingest the entire lyrics from first line to last line as one unified emotional story:
1. Story Arc & Cohesion: Understand the narrative journey (Intro/Verse -> Chorus -> Outro) so every line connects with the whole instead of standing as a disconnected fragment.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs & Metaphor Chains: Core visual symbols, metaphors, and titular imagery MUST be preserved 100%. Keep paired metaphors across the song in the SAME image field instead of breaking them apart across lines.
2. Idioms, Double Negatives & Wordplay: Decode double negatives into their true affirmative/negative sense, translate idioms figuratively, and carry over double entendres/puns creatively rather than translating word-for-word.
3. Zero Hallucination & Meaning Over Rhyme: Do NOT invent extra actions or clichéd fillers ("người hỡi", "em ơi", "trong đêm vắng"). Rhyme is secondary; never bend imagery or meaning to force a rhyme.

[REGISTER, DICTION & ARTISTIC VOICE]
1. ANTI-PERSONA & ZERO DOMESTICATION: Never flatten foreign rock, indie, rap, or J-Pop into generic V-Pop ballad clichés, Wuxia/Xianxia prose, or dry textbook translationese. Channel the ORIGINAL ARTIST's exact intensity and worldview.
2. NATURAL COLLOQUIAL & POETIC DICTION:
   - Never slip dry administrative, accounting, legal, clinical, or anatomical glosses into emotional/street lyrics (e.g., match poetic/lived sense instead of officialese or dictionary labels).
   - Distinguish hip-hop brag/swagger and affectionate teasing from stiff literal cursing or harsh scolding.
   - Preserve emotional tension in Japanese sentence-final particles (e.g., tough "俺" paired with soft "〜の / 〜かな / 〜よ" -> reflect gentle cadence instead of flat statements).
3. BAN ON MECHANICAL "TÔI - BẠN" IN ROMANCE: Never translate intimate/romantic lines as "Tôi yêu bạn" or "Tôi nhớ bạn"; use natural pairs ("Anh - Em", "Em - Anh", "Tớ - Cậu").
${hanVietBanRule}

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
When words, phrases, or chants repeat in the source ("ano kaze ano kaze", "itai itai itai"):
1. Exact Lexical Repetition: Repeat the EXACT same Vietnamese word ("Cơn gió ấy, cơn gió ấy"; "Đau đớn, đau đớn, đau đớn") — NEVER swap with synonyms ("cơn gió ấy, làn gió ấy"), NEVER collapse, and NEVER pad tails.

[TEMPORAL PROGRESSION, ENJAMBMENT & ACTIVE FLOW]
1. Within-Line Temporal Sync: Inside standalone lines, keep idea flow aligned left-to-right with the audio as closely as natural Vietnamese allows.
2. Multi-Line Enjambment & CJK SOV (CRITICAL): Read the FULL 2–3 line sentence/modifier block (e.g., 連体修飾 or 〜を at line boundaries) BEFORE writing Vietnamese verbs. Keep **active voice** cleanly via Topic-Comment (Khởi ngữ) or balanced clause splits across the 1:1 lines—NEVER flip an active phrase into awkward passive ("Bị...") just to patch line order, and NEVER strand orphan prepositions/conjunctions (cho, vì, của, rằng, bởi) at the end of line <n>.
3. Topic-Comment & Scenery Lines: Put topicalized nouns up front without dangling comma tails; preserve pure scenery/noun-ending lines as imagery without inventing subjects ("Anh thấy...", "Em nhìn...").

[CORE EXEMPLARS]
- Visceral Restraint: 転んで足元つばを吐いた -> Vấp ngã rồi nhổ một bãi nước bọt xuống chân.
- Multi-Line SOV Enjambment (Active Voice): <1>戻れないあの時の道が私の手を</1>\n<2>ささくれで刺していくんだ</2> -> <1>Con đường ngày ấy chẳng thể quay về</1>\n<2>cứ dùng những vết dằm đâm vào tay em</2> (NEVER invert to passive 'Bị...').
- EN Enjambment (No Hanging Preposition): <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>Tốt hơn cậu hãy để dành</1>\n<2>cho lúc nửa đêm</2>.
- Topic-Comment & Repetition: 行く末を 行く末を 越えてゆくことが今 -> Tương lai ấy, tương lai ấy, giờ đây ta sẽ vượt qua. / 痛い 痛い 痛い -> Đau đớn, đau đớn, đau đớn.`;
}

/**
 * Builds the flow and punctuation section of the prompt.
 * @returns {string}
 */
function buildTranslationFlowPunctuation() {
    return `FLOW, INTERJECTIONS & PUNCTUATION:
1) Use natural Vietnamese phrasing that flows smoothly with the singing rhythm.
2) Enjambment: If a sentence continues into the next line, do NOT end the current line with a comma or strand hanging prepositions/conjunctions (cho, vì, của, rằng, bởi) at the end of line <n>.
3) Interjections & Vocal Ad-libs:
   - Keep standalone vocal ad-lib lines (Oh yeah, La la, Woo, Hmm) as-is.
   - Omit redundant inline/trailing breath fillers attached to sentences (uh, oh, ah, yah) when they disrupt natural Vietnamese flow.
   - Expressive literary exclamations (e.g., 嗚呼 / あぁ) -> adapt organically to tone ("À", "Ôi", "A", "Chao ôi") instead of forcing English "Ah". Do not overuse "Ôi" in casual pop.
   - Melodic stutters ("lo-lo-love") -> render rhythmically ("t-tình yêu", "y-yêu") rather than choppy literal repeats.
4) Avoid dangling fragments, trailing comma-stubs, and repetitive redundant noun doubles.`;
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

    if (effort === "high") {
        return `THINKING PROCESS RULES (Deep Deliberation):
${hygiene}

[PRE-FLIGHT REASONING GUIDE (DEEP)]
In <thought>, analyze the song's narrative arc, artist/speaker POV (cross-checked with Artist metadata), locked relational pronoun persona vs. any generic-"you" lines, recurring metaphor chains, slang/idiom non-literal intent, and any multi-line enjambments or CJK SOV clauses whose break points need rebalancing across lines. Once resolved, close </thought> and output the final ${finalOutputLabel} once cleanly without redrafting the entire song inside thought.`;
    }

    if (effort === "medium") {
        return `THINKING PROCESS RULES (Medium Effort):
${hygiene}

[PRE-FLIGHT REASONING GUIDE (BALANCED)]
In <thought>, briefly map out (< 150 words) the song's emotional arc, artist/speaker POV & locked pronoun persona, paired metaphors/non-literal slang to preserve, and how any tricky multi-line sentences (CJK SOV / enjambments) connect cleanly across lines. Do not draft line-by-line translations in thought. Output the ${finalOutputLabel} immediately after </thought>.`;
    }

    return `THINKING PROCESS RULES (Concise Planning):
${hygiene}

[PRE-FLIGHT REASONING GUIDE (CONCISE)]
In <thought>, outline in 1-2 brief sentences (< 60 words) the song narrative and relationship dynamic, artist persona (check Artist metadata), locked pronoun/register choice, paired metaphors, and multi-line enjambment joints. Never list lines or draft line-by-line translations in thought. Start outputting translation tags/JSON immediately after </thought>.`;
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
2) Do not output chain-of-thought, scratchpad lists, or reasoning text in the final output. If your model emits reasoning tokens, keep them strictly in its native reasoning channel or inside <thought>...</thought> before the ${finalOutputLabel}, never inside it.
3) Skip deliberation and write the ${finalOutputLabel} immediately.`;
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

4) CJK Enjambment, Pre-Nominal Clauses & Cultural Nuance:
   - Japanese and Korean place long modifying clauses before nouns (連体修飾) and often split a single sentence across multiple lines (enjambment). Read the full multi-line sentence first and restructure naturally so each English line flows coherently without dangling fragments.
   - Accurately adapt cultural idioms, seasonal motifs, and unexpressed emotions into resonant English poetic language rather than awkward literal dictionary glosses.
   - Transcreate onomatopoeia/mimetic words (e.g., ぎゅっと, ふわり, ドキドキ) into vivid verbs and sensory descriptions.`,
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
2) Enjambment & Narrative Continuity: Capture the emotional story arc across verse, pre-chorus, and chorus climaxes, restructuring multi-line Japanese/Korean modifier clauses into natural, connected English lines.`,
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

function buildTranslationGuardrailsEN(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. Read the entire lyrics first to understand multi-line clauses and grammatical relationships.
2. Direct Semantic Precision: Prioritize accurate, transparent meaning and grammatical equivalence for language learners.
3. Repetition Fidelity: Repeat the exact same English word when the source repeats a word or phrase.`;
    }

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story. Never translate lines in complete isolation.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs & Metaphor Chains: Core visual symbols, metaphors, and titular imagery (e.g., "looking at someone's back", "taillights", "crossroad", "rain") MUST be 100% preserved. Keep paired metaphors across the song in ONE consistent image field (e.g., if the chorus asks to "stitch me up", translate an earlier sewing/thread image in that same thread family rather than abstractly as "shattered").
2. Idioms, Double Negatives & Literary Glosses: Decode double negatives into clear natural English intent, translate idioms figuratively rather than literally, and pick poetic/literary senses over clinical anatomy or legal jargon (e.g., literary Japanese 瞼 -> "eyes / gaze / lashes", not clinical "eyelids"; artistic 世界を犯す -> "defy / shatter the world", not legalistic "violate").
3. Zero Hallucination & Filler: Do NOT inject invented storylines, secondary actions, or clichéd fillers ("baby", "under the sky", "holding you tight") not present in the source text.
4. Meaning Over Rhyme: Rhyme is secondary; poetic meaning and imagery are supreme. Never compromise the author's message or emotional intent for an end-rhyme.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: Absolutely DO NOT rewrite the song into generic Western pop, acoustic ballad, or radio tropes. Preserve the original artist's distinct worldview, tone, and intensity.
2. TARGET PERSONA & VOICE CHECK: Channel the ORIGINAL ARTIST's authentic voice—whether raw, existential, detached, frantic, playful, or bittersweet. Cross-check Artist metadata + full lyrics before locking POV, preserve tone tension in foreign particles (e.g., tough "おれ" paired with vulnerable "〜の"), and use impersonal "one / people / you" naturally when a line states a universal truth rather than addressing a partner.
3. COLLOQUIAL NUANCE & SWAGGER: Distinguish playful teasing, R&B longing, and hip-hop brag/swagger from literal hostility or dry prose—never inject corporate/accounting jargon into street or indie lyrics.

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
When words, phrases, or chants are repeated in the source (within the same line or across adjacent lines):
1. Exact Lexical Repetition: You MUST replicate the repetition using the exact same English word ("That wind, that wind"; "It hurts, it hurts, it hurts"; "Deeply, deeply").
2. NO Synonym Substitution: NEVER swap repeated words with synonyms to "avoid repetition" (e.g., FORBIDDEN to change "that wind, that wind" into "that wind, that breeze"). The listener hears identical audio and expects identical visual subtitles.
3. NO Collapsing or Omission: NEVER collapse repeated chants into a single occurrence.
4. NO Dangling Tails / Padding: NEVER push repeated words to the end of a line as dangling comma stubs (e.g., "..., ahead") or invent filler words to pad meter.

[TEMPORAL PROGRESSION, ENJAMBMENT & AUDIO-VISUAL SYNC]
1. Within-Line Temporal Sync: Inside standalone lines, keep ideas aligned with the audio's left-to-right flow as closely as natural English syntax allows.
2. Multi-Line SOV & Enjambment Rebalancing: When a sentence spans 2+ lines (e.g., JP Subject+Object 〜を on line <n> and Verb on line <n+1>), digest the full clause FIRST so you preserve active voice rather than forcing awkward passives just because line <n> stopped at an object. Shift clause boundaries cleanly across the 1:1 lines without stranding orphan prepositions ("for", "of", "to") at line ends.
3. Atmospheric / Scenery lines: Translate as pure imagery. DO NOT invent fake subjects ("I see...").
4. Action lines: Keep clean Subject-Verb-Object clarity.

[EXEMPLARS]
- Visceral Action (No Softening): 転んで足元つばを吐いた -> I stumbled and spat at my feet. (Never soften into polite clichés like "I let out a sigh").
- Multi-Line SOV Enjambment (Keep Active Voice): <1>戻れないあの時の道が私の手を</1>\n<2>ささくれで刺していくんだ</2> -> <1>That road I can never walk back</1>\n<2>keeps pricking my hands with splinters</2>.
- Repetition & Temporal Sync: あの風 あの風 懐かしいとお前が言った -> That wind, that wind—you said it felt so nostalgic.
- Chant Preservation: 痛い 痛い 痛い -> It hurts, it hurts, it hurts.`;
}

function buildTranslationFlowPunctuationEN() {
    return `FLOW & PUNCTUATION:
1) Use natural English lyric phrasing that breathes with the singing rhythm.
2) Enjambment: When a sentence spans <n> and <n+1>, avoid trailing commas or stranding dangling prepositions/conjunctions at the end of line <n>.
3) Ad-libs & Exclamations: Keep standalone pure vocal ad-lib lines (Oh yeah, La la, Hmm) unchanged; drop distracting inline breath fillers when unnatural, adapt expressive CJK exclamations (嗚呼 / あぁ) naturally ("Ah...", "Oh..."), and keep stutters rhythmic.`;
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
   - 純粋な情景描写には不要な主語（「私は」「僕が見る」）を捏造せず、体言止めや詩的余韻で表現する。
4) 一人称・二人称、省略および文体の統一 (Persona Lock & Pronoun Ellipsis):
   - アーティスト名（Artist metadata）と歌詞全体の物語の両方から歌唱者の視点を確認し、一時的な比喩や引用句で性別を誤認しないこと。一人称・二人称（僕/君、私/あなた、俺/お前）と口調を1つに固定しつつ、日本語の歌詞らしく文脈上明らかな主語・目的語（「私は」「君を」）は過剰に繰り返さず自然に省略する。
   - また、恋人ではなく「人間一般・世の中」を指す総称的 "you" が現れた場合は無理に「君/あなた」を当てず、無主語表現や「人は / 誰だって」等で自然に訳すこと。`,
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

function buildTranslationGuardrailsJA(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. 歌詞全体の文脈と行をまたぐ構文を把握した上で、原詩の語義・文法構造が正確に伝わるよう翻訳すること。
2. 同一語句の反復は省略・類語置換せずそのまま再現すること。`;
    }

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. 原詩モチーフと隠喩の連鎖の死守: タイトルや歌詞の鍵となる具体的イメージ（背中、雨、交差点等）を100%保持し、曲全体で対になる比喩は同じイメージ群で統一する（例: 「ほつれた（unraveled）」と「縫い合わせて（stitch me up）」）。
2. 慣用表現・二重否定・掛詞の自然な消化: 英語等の二重否定（"never think I wasn't better alone" 等）を直訳せず真意で訳し、慣用句・スラング・ダブルミーニングは辞書的直訳ではなく歌の文脈に沿った日本語に昇華する。
3. 捏造・水増しの排除 (Zero Hallucination): 原詩にない架空のストーリーや安易なフィラーを勝手に追加しない。
4. 直訳調の排斥と口語・スラングのニュアンス: 翻訳調（〜すること、〜によって）や硬直した行政・経済用語（ラップ等の稼ぎを「収入」等）を排除し、軽口やヒップホップの誇示（"motherfuckin'", "full of shit" 等）を怒鳴り調子の悪罵（「クソッタレ」等）へ歪曲しない。

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: 汎用的なJ-Popの定型句に落とし込まず、原曲アーティスト固有の世界観とトーン（荒々しさ、哲学性、倦怠感、疾走感など）をそのまま尊重すること。
2. PERSONA & SPEECH REGISTER LOCK: アーティスト名と全歌詞を踏まえ一人称・二人称（僕/君、私/あなた、俺/お前 等）と語尾のトーンを1つに固定し、文脈上不要な人称代名詞は省略する。ただし一般論を指す総称的 "you" には「人は」や無主語表現を用いる。
3. TARGET PERSONA: 原曲作者の声を日本語で代弁する字幕翻訳家として振る舞うこと。

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
原詩の中で同一の語句やリフレインが繰り返されている場合（例: あの風 あの風 / 痛い 痛い 痛い）:
1. 同一語句での反復必須: 「類語への置き換えによる反復回避」は厳禁。必ず同一の日本語語句を同じ回数繰り返すこと。
2. 1回への圧縮や省略の禁止: リスナーは耳で繰り返しを聴いているため、視覚的にも同じ反復を維持すること。
3. 行末の不自然なぶら下がりや埋め合わせ言葉の禁止。

[SOV ENJAMBMENT & AUDIO-VISUAL SYNC]
1. 音楽の流れへの適応とSOV語順の調和: 英語等のSVO言語を行ごとにまたいで訳す際も、不自然な翻訳調語順を避け、必要に応じて自然な倒置法（体言止め・余韻）や2行を通じた無理のない節区切りで日本語のSOV構造として美しく成立させること。
2. 助詞の行末孤立防止: 行<n>の末尾に不自然な助詞や接続語だけを残さず、意味のまとまりとして聴覚・視覚のテンポを合わせる。
3. 情景描写は体言止め等で純粋なイメージとして訳し、架空の主語（「私が見る」等）を捏造しない。

[EXEMPLARS]
- スラング・熱量の自然な消化: I'm a motherfuckin' starboy -> 俺は正真正銘のスターボーイだ（直訳の悪罵にせず誇示のニュアンスを保つ）。
- 2行跨ぎ（SVO→SOV）の自然な再配分: <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>そいつは取っておきな</1>\n<2>真夜中のためにさ</2>（自然な語順・倒置で1:1を保つ）。`;
}

function buildTranslationFlowPunctuationJA() {
    return `FLOW & PUNCTUATION:
1) Natural Japanese lyric phrasing without full stops (。) at line endings, flowing smoothly with the music.
2) Enjambment: Ensure multi-line thoughts rebalance naturally into Japanese syntax without awkward dangling particles at line ends.
3) Ad-libs & Exclamations: Keep standalone vocal ad-lib lines (Oh yeah, ララ) unchanged; drop empty trailing breath fillers (uh, oh) tacked onto sentences when unnatural, and adapt literary exclamations organically (ああ / 嗚呼).`;
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
   - 배경/풍경 묘사에는 불필요한 인위적 주어('내가', '난')를 덧붙이지 않고 명사형 종결이나 시적 여운으로 묘사한다.
4) 화법(반말/존댓말), 주체 생략 및 대명사 일관성 유지 (Speech Level, Artist Check & Persona Lock):
   - 아티스트 정보(Artist metadata)와 가사 전체 맥락을 함께 확인하여 화자의 시점을 정하고(일시적 비유나 인용구로 성별을 오판하지 말 것), 화법(반말 '-어/아' 또는 존댓말 '-요/-네요')과 호칭을 처음부터 끝까지 통일한다. 단, 한국어 가사답게 맥락상 명확한 주어('나는', '너는')는 매 행 반복하지 않고 자연스럽게 생략한다.
   - 연인이나 청자가 아닌 '사람 일반·인간 보편'을 뜻하는 총칭적 "you" 구절에는 억지로 '너/그대'를 넣지 말고 '누구나 / 사람은' 또는 무주어 표현으로 옮긴다.`,
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

function buildTranslationGuardrailsKO(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. 가사 전체의 맥락과 행간 구문을 파악하여 원문의 의미와 문법 구조가 정확히 전달되도록 번역할 것.
2. 원문의 반복 어구는 유의어로 바꾸거나 생략하지 말고 동일하게 반복할 것.`;
    }

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. 원곡 상징과 은유 사슬의 보존: 가사의 핵심 모티프와 심상(뒷모습, 비, 신호등 등)은 100% 보존하며, 곡 전체를 잇는 짝 은유는 같은 이미지 계통을 유지한다(예: "unraveled"와 "stitch me up" -> "실타래처럼 풀린" + "꿰매줘", 맥락 끊긴 "무너졌어" 금지).
2. 관용구·이중부정·말장난 해석: 영어식 이중부정("never think I wasn't better alone")을 직역하지 말고 긍정 본뜻("혼자가 더 낫다고만 믿었지")으로 풀며, 관용구·속어·중의적 표현은 사전적 직역이 아닌 가사 맥락으로 옮긴다.
3. 허구적 내용 추가 금지 (Zero Hallucination): 원곡에 없는 부차적 상황이나 상투적 추임새를 억지로 끼워 넣지 않는다.
4. 번역투·사무적 어휘 배제: 딱딱한 직역투나 행정·의학·법률 용어(랩의 돈을 "수입"으로, 시적 瞼를 "눈꺼풀"로, 예술적 世界を犯す를 "침범"으로 번역 등)를 피하고, 힙합의 허세("motherfuckin'")나 다정한 놀림("full of shit")을 험악한 욕설·질책으로 왜곡하지 않는다.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: 천편일률적인 K-Pop/가요 유행어에 맞추지 말고, 원곡 아티스트 고유의 톤과 정서(거친 질감, 철학적 사유, 고독, 질주감 등)를 원형 그대로 존중할 것.
2. SPEECH LEVEL & PRONOUN LOCK: 아티스트 정보와 가사 전체를 확인해 화법(반말 vs 존댓말)과 호칭을 하나로 통일하되, 한국어답게 맥락상 명확한 '나는/너는'은 생략하며 총칭적 "you"에는 일반 주체나 무주어 표현을 쓴다.
3. TARGET PERSONA: 원곡의 영혼을 한국어로 전하는 자막 번역가로서 기능할 것.

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
원곡에서 특정 단어나 후렴구가 반복될 경우 (예: 그 바람 그 바람 / 아파 아파 아파):
1. 동일 어휘 반복 필수: "반복 회피를 위한 유의어 교체" 엄격히 금지. 반드시 동일한 한국어 단어로 동일하게 반복할 것.
2. 축약 및 생략 금지: 귀로 들리는 반복 리듬과 눈으로 보는 자막을 일치시킬 것.
3. 행 끝에 불필요한 군더더기 어휘나 꼬리 표현을 덧붙이지 말 것.

[SOV ENJAMBMENT & AUDIO-VISUAL SYNC]
1. 호흡 일치와 한국어 SOV 어순의 조화: 2행 이상 걸친 구문(영어 SVO나 일본어 연체수식·vắt dòng)을 옮길 때는 문장 전체를 먼저 파악한 뒤, 부자연스러운 수동태나 직역 어순을 피하고 도치나 자연스러운 절 경계 재분배로 각 행이 한국어답게 이어지게 할 것.
2. 행말 조사/접속어 고립 방지: 행 <n> 끝에 어색한 조사나 전치사 대응어가 혼자 남지 않도록 <n+1>과 매끄럽게 호흡을 나눈다.
3. 배경/풍경 묘사: 인위적 주어('내가', '난')를 지어내지 말고 순수한 심상으로 묘사할 것.

[EXEMPLARS]
- 스웨그·강조어 뉘앙스 유지: I'm a motherfuckin' starboy -> 난 진짜배기 스타보이야 (분노 섞인 욕설 '빌어먹을'로 왜곡 금지).
- 2행 걸침(Enjambment) 자연스러운 재분배: <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>그건 아껴 두는 게 좋아</1>\n<2>깊은 한밤중을 위해서</2> (어색한 어순 직역 없이 자연스러운 도치로 1:1 유지).`;
}

function buildTranslationFlowPunctuationKO() {
    return `FLOW & PUNCTUATION:
1) Natural Korean lyric spacing and rhythmic phrasing flowing smoothly with the song.
2) Enjambment: Rebalance multi-line breaks naturally in Korean phrasing without dangling suffixes or awkward trailing commas.
3) Ad-libs & Exclamations: Keep standalone pure ad-libs (Oh yeah, 라라) intact; drop empty breath fillers (uh, oh) tacked onto Korean sentences when unnatural, and adapt poetic exclamations (嗚呼 / あぁ -> 아, 아아) smoothly.`;
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
   - 纯风景与意境白描绝不强行添加虚假主语（如“我看见”），保持原诗的留白与张力。
4) 跨行长句（Enjambment）与规范简体中文:
   - 日韩歌词常有长定语前置（連体修飾）及跨行断句，务必先通读完整句子再顺畅切分各行，避免单行语义残缺。
   - 统一使用规范现代简体中文（Simplified Chinese），严禁直接照搬残留日文汉字异体字或繁体字（如必须将“風/涙/駅/帰”转化为规范简体“风/泪/车站/归”）。`,
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

function buildTranslationGuardrailsZH(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. 通读全曲理解跨行长句与语法修饰关系，准确传达原词字面语义与语法结构。
2. 统一使用规范简体中文，严禁残留日文汉字异体字；原词重复的词汇必须使用相同中文词汇重复。`;
    }

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. 核心意象与隐喻链保全: 歌词中的关键象征意象（背影、雨丝、车灯等）必须100%还原；前后呼应的成对隐喻须保持同一意象场（如 "unraveled" 与 "stitch me up" 应译为“散了线”与“缝补”，切忌中途断成“崩溃”配“缝补”）。
2. 习语、双重否定与双关消解: 将英文双重否定自然转为本意（"never think I wasn't better alone" -> “总以为一个人更好”），拒绝照搬字面；习语及双关须译出弦外之音，而非扁平字典释义。
3. 杜绝虚构与填充 (Zero Hallucination): 切勿任意添加原词没有的套路性修辞或无意义填充词；押韵绝不容许以害意为代价。
4. 规范简体字要求: 必须输出纯正的现代简体中文（Simplified Chinese），严禁直接复制残留日文汉字（Kanji）或繁体字。

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: 严禁套用平庸的华语苦情流行套路，尊重原曲独特文风（冷峻、哲学、自省、狂乱或俏皮）。
2. 语态视角、省略与泛指: 结合歌手信息（Artist metadata）与全词锁定叙述视角，借助中文意合特点自然省略重复的“我/你”；若句中 “you” 泛指世人而非倾诉对象，应译作“人 / 谁”或无主句。
3. 口语张力与反公文化: 区分嘻哈嚣张炫耀（"motherfuckin'" -> “货真价实/骨子里”，莫译成愤怒咒骂）、亲昵调侃（"full of shit" -> “尽胡说”，莫译成严厉指责）；严禁掺入财务公文词汇（“年收入”）、生硬医学/法学词（诗意“瞼”译作“眼眸/双眼”，莫译“眼皮”；“世界を犯す”译作“冲破/颠覆世界”，莫译“侵犯”），并保留日文刚硬人称配柔和句尾助词（俺 + 〜の）的反差语气。

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
原词出现同一词汇/呼号重复时（例如: 那阵风 那阵风 / 好痛 好痛 好痛 / 湛蓝 湛蓝 湛蓝）:
1. 严格使用相同词汇重复: 严禁为了所谓“行文多变”或“对仗”而擅自替换为近义词（例如严禁将“那阵风 那阵风”翻译为“那阵风 那缕风”）。听众耳中听到的是相同的音，字幕眼见也必须保持相同。
2. 严禁压缩合并: 严禁将多次反复的呐喊压缩成单一词汇。
3. 严禁行末断裂拖挂: 严禁将重复词置于句尾变成断裂的逗号碎屑尾巴。

[ENJAMBMENT, PARATAXIS & AUDIO-VISUAL SYNC]
1. 跨行长句与日韩SOV重构: 遇到跨行句（如日文上行宾语〜を接下行谓语）务必先通读整句，利用中文意合与主动语态流畅衔接两行，严禁仅因上行出现宾语就硬凑成别扭的“让……被……”被动句。
2. 拒绝行末悬空介词: 切勿将“为了 / 给 / 关于 / 被”孤立挂在上一行结尾，须把介词自然顺延至下一行开头以贴合歌唱节奏。
3. 意境白描: 纯风景描写保持意境留白，严禁捏造虚假主语（“我看见”）。

[EXEMPLARS]
- 日语跨行SOV（保主动语态，忌硬转被动）: <1>戻れないあの時の道が私の手を</1>\n<2>ささくれで刺していくんだ</2> -> <1>再也回不去的当年那条路</1>\n<2>正用倒刺一次次扎进我手里</2>（忌译为“让我的手 / 被倒刺扎痛”）。
- 英文跨行忌悬空介词: <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>你最好还是留着</1>\n<2>等到深夜再说</2>。
- 俚语张力与非直译: I'm a motherfuckin' starboy -> 老子就是货真价实的Starboy（保留嚣张气场，莫硬译脏话）。`;
}

function buildTranslationFlowPunctuationZH() {
    return `FLOW & PUNCTUATION:
1) Natural Chinese lyric phrasing using concise parataxis (意合), no periods (。) at line ends.
2) Enjambment: Shift prepositions cleanly to the start of the next line instead of stranding hanging markers ("为了 / 给") at line <n> end.
3) Ad-libs & Exclamations: Keep standalone pure vocal ad-libs (Oh yeah, 啦啦) as-is; omit distracting trailing breath fillers (uh, oh) tacked onto sentences, and translate literary exclamations organically (嗚呼 / あぁ -> 啊……) rather than leaving English "Ah".`;
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
3) Sentence Type & Grammatical Gender Lock:
   - Scenery lines: Preserve as pure imagery without fabricating artificial subjects ("Я бачу").
   - Grammatical Gender & Address Consistency: Cross-check BOTH the performing artist (Artist metadata) AND full-song lyrics before locking past-tense verb/adjective gender endings (masculine "-в" vs feminine "-ла") and intimacy register ("ти" vs "ви") from first line to last line—never flip gender over one figurative detail. For universal statements where "you" means people in general, use impersonal or 2nd-person generic forms ("людина", "-ш" without forcing gendered partner adjectives).
   - Enjambment & Euphony (Милозвучність): Use Ukrainian case inflection and natural euphony alternation (у/в, і/й, з/із/зі) to rebalance multi-line clauses cleanly without broken fragments.`,
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

function buildTranslationGuardrailsUK(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. Read the entire lyrics first to resolve multi-line clauses and grammatical gender agreement.
2. Direct Semantic Precision: Prioritize accurate semantic and grammatical equivalence for language learners while keeping repeated words identical.`;
    }

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from beginning to end as a unified story before translating.
1. Story Arc: Align with the emotional progression from verse to chorus climax.
2. Contextual Cohesion: Every line must harmonize with the overarching story.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs & Metaphor Chains: Core visual symbols, metaphors, and titular imagery (e.g., "looking at someone's back", "taillights", "rain", "crossroad") MUST be preserved in Ukrainian. Keep paired metaphors across the track in one cohesive image family (e.g., "unraveled" paired with "stitch me up" -> "розповзлась нитками / розпустилась" + "зший мене", never disconnected "розсипалась").
2. Idioms, Double Negatives & Literary Glosses: Watch out for English pseudo-double negatives ("never think I wasn't better alone" means affirmative "завжди думав, що самому краще"—do NOT translate mechanically into a Ukrainian negative!). Decode idioms/wordplay figuratively and pick poetic senses over clinical or legal calques (瞼 -> "очі / вії / погляд", not anatomical "повіки"; 世界を犯す -> "ламати / перевертати світ", not legalistic "порушувати").
3. Zero Hallucination & Filler: Do NOT inject invented storylines, secondary actions, or clichéd fillers not present in the source text.
4. Meaning Over Rhyme: Rhyme is secondary; poetic meaning and imagery are supreme. Never compromise the author's message for an end-rhyme.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: Absolutely DO NOT rewrite the song into generic pop tropes or stiff bureaucratic/Russianized calques (avoid dry accounting terms like "дохід" in rap; use vivid living Ukrainian). Preserve the artist's voice, swagger, playful teasing, and tone tension (including JP tough pronouns + soft sentence-final particles).
2. GRAMMATICAL GENDER & REGISTER LOCK: Cross-check Artist metadata + whole lyrics to lock narrator/addressee grammatical gender (masculine vs feminine verb/adjective inflections) and second-person register ("ти" vs "ви") across the song, using impersonal/general forms for generic-"you" truths. Never accidentally switch gender endings mid-song.
3. TARGET PERSONA: You are an expert Lyrical Subtitle Translator channeling the ORIGINAL ARTIST's voice.

[REPETITION & RHYTHM FIDELITY LAW — MANDATORY]
When words or chants are repeated in the source (e.g., within the same line or across lines):
1. Exact Lexical Repetition: Replicate the repetition using the exact same Ukrainian word. Never swap with synonyms to avoid repetition.
2. NO Collapsing or Omission: Keep the repetition 100% intact to mirror the audio beat.
3. NO Dangling Tails: Do not leave severed comma fragments at the end of lines.

[ENJAMBMENT, INFLECTION & AUDIO-VISUAL SYNC]
1. Clause-Boundary Rebalancing (SVO / CJK SOV): Digest multi-line sentences in full before translating so you leverage Ukrainian case inflection smoothly in active voice—never turn JP SOV enjambments into stiff passives ("було..."), and never strand orphan prepositions ("для", "у", "про", "бо", "щоб") at the end of line <n>.
2. Sentence Type Preservation: Atmospheric/scenery lines must stay as pure imagery. NEVER fabricate artificial subjects ("Я бачу").

[EXEMPLARS]
- Multi-Line EN Enjambment & Euphony: <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>Краще прибережи це</1>\n<2>для глибокої ночі</2> (shift "для" cleanly to line 2; avoid dangling prepositions).
- Swagger vs. Literal Cursing: I'm a motherfuckin' starboy -> Я справжній, скажений Starboy (keep swagger; avoid dry literal insults).`;
}

function buildTranslationFlowPunctuationUK() {
    return `FLOW & PUNCTUATION:
1) Natural Ukrainian lyric phrasing, euphony (у/в, і/й), and standard capitalization flowing with the audio rhythm.
2) Enjambment: Shift hanging prepositions/conjunctions cleanly onto line <n+1> without trailing comma fragments.
3) Ad-libs & Exclamations: Keep standalone pure vocal ad-libs (Oh yeah, Ла-ла) as-is; omit distracting trailing breath fillers (uh, oh) tacked onto sentences, and render expressive literary exclamations (嗚呼 / あぁ -> Ох, А, Ах) naturally.`;
}

const STYLE_INSTRUCTIONS_ES = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (Traductor experto de letras musicales). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into faithful, evocative Spanish.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
Prioritize Semantic & Imagery Fidelity together with natural Spanish lyric cadence (musicalidad del español). NEVER domesticate, censor, or flatten rock, indie, hip-hop, or J-Pop into generic radio ballad clichés. Never drop core symbols or invent filler lines to force a rhyme.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & SPANISH CADENCE"
1) Symbolic Anchor & Zero Hallucination:
   - Preserve concrete visual motifs 100% (taillights, rain, crossroad, someone's back); never invent filler phrases ("mi amor", "bajo el cielo") to pad meter.
2) Natural Diction, Subjunctive & Pro-Drop Flow:
   - Use natural contemporary Spanish lyric diction and employ the subjunctive mood (subjuntivo) organically for longing, doubt, or hypothetical feelings rather than stiff literal indicatives.
   - Pro-Drop Discipline: Verb endings already carry person; NEVER repeat "yo / tú" on every line like translated English unless needed for sharp contrast.
3) Grammatical Gender, Regional Register & Address Consistency:
   - Cross-check Artist metadata + whole lyrics before locking narrator/addressee gender endings ("-o / -a") and regional address: default to broad international Latin American ("tú / ustedes") unless the artist's origin clearly calls for Peninsular Spain ("vosotros") or Rioplatense ("vos")—NEVER mix "vosotros" and "ustedes" in the same track. For universal truths ("generic you"), use impersonal "uno / la gente / se" or 2nd-person general without forcing gendered partner adjectives.
4) Multi-Line Enjambment & Scenery Lines:
   - Preserve scenery/atmospheric lines as pure imagery without inventing subjects ("Veo..."). Digest 2–3 line clauses (e.g., JP pre-nominal modifiers) in full before writing Spanish verbs.`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are a Spanish Poet & Ballad Lyricist.`,
        style: `STRATEGY: "LYRICAL & ROMANTIC"
1) Diction: Evocative, musical, emotionally resonant Spanish phrasing (lenguaje poético y expresivo).`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are a Spanish Lyricist specializing in Anime, Pop, and Coming-of-Age stories.`,
        style: `STRATEGY: "YOUTH & SINCERE NARRATIVE"
1) Tone: Fresh, heartfelt, nostalgic, and vivid narrative storytelling.`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are a Spanish Urban / Hip-Hop Lyricist.`,
        style: `STRATEGY: "PUNCHY & RHYTHMIC"
1) Diction: Direct, rhythmic, authentic urban Spanish swagger and flow.`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classical Spanish Songwriter (Bolero / Canción clásica).`,
        style: `STRATEGY: "CLASSICAL & TIMELESS"
1) Diction: Dignified, timeless literary Spanish elegance.`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are a Spanish Linguistic Translator.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsES(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. Read the entire lyrics first to resolve multi-line clauses and grammatical agreement.
2. Direct Semantic Precision: Prioritize accurate meaning and structure while repeating repeated words identically.`;
    }

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from start to finish as one unified story so every line aligns with the emotional arc.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs & Metaphor Chains: Preserve core visual symbols 100%, keeping paired metaphors across the song in one cohesive image family ("deshilachada / descosida" paired with "cóselo", never broken into disconnected images).
2. Idioms, Double Negatives & Literary Glosses: Decode English pseudo-double negatives ("never think I wasn't better alone" -> "siempre creí que estaba mejor solo/a") instead of turning them negative; render idioms figuratively and pick poetic senses over clinical/legal dictionary glosses (瞼 -> "ojos / mirada", not "párpados"; 世界を犯す -> "desafiar / romper el mundo", not "violar").
3. Zero Hallucination & Meaning Over Rhyme: Never add unstated storylines or cliché fillers; rhyme is strictly secondary to imagery and intent.

[REGISTER & ARTISTIC VOICE PRESERVATION]
1. ANTI-PERSONA & ZERO DOMESTICATION: Channel the ORIGINAL ARTIST's voice—never flatten indie, rap, or J-Rock into generic Latin pop clichés or stiff bureaucratic Spanish (no dry "ingresos" for rap earnings).
2. GENDER, REGIONAL REGISTER & CULTURAL MINEFIELDS: Cross-check Artist metadata + whole lyrics to lock grammatical gender ("-o/-a") and one consistent regional register ("tú / ustedes" vs Spain "vosotros" or "vos"); avoid regionally loaded traps like "coger" in romantic lines (vulgar sexual slang across most of Latin America—prefer "tomar / agarrar"); keep hip-hop swagger and playful teasing natural ("auténtico", not robotic "maldito").
3. JAPANESE PARTICLE CONTRAST: Reflect soft sentence-final nuance (tough "おれ" + soft "〜の") naturally rather than flattening into dry statements.

[REPETITION, ENJAMBMENT & ACTIVE VOICE]
1. Exact Lexical Repetition: Repeat identical words verbatim for chants/refrains—never swap synonyms or collapse repeats.
2. Enjambment & Active Flow: Read 2–3 line SOV/SVO clauses in full before placing verbs; keep active voice cleanly without awkward passive ("ser + participio") just to match line breaks, and NEVER strand orphan prepositions ("para", "de", "con", "por", "que") at the end of line <n>.
3. Scenery Lines: Translate pure imagery without inventing subjects ("Veo...").

[EXEMPLARS]
- Multi-Line EN Enjambment: <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>Mejor guárdalo</1>\n<2>para la medianoche</2> (shift "para" cleanly to open line 2).
- Swagger vs. Literal Cursing: I'm a motherfuckin' starboy -> Soy un auténtico Starboy (preserve brag energy; avoid stiff insults).`;
}

function buildTranslationFlowPunctuationES() {
    return `FLOW & PUNCTUATION:
1) Natural Spanish lyric phrasing; avoid spamming inverted exclamation marks (¡...!) on soft or melancholic lines unless genuine outcry.
2) Enjambment: Shift hanging prepositions/conjunctions cleanly onto line <n+1> without trailing comma stubs.
3) Ad-libs & Exclamations: Keep standalone pure vocal ad-libs (Oh yeah, La la, Hmm) unchanged; drop distracting inline breath fillers (uh, oh) tacked onto sentences, and render expressive literary exclamations (嗚呼 / あぁ -> Ay, Ah, Oh) organically.`;
}

const STYLE_INSTRUCTIONS_ID = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (Penerjemah Lirik Lagu Profesional). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into natural, evocative Bahasa Indonesia.
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
Prioritize Semantic & Imagery Fidelity together with natural Indonesian lyrical flow. NEVER flatten rock, indie, hip-hop, or J-Pop into stiff formal textbook Indonesian or generic melancholic pop clichés ("merana", "derita cinta"). Never drop symbols or invent fillers to force a rhyme.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & NATURAL INDONESIAN"
1) Symbolic Anchor & Zero Hallucination:
   - Preserve core visual images 100% (punggung, lampu belakang, hujan, persimpangan); never fabricate filler phrases not in the source.
2) Pronoun Persona & Register Lock (CRITICAL FOR INDONESIAN):
   - ABSOLUTE BAN ON STIFF "SAYA - ANDA": Never use bureaucratic "Saya - Anda" in love, pop, indie, or emotional songs.
   - Cross-check Artist metadata + whole song lyrics and LOCK ONE organic persona:
     * Romance / Pop / Indie / Ballad -> "Aku - Kamu" or poetic "Aku - Kau" (fluidly using -ku / -mu where musical).
     * Street / Rap / Hip-Hop / Diss -> "Gue - Lo".
     * Introspective Monologue -> "Aku" (drop redundant pronouns where natural; for universal truths/"generic you", use "orang / seseorang" or subjectless clauses).
3) Active Voice & Everyday Indonesian Diction:
   - Prefer vivid active/living Indonesian rather than stiff formal affixes ("melakukan konfirmasi", "pendapatan") or clunky passive "di-" conversions across enjambments.
4) Multi-Line Enjambment & Scenery Lines:
   - Keep pure scenery lines as imagery without inventing subjects ("Aku melihat..."). Read full multi-line CJK/English clauses before setting Indonesian line breaks.`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are an Indonesian Poet & Ballad Lyricist.`,
        style: `STRATEGY: "LYRICAL & ROMANTIC"
1) Diction: Warm, lyrical, musically poetic Indonesian phrasing ("Aku - Kamu / Kau").`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are an Indonesian Lyricist specializing in Anime, Indie, and Youth stories.`,
        style: `STRATEGY: "YOUTH & SINCERE NARRATIVE"
1) Tone: Relatable, vibrant, nostalgic coming-of-age storytelling in living Indonesian.`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are an Indonesian Hip-Hop / Urban Lyricist.`,
        style: `STRATEGY: "PUNCHY & RHYTHMIC"
1) Diction: Sharp, rhythmic contemporary urban Indonesian ("Gue - Lo") with attitude.`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classic Indonesian Songwriter (Puitis / Klasik).`,
        style: `STRATEGY: "CLASSICAL & ELEGANT"
1) Diction: Timeless, refined literary Indonesian elegance.`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are an Indonesian Linguistic Translator.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsID(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. Read the entire lyrics first to resolve multi-line clauses and exact grammatical roles.
2. Direct Semantic Precision: Prioritize accurate meaning while repeating repeated words identically.`;
    }

    const isVintage = styleKey === "vintage_classic";
    const archaicIdBan = isVintage
        ? `3. VINTAGE POETIC REGISTER: Classical terms ("kalbu", "sanubari", "daku", "dikau") are welcome only if graceful, never stiff "Saya - Anda".`
        : `3. ANTI-SINETRON CLICHÉS & ARCHAIC MALAY BAN: Never slip melodramatic soap-opera / archaic Malay tropes ("merana", "kalbu", "sanubari", "daku", "dikau", "dinda", "kanda", "nestapa", "fana") or dry "membuat aku..." / "oleh..." translationese into modern songs.`;

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from start to finish as one unified story so every line matches the arc.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs & Metaphor Chains: Keep concrete symbols and paired metaphors across the song in one cohesive image field ("terurai benangnya" paired with "jahit kembali", never broken into disconnected "hancur" + "jahit").
2. Idioms, Double Negatives & Literary Glosses: Decode English double negatives into clear natural meaning ("never think I wasn't better alone" -> "selalu kukira sendiri lebih baik"); translate idioms figuratively and avoid cold anatomical/legal dictionary glosses (poetic 瞼 -> "tatapan / mata", not "kelopak mata"; artistic 世界を犯す -> "mengguncang / mendobrak dunia", not legalistic "melanggar").
3. Zero Hallucination & Meaning Over Rhyme: Do not invent filler lines; meaning and imagery always beat forced rhymes.

[REGISTER, PRONOUN LOCK & VOICE]
1. ANTI-PERSONA & ZERO DOMESTICATION: Keep the artist's raw, detached, or playful worldview intact. NEVER use stiff formal "Saya - Anda" or dry office/accounting prose ("melakukan...", "pendapatan") in songs.
2. PERSONA LOCK (STRICT GENRE FIT): Cross-check Artist metadata + whole lyrics, lock ONE pair consistently: keep Jakarta urban "Gue - Lo" for Hip-Hop/Rap/Street tracks (NEVER inject "Gue - Lo" into gentle ballads or delicate J-Pop), use "Aku - Kamu / Kau" for Romance/Pop/Indie, and use impersonal "orang / kita" for universal "generic you" truths. Distinguish brag/teasing from angry profanity.
${archaicIdBan}
4. JAPANESE PARTICLE NUANCE: Reflect soft Japanese sentence-final contrast (tough "おれ" + soft "〜の") gently ("kok / aja / sih / ya" matching tone) instead of stiff statements.

[REPETITION, ENJAMBMENT & ACTIVE VOICE]
1. Exact Lexical Repetition: Repeat identical words verbatim for chants/refrains—never swap synonyms or collapse repeats.
2. Active-Voice Enjambment (No Forced "di-" Passive): Read 2–3 line SOV/SVO sentences in full first. Rebalance clause breaks cleanly in **active voice** rather than turning JP 〜を objects into awkward "di- / ter-" passives, and NEVER strand orphan prepositions ("untuk", "di", "ke", "dari", "karena") at the end of line <n>.
3. Scenery Lines: Keep pure scenery/noun lines free of invented subjects ("Aku melihat...").

[EXEMPLARS]
- Multi-Line JP SOV (Keep Active Voice): <1>戻れないあの時の道が私の手を</1>\n<2>ささくれで刺していくんだ</2> -> <1>Jalan masa lalu yang tak bisa kembali</1>\n<2>terus menusuk tanganku dengan serpihan luka</2> (NEVER invert to awkward passive 'tanganku tertusuk oleh...').
- EN Enjambment (No Hanging Preposition): <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>Lebih baik kau simpan itu</1>\n<2>untuk tengah malam nanti</2>.`;
}

function buildTranslationFlowPunctuationID() {
    return `FLOW & PUNCTUATION:
1) Natural, flowing Bahasa Indonesia lyric cadence without stiff textbook affixes.
2) Enjambment: Shift hanging prepositions/conjunctions cleanly onto line <n+1> without trailing comma fragments.
3) Ad-libs & Exclamations: Keep standalone pure vocal ad-libs (Oh yeah, La la, Hmm) unchanged; drop distracting inline breath fillers (uh, oh) tacked onto sentences, and render expressive literary exclamations (嗚呼 / あぁ -> Ah..., Oh...) organically without campy "Aduh".`;
}

const STYLE_INSTRUCTIONS_TH = {
    "smart_adaptive": {
        role: `You are an expert Lyrical Subtitle Translator (นักแปลเนื้อเพลงมืออาชีพ). Your mission is to channel the authentic artistic voice, literary depth, and emotional world of the ORIGINAL ARTIST into natural, singable Thai (ภาษาไทย).
CORE PRINCIPLE (ARTIST VOICE FIDELITY):
Prioritize Semantic & Imagery Fidelity together with natural Thai breath pacing and poetic cadence. NEVER flatten rock, indie, hip-hop, or J-Pop into robotic formal textbook Thai ("ผมรักคุณ", "ดิฉัน") or generic melodramatic clichés. Never drop core symbols or invent fillers to force rhyme.`,
        style: `STRATEGY: "ARTIST-CENTRIC FIDELITY & NATURAL THAI CADENCE"
1) Symbolic Anchor & Zero Hallucination:
   - Preserve concrete visual symbols 100% (แผ่นหลัง, ไฟท้ายรถ, สายฝน, ทางแยก); never invent filler words just for rhyme.
2) Natural Thai Pronouns & Ellipsis (CRITICAL):
   - ABSOLUTE BAN ON TEXTBOOK "ดิฉัน / ท่าน / คุณ" (and robotic "ผม - คุณ") in emotional/pop/indie songs unless clearly classical/ironic.
   - Cross-check Artist metadata + whole lyrics and LOCK ONE organic persona:
     * Romantic Pop / Indie / Ballad -> "ฉัน - เธอ" (most natural universal Thai) or "เรา - เธอ" / "ผม - เธอ" where clearly gendered.
     * Street / Rap / Hip-Hop / Diss -> "กู - มึง" (raw street) or bold "ฉัน / ข้า".
     * Solitary Introspection -> "ฉัน / ข้า" (prefer natural Thai pronoun ellipsis where the subject is already obvious—never spam "ฉัน/เธอ" on every line).
   - For universal truths ("generic you"), use "คนเรา / ใครต่อใคร" or omit the subject naturally.
3) Thai Serial Verbs & Breath Spacing (การเว้นวรรค):
   - Use clean spaces between breath phrases (เว้นวรรคตามจังหวะร้อง) for smooth subtitle reading, and lean on natural Thai serial verbs (กริยาเรียง) to keep sentences fluid and active.
4) Multi-Line Enjambment & Scenery Lines:
   - Preserve pure scenery lines as pure imagery without inventing subjects ("ฉันเห็น..."). Digest multi-line CJK/English clauses completely before breaking Thai phrases.`,
        pronounSuggestion: null
    },
    "poetic_standard": {
        role: `You are a Thai Poet & Ballad Lyricist.`,
        style: `STRATEGY: "LYRICAL & ROMANTIC"
1) Diction: Graceful, deeply emotional, musical Thai phrasing (สละสลวย กินใจ).`,
        pronounSuggestion: null
    },
    "youth_story": {
        role: `You are a Thai Lyricist specializing in Anime, J-Pop, and Youth stories.`,
        style: `STRATEGY: "YOUTH & SINCERE NARRATIVE"
1) Tone: Warm, nostalgic, heartfelt coming-of-age Thai storytelling ("ฉัน - เธอ" or "เรา - เธอ").`,
        pronounSuggestion: null
    },
    "street_bold": {
        role: `You are a Thai Hip-Hop / Rap Lyricist.`,
        style: `STRATEGY: "PUNCHY & RHYTHMIC"
1) Diction: Raw, rhythmic, authentic street Thai flow and swagger ("กู - มึง" when confrontational).`,
        pronounSuggestion: null
    },
    "vintage_classic": {
        role: `You are a Classic Thai Songwriter (ลูกกรุง / กวีนิพนธ์).`,
        style: `STRATEGY: "CLASSICAL & TIMELESS"
1) Diction: Refined, timeless literary Thai poetic elegance.`,
        pronounSuggestion: null
    },
    "literal_study": {
        role: `You are a Thai Linguistic Translator.`,
        style: `STRATEGY: "GRAMMATICAL PRECISION"
1) Direct semantic and grammatical equivalence for language learning.`,
        pronounSuggestion: null
    }
};

function buildTranslationGuardrailsTH(styleKey = "smart_adaptive") {
    if (styleKey === "literal_study") {
        return `[HOLISTIC CONTEXT & LINGUISTIC FIDELITY LAW]
1. Read the entire lyrics first to understand multi-line clauses and grammatical relationships.
2. Direct Semantic Precision: Prioritize accurate meaning while repeating repeated words identically.`;
    }

    const isVintage = styleKey === "vintage_classic";
    const archaicThBan = isVintage
        ? `3. CLASSICAL REGISTER: Timeless poetic phrasing and graceful rhythm (คำสัมผัส) are welcome when natural.`
        : `3. ZERO TRANSLATIONESE ("การ / ความ / มัน") & NO ARCHAIC ROYAL/PALI CLICHÉS: NEVER bloat Thai lyrics with textbook nominalizers ("การจากลา", "ความรู้สึกที่..."), literal English dummy-"it" ("มันเจ็บ...", "มันทำให้ฉัน..."), or heavy archaic Pali-Sanskrit/court terms ("หทัย", "โศกา", "นิรันดร์กาล") in modern genres—use crisp living verbs and natural breath phrasing instead.`;

    return `[HOLISTIC NARRATIVE COMPREHENSION LAW]
Ingest the entire song lyrics from start to finish as one unified story so every line flows with the song's emotional arc.

[SEMANTIC & IMAGERY FIDELITY LAW — CRITICAL]
1. Sacred Motifs & Metaphor Chains: Keep concrete images 100% intact and keep paired metaphors across the track in one cohesive image family ("ด้ายที่หลุดลุ่ย" paired with "เย็บฉันกลับคืนมา", never disconnected "พังทลาย" + "เย็บ").
2. Idioms, Double Negatives & Literary Glosses: Decode English double negatives directly into positive Thai intent ("never think I wasn't better alone" -> "เคยคิดเสมอว่าอยู่คนเดียวดีกว่า"); translate idioms figuratively and avoid stiff officialese, accounting, anatomical, or legal glosses ("รายได้ทั้งปี", "เปลือกตา" for poetic 瞼 -> "แววตา / ดวงตา", "ละเมิดโลก" for 世界を犯す -> "ทลายกรอบโลก").
3. Zero Hallucination & Meaning Over Rhyme: Do not invent extra words or filler lines; meaning and imagery outrank forced end-rhyme.

[REGISTER, PRONOUNS & ARTISTIC VOICE]
1. ANTI-PERSONA & ZERO DOMESTICATION: Channel the ORIGINAL ARTIST's tone. NEVER inject robotic polite particles ("ครับ / ค่ะ / นะครับ / ค่ะ") or stiff official phrasing into pop, rock, rap, or J-Rock.
2. PERSONA LOCK & NATURAL TONE: Cross-check Artist metadata + whole lyrics before locking persona ("ฉัน - เธอ", "เรา - เธอ", or "กู - มึง"), dropping redundant pronouns naturally and using "คนเรา / ใครสักคน" for generic-"you" lines. Distinguish hip-hop swagger ("ตัวจริง / สุดจัด") and gentle teasing ("พูดไปเรื่อยน่า") from stiff angry cursing or harsh scolding.
${archaicThBan}
4. JAPANESE PARTICLE NUANCE: Convey soft Japanese endings paired with tough pronouns (おれ + 〜の) through natural Thai cadence ("...นะ", "...หรอก", "...เลย") instead of dry flat sentences.

[REPETITION, ACTIVE SERIAL VERBS & ENJAMBMENT]
1. Exact Lexical Repetition: Repeat identical Thai words verbatim for chants/refrains—never swap synonyms or collapse repeats.
2. Active Voice over "ถูก / โดน" Passive Trap: Read 2–3 line JP SOV (〜を) or English sentences in full BEFORE phrasing. Use natural Thai active serial verbs (กริยาเรียง) or clean topic-fronting—NEVER overuse adversarial passive "ถูก / โดน" just because an object appeared on line <n>, and NEVER strand dangling linkers ("เพื่อ", "สำหรับ", "ของ", "เพราะ", "ที่") at the end of line <n>.
3. Scenery Lines: Preserve pure scenery lines as imagery without fabricating subjects ("ฉันเห็น...").

[EXEMPLARS]
- Multi-Line JP SOV (No "ถูก" Passive): <1>戻れないあの時の道が私の手を</1>\n<2>ささくれで刺していくんだ</2> -> <1>ถนนวันวานที่ไม่อาจย้อนกลับ</1>\n<2>คอยทิ่มแทงมือฉันด้วยเสี้ยนหนาม</2> (NEVER invert to awkward passive 'มือฉันถูก...ทิ่มแทง').
- EN Enjambment (No Hanging Preposition): <1>You better save it for</1>\n<2>The middle of the night</2> -> <1>เก็บมันเอาไว้ดีกว่า</1>\n<2>สำหรับกลางดึกคืนนี้</2>.`;
}

function buildTranslationFlowPunctuationTH() {
    return `FLOW, SPACING & PUNCTUATION:
1) Natural Thai lyric cadence with clean spaces between breath phrases (เว้นวรรคตามจังหวะหายใจ) for comfortable subtitle reading.
2) Enjambment: Shift hanging linkers/prepositions ("เพื่อ", "สำหรับ", "เพราะ") cleanly onto line <n+1> without stranded fragments.
3) Ad-libs & Exclamations: Keep standalone pure vocal ad-libs (Oh yeah, ลา ลา, Hmm) unchanged; drop distracting inline breath fillers (uh, oh) tacked onto sentences, and render expressive literary exclamations (嗚呼 / あぁ -> อา..., โอ้..., โธ่) naturally.`;
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
        buildGuardrails: (styleKey) => buildTranslationGuardrails(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuation(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Vietnamese"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Vietnamese.\nCRITICAL: Every meaningful lyric line MUST be translated into Vietnamese (even if the source line is in English, Japanese, Korean, Chinese, Spanish, French, or Romaji—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Vietnamese.\nCRITICAL: Every meaningful lyric line MUST be translated into Vietnamese (even if the source line is in English, Japanese, Korean, Chinese, or Romaji—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
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
        buildGuardrails: (styleKey) => buildTranslationGuardrailsEN(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationEN(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "English"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable, and poetic English.\nCRITICAL: Every meaningful lyric line MUST be translated into English (even if the source line is in Japanese, Korean, Chinese, Spanish, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable English.\nCRITICAL: Every meaningful lyric line MUST be translated into English (even if the source line is in Japanese, Korean, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
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
        buildGuardrails: (styleKey) => buildTranslationGuardrailsJA(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationJA(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Japanese"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Japanese (日本語).\nCRITICAL: Every meaningful lyric line MUST be translated into Japanese (even if the source line is in English, Korean, Chinese, Spanish, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, ララ) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Japanese (日本語).\nCRITICAL: Every meaningful lyric line MUST be translated into Japanese (even if the source line is in English, Korean, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, ララ) unchanged.\n\nSong: ${artist} - ${title}`,
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
        buildGuardrails: (styleKey) => buildTranslationGuardrailsKO(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationKO(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Korean"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Korean (한국어).\nCRITICAL: Every meaningful lyric line MUST be translated into Korean (even if the source line is in English, Japanese, Chinese, Spanish, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, 라라) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Korean (한국어).\nCRITICAL: Every meaningful lyric line MUST be translated into Korean (even if the source line is in English, Japanese, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, 라라) unchanged.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Korean."
    },
    zh: {
        code: "zh",
        name: "Simplified Chinese",
        label: "中文 (Chinese)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_ZH,
        buildPronounSection: () => "",
        buildGuardrails: (styleKey) => buildTranslationGuardrailsZH(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationZH(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Simplified Chinese"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Simplified Chinese (简体中文).\nCRITICAL: Every meaningful lyric line MUST be translated into Simplified Chinese (even if the source line is in English, Japanese, Korean, Spanish, French, or Vietnamese—do NOT leave foreign sentences or Japanese Kanji variants untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, 啦啦) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Simplified Chinese (简体中文).\nCRITICAL: Every meaningful lyric line MUST be translated into Simplified Chinese (even if the source line is in English, Japanese, Korean, or Vietnamese—do NOT leave foreign sentences or Japanese Kanji variants untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, 啦啦) unchanged.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Simplified Chinese."
    },
    uk: {
        code: "uk",
        name: "Ukrainian",
        label: "Українська (Ukrainian)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_UK,
        buildPronounSection: () => "",
        buildGuardrails: (styleKey) => buildTranslationGuardrailsUK(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationUK(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Ukrainian"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable, and poetic Ukrainian (Українська).\nCRITICAL: Every meaningful lyric line MUST be translated into Ukrainian (even if the source line is in English, Japanese, Korean, Chinese, Spanish, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, Ла-ла) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Ukrainian (Українська).\nCRITICAL: Every meaningful lyric line MUST be translated into Ukrainian (even if the source line is in English, Japanese, Korean, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, Ла-ла) unchanged.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Ukrainian."
    },
    es: {
        code: "es",
        name: "Spanish",
        label: "Español (Spanish)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_ES,
        buildPronounSection: () => "",
        buildGuardrails: (styleKey) => buildTranslationGuardrailsES(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationES(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Spanish"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable, and poetic Spanish (Español).\nCRITICAL: Every meaningful lyric line MUST be translated into Spanish (even if the source line is in English, Japanese, Korean, Chinese, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Spanish (Español).\nCRITICAL: Every meaningful lyric line MUST be translated into Spanish (even if the source line is in English, Japanese, Korean, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Spanish."
    },
    id: {
        code: "id",
        name: "Indonesian",
        label: "Bahasa Indonesia (Indonesian)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_ID,
        buildPronounSection: () => "",
        buildGuardrails: (styleKey) => buildTranslationGuardrailsID(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationID(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Indonesian"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Bahasa Indonesia.\nCRITICAL: Every meaningful lyric line MUST be translated into Indonesian (even if the source line is in English, Japanese, Korean, Chinese, Spanish, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Bahasa Indonesia.\nCRITICAL: Every meaningful lyric line MUST be translated into Indonesian (even if the source line is in English, Japanese, Korean, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, La la) unchanged.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Bahasa Indonesia."
    },
    th: {
        code: "th",
        name: "Thai",
        label: "ภาษาไทย (Thai)",
        hasPronouns: false,
        pronouns: null,
        styles: STYLE_INSTRUCTIONS_TH,
        buildPronounSection: () => "",
        buildGuardrails: (styleKey) => buildTranslationGuardrailsTH(styleKey),
        buildFlowPunctuation: () => buildTranslationFlowPunctuationTH(),
        buildOutputTagsBlock: (lineCount) => buildTranslationOutputTagsBlock(lineCount, "Thai"),
        buildOutputJsonBlock: (lineCount) => buildTranslationOutputJsonBlock(lineCount),
        userPromptPreamble: (artist, title) => `Translate lyrics to natural, singable Thai (ภาษาไทย).\nCRITICAL: Every meaningful lyric line MUST be translated into Thai (even if the source line is in English, Japanese, Korean, Chinese, Spanish, French, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, ลา ลา) unchanged.\n\nSong: ${artist} - ${title}`,
        jsonSchemaUserPrompt: (artist, title, lineCount) => `Translate lyrics to natural, singable Thai (ภาษาไทย).\nCRITICAL: Every meaningful lyric line MUST be translated into Thai (even if the source line is in English, Japanese, Korean, Chinese, or Vietnamese—do NOT leave foreign sentences untranslated). Keep only structural tags ([Intro], [Chorus], (Instrumental)) and standalone pure vocal ad-libs (Yeah, Oh, Ah, ลา ลา) unchanged.\n\nSong: ${artist} - ${title}`,
        fallbackInstruction: "Translate to Thai."
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
        langModule.buildGuardrails ? langModule.buildGuardrails(styleKey) : buildTranslationGuardrails(styleKey),
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

