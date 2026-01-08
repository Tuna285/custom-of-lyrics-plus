# ============================================================================

## INSTRUCTION SET FOR AI CODE ASSISTANTS

# ============================================================================

When editing code in this project, follow this risk classification system:

### RISK CLASSIFICATION

**Type A (Safe - Apply Immediately)**

- New files or functions with no dependencies
- Comments, documentation, or docstrings
- Test files
- Configuration files in isolated scopes
- Validation: ✓ No bracket/syntax issues, ✓ No impact on existing code

**Type B (Risky - Show Diff + Await Approval)**

- Logic changes to existing functions
- Refactoring of working code
- Parameter additions with defaults
- Control flow modifications
- Validation: ✓ Syntax valid, ✓ All callers analyzed, ✓ No breaking changes

**Type C (Dangerous - Full Impact Analysis)**

- Breaking API changes
- Signature modifications without backward compat
- Core algorithm changes
- Database schema modifications
- Validation: ✓ Impact analysis complete, ✓ Migration path documented, ✓ Alternatives provided

### PROTOCOL RULES

**Rule 1: Show Diffs**
Always provide diff format for Type B/C:

```
FILE: target.js
ACTION: Brief description
RISK: Type A/B/C
- old line
+ new line
WHY: Rationale
IMPACT: Who/what affected
VALIDATION: ✓ checks passed
```

**Rule 2: Burden of Proof**
For modifying working code, provide evidence:

- Why change is necessary (not subjective)
- Evidence of problem (error, performance, security)
- Test coverage for validation
- Rollback plan if needed

**Rule 3: One Change Per Edit**

- Do not bundle multiple unrelated changes
- Each edit should have single, clear purpose
- Reject vague requests ("improve this file")

**Rule 4: Validate Before Applying**

- Bracket matching: [], {}, ()
- Template literal closure: backticks
- Quote matching: "", ''
- No orphaned keywords: if/else, try/catch
- Async/await pairing

**Rule 5: Communicate Alternatives**
For Type C changes, provide:

- Option A: Safer approach (non-breaking)
- Option B: Current approach (with impact)
- Recommendation with reasoning
- Let user choose

### VALIDATION CHECKLIST

Before approving any change:

- [ ] Syntax validation passed
- [ ] No unmatched brackets/quotes
- [ ] No orphaned control flow
- [ ] Affected callers identified
- [ ] Breaking changes documented
- [ ] Change is singular (not bundled)
- [ ] Rationale is evidence-based

### LANGUAGE-SPECIFIC RULES

**JavaScript/TypeScript**

- Validate: function signatures, async/await, template literals
- Catch: null pointer diffs, async function without await, var shadowing
- Test: with existing test suite if available

**Python**

- Validate: indentation, decorator syntax, type hints
- Catch: mixed spaces/tabs, import order, function signature changes
- Test: run pytest if available

**CSS**

- Validate: selector specificity, variable usage, z-index conflicts
- Catch: unclosed braces, invalid property values
- Test: visual regression if available

### PERFORMANCE TARGETS

- Type A decisions: immediate (no wait needed)
- Type B diff review: < 30 seconds for user
- Type C impact analysis: < 1 minute for user
- Overall session: < 5 interactions for common tasks

### EXAMPLES

**Example 1: Type A (Safe)**

```
USER: "Add JSDoc comment to parseJSON function"

RESPONSE:
FILE: utils.js
ACTION: Add JSDoc
RISK: Type A - Safe

+ /**
+  * Parse JSON string with error handling
+  * @param {string} data - JSON string to parse
+  * @returns {Object} Parsed JSON object
+  * @throws {SyntaxError} If invalid JSON
+  */
  function parseJSON(data) {
    return JSON.parse(data);
  }

APPLIED ✓
```

**Example 2: Type B (Risky)**

```
USER: "Add timeout parameter to fetchData()"

RESPONSE:
FILE: api.js
ACTION: Add timeout parameter
RISK: Type B - Risky (signature change)

- function fetchData(url) {
+ function fetchData(url, timeout = 5000) {
    return fetch(url, { timeout });
  }

CALLERS (3 found):
  - handler.js:42 ✓ Uses defaults
  - index.js:15 ✓ Uses defaults
  - worker.js:88 ✓ Positional arg

VALIDATION: ✓ Syntax OK, ✓ Backward compatible
CONFIDENCE: 100%

Apply this change? [YES/NO]
```

**Example 3: Type C (Dangerous)**

```
USER: "Change fetchData to return Promise<void> instead of data"

RESPONSE:
FILE: api.js
ACTION: Return type change
RISK: Type C - DANGEROUS

BREAKING CHANGE: YES (semantic)

CALLERS (5 found):
  - handler.js:42 - expects returned data ❌
  - service.js:15 - assigns to variable ❌
  - worker.js:88 - passes to processData() ❌
  - test.js:10 - expects return value ❌
  - index.js:5 - logs result ❌

IMPACT: 5 call sites broken

ALTERNATIVES:
Option A (SAFER): Create new fetchAndProcess() function
  - Preserves existing fetchData()
  - Non-breaking
  - Dual API during transition

Option B (CURRENT): Modify fetchData() return type
  - Breaking
  - Requires 5 updates
  - Migration period needed

RECOMMENDATION: Option A

Which approach? [A/B]
```

### PROJECT-SPECIFIC RULES (lyrics-plus)

- This is a Spicetify custom app for displaying lyrics
- Main technologies: JavaScript, CSS, Spicetify API
- Key services: `IDBCache.js`, `GeminiClient.js`, `Translator.js`
- Respect existing localization patterns in `i18n/`
- Follow CSS variable conventions in `variables.css`

---

END OF GEMINI.md - Read this file at the start of each session
