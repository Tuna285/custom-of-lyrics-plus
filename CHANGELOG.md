# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-05-01

### Added

- **NetEase Cloud Music Provider** — Integrated as a high-quality synced lyrics source. Supports automatic matching and manual search via popup modal. Supports internal NetEase translations (`tlyric`).
- **Video Background Blur** — New slider in Settings → Appearance to adjust background blur intensity for better lyric readability.

### Changed

- **Theme Consistency** — Removed all hardcoded hex colors (`#1ed760`, etc.). UI elements (buttons, highlights) now dynamically inherit from the active Spicetify theme variables (`--spice-button`, `--spice-text`, etc.).
- **LRC Parser Upgrade** — Enhanced robustness to handle NetEase's non-standard timestamp formats (e.g., `[mm:ss:xx]`) and unified timestamp removal to prevent display artifacts.

### Fixed

- **Metadata Decluttering** — Automatically detects and removes artist credit lines (Composer, Lyricist, etc.) from NetEase lyrics to provide a cleaner listening experience.
- **Manual Search Persistence** — Fixed an issue where manually selected lyrics wouldn't apply or survive re-renders. Manual selections are now persisted in the IDB cache.

## [1.5.0] - 2026-04-21

### Added

- **Multi-language UI** — Settings interface now supports 5 languages: English, Tiếng Việt, 한국어, 日本語, 中文（简体）. Language files: `i18n/LangKO.js`, `i18n/LangJA.js`, `i18n/LangZH.js` (previously only EN + VI existed). Switch via Settings → General → Language.
- **Appearance tab** — New dedicated tab in the settings modal for color customization. Allows per-channel overrides for Active lyric color, Inactive lyric color, and Accent/highlight color. Color picker shows a native swatch; "Reset" button restores the Spicetify theme default (CSS variable) instantly without a reload.
- **Provider descriptions** — All 6 lyric providers (local, musixmatch, netease, lrclib, spotify, genius) now display a translated description below their row in the Providers tab, fully localized in all 5 languages.
- **Multi-language README** — Added `assets/readme/` directory with `README_EN.md`, `README_KO.md`, `README_JA.md`, `README_ZH.md`, `README_VI.md`. Each file has a language navigation bar at the top. Root `README.md` and `README_VI.md` link to this directory.
- **`AGENTS.md`** — Architecture documentation for the project: global-scope concatenation model, `manifest.json` ↔ `install.ps1` sync invariant, deploy commands, commit conventions.

### Changed

- **Settings UI — description hierarchy**: Setting descriptions are now visually grouped with their control row inside a `.setting-group` wrapper. Descriptions render as a smaller, muted `<p>` below the row instead of as the row label. Hover effect applies to the whole group. Both `OptionList` and `ServiceOption` components updated.
- **CORS proxy section**: Restructured with a section header (`h2`), description text above the input, and a note below — consistent with the rest of the settings layout.
- **Modal title localized**: Settings modal title now uses `getText("modal.title")` so it renders in the active language (e.g. "Lyrics Plus 설정", "Lyrics Plus 設定", "Lyrics Plus 设置").
- **i18n switch statement**: `getCurrentLang()` in `I18n.js` expanded from a binary `vi/en` check to a full `switch` covering `vi`, `ko`, `ja`, `zh`, with `en` as the default fallback.

## [1.4.2] - 2026-04-20

### Fixed

- **Idling indicator (♪) popping up mid-line** on ballads and songs with short lyrics + held notes.
- **Reasoning Effort** on non-thinking models (Gemma 4 26B A4B, GPT-4o, Claude Haiku, etc.): no more spam warn toast, no more API rejection on Gemma 4 31B and Claude Haiku.

### Changed

- **Translation prompts**: Steer Vietnamese toward modern V-pop wording (avoid overused tics like "khẽ khàng"; cap repeated poetic words to once per song). Youth story style: clarify **heavy/obscure** Sino-Vietnamese only, not everyday words like "thanh xuân".

## [1.4.1] - 2026-04-19

### Added

- **Reasoning Effort selector** (`Off` / `Low` / `Medium` / `High`) replaces the old boolean "Disable AI Thinking" toggle. Maps to the correct per-provider field (Gemini `thinking_budget`, OpenAI `reasoning_effort`, OpenRouter `reasoning.max_tokens`, Qwen `enable_thinking`, Claude `effort`, Ollama `think`). Defaults to **Low** — the sweet spot for lyric translation. Existing users who had "Disable AI Thinking" on are migrated to `Off`.
- **Anti-redraft stream abort**: Deterministic client-side detector watches the SSE content channel for a second `<1>` tag (the signature of a full-song redraft during model audit passes). When detected, the stream is proactively aborted and truncated at the first complete draft, preventing wasted tokens and rate-limit hits on chatty models.
- **Targeted-revision thinking rules**: Added prompt rules #7/#8 to discourage full-lyric redrafts during reasoning — model is instructed to emit minimal per-line patches and cap itself at one revision pass over fewer than 5 lines.

### Changed

- **Default model** updated to `gemma-4-26b-a4b-it` (MoE, no thinking mode — ~6× faster than dense reasoning models at comparable lyric-translation quality, with 15 RPM / 1500 RPD on Google's free tier).

## [1.4.0] - 2026-04-19

### Added

- **Mini Lyrics in Picture-in-Picture**: Inject synchronized lyrics into Spotify's native PiP mini player. Toggle from PiP settings panel or with `Ctrl+Shift+M`.
- **Endpoint & Model Presets**: New dropdown picker for popular LLM providers (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, local Ollama) with curated model lists; custom URL/model still accepted.
- **Live AI Reasoning Window**: Brain icon next to the translating indicator opens a draggable, auto-scrolling window that streams the model's thinking in real time, with separate tabs for translation and phonetic streams.
- **Response Format selection**: Choose between *Prompt Engineering* (universal) and *JSON Schema* (stricter parsing) — auto-falls back to Prompt Engineering when the model doesn't support it.
- **Pre-translation lead time**: Configure how many seconds before the current song ends to start translating the next track.
- **Disable AI Thinking** config option for models that support it.

### Changed

- **Settings UI rewrite**: Removed Direct API / ProxyPal modes. Translation tab now exposes a flat layout with Endpoint, Model, API Key 1/2, Response Format, and Pre-translation lead time.
- **Translation completion time**: Now reports true wall-clock duration instead of summing parallel task durations. Output is human-readable (`3.5s`, `1m 24s`) instead of raw milliseconds.
- **Smart idle indicator (♪)**: Per-song adaptive timing based on tempo estimation, with a grace period to prevent premature appearance on lines that end abruptly.
- **Reasoning window UI**: Redesigned for a less "AI generated" look, fixed initial position and size, draggable, auto-scrolls to the newest line.
- **Reasoning window persistence**: Position and size are now saved across closes, song changes, and Spotify restarts. Window also stays open when switching tracks — new song's translation/phonetic stream replaces the previous content in place.
- **Streaming throttling**: `onProgress` callbacks throttled so the reasoning window doesn't slow down responses on long songs.
- **Removed** unused `.gitignore` file.

### Fixed

- **Pre-translate indicator** floating layout — now stacks correctly with translating indicator and matches its size, fixed unsynced issue with songs.
- **Local LRC sync stuck after enabling display mode** — phonetic conversion (Romaji/Pinyin/Romaja) and legacy cached translations no longer drop per-line `startTime`, restoring active-line highlighting and click-to-seek.
- **README** image placeholders restored (`preview.gif`, conversion previews, manual download).

### Documentation

- `README.md` and `README_VI.md` rewritten Key Features and Configuration sections to cover the new features and the flattened settings UI.

## [1.3.0] - 2026-01-23

### Added

- **Client-side Video Migration**: Video Background search to run directly on the client using `ivLyrics`.
- **Modern UI**: Simplified modal designs by removing redundant background layers, creating a clean "1-layer" aesthetic.

### Fixed / Improved

- **Gemini/Gemma**: Improved translation format for Gemma model to fix missing line, improve translation quality for Gemini/Gemma model.

## [1.2.7] - 2026-01-08

### Added

- **Vietnamese Language Support**: Full interface translation is now available! (Đã hỗ trợ hoàn toàn Tiếng Việt 🇻🇳).

### Fixed / Improved

- **Cache Logic**: Resetting translation cache now only affects active Display Modes.
- **Cache Persistence**: Cached translations are now preserved when changing Style or Pronoun settings.
- **General**: Added and improved various minor functions for better stability.

## [1.2.6] - 2026-01-05

### Fixed

- **Cached Translation Display Bug**: Fixed critical race condition where cached Gemini translations would briefly appear then disappear when switching tracks
  - Root cause: `fetchLyrics()` was overwriting `currentLyrics` with original lyrics after `lyricsSource()` had already loaded cached translations
  - Applied fix to both code paths (new song and same song scenarios)
  - Prevented `_dmResults` from being reset on repeated `lyricsSource()` calls
  - Added early return when cached translations exist to skip unnecessary API calls
- **Rate Limit Notification Spam**: Silenced 429 error notifications (logged to console only) and added global throttling to prevent duplicate error messages

---

## [1.2.5] - 2026-01-05

### Added

- **Skip Update**: Added "Skip This Version" button to update notification to mute future alerts for specific versions
- **Update Check**: Changed update check to run on every startup (removed 24h delay)

### Fixed

- **Lyric Alignment**: Fixed translation misalignment caused by empty line filtering (preserved 1:1 line mapping)
- **Scrollbar**: Refined scrollbar hiding logic without breaking scroll behavior
- **Prompts**: Explicitly preserved Japanese quotation marks style in translation rules

---

## [1.2.4] - 2026-01-05

### Added

- **Vietnamese README**: Added `README_VI.md` with full Vietnamese documentation
- **Installer Improvements**: Admin check, auto-close Spotify, retry logic for locked files

### Improved

- **Gemma Translation Accuracy**:
  - Changed prompt format from JSON array to numbered list (prevents line shifting)
  - Reduced temperature from 1.0 to 0.5 for more deterministic output
  - Added concrete input/output examples in prompt
  - Added mixed-language rule (keep English, translate CJK)
- **Number Romanization**: Numbers now convert to words (2000 → "ni-sen" JP, "i-cheon" KR)
- **Error Handling**:
  - Distinguish between Official API and ProxyPal errors
  - Network error detection with helpful messages
  - Show user notifications for all error types
  - Added handling for 400, 502, 503, 504 status codes
- **Settings Persistence**: `gemini:api-mode` now survives `spicetify apply` using persistent storage

### Fixed

- Fixed settings reset to "proxy" after `spicetify apply`
- Fixed ProxyPal: removed invalid models from dropdown
- Improved numbered list parser for Gemma responses

---

## [1.2.3] - 2026-01-03

### Added

- **One-Click Update**: Beautiful update modal with copy-to-clipboard install command
- One-liner installation via PowerShell: `iwr -useb .../install.ps1 | iex`
- Uninstall script for easy removal
- Settings button in lyrics header for quick access
- Synchronous cache preload for instant translation display
- `GeminiClient.cancelAllQueues()` - Cancel all pending API requests
- `CacheManager.stats` - Get cache statistics
- Queue status monitoring via `queue.status`

### Performance

- Request deduplication: Prevents duplicate API calls for same content
- Adaptive queue delay: 100ms normal, 500ms when rate limited (was fixed 200ms)
- True exponential backoff: 1s → 2s → 4s retry delays
- Queue cancellation: Cancel pending requests when track changes
- Cache TTL increased from 1 hour to 7 days (translations don't change)
- Cache size increased from 200 to 500 songs
- Persistent cache: Translations survive browser restart via localStorage

### Fixed

- **Translations not displaying**: Fixed issue where cached translations wouldn't show until display mode was toggled to "none" and back
- **Duplicate idling indicators (♪)**: Added `isNoteLineObject()` helper to check all text fields (`text`, `originalText`, `text2`) instead of just `text`, fixing detection after translation processing
- Robust note detection with `isReallyNote` helper for Unicode handling
- Look-back merge strategy to prevent consecutive note artifacts
- Refactored `updateCombinedLyrics` to read directly from `_dmResults` instead of stale closure variables

### Improved

- Update notification now shows command directly in modal
- Removed excessive debug logs for cleaner console output

---

## [1.2.2] - 2025-12-31

### Fixed

- Fixed lyrics invisible when "Transparent Background" is OFF
- Fixed Proxy Mode not working when Official API Key is missing
- Fixed Proxy Mode ignoring Smart Phonetic (Romaji/Pinyin) settings
- Changed default Proxy Model to `gemini-3-flash-preview` for better performance

## [1.2.1] - 2025-12-31

### Changed

- Renamed project to **Lyric Plus Translate**
- Updated README with local assets and better documentation
- Added CHANGELOG.md

---

## [1.2.0] - 2025-12-31

### Added

- Modularized architecture: separated code into GeminiClient, Prompts, Translator modules
- Pre-translation feature for next song in queue
- Smart deduplication for similar translations
- Idling indicator animation (♪) for long pauses

### Changed

- Renamed project to **Lyric Plus Translate**
- Improved translation race condition handling
- Enhanced error handling with null provider guards

### Fixed

- CACHE reassignment issues
- Race conditions in translation flow
- Null pointer exceptions on Spicetify Player access

---

## [1.1.0] - 2025-12-29

### Changed

- Major refactoring of Gemini API methods and rules
- Improved translation logic

---

## [1.0.0] - 2025-12-19

### Added

- Initial versioned release
- Improved Auto mode with Pronoun selection
- Increased temperature to 0.3 and max timeout to 60000ms

---

## Pre-release Updates

### 2025-11-23

- Updated README documentation

### 2025-10-02

- Optimized performance and fixed bugs
- Added Auto-scroll feature for unsynced lyrics

### 2025-09-16

- Fixed various UI issues
- Reorganized project structure

### 2025-09-15

- Added artwork background setting
- Added background brightness control
- Improved Gemini prompt

### 2025-09-10

- Added "Reset translation cache" button
- Made Cache lyrics work with Gemini mode

### 2025-09-05

- Big update with display error fixes

### 2025-08-29 ~ 2025-08-30

- Improved Vietnamese translation prompt
- Improved AI prompt quality
- Fixed Furigana/Kuromoji at Replace Original Display

### 2025-08-28

- Improved Romaji translation and error handling
- Updated OptionsMenu

### 2025-08-26

- Initial commit
- Basic lyrics display with Gemini translation support

