# SWE Light Review Report (Review Round 1)

## 1. What the prior attempt got wrong

### Issue 1: Regex Literal Escape Defect in Generic Closing Tag Cleanup
- **Input**: Models outputting malformed closing tags like `<1>Line 1</1\n<2>Line 2</2` or `＜1＞Line 1＜／1` without closing bracket.
- **Expected**: `content.replace(/[<＜【［][\/／]\d*[>＞】］]?[ \t]*$/, '')` strips the malformed closing tag trailing characters cleanly.
- **Actual**: Line 348 used `/[<＜【［][\/／]\\d*[>＞】］]?[ \\t]*$/` inside a regex literal. In JavaScript regex literals, `\\d` searches for a literal backslash `\` followed by `d` rather than digits, causing the cleanup regex to fail completely (`false`).
- **Root Cause**: Accidental double escaping `\\d` and `\\t` within a regex literal instead of a `RegExp` string constructor.

### Issue 2: Duplicate Opening Tag Parser Overwrite
- **Input**: Model outputting opening tags as closing markers: `<1>Line 1<1><2>Line 2<2>`.
- **Expected**: Parser extracts `['Line 1', 'Line 2']`.
- **Actual**: Parser extracted `['', '']` (wiping all line content).
- **Root Cause**: `tagRegex` matched the second `<1>` as a new tag with `currentTag.number = 1`, and parsed the empty content between `<1>` and `<2>`, overwriting `result[0]` with `""`.

### Issue 3: False Stream Abort on Japanese Lyrics with Number/Bracket Patterns in Redraft Detector
- **Input**: Streaming Japanese lyrics containing `【1】` or numbers inside a subsequent line (e.g. `<3>【1】Điều khoản quan trọng...</3>`).
- **Expected**: Stream continues uninterrupted.
- **Actual**: `redraftMatch` matched `>【1】` because `<3>` ended with `>`, treating `【1】` as a second line-1 tag and aborting the stream early due to the unsafe `.length > 25` confirmation rule.
- **Root Cause**: `redraftMatch` regex looked for `[>＞】］]\s*\n?` which matched the `>` of opening tags (like `<3>`), and the confirmation logic used an arbitrary character length check (`> 25`) instead of structural closing tags (`</1>` / `<2>`).

### Issue 4: Missing `<reasoning>` and `window.Prompts` Global Exposure
- **Input**: DeepSeek / Qwen / OpenRouter models outputting `<reasoning>...</reasoning>` blocks or unclosed `<reasoning>` tags.
- **Expected**: Thought blocks cleanly stripped and extracted without thought leakage.
- **Actual**: `<reasoning>` was omitted from reasoning patterns; `window.Prompts` was not exposed globally.
- **Root Cause**: Incomplete tag pattern set and missing window assignment.

---

## 2. What I changed

- **`services/GeminiClient.js`**:
  - Fixed regex literal escape bug at line 348 from `\\d*` / `\\t*` to `\d*` / `\t*`.
  - Added duplicate tag assignment protection in `extractGeminiJson` to prevent empty string overwrites when models use opening tags as line delimiters.
  - Added `<reasoning>` and `</reasoning>` support in `stripReasoningBlocks`, `extractStreamingReasoning`, and Priority 3 fallback split leak detector `reasoningLeakRe`.
  - Enhanced `checkRedraftAbort` to strictly require closing tag boundaries (`[<＜【［][\/／]\d+[>＞】］]`) or newlines, and verified redraft confirmation strictly against structural closing tags (`</1>`, `【/1】`, `<2>`) instead of length heuristics.

- **`utils/Prompts.js`**:
  - Exported `window.Prompts = Prompts` globally for Spicetify / browser runtime.

---

## 3. Verification Record

- **Deep Verification (ran actual tests)**:
  - `node -c utils/Prompts.js; node -c services/GeminiClient.js` (exited 0).
  - Executed 6 automated test suites in `scratch/test_reviewer_suite.js`:
    1. Prompts.js requirements: Rule 8 natural flow, J-Pop motifs, Japanese pronoun persona anchoring (Boku/Kimi, Watashi/Anata, Ore/Omae), Enjambment, Gitaigo/mimetic words, reasoning guides across all effort levels.
    2. `stripReasoningBlocks`: Closed & unclosed `<thought>`, `<think>`, `<reasoning>`, Gemma `<|channel>thought`, truncated thoughts, stray closing tags with internal whitespace.
    3. `extractStreamingReasoning`: Real-time streaming chunks with unclosed tags.
    4. `extractGeminiJson`: Half-width (`<1>`), full-width angle (`＜1＞`), lenticular (`【1】`), square (`［1］`), full-width slash (`＜／1＞`), ruby tags (`<ruby>`), inline numbers, duplicate opening tags, malformed closing tags.
    5. Fallback split leakage prevention: `<thought>`, English reasoning keywords, `<reasoning>`.
    6. `checkRedraftAbort`: Pass-3 redraft cutoff vs lyrics with `【1】`, Furigana with ruby tags, multiline lyrics, full-width redrafts.
  - All 6 test suites passed with **0 failures**.

- **Shallow Verification (manual only)**:
  - Validated prompt text coherence and persona anchoring in `buildPronounSection` and `STYLE_INSTRUCTIONS`.

- **Unverified aspects**:
  - Real-time live audio playback and streaming latency inside Spotify desktop client.

---

## 4. Known Issues
- `Minor Robustness Risk` — If a non-English, non-CJK model produces raw thought text in an unsupported language with no tags and no keywords, and fails structured tag parsing, line-count mismatch threshold (0.85) remains the primary fallback safety net.

---

## 5. Remaining risk & next step
- The implementation is robust, fully verified against edge cases, and satisfies all requirements R1, R2, and R3. Ready for deployment and live testing in Spicetify.
