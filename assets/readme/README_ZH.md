# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)



<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> 专为 Spicetify 打造的 **Lyrics Plus** 定制版本，专注于高质量歌词翻译、多语言支持、拼音/注音/罗马字注音、画中画迷你歌词及视频背景。可连接任何兼容 OpenAI 的 LLM 端点 —— Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude 或本地 Ollama。

> [!TIP]
> **现已支持 6 种目标语言翻译:** 越南语 (`vi`)、英语 (`en`)、日语 (`ja`)、韩语 (`ko`)、中文 (`zh`) 和乌克兰语 (`uk`)。保持优美流畅的歌词韵律，支持自定义填词风格。

---

## 主要功能

### 1. 使用 LLM API 翻译歌词

连接任何兼容 OpenAI 的 LLM 端点（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude、本地 Ollama 等），自然准确地翻译歌词。

- **6 种目标语言** —— 支持翻译成越南语、英语、日语、韩语、中文或乌克兰语，配备专属的歌词风格指南和安全防护规则。
- **优美歌词韵律 (Lyrical Flow)** —— 100% 忠实保留核心意象、隐喻与叙事脉络，塑造自然的人声演唱韵律，避免因死板数音节或强行押韵而破坏原意。
- **内置端点和模型预设** —— 一键选择热门提供商（Gemini 3.8/3.7/3.6、Gemma、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）；同样支持自定义 URL/模型。
- **双显示模式** —— 振假名（日语 `<ruby>`）、罗马字（日语）、罗马字（韩语）、拼音（中文）+ 目标语言 AI 翻译。
- **翻译风格** —— 6 种风格（智能自适应 / 诗意 / 青春动漫 / 街头说唱 / 复古经典 / 直译）以匹配歌曲氛围。
- **代词模式** —— 针对越南语的语境代词映射（自动、Anh-Em、Tớ-Cậu、Tao-Mày…），在整个曲目中保持一致的人称叙事。
- **多 API 密钥轮询** —— 支持添加多个 API 密钥，具备自动轮询负载均衡和配额/速率限制即时故障转移功能。
- **动态推理（思考时间）控制** —— 自定义 AI 思考预算（`off`、`low`、`medium`、`high`、`auto`），并提供流式推理过程窗口。
- **预翻译** —— 在播放前在后台翻译下一首曲目，可调整提前时间。
- **响应格式** —— 选择提示词工程（通用）或 JSON Schema（在支持的模型上更严格解析，不支持时自动回退）。

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. 统一多源手动搜索

全新升级的手动搜索对话框，支持跨多个提供商（**NetEase**、**LRCLIB** 和 **Musixmatch**）搜索歌词，配备交互式筛选标签、曲目时长匹配打分以及状态徽章（`Synced`、`Unsynced`）。

### 3. 画中画迷你歌词

将同步歌词直接注入 Spotify 原生画中画迷你播放器，让您在使用其他应用时也能跟着歌词唱。从 PiP 设置面板或使用 `Ctrl+Shift+M` 切换。

### 4. 视频背景与影院模式

为歌词页面提供 YouTube MV 动态背景。基于 YouTube 原生推荐算法匹配候选视频，自动跳过视频广告，并支持全窗口影院模式（`100vw x 100vh`），可自由调节缩放、暗度和模糊度。

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 5. 现代界面与优化体验

- **透明背景** —— 与任意 Spicetify 主题和谐融合。
- **多语言界面** —— 完整本地化为 5 种语言：英语、越南语、日语、韩语、简体中文。
- **自动隐藏控件** —— 设置按钮仅在悬停时显示，最大化显示空间。
- **流畅过渡** —— 自适应歌曲节奏的 Apple Music 流体平滑过渡与间奏休止符动画。

---

## 安装

> **要求：** [Spotify](https://download.scdn.co/SpotifySetup.exe) 需从官网安装，**不能**使用 Microsoft Store 版本。

安装 Spicetify：

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

### 快速安装（推荐）

打开 **PowerShell** 并运行：

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### 卸载

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### 手动安装

1. 下载并解压此仓库
2. 将 `lyrics-plus` 文件夹复制到 Spicetify 的 CustomApps 目录：
   - **Windows：** `%LocalAppData%\spicetify\CustomApps`
   - **MacOS/Linux：** `~/.config/spicetify/CustomApps`
<img width="498" height="367" alt="image" src="https://github.com/user-attachments/assets/31a5b810-ee06-447d-91f4-1e463a601dee" />

3. 在终端中运行：
   ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

---

## 配置

1. 打开 Spotify，点击头像 → **Lyric Plus Translate config**
2. 进入 **Translation** 标签并配置：
   - **API Endpoint** —— 选择预设（Gemini、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）或粘贴任意兼容 OpenAI 的 URL。
   - **Model Name** —— 从预设（`gemini-3.8-flash`、`gemini-3.7-flash` 等）中选择或输入自定义模型名称。
   - **API Keys** —— 添加一个或多个 API 密钥（[Google AI Studio](https://aistudio.google.com/) 提供免费额度）。支持多密钥轮询及配额不足时自动切换。
   - **Reasoning Effort** —— 调节思考预算（`off`、`low`、`medium`、`high`、`auto`）。
   - **Response Format** —— *Prompt Engineering*（通用）或 *JSON Schema*。
   - **Pre-translation** —— 开启/关闭并设置提前时间。
3. 将鼠标悬停在歌词上，点击翻译图标（⇄）自定义**目标语言**、**显示模式**、**翻译风格**和**代词**。
4. *（可选）* 在播放曲目时按 `Ctrl+Shift+M` 切换画中画迷你歌词。

---

## 支持的语言

### 本地模式（Kuromoji、Aromanize、OpenCC）

| 源语言             | 显示模式 1                  | 显示模式 2 |
| ------------------ | --------------------------- | ---------- |
| 日语 (日本語)       | 罗马字、平假名、片假名       | —          |
| 韩语 (한국어)       | 罗马字                      | —          |
| 中文 (中文)         | 拼音、简体字、繁体字         | —          |

### AI 模式（LLM 翻译）

| 源语言             | 显示模式 1                      | 显示模式 2 (目标语言)               |
| ------------------ | ------------------------------- | ----------------------------------- |
| 日语 (日本語)       | 振假名 (AI)、罗马字 (AI)        | 越南语、英语、日语、韩语、中文、乌克兰语 |
| 韩语 (한국어)       | 罗马字 (AI)                     | 越南语、英语、日语、韩语、中文、乌克兰语 |
| 中文 (中文)         | 拼音 (AI)                       | 越南语、英语、日语、韩语、中文、乌克兰语 |
| 所有语言           | 本地模式注音                    | 越南语、英语、日语、韩语、中文、乌克兰语 |


---

## 致谢

- 原版 [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- 翻译支持：任意兼容 OpenAI 的 LLM（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic、Ollama、…）
- 罗马字转换：[Kuroshiro](https://github.com/hexenq/kuroshiro)、[Aromanize](https://github.com/fujaru/aromanize-js)、[OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## 许可证

[LGPL-2.1](../../LICENSE)

---

*本项目正在积极开发中。欢迎报告任何问题或提出功能建议！*


