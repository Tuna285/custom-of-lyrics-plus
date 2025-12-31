# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
