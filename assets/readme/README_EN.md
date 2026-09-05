# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)



<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> A personalized version of **Lyrics Plus** for Spicetify, rebuilt to focus on high-quality lyric translation, phonetic transcription (Furigana, Romaji, Pinyin), and video backgrounds. Powered by the Google Gemini API to translate lyrics naturally and accurately.

> [!NOTE]
> **Supporting 6 target languages:** Tiếng Việt (`vi`), English (`en`), 日本語 (`ja`), 한국어 (`ko`), 中文 (`zh`), and Українська (`uk`).

---

## Key Features

### 1. Lyric Translation with Google Gemini API

Connects to Google Gemini API to translate lyrics naturally and accurately.

- **6 Target Languages** — Translate into Vietnamese, English, Japanese, Korean, Chinese, or Ukrainian.
- **Built-in Gemini Models** — One-click pickers for Gemini models (Gemini 3.8/3.7/3.6 Flash, etc.) or type a custom model name.
- **Dual display modes** — Furigana (Japanese `<ruby>`), Romaji (Japanese), Romaja (Korean), Pinyin (Chinese) + AI Translation in your selected target language.
- **Translation Style** — 6 tones (Smart Adaptive, Poetic, Youth-Anime, Street-Rap, Vintage, Literal) to match the mood of the song.
- **Pronoun Mode** — Contextual pronoun mapping for Vietnamese (Auto, Anh-Em, Tớ-Cậu, Tao-Mày…) to maintain consistent narrative voice.
- **Multi-Key API Rotation** — Add multiple API keys (free from [Google AI Studio](https://aistudio.google.com/)) with automatic round-robin load balancing and quota failover.
- **Live AI Reasoning** — Stream the model's thinking process in real time.
- **Pre-translation** — Translates the next track in the background before it plays, with adjustable lead time.
- **Response format** — Choose Prompt Engineering (universal) or JSON Schema.

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Video Background

Animated YouTube music-video backdrops for the lyrics page. Automatically skips ads, supports full-window Cinema Mode, with adjustable scale, dim, and blur — pairs nicely with transparent mode and any Spicetify theme.

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 3. Modern Interface & Optimized Experience

- **Transparent background** — harmonizes with any Spicetify theme.
- **Auto-hiding controls** — setting buttons only appear on hover, maximizing display space.
- **Smooth transitions** — optimized animations for seamless line transitions.
- **Multilingual UI** — fully localized into English, Tiếng Việt, 日本語, 한국어, 中文（简体）.

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
   - **API Endpoint** — default Google Gemini endpoint (custom proxy URL supported).
   - **Model Name** — pick from presets (`gemini-3.8-flash`, `gemini-3.7-flash`, etc.) or type a custom model name.
   - **API Keys** — add one or more API keys (free tier available at [Google AI Studio](https://aistudio.google.com/)). Multiple keys automatically rotate round-robin with quota failover.
   - **Reasoning Effort** — adjust thinking budget (`off`, `low`, `medium`, `high`, `auto`).
   - **Response Format** — *Prompt Engineering* (universal) or *JSON Schema*.
   - **Pre-translation** — toggle on/off and configure lead time.
3. Hover over lyrics and click the translation icon (⇄) to customize **Target Language**, **Display Modes**, **Translation Style**, and **Pronouns**.

---

## Supported Languages

### Local Mode (Kuromoji, Aromanize, OpenCC)

| Source Language   | Display Mode 1                  | Display Mode 2 |
| ----------------- | ------------------------------- | -------------- |
| Japanese (日本語)  | Romaji, Hiragana, Katakana      | —              |
| Korean (한국어)    | Romaja                          | —              |
| Chinese (中文)    | Pinyin, Simplified, Traditional | —              |

### AI Mode (LLM Translation)

| Source Language   | Display Mode 1 (Phonetics)      | Display Mode 2 (Translation)        |
| ----------------- | ------------------------------- | ----------------------------------- |
| Japanese (日本語)  | Furigana, Romaji (AI / Local)   | 6 languages (VI, EN, JA, KO, ZH, UK)|
| Korean (한국어)    | Romaja (AI / Local)             | 6 languages (VI, EN, JA, KO, ZH, UK)|
| Chinese (中文)    | Pinyin (AI / Local)             | 6 languages (VI, EN, JA, KO, ZH, UK)|
| Other             | —                               | 6 languages (VI, EN, JA, KO, ZH, UK)|



---

## Credits

- Original [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- Translation: [Google Gemini API](https://aistudio.google.com/)
- Romanization: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## License

[LGPL-2.1](../../LICENSE)

---

*This project is under active development. Please report any issues!*

