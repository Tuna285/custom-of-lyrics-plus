# Repository Guidelines

## Project Overview

**Lyric Plus Translate** is a Spicetify custom app (plain JavaScript, no bundler) that replaces the built-in Lyrics Plus with AI-powered translation, mini-lyrics PiP, and video backgrounds. It runs inside Spotify's renderer process via the Spicetify framework, which injects and concatenates all source files into a single shared global scope.

## Project Structure & Module Organization

All files execute in a shared global scope — there are **no ES modules or `import`/`require` statements**. Load order is critical and defined by the `subfiles` array in `manifest.json`.

```
index.js            ← entry point; defines render() and LyricsContainer
manifest.json       ← Spicetify app metadata + subfiles load order
utils/Namespace.js  ← MUST LOAD FIRST; creates window.LyricsPlus namespace
utils/Config.js     ← global CONFIG object via Spicetify.LocalStorage
services/           ← GeminiClient, Translator, LyricsFetcher, IDBCache, etc.
providers/          ← LRCLIB and Musixmatch API adapters
parsers/            ← LRCParser for timestamped lyrics
components/         ← React-like components via Spicetify.React
i18n/               ← LangEN.js, LangVI.js, I18n.js
```

**Critical invariant:** the `subfiles` list in `manifest.json` and the `$filesToDownload` list in `install.ps1` must stay in sync whenever files are added or removed.

React is accessed via `Spicetify.React` (not imported). Config is persisted with `Spicetify.LocalStorage` / `localStorage`. No build step is required; changes are applied by running `spicetify apply`.

## Development & Deployment Commands

There is no package manager or build tool. To test changes locally:

```powershell
# Copy the repo folder to Spicetify's CustomApps directory (Windows)
Copy-Item -Recurse -Force "." "$env:LOCALAPPDATA\spicetify\CustomApps\lyrics-plus"

# Apply and reload Spotify
spicetify apply
```

Quick-install from remote (end-user):
```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

Uninstall:
```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

> **Do not run PowerShell as Administrator** — Spicetify cannot apply changes under elevated privileges.

## Coding Style & Conventions

- Plain JavaScript (`.js`); `types.d.ts` provides JSDoc type hints via `/// <reference>` — not compiled
- Use JSDoc (`/** @param ... @returns ... */`) for functions where types improve clarity
- No ES module syntax (`import`/`export`) — all declarations become globals or register via `window.LyricsPlus.register(name, module)`
- Immutable state updates: spread rather than in-place mutation
- No `console.log` in production paths (use `console.warn` for recoverable issues only)
- Localization: all user-visible strings go through `i18n/I18n.js`; add keys to both `LangEN.js` and `LangVI.js`

## Commit Guidelines

Follow conventional commits. Scope is optional but used for targeted changes:

```
feat: <description>
fix: <description>
fix(scope): <description>    # e.g. fix(installer): ...
feat(scope): <description>   # e.g. feat(reasoning): ...
docs: <description>
style: <description>
chore: <description>
```

Release commits use the pattern: `release v<version>: <summary of changes>`.
