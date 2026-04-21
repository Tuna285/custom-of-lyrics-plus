# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> A personalized version of **Lyrics Plus** for Spicetify, rebuilt to focus on high-quality lyric translation, ideal for Vietnamese users. Connects to any OpenAI-compatible LLM endpoint — Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, or local Ollama.

> [!NOTE]
> **Currently, the translation feature only supports Vietnamese (Tiếng Việt).** Support for other languages may be added in future updates if requested.

---

## Key Features

### 1. Lyric Translation with LLM API

Connects to any OpenAI-compatible LLM endpoint (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, local Ollama, etc.) to translate lyrics naturally and accurately.

- **Built-in endpoint & model presets** — One-click pickers for popular providers (Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) with curated model lists; custom URL/model still accepted.
- **Dual display modes** — Romaji (Japanese), Romaja (Korean), Pinyin (Chinese) + **Vietnamese** translation — ideal for language learning.
- **Translation Style** — 6 tones (Smart Adaptive / Poetic / Youth-Anime / Street-Rap / Vintage / Literal) to match the mood of the song.
- **Pronoun Lock** — 9 Vietnamese pronoun pairs (Auto, Anh-Em, Tớ-Cậu, Tao-Mày…) for a consistent voice across the whole track.
- **Pre-translation** — Translates the next track in the background before it plays, with adjustable lead time.
- **Live AI Reasoning** — Brain icon next to the translating indicator opens a draggable window that streams the model's thinking in real time (separate tabs for translation and phonetic).
- **Response format** — Choose Prompt Engineering (universal) or JSON Schema (stricter parsing on capable models, with automatic fallback if unsupported).
- **High quality** — Prompts tuned for musical context, preserving meaning and emotion.


| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Mini Lyrics in Picture-in-Picture

Inject synchronized lyrics directly into Spotify's native Picture-in-Picture mini player so you can read along while working in any other app. Toggle from the PiP settings panel or with `Ctrl+Shift+M`.

### 3. Video Background

Animated YouTube music-video backdrops for the lyrics page. Adjustable scale, dim, and blur — pairs nicely with the transparent mode and any Spicetify theme.


<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 4. Modern Interface & Optimized Experience

- **Transparent background** — harmonizes with any Spicetify theme.
- **Auto-hiding controls** — setting buttons only appear on hover, maximizing display space.
- **Smooth transitions** — optimized animations for seamless line transitions.
- **Full Vietnamese UI** — complete localization for Vietnamese users 🇻🇳.

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
2. Go to the **Translation** tab and fill in:
   - **API Endpoint** — pick a preset (Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) or paste any OpenAI-compatible URL.
   - **Model Name** — pick from the curated dropdown or type a custom model name.
   - **API Key** — your provider's key (free tier available at [Google AI Studio](https://aistudio.google.com/)). Up to 2 keys for round-robin.
   - **Response Format** — *Prompt Engineering* (works on every model) or *JSON Schema* (auto-falls back to Prompt Engineering if the model doesn't support it).
   - **Pre-translation** — toggle on/off and pick the lead time (how many seconds before the current song ends to start translating the next one).
3. Hover over lyrics and click the translation icon (⇄) to customize **Display Modes**, **Translation Style**, and **Pronouns**.
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

| Source Language   | Display Mode 1                  | Display Mode 2 |
| ----------------- | ------------------------------- | -------------- |
| Japanese (日本語)  | Romaji (AI), include Local Mode | Vietnamese     |
| Korean (한국어)    | Romaja (AI), include Local Mode | Vietnamese     |
| Chinese (中文)    | Pinyin (AI), include Local Mode | Vietnamese     |
| Other             | —                               | Vietnamese     |

---

## Credits

- Original [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- Translation powered by any OpenAI-compatible LLM (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, …)
- Romanization: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

## Recommended

This app works beautifully with:

- Theme: **[Spicetify Lucid](https://github.com/sanoojes/spicetify-lucid)** by sanoojes.
- For TV Mode and Fullscreen Mode: **[Made by Spicetify Creator](https://github.com/daksh2k/Spicetify-stuff/tree/master/Extensions/full-screen)**.
*(Both can be installed via Spicetify Marketplace)*

---

## License

[LGPL-2.1](../../LICENSE)

---

*This project is under active development. Please report any issues!*

