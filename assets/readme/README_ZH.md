# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](../../README.md) | [Tiếng Việt](../../README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> 专为 Spicetify 打造的 **Lyrics Plus** 定制版本，专注于高质量歌词翻译，主要面向越南用户。可连接任何兼容 OpenAI 的 LLM 端点 —— Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude 或本地 Ollama。

> [!NOTE]
> **目前，翻译功能仅支持越南语（Tiếng Việt）。** 如有需求，未来更新中可能会添加对其他语言的支持。

---

## 主要功能

### 1. 使用 LLM API 翻译歌词

连接任何兼容 OpenAI 的 LLM 端点（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude、本地 Ollama 等），自然准确地翻译歌词。

- **内置端点和模型预设** —— 一键选择热门提供商（Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）及精选模型列表；同样支持自定义 URL/模型。
- **双显示模式** —— 罗马字（日语）、罗马字（韩语）、拼音（中文）+**越南语**翻译 —— 非常适合语言学习。
- **翻译风格** —— 6 种风格（智能自适应 / 诗意 / 青春动漫 / 街头说唱 / 复古经典 / 直译）以匹配歌曲氛围。
- **代词锁定** —— 9 种越南语代词对（自动、Anh-Em、Tớ-Cậu、Tao-Mày…），在整个曲目中保持一致的语气。
- **预翻译** —— 在播放前在后台翻译下一首曲目，可调整提前时间。
- **实时 AI 推理** —— 翻译指示器旁的大脑图标可打开一个可拖动窗口，实时流式显示模型的思考过程（翻译和音标分为独立标签）。
- **响应格式** —— 选择提示词工程（通用）或 JSON Schema（在支持的模型上更严格解析，不支持时自动回退）。
- **高质量** —— 针对音乐语境调优的提示词，保留意义和情感。


| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. 画中画迷你歌词

将同步歌词直接注入 Spotify 原生画中画迷你播放器，让您在使用其他应用时也能跟着歌词唱。从 PiP 设置面板或使用 `Ctrl+Shift+M` 切换。

### 3. 视频背景

为歌词页面提供 YouTube MV 动态背景。可调节缩放、亮度和模糊 —— 与透明模式和任意 Spicetify 主题完美搭配。


<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 4. 现代界面与优化体验

- **透明背景** —— 与任意 Spicetify 主题和谐融合。
- **自动隐藏控件** —— 设置按钮仅在悬停时显示，最大化显示空间。
- **流畅过渡** —— 优化的动画实现无缝歌词切换。
- **完整越南语 UI** —— 为越南用户完整本地化 🇻🇳。

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
2. 进入 **Translation** 标签并填写：
   - **API Endpoint** —— 选择预设（Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）或粘贴任意兼容 OpenAI 的 URL。
   - **Model Name** —— 从精选下拉列表中选择或输入自定义模型名称。
   - **API Key** —— 提供商的密钥（[Google AI Studio](https://aistudio.google.com/) 提供免费额度）。支持最多 2 个密钥轮询。
   - **Response Format** —— *提示词工程*（适用于所有模型）或 *JSON Schema*（在不支持的模型上自动回退到提示词工程）。
   - **Pre-translation** —— 开启/关闭并设置提前时间（当前歌曲结束前多少秒开始翻译下一首）。
3. 将鼠标悬停在歌词上，点击翻译图标（⇄）自定义**显示模式**、**翻译风格**和**代词**。
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

| 源语言             | 显示模式 1                      | 显示模式 2 |
| ------------------ | ------------------------------- | ---------- |
| 日语 (日本語)       | 罗马字（AI），含本地模式         | 越南语     |
| 韩语 (한국어)       | 罗马字（AI），含本地模式         | 越南语     |
| 中文 (中文)         | 拼音（AI），含本地模式           | 越南语     |
| 其他               | —                               | 越南语     |

---

## 致谢

- 原版 [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- 翻译支持：任意兼容 OpenAI 的 LLM（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic、Ollama、…）
- 罗马字转换：[Kuroshiro](https://github.com/hexenq/kuroshiro)、[Aromanize](https://github.com/fujaru/aromanize-js)、[OpenCC](https://github.com/BYVoid/OpenCC)

---

## 推荐

此应用与以下内容完美搭配：

- 主题：sanoojes 的 **[Spicetify Lucid](https://github.com/sanoojes/spicetify-lucid)**。
- TV 模式和全屏模式：**[由 Spicetify Creator 制作](https://github.com/daksh2k/Spicetify-stuff/tree/master/Extensions/full-screen)**。
*（两者均可在 Spicetify Marketplace 安装）*

---

## 许可证

[LGPL-2.1](../../LICENSE)

---

*本项目正在积极开发中。欢迎报告任何问题或提出功能建议！*

