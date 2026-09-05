# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README.md) | [Tiếng Việt](README_VI.md) | [한국어](assets/readme/README_KO.md) | [日本語](assets/readme/README_JA.md) | [中文（简体）](assets/readme/README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)

<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> A personalized version of **Lyrics Plus** for Spicetify, rebuilt to focus on high-quality lyric translation, multilingual support, phonetic romanization/furigana, PiP mini lyrics, and video backgrounds. Connects to any OpenAI-compatible LLM endpoint — Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, or local Ollama.

> [!TIP]
> **Now supporting 6 target languages:** Tiếng Việt (`vi`), English (`en`), 日本語 (`ja`), 한국어 (`ko`), 中文 (`zh`), and Українська (`uk`) with faithful lyrical flow and customizable songwriting styles.

---

## Key Features

### 1. Lyric Translation with LLM API

Connects to any OpenAI-compatible LLM endpoint (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, local Ollama, etc.) to translate lyrics naturally and accurately.

- **6 Target Languages** — Translate into Vietnamese, English, Japanese, Korean, Chinese, or Ukrainian with dedicated style guidelines and guardrails.
- **Faithful Lyrical Flow** — Preserves 100% of core imagery, metaphors, and storytelling while shaping natural vocal prosody without rigid syllable-counting or forced rhymes that distort meaning.
- **Built-in endpoint & model presets** — One-click pickers for popular providers (Gemini 3.8/3.7/3.6, Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama); custom URL/model supported.
- **Dual display modes** — Furigana (Japanese `<ruby>`), Romaji (Japanese), Romaja (Korean), Pinyin (Chinese) + AI Translation in your selected target language.
- **Translation Style** — 6 tones (Smart Adaptive / Poetic / Youth-Anime / Street-Rap / Vintage / Literal) to match the mood of the song.
- **Pronoun Mode** — Contextual pronoun mapping for Vietnamese (Auto, Anh-Em, Tớ-Cậu, Tao-Mày…) to maintain consistent narrative voice.
- **Multi-Key API Rotation** — Add multiple API keys with automatic round-robin load balancing and instant quota/rate-limit failover.
- **Dynamic Reasoning Control** — Customize AI thinking budget (`off`, `low`, `medium`, `high`, `auto`) with streaming reasoning progress window.
- **Pre-translation** — Translates the next track in the background before it plays, with adjustable lead time.
- **Response format** — Choose Prompt Engineering (universal) or JSON Schema (stricter parsing on capable models, with automatic fallback).

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Unified Multi-Provider Manual Search

Revamped manual search dialog allowing you to find lyrics across multiple providers (**NetEase**, **LRCLIB**, and **Musixmatch**) with interactive filter chips, track duration scoring, and status badges (`Synced`, `Unsynced`).

### 3. Mini Lyrics in Picture-in-Picture

Inject synchronized lyrics directly into Spotify's native Picture-in-Picture mini player so you can read along while working in any other app. Toggle from the PiP settings panel or with `Ctrl+Shift+M`.

### 4. Video Background & Cinema Mode

Animated YouTube music-video backdrops for the lyrics page. Matches candidates using YouTube's native recommendation algorithm, bypasses video ads automatically, and supports full-window Cinema Mode (`100vw x 100vh`) with adjustable scale, dim, and blur.

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 5. Modern Interface & Optimized Experience

- **Transparent background** — harmonizes with any Spicetify theme.
- **Multi-language UI** — fully localized into 5 languages: English, Tiếng Việt, 日本語, 한국어, 中文（简体）.
- **Auto-hiding controls** — setting buttons only appear on hover, maximizing display space.
- **Smooth transitions** — tempo-adaptive Apple Music fluid easing line transitions and musical rest animations.

---

## Installation

> **Requirement:** [Spotify](https://download.scdn.co/SpotifySetup.exe) installed from web, NOT from Microsoft Store.

Install Spicetify:

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

### Quick Install (Recommended)

Open **PowerShell** and run:

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### Uninstall

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### Manual Installation

1. Download and extract this repository
2. Copy the `lyrics-plus` folder to Spicetify's CustomApps directory:
   - **Windows:** `%LocalAppData%\spicetify\CustomApps`
   - **MacOS/Linux:** `~/.config/spicetify/CustomApps`

<img width="498" height="367" alt="image" src="https://github.com/user-attachments/assets/31a5b810-ee06-447d-91f4-1e463a601dee" />

3. Run in terminal:
   ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

---

## Configuration

1. Open Spotify, click on your avatar → **Lyric Plus Translate config**
2. Go to the **Translation** tab and configure:
   - **API Endpoint** — pick a preset (Gemini, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) or paste any OpenAI-compatible URL.
   - **Model Name** — pick from presets (`gemini-3.8-flash`, `gemini-3.7-flash`, etc.) or type a custom model name.
   - **API Keys** — add one or more API keys (free tier available at [Google AI Studio](https://aistudio.google.com/)). Multiple keys automatically rotate round-robin with quota failover.
   - **Reasoning Effort** — adjust thinking budget (`off`, `low`, `medium`, `high`, `auto`).
   - **Response Format** — *Prompt Engineering* (universal) or *JSON Schema*.
   - **Pre-translation** — toggle on/off and configure lead time.
3. Hover over lyrics and click the translation icon (⇄) to customize **Target Language**, **Display Modes**, **Translation Style**, and **Pronouns**.
4. *(Optional)* Press `Ctrl+Shift+M` while a track is playing to toggle Mini Lyrics in Picture-in-Picture.

---

## Supported Languages

### Local Mode (Kuromoji, Aromanize, OpenCC)

| Source Language   | Display Mode 1                  | Display Mode 2 |
| ----------------- | ------------------------------- | -------------- |
| Japanese (日本語)  | Romaji, Hiragana, Katakana      | —              |
| Korean (한국어)    | Romaja                          | —              |
| Chinese (中文)    | Pinyin, Simplified, Traditional | —              |

### AI Mode (LLM Translation)

| Source Language   | Display Mode 1 (Phonetics)      | Display Mode 2 (Target Translation) |
| ----------------- | ------------------------------- | ----------------------------------- |
| Japanese (日本語)  | Furigana (AI), Romaji (AI)      | Vietnamese, English, Japanese, Korean, Chinese, Ukrainian |
| Korean (한국어)    | Romaja (AI)                     | Vietnamese, English, Japanese, Korean, Chinese, Ukrainian |
| Chinese (中文)    | Pinyin (AI)                     | Vietnamese, English, Japanese, Korean, Chinese, Ukrainian |
| Any Language      | Local Mode Phonetics            | Vietnamese, English, Japanese, Korean, Chinese, Ukrainian |


---

## Credits

- Original [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- Translation powered by any OpenAI-compatible LLM (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, …)
- Romanization: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## License

[LGPL-2.1](LICENSE)

---

*This project is under active development. Please report any issues!*
