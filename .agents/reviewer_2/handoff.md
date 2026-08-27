# SWE Light Review Report (Review Round 2)

## 1. What the prior attempt got wrong

### Issue 1: Unclosed Thought Lookahead Premature Truncation on Numbered Reasoning
- **Input**: Model generating an unclosed `<thought>` block containing numbered planning steps before tags/JSON (e.g. `<thought>Here is my plan:\n1. Identify pronouns (Boku/Kimi -> Tớ/Cậu)\n2. Handle enjambment\n<1>Dòng một</1>`).
- **Expected**: `stripReasoningBlocks` strips the entire thought block up to `<1>`, and `extractStreamingReasoning` streams the full thought.
- **Actual**: `stripReasoningBlocks` matched `\d+\.\s*` inside `unclosedPatterns` lookahead at `1. Identify...`, truncating the match prematurely and leaving `1. Identify pronouns...\n2. Handle enjambment` unstripped inside `cleaned`.
- **Root Cause**: The unclosed lookahead included `\d+\.\s*` and `\[` which collided with numbered planning lists (`1. ...`, `2. ...`) and bracketed markdown markers (`[Plan]`, `[Analysis]`) commonly used inside model reasoning text.

### Issue 2: Japanese Full-width Digit Zenkaku Tags (`＜１＞...＜／１＞`, `【１】...【／１】`) Not Parsed as Tags
- **Input**: Japanese / Asian LLMs outputting tags with full-width digits (e.g. `＜１＞Dòng một＜／１＞\n＜２＞Dòng hai＜／２＞`).
- **Expected**: `extractGeminiJson` parses as structured compact tags with `vi = ['Dòng một', 'Dòng hai']`.
- **Actual**: `tagRegex = /[<＜【［](\d+)[>＞】］]/g` failed to match full-width digits (`１`, `２`), causing output to fall through to Priority 3 fallback split, preserving raw tag markup `＜１＞Dòng một＜／１＞` in the lyric text.
- **Root Cause**: JavaScript regex `\d` matches only ASCII digits `0-9`, not Unicode full-width digits (`\uFF10-\uFF19`).

---

## 2. What I changed

- **`services/GeminiClient.js`**:
  - **Refined Unclosed Thought Boundaries**: Updated `stripReasoningBlocks` and `extractStreamingReasoning` lookaheads from `(?=[<＜【［\[]\d+[>＞】］\]]|\d+\.\s*|\[|\{|"translations"|$)` to `(?=(?:[<＜【［][0-9０-９]+[>＞】］]|(?:\n|^)\s*\{|(?:\n|^)\s*\[\s*["\d]|"translations"|"phonetics"|$))`. Added opening tag attribute support `(?:\s+[^>]*)?`.
  - **Full-Width Digit (Zenkaku) Support in Tag Parsing**: Updated `tagRegex` to match `[0-9０-９]+` and normalized full-width digits `０-９` to standard ASCII `0-9` via `String.fromCharCode(ch.charCodeAt(0) - 65248)`.
  - **Full-Width Digit Support in Closing Tag & Opening Cleanup Regexes**: Handled `fullWidthNum` in `closingTagRe`, `openingReg`, and generic malformed closing cleanup `/[<＜【［][\/／][0-9０-９]*[>＞】］]?[ \t]*$/`.
  - **Full-Width Digit Support in Numbered List Parser**: Added `[0-9０-９]+` support in Priority 1 numbered list parser.
  - **Full-Width Digit Support in Redraft Detector**: Updated `checkRedraftAbort` to recognize `[1１]` and `[2２]` tag boundaries.

---

## 3. Verification Record

- **Deep Verification (ran actual tests)**:
  - `node -c utils/Prompts.js; node -c services/GeminiClient.js` (both exit 0).
  - Executed 48 unit and adversarial test cases in `scratch/test_adversarial_suite.js`:
    1. Full-width angle, lenticular, square bracket tags with half-width and full-width slashes and digits (`＜１＞`, `【１】`, `［１］`, `＜／１＞`).
    2. Ruby tags with embedded numbers and complex Furigana.
    3. Closed and unclosed `<thought>`, `<think>`, `<reasoning>`, Gemma `<|channel>thought`, unclosed thoughts with internal numbered steps (`1. ...`, `2. ...`), and stray closing tags with internal spaces.
    4. Partial streaming reasoning extraction during token-by-token emission.
    5. Priority 3 fallback split leak detection and failover error throwing on leaked thought keywords.
    6. `processResponse` end-to-end tag parsing, reasoning extraction, and recovery when tags are placed inside thought blocks.
    7. Streaming redraft detector simulation confirming early abort on Pass-3 redrafts (both ASCII and Zenkaku digits) while keeping lyrics with numbers/ruby tags untouched.
    8. `Prompts.js` prompt generation across all modes (Translation, Furigana, Romanization, JSON Schema, all pronoun pairs, all effort levels).
  - **Result: 48/48 passed (0 failures).**

- **Shallow Verification (manual only)**:
  - Reviewed prompt text alignment with J-pop cultural motifs, persona anchoring, enjambment, and Natural Flow Rule 8.

- **Unverified aspects**:
  - Live Spotify client desktop playback under fluctuating network conditions.

---

## 4. Known Issues
- `Minor Robustness Risk` — If an unsupported model outputs unstructured thought text in an obscure language without any tags or known keywords and fails structured tag parsing, line-count mismatch threshold (0.85) remains the primary fallback safety net.

---

## 5. Remaining risk & next step
- Task is complete. All requirements R1, R2, and R3 are fully resolved, adversarial edge cases fixed, and verified.
