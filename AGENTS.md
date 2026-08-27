# Repository Guidelines & Developer Standards

## 1. Project Overview & Architecture

**Lyric Plus Translate** is a Spicetify custom app (plain JavaScript, no bundler) that replaces the built-in Lyrics Plus with AI-powered translation, mini-lyrics PiP, and video backgrounds.

* **Shared Global Scope:** There are **no ES modules or `import`/`require` statements**. All declarations execute in a single shared global scope attached to `window.LyricsPlus`.
* **Load Order Law:** Execution order is strictly defined by the `subfiles` array in `manifest.json`.
* **Critical Invariant:** Whenever source files are added, renamed, or deleted, you **MUST** update BOTH `manifest.json` (`subfiles`) and `install.ps1` (`$filesToDownload`) in sync.

```
index.js            ← entry point & React root render (~1280 lines)
manifest.json       ← Spicetify app metadata & subfiles load order
utils/Namespace.js  ← MUST LOAD FIRST; creates window.LyricsPlus namespace
utils/Config.js     ← global CONFIG object via Spicetify.LocalStorage
services/           ← GeminiClient, Translator, LyricsFetcher, IDBCache, TranslationCoordinator
providers/          ← LRCLIB, Musixmatch, ProviderNetease
parsers/            ← LRCParser for timestamped lyrics
components/         ← SyncedLyrics, UnsyncedLyrics, VideoBackground, VideoSettingsModal, Settings, OptionsMenu
i18n/               ← LangEN.js, LangVI.js, I18n.js
```

---

## 2. Core Technical Invariants & Rules

### A. Dual-Renderer Invariant (`components/SyncedLyrics.js`)
Synced lyrics are rendered by **TWO separate components**:
1. `SyncedLyricsPage` (Standard View): Uses `lyricWithEmptyLines` array and active window `activeLines`.
2. `SyncedExpandedLyricsPage` (Fullscreen / Expanded View): Uses `padded` array.

> [!IMPORTANT]
> Any bug fix or feature affecting timing, note line filtering, idling indicators, or line transition durations **MUST BE APPLIED IDENTICALLY TO BOTH RENDERERS** using their respective scope variables (`activeLines` vs `padded`).

---

### B. Idling Indicator (`• • •` / `♪`) Rules & Math
* **Rest Gating:** An idling indicator is considered ONLY when actual singing rest duration `silentDuration >= 4500ms` and raw line interval `GAP_THRESHOLD_MIN = 10500ms`.
* **Provider Empty-Line Filtering:** Dummy empty lines from provider LRCs (e.g. NetEase multi-sentence lines) with `durationToNext < 9000ms` MUST be dropped (`continue;`) during note processing to prevent false indicators between lyric lines.
* **Timeline Animation:**
  * **0% → 85% Rest Window:** Dot scale expands ($0.4 \rightarrow 0.75$), rises upward ($\text{translateY}(-5px)$), and reaches peak glow halo at **85%**.
  * **Staggered Drop Delays:** Dots turn off with staggered delays (`0s`, `0.12s`, `0.24s`).
  * **Idle Wave:** Option B `idlingIdleWave` (+5px bounce) runs at speed `calc(var(--indicator-delay) * 0.3)`.

---

### C. Apple Music Dynamic Line-Transition Formula
* **CSS Variable:** `--line-transition-duration`
* **Dynamic Duration Formula:** Based on line interval $D$ in ms:
  $$\text{durationSec} = \min\left(0.60, \max\left(0.20, \frac{D \times 0.08}{1000}\right)\right)\text{s}$$
  * Fast lines ($D < 2.5s$): Transitions quickly ($0.20s - 0.25s$).
  * Slow ballad lines ($D > 6s$): Transitions smoothly ($0.50s - 0.60s$).
* **CSS Transition Styling:**
  ```css
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
  transition-duration: var(--line-transition-duration, 0.4s);
  ```

---

### D. Provider & Service Quirks

#### 1. NetEase Provider (`ProviderNetease.js`)
* **Dynamic Matching Threshold:** Lower threshold to `0.12` when track duration offset is $<8s$ for reliable Japanese/Korean search auto-matching.
* **Fallback (`tlyric`):** If original Japanese/Korean `lrc` is empty, automatically fall back to Chinese translation (`tlyric`) as main text.
* **Pre-fetch Tags:** Pre-fetch lyrics on manual search to display visual badges (`Synced`, `Unsynced`, `No Lyrics`).

#### 2. Gemini AI & Dynamic Keys (`GeminiClient.js` & `TranslationCoordinator.js`)
* **Dynamic Key Rotation:** Sequential Round-Robin rotation across `"gemini-api-keys"` array.
* **Quota Failover:** Throw immediately on HTTP 429 Quota Exceeded errors so the coordinator instantly switches to the next fallback key without getting stuck in redundant retries.
* **Multi-part Output:** Always concatenate all response parts: `partsArr.map(p => p.text).join("")` to prevent text truncation mid-sentence.
* **Phonetic Model Split:** Route mechanical transcription tasks (Romaji, Furigana) to `gemini-3.5-flash-lite` while keeping main translation on `gemini-3.6-flash`.

#### 3. Video Background (`VideoBackground.js` & `VideoManager.js`)
* **Non-Singleton Lifecycle:** React component destroys player (`player.destroy()`) on unmount, freeing 100% CPU/RAM when leaving the Lyrics tab.
* **Soft-Captions:** Disable YouTube captions continuously (`unloadModule("captions")`, `cc_load_policy: 0`).
* **Event Propagation:** Use `e.stopPropagation()` and `e.preventDefault()` on modal button click handlers to prevent unintended modal closing.

---

### E. Karaoke Deprecation & Frozen Status Invariant
* **Scope & Intent:** This repository focuses **100% on AI Translation (Gemini), Phonetics (Furigana/Romaji/Pinyin), PiP MiniLyrics, and Video Background**.
* **Legacy Artifacts:** All karaoke references (`KARAOKE = 0`, `isKara`, `KaraokeLine`, `parseKaraokeLine`, `getKaraoke`) are **frozen legacy code** from the upstream `lyrics-plus` fork.
* **CRITICAL INVARIANT FOR ALL AGENTS / CONTRIBUTORS:**
  * **DO NOT** refactor, modify, optimize, or develop features for Karaoke.
  * **DO NOT** remove or re-index `CONFIG.modes = ["karaoke", "synced", "unsynced", "genius"]` — downstream code, IndexedDB cache schemas, and tab navigation depend strictly on exact index positions (`1: synced`, `2: unsynced`, `3: genius`).
  * Treat all Karaoke code as completely frozen and passive.

---

## 3. Development Commands & Workflow

```powershell
# Apply changes to Spicetify and reload Spotify
spicetify apply

# Quick-install from remote:
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex

# Uninstall:
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

> **Do not run PowerShell as Administrator** — Spicetify cannot apply changes under elevated privileges.

---

## 4. Agent Operating Rules (`@[user_global]`)

1. **Suy Nghĩ Trước Khi Code:** Always state assumptions, plans, and trade-offs explicitly. STOP and wait for explicit user approval before writing code or running modifying commands.
2. **Ưu Tiên Sự Đơn Giản:** Write the minimum code necessary to solve the problem. Do not add unrequested flexibility, configuration, or unnecessary abstractions.
3. **Chỉnh Sửa Đúng Trọng Tâm (Surgical Changes):** Touch ONLY what is necessary. Preserve surrounding formatting and comments. Never refactor working code unless asked.
4. **Thực Tế Làm Chuẩn (No Guessing):** Inspect authoritative source files using `view_file` or code search. Never guess variable names, scope variables, or method signatures.
5. **Thực Thi Theo Mục Tiêu:** Define verification criteria. Run syntax checks (`node -c <file>`) and empirical verification (`spicetify apply`) before declaring completion.

---

## 5. Commit Guidelines

Follow conventional commits:
```
feat: <description>
fix: <description>
fix(scope): <description>
feat(scope): <description>
docs: <description>
style: <description>
chore: <description>
```
Release commits follow: `release v<version>: <summary of changes>`.