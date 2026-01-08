# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.7] - 2026-01-08

### Added

- **Vietnamese Language Support**: Full interface translation is now available! (Đã hỗ trợ hoàn toàn Tiếng Việt 🇻🇳).

### Fixed / Improved

- **Localization Engine**: Implemented `I18n.js` for better performance and future language support.
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
