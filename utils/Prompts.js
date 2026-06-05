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

const STYLE_INSTRUCTIONS = {
    "smart_adaptive": {
        role: `You are a professional Vietnamese Songwriter, Lyricist & Adapter. Your goal is to transcreate the original song lyrics into Vietnamese so they read and sound like an authentic, emotionally-resonant V-Pop song.
CORE PRINCIPLE: Prioritize Emotional Impact, Poetic Flow, and Singability over direct literal translation. If a literal sentence sounds rigid, academic, or unnatural when sung, you must creatively rephrase it to capture the core emotion, imagery, and poetic essence.`,
        style: `STRATEGY: "TRANSCREATION & MELODIC ALIGNMENT"
1) Melodic Flow & Syllable Control (CRITICAL):
   - Pay attention to line length and pacing. Do not translate a short, punchy original line into a long, wordy Vietnamese sentence.
   - Keep word counts balanced so the translation matches the original song tempo.
   - Avoid awkward consonant clusters or harsh tones that disrupt the vocal melody.

2) Natural Syntax & Pronoun Dropping:
   - In Vietnamese lyrics, constantly repeating "Anh/Em/Tôi" makes the song sound robotic.
   - Once the subject-object relationship is established, omit explicit pronouns where natural to let the actions and emotions flow.
   - Use poetic word order/inversion (e.g., "Nơi này lạnh giá" -> "Lạnh lẽo nơi đây") to enhance lyricism.

3) Metaphors & Imagery Transcreation:
   - Never translate foreign idioms literally if they lose meaning.
   - "Plastic love/voice" -> "Tình giả dối" / "Thanh âm vô hồn"
   - "Same temperature" -> "Hơi ấm tương đồng" / "Nhịp đập đồng điệu"
   - Preserve cultural motifs (like cherry blossoms, rain, seasons) but frame them in natural Vietnamese literary style.`,
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
        role: `You are a Storyteller for Anime/Indie music. Your goal is to translate a "Coming-of-age" story.`,
        style: `STRATEGY: "SLICE OF LIFE"
1) Tone: Youthful, direct, sincere, and slightly nostalgic.
   - Avoid heavy/obscure Sino-Vietnamese (Hán Việt). Common ones everyday speakers use are fine.
   - Examples (keep): "Thanh xuân", "Rực rỡ", "Ngốc nghếch".
   - Examples (avoid as too heavy): "U hoài", "Thiên thu", "Ái tình", "Sầu bi".

2) Imagery:
   - Preserve specific nouns (School, Train, Sunset, Uniform) as they are core to the genre.
   - Example: "After school" -> "Tan trường", "On the way home" -> "Đường về".`,
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
 * @returns {string}
 */
function buildPronounSection(pronounKey, styleObj) {
    if (pronounKey === "default") {
        return `
PRONOUN MODE: ANALYZE & LOCK

STEP 1 — ANALYZE CONTEXT:
Scan lyrics to determine relationship: Lovers? Friends? Family? Rivals?
Look for clues: "Aishiteru/Love" (Romance) vs "Tomodachi/Friend" (Platonic).

STEP 2 — SELECT & LOCK:
Pick ONE pronoun pair and STICK TO IT for the entire song:
- Romance → "Anh - Em" (or "Em - Anh")
- Friendship/Youth → "Tớ - Cậu" (or "Mình - Cậu")
- Conflict/Rap → "Tao - Mày" (or "Tôi - Ông")
- Solitary/General → "Ta - Người" (or "Tôi - Người")

STEP 3 — AVOID "ROBOTIC" PHRASING:
- AVOID "Tôi - Bạn" unless strictly formal. It sounds unnatural in Vietnamese music.
- If ambiguous, lean towards "Anh - Em" or "Tớ - Cậu" over "Tôi - Bạn".

`;
    }
    if (pronounKey && PRONOUN_MODES[pronounKey] && PRONOUN_MODES[pronounKey].value) {
        const pair = PRONOUN_MODES[pronounKey].value.split(" - ");
        const first = pair[0];
        const second = pair[1];
        return `
PRONOUN LOCK (MANDATORY — HIGHEST PRIORITY):
- First person (I/me/my) → "${first}"
- Second person (you/your) → "${second}"
- Example: "I love you" → "${first} yêu ${second}"
- DO NOT swap or use any other pronouns. This is a hard rule.
- If monologue (no second person), use only "${first}".

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
    return `GUARDRAILS (SEMANTIC PRECISION):
1) NO new facts or imagery (rain, tears, sunsets, colors, places, extra events) unless explicitly present.
2) NO intensifiers unless explicit (don't add: rất/quá/thật/đầy/cực...).
3) NO emotion adjectives unless explicit (don't add: buồn bã/chán chường/cô đơn/đau đớn...).
4) Prefer nuanced verbs/nouns over adding descriptors.
5) Idioms & interjections ONLY: translate the function minimally (no extra emotion words).
6) No explanations. No parentheses like "(meaning: ...)".
7) MODERN V-POP WORD CHOICE — when the source calls for common "soft/gentle/quiet/overused" concepts, use everyday V-pop vocabulary, NOT archaic/stiff substitutes or overused AI clichés. Required substitutions:
   - "khẽ khàng" → use "nhẹ nhàng" (default), or "khẽ", "thì thầm", "se sẽ" by context
   - "chao nghiêng" → use "nghiêng ngả", "chao đảo", "lung lay", or "lắc lư" by context
   - "nỉ non" → use "thì thầm", "rì rào", "vọng lại"
   - "thiên thu" / "vạn kiếp" → use "mãi mãi", "vĩnh viễn" (unless classical mode explicitly picked)
   - "ái tình" → use "tình yêu" (unless classical mode)
   - "nàng" / "chàng" as default pronoun → follow the locked pronoun pair (Anh-Em / Tớ-Cậu / etc.)
   - "ngập tràn" → use "tràn đầy", "đong đầy", "chứa chan", or "đầy" (avoid overusing "ngập tràn")
   - "đắm chìm" / "chìm đắm" → use "hòa mình", "say đắm", or "lạc vào" (avoid overusing "đắm chìm")
   - "hoài niệm" → use "nhớ về", "ký ức", or "kỷ niệm xưa"
   - "tô điểm" / "hòa quyện" → use natural, simpler V-pop phrasings
   "khẽ khàng" and "chao nghiêng" in particular are known LLM tics — actively avoid them.
8) NO POETIC-WORD REPETITION — EXCEPT for direct, verbatim repeated lines (like a chorus, hook, or refrain, which MUST be translated consistently and repeated exactly), any Hán-Việt / thi vị word (vấn vương, bâng khuâng, xao xuyến, mơ màng, man mác, da diết, ngọt lịm, dịu êm, mộng mị, u hoài, nhẹ nhàng, đắm chìm, ngập tràn, hoài niệm...) may appear AT MOST ONCE per song in non-identical lines. If the source repeats a motif in different/non-identical lines, vary the Vietnamese word each time. Same-word repetition across different lines is the main thing that makes auto-translated lyrics sound artificial.
9) CRITICAL: Every single line MUST be fully translated into Vietnamese. Under no circumstances should you copy or output the original foreign text (Japanese, Korean, Chinese, etc.) for any line. Outputting original, untranslated lines is an absolute failure.`;
}

/**
 * Builds the flow and punctuation section of the prompt.
 * @returns {string}
 */
function buildTranslationFlowPunctuation() {
    return `FLOW & PUNCTUATION:
1) Use natural Vietnamese phrasing.
2) If a sentence continues to the next line, do NOT end the current line with a comma.
3) Map emotional interjections (嗚呼, 呜呼, 아) to "Ah". Do not use "Ôi"/"Than ôi". Keep vocal sounds (Yeah, La la, Oh, Ah) unchanged.
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
 * @returns {string}
 */
function buildTaskThinkingRules(finalOutputLabel, effort = "low") {
    const hygiene = `1) Visible reply must be ONLY the required ${finalOutputLabel}. No filler ("Sure", "Here is..."), no plan headings, no commentary around the answer.
2) Do not output chain-of-thought, scratchpad lists, or draft lines in the final output. The final output must start directly with the translation tags (or JSON object) unless reasoning is active.
3) The final ${finalOutputLabel} must appear once and comprise the entire message.
4) Translate the source DIRECTLY to Vietnamese. Do not route through English, romaji, pinyin, or any other intermediate language.
5) Produce the Vietnamese for each line ONCE in the FINAL REPLY. The full set of tags must appear EXACTLY ONCE, and ONLY in the final reply.
6) **DELIVERABLE POSITION & TAGGING — CRITICAL.** If you output any reasoning, thinking process, or planning in the main response stream, you MUST wrap it entirely inside <thought>...</thought> tags at the very beginning of your response, and close </thought> before writing the first tag (e.g. <1>). NEVER place translation tags inside <thought>...</thought>. If your model has a native reasoning channel (where thoughts are sent separately from the response content), use that and start your main reply directly with the first tag/JSON without any preamble.
7) **NO LINE-BY-LINE DRAFTS IN REASONING:** Absolutely DO NOT write draft translations, list individual lines, or draft specific line translations inside the reasoning block. Keep your reasoning to a general, high-level overview (mood, genre, locked pronouns, translation strategy) in 2-4 sentences max. The actual translated lines must ONLY appear in the final tags/JSON.`;

    if (effort === "off") {
        return `THINKING PROCESS RULES (STRICT — NO DELIBERATION):
1) Visible reply must be ONLY the required ${finalOutputLabel}. No filler ("Sure", "Here is..."), no plan headings, no commentary around the answer.
2) Do not output chain-of-thought, scratchpad lists, or reasoning tags in the reply. Do not paste the full source lyrics again before the deliverable.
3) The final ${finalOutputLabel} must appear once and comprise the entire message.
4) Translate the source DIRECTLY to Vietnamese. Do not route through English, romaji, pinyin, or any other intermediate language.
5) Produce the Vietnamese for each line ONCE in the FINAL REPLY. The full set of tags must appear EXACTLY ONCE, and ONLY in the final reply.
6) Skip deliberation entirely. Trust your first instinct and write the ${finalOutputLabel} immediately. No thinking, no auditing, no redrafting.`;
    }

    if (effort === "high") {
        return `THINKING PROCESS RULES (High Effort / Deep Deliberation):
${hygiene}

REASONING GUIDE:
Use your reasoning space to perform an in-depth translation design and thorough self-audit:
1. **Thematic & Genre Analysis:** Analyze the song's musical style, era, subtext, and emotional narrative. Identify cultural reference points.
2. **Grammar & Tone Integration:** Map sentence structures and inversion strategies. Pick matching pronouns and refine V-Pop phrasing.
3. **Melodic Singability & Rhythm Audit:** Ensure every translated line matches the original tempo, syllable pacing, and vowel-flow.
4. **Vocabulary & Repetition Check:** Review and eliminate cliché words, unnecessary subject pronouns, and repetitive poetic terms. Check that no poetic Hán-Việt term appears more than once per song.

*Constraint:* Keep reasoning to a general, high-level overview. Absolutely DO NOT list lines, write out draft translations, or draft specific line translations inside the reasoning block.`;
    }

    if (effort === "medium") {
        return `THINKING PROCESS RULES (Medium Effort):
${hygiene}

REASONING GUIDE:
Use your reasoning space to plan the translation:
1. **Genre & Mood:** Identify the style and emotional theme of the track.
2. **Pronoun Locking:** Choose and maintain the perfect pronoun pair based on the song's relationship context.
3. **Metaphor Transcreation:** Select non-literal transcreation strategies for complex idioms.
4. **Syllable Control:** Ensure translated lines fit the rhythm and are singable.

*Constraint:* Keep reasoning to a general, high-level overview. Absolutely DO NOT list lines, write out draft translations, or draft specific line translations inside the reasoning block.`;
    }

    // low — concise planning (default).
    return `THINKING PROCESS RULES (Low Effort / Concise Planning):
${hygiene}

REASONING GUIDE:
Use your thinking space to perform a quick, focused translation planning:
1. **Genre & Mood:** Identify the song's musical style and overall emotional theme.
2. **Pronoun Check:** Select the appropriate pronoun pair based on the narrative context.
3. **Metaphor Strategy:** Identify any complex idioms or non-literal phrases and plan their natural Vietnamese transcreation.
4. **Flow & Length:** Ensure the syllable count and pace of the Vietnamese draft feel natural and singable alongside the source lines.

*Constraint:* Keep reasoning to a general, high-level overview. Absolutely DO NOT list lines, write out draft translations, or draft specific line translations inside the reasoning block.`;
}

/**
 * Builds the thinking process rules for phonetic transcription.
 * @param {string} finalOutputLabel - The name of the final output format
 * @param {"off" | "low" | "medium" | "high"} effort - Reasoning effort level
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
 * @returns {string}
 */
function buildTranslationOutputTagsBlock(lineCount) {
    return `OUTPUT FORMAT (COMPACT TAGS — STRICT):
<1>[Vietnamese translation of line 1]</1>
<2>[Vietnamese translation of line 2]</2>
...
<${lineCount}>[Vietnamese translation of line ${lineCount}]</${lineCount}>

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
 * Builds the translation system prompt.
 * @param {number} lineCount - Number of lines in the lyrics
 * @param {string} styleKey - The chosen style key
 * @param {string} pronounKey - The chosen pronoun mode key
 * @param {"json" | "tags"} mode - Output format mode
 * @param {"off" | "low" | "medium" | "high"} effort - Reasoning effort level
 * @returns {string} The full system prompt string
 */
function buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, mode, effort = "low") {
    const styleObj = STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS.smart_adaptive;
    const pronounSection = buildPronounSection(pronounKey, styleObj);
    const outputBlock = mode === "json"
        ? buildTranslationOutputJsonBlock(lineCount)
        : buildTranslationOutputTagsBlock(lineCount);
    const thinkingLabel = mode === "json" ? "JSON object" : "tags";

    const parts = [
        pronounSection.trimEnd(),
        styleObj.role,
        styleObj.style,
        outputBlock,
        buildTranslationGuardrails(),
        buildTranslationFlowPunctuation(),
        buildTaskThinkingRules(thinkingLabel, effort)
    ];

    if (mode === "tags" && effort === "off") {
        parts.push("Start DIRECTLY with <1>. No preamble or filler.");
    }

    return parts.filter(Boolean).join("\n\n");
}

const Prompts = {
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
     * @param {"off" | "low" | "medium" | "high"} [options.reasoningEffort] - Level of reasoning effort
     * @returns {{ system: string, user: string }}
     */
    buildPromptEngPrompt({ artist, title, text, styleKey = "smart_adaptive", pronounKey = "default", wantSmartPhonetic = false, reasoningEffort = "low" }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const taggedInput = lines.map((l, i) => `<${i + 1}>${l}</${i + 1}>`).join("\n");

        if (wantSmartPhonetic) {
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
8. ${reasoningEffort === "off" ? "Start DIRECTLY with <1>. NO preamble, NO thinking, NO explanation." : "If reasoning/thinking is active, tags must start immediately after the closing thought block."}

${buildPhoneticTaskThinkingRules("romanization tags (<1>...</1>)", reasoningEffort)}`;

            return {
                system: phoneticCore,
                user: `Romanize lyrics for: "${artist} - ${title}".
CRITICAL: Do NOT translate the lyrics. Output the pronunciation (phonetic transcription) only (Romaji for Japanese, Romaja/Revised Romanization for Korean, Pinyin for Chinese).

Input (${lineCount} lines):
${taggedInput}

Output (${lineCount} tags):`
            };
        }

        const systemPrompt = buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, "tags", reasoningEffort);

        return {
            system: systemPrompt,
            user: `Translate lyrics to Vietnamese.
CRITICAL: Every single line MUST be translated into Vietnamese. Do NOT copy or output the original foreign text (Japanese, Korean, Chinese, etc.).

Song: ${artist} - ${title}

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
     * @returns {string}
     */
    buildMinimalFallbackPrompt({ artist, title, text }) {
        const lines = text.split("\n");
        const linesJson = JSON.stringify(lines);
        return `Translate to Vietnamese. Output valid JSON Array of ${lines.length} strings. 1:1 mapping. No merging.
Input: ${linesJson}
Output JSON:`;
    },

    /**
     * Builds fallback tags translation prompt.
     * @param {object} options
     * @param {string} options.artist
     * @param {string} options.title
     * @param {string} options.text
     * @returns {string}
     */
    buildMinimalFallbackTagsPrompt({ artist, title, text }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const taggedInput = lines.map((l, i) => `<${i + 1}>${l}</${i + 1}>`).join("\n");
        return `Translate to Vietnamese. Output EXACTLY ${lineCount} XML tags (<1>...</1> to <${lineCount}>...</${lineCount}>). 1:1 mapping. No merging.
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
     * @returns {{ system: string, user: string }}
     */
    buildJsonSchemaTranslationPrompt({ artist, title, text, styleKey = "smart_adaptive", pronounKey = "default", reasoningEffort = "low" }) {
        const lines = text.split("\n");
        const lineCount = lines.length;
        const systemPrompt = buildTranslationSystemPrompt(lineCount, styleKey, pronounKey, "json", reasoningEffort);

        return {
            system: systemPrompt,
            user: `Translate lyrics to Vietnamese.
CRITICAL: Every single line MUST be translated into Vietnamese. Do NOT copy or output the original foreign text (Japanese, Korean, Chinese, etc.).

Song: ${artist} - ${title}

Input (${lineCount} lines):
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Output: A single JSON object with key "translations" only. The "translations" value must be an array of exactly ${lineCount} Vietnamese strings.`
        };
    },

    /**
     * Builds structured phonetic prompt for JSON schema mode.
     * @param {object} options
     * @param {string} options.artist
     * @param {string} options.title
     * @param {string} options.text
     * @param {"off" | "low" | "medium" | "high"} [options.reasoningEffort]
     * @returns {{ system: string, user: string }}
     */
    buildJsonSchemaPhoneticPrompt({ artist, title, text, reasoningEffort = "low" }) {
        const lines = text.split("\n");
        const lineCount = lines.length;

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

${buildPhoneticTaskThinkingRules('JSON object (key "phonetics" only)', reasoningEffort)}`,

            user: `Romanize lyrics for: "${artist} - ${title}".
CRITICAL: Do NOT translate the lyrics. Output the pronunciation (phonetic transcription) only (Romaji for Japanese, Romaja/Revised Romanization for Korean, Pinyin for Chinese).

Input (${lineCount} lines):
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Output: JSON with key "phonetics" containing array of ${lineCount} romanized strings.`
        };
    }
};
