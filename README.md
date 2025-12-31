# Lyric Plus Translate

> A personalized version of **Lyrics Plus** for Spicetify, rebuilt to focus on high-quality lyric translation, ideal for Vietnamese users. Supports personal API (Google) and via [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) or [ProxyPal](https://github.com/heyhuynhgiabuu/proxypal).

> [!NOTE]
> **Currently, the translation feature only supports Vietnamese (Tiếng Việt).** Support for other languages may be added in future updates.

![Preview](assets/preview.gif)

---

## Key Features

### 1. Lyric Translation with Gemini API
Uses Google's LLM models (via API and Proxy) to translate lyrics naturally and accurately.
- **Dual display modes**: Convert songs to Romaji (Japanese), Romaja (Korean), Pinyin (Chinese) and translate to **Vietnamese** - ideal for language learning.
- **High quality**: Translations optimized for musical context, preserving meaning and emotion.

<table>
  <tr>
    <th>Japanese → Romaji</th>
    <th>Korean → Romaja</th>
    <th>Chinese → Pinyin</th>
  </tr>
  <tr>
    <td><img src="assets/japanese_conversion.png" alt="Japanese" width="300"/></td>
    <td><img src="assets/korean_conversion.png" alt="Korean" width="300"/></td>
    <td><img src="assets/chinese_conversion.png" alt="Chinese" width="300"/></td>
  </tr>
</table>


### 2. Modern Interface & Optimized Experience
- **Transparent background**: Lyrics displayed on transparent overlay, harmonizing with Spicetify themes.
- **Auto-hiding controls**: Setting buttons only appear on hover, maximizing display space.
- **Smooth transitions**: Optimized animations for seamless line transitions.

### 3. Smart Translation Optimization
Prompts are fine-tuned and automatically processed for clean, sensible results.

---

## Installation

### Via Spicetify Marketplace (Recommended)
1. Open Spotify and go to **Marketplace** tab
2. Search for "Lyric Plus Translate"  
3. Click **Install**

### Manual Installation

> **Requirement:** Spotify installed from web, NOT from Microsoft Store

1. Install [Spicetify](https://spicetify.app/docs/getting-started) first
2. Download and extract this repository

   ![Download](assets/manual_download.png)

3. Copy the `lyrics-plus` folder to Spicetify's CustomApps directory:
   - **Windows:** `%LocalAppData%\spicetify\CustomApps`
   - **MacOS/Linux:** `~/.config/spicetify/CustomApps`

4. Run in terminal:
   ```bash
   spicetify apply
   ```

---

## Configuration

1. Open Spotify, click on your avatar → **Lyric Plus Translate config**
2. Go to **Translation** section and configure your API mode:
   - **Direct API**: Use your own [Google AI Studio](https://aistudio.google.com/) API key
   - **Proxy**: Use [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) or [ProxyPal](https://github.com/heyhuynhgiabuu/proxypal)

3. Hover over lyrics and click the translation icon (⇄) to customize display modes

---

## Supported Languages

### Local Mode (Kuromoji, Aromanize, OpenCC)
| Source Language | Display Mode 1 | Display Mode 2 |
|-----------------|----------------|----------------|
| Japanese (日本語) | Romaji, Hiragana, Katakana | - |
| Korean (한국어) | Romaja | - |
| Chinese (中文) | Pinyin, Simplified, Traditional | - |

### Gemini/Gemma Mode (AI Translation)
| Source Language | Display Mode 1 | Display Mode 2 |
|-----------------|----------------|----------------|
| Japanese (日本語) | Romaji (Gemini/Gemma), include Local Mode | Vietnamese |
| Korean (한국어) | Romaja (Gemini/Gemma), include Local Mode | Vietnamese |
| Chinese (中文) | Pinyin (Gemini/Gemma), include Local Mode | Vietnamese |
| Other | - | Vietnamese |

---

## Credits
- Original [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- Translation powered by Google Gemini API
- Romanization: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

## License
[LGPL-2.1](LICENSE)

---

*This project is under active development. Please report any issues!*
