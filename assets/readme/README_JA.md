# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

---

> Spicetify向けの**Lyrics Plus**カスタム版で、高品質な歌詞翻訳に特化して再構築されました。主にベトナム語ユーザー向けに最適化されており、OpenAI互換のLLMエンドポイントに接続できます — Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude、またはローカルOllama。

> [!NOTE]
> **現在、翻訳機能はベトナム語（Tiếng Việt）のみをサポートしています。** リクエストがあれば、将来のアップデートで他言語のサポートが追加される可能性があります。

---

## 主な機能

### 1. LLM APIを使った歌詞翻訳

OpenAI互換のLLMエンドポイント（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude、ローカルOllamaなど）に接続し、自然かつ正確に歌詞を翻訳します。

- **組み込みエンドポイント＆モデルプリセット** — 人気プロバイダー（Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）向けのワンクリック選択とキュレーションされたモデルリスト。カスタムURL/モデルも対応。
- **デュアル表示モード** — ローマ字（日本語）、ローマ字（韓国語）、ピンイン（中国語）＋**ベトナム語**翻訳 — 語学学習に最適。
- **翻訳スタイル** — 6つのトーン（スマート自動 / 詩的 / 青春・アニメ / ストリート・ラップ / ヴィンテージ / 直訳）で曲の雰囲気に合わせた翻訳。
- **代名詞ロック** — 9種類のベトナム語代名詞ペア（自動、Anh-Em、Tớ-Cậu、Tao-Mày…）でトラック全体を通じて一貫した語り口を維持。
- **事前翻訳** — 再生前にバックグラウンドで次のトラックを翻訳。リードタイムを調整可能。
- **ライブAI推論** — 翻訳インジケーター横の脳アイコンをクリックするとドラッグ可能なウィンドウが開き、モデルの思考過程をリアルタイムでストリーミング（翻訳タブと発音タブで分離）。
- **レスポンス形式** — プロンプトエンジニアリング（汎用）またはJSONスキーマ（対応モデルでより厳密なパース、非対応時は自動フォールバック）を選択。
- **高品質** — 音楽的文脈に合わせてチューニングされたプロンプトで意味と感情を保持。

### 2. ピクチャーインピクチャーのミニ歌詞

Spotifyのネイティブピクチャーインピクチャーミニプレーヤーに同期された歌詞を直接注入し、他のアプリで作業しながら歌詞を読めます。PiP設定パネルまたは`Ctrl+Shift+M`で切り替え。

### 3. 動画背景

歌詞ページ向けのYouTubeミュージックビデオアニメーション背景。スケール、ディム、ブラーを調整可能 — 透明モードやあらゆるSpicetifyテーマと相性抜群。

### 4. モダンなインターフェースと最適化されたエクスペリエンス

- **透明背景** — あらゆるSpicetifyテーマと調和。
- **自動非表示コントロール** — 設定ボタンはホバー時のみ表示され、表示スペースを最大化。
- **スムーズなトランジション** — シームレスなライン切り替えのための最適化されたアニメーション。
- **完全なベトナム語UI** — ベトナム語ユーザー向けの完全ローカライズ 🇻🇳。

---

## インストール

> **要件:** [Spotify](https://download.scdn.co/SpotifySetup.exe)はWebからインストールしてください。Microsoft Store版は**使用不可**。

Spicetifyのインストール:

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

### クイックインストール（推奨）

**PowerShell**を開いて実行:

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### アンインストール

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### 手動インストール

1. このリポジトリをダウンロードして展開
2. `lyrics-plus`フォルダをSpicetifyのCustomAppsディレクトリにコピー:
   - **Windows:** `%LocalAppData%\spicetify\CustomApps`
   - **MacOS/Linux:** `~/.config/spicetify/CustomApps`
3. ターミナルで実行:
   ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

---

## 設定

1. Spotifyを開き、アバターをクリック → **Lyric Plus Translate config**
2. **Translation**タブに移動して入力:
   - **API Endpoint** — プリセット選択（Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）またはOpenAI互換URLを貼り付け。
   - **Model Name** — ドロップダウンから選択またはカスタムモデル名を入力。
   - **API Key** — プロバイダーのキー（[Google AI Studio](https://aistudio.google.com/)で無料利用可能）。最大2つのキーをラウンドロビン。
   - **Response Format** — *Prompt Engineering*（全モデル対応）または*JSON Schema*（非対応モデルでは自動フォールバック）。
   - **Pre-translation** — オン/オフと現在の曲終了前何秒で翻訳を開始するか設定。
3. 歌詞の上にマウスを置き、翻訳アイコン（⇄）をクリックして**表示モード**、**翻訳スタイル**、**代名詞**をカスタマイズ。
4. *(任意)* トラック再生中に`Ctrl+Shift+M`を押してPiPミニ歌詞をトグル。

---

## 対応言語

### ローカルモード（Kuromoji、Aromanize、OpenCC）

| ソース言語        | 表示モード 1                    | 表示モード 2 |
| ----------------- | ------------------------------- | ------------ |
| 日本語 (日本語)   | ローマ字、ひらがな、カタカナ     | —            |
| 韓国語 (한국어)   | ローマ字                        | —            |
| 中国語 (中文)     | ピンイン、簡体字、繁体字         | —            |

### AIモード（LLM翻訳）

| ソース言語        | 表示モード 1                      | 表示モード 2   |
| ----------------- | --------------------------------- | -------------- |
| 日本語 (日本語)   | ローマ字（AI）、ローカル含む       | ベトナム語     |
| 韓国語 (한국어)   | ローマ字（AI）、ローカル含む       | ベトナム語     |
| 中国語 (中文)     | ピンイン（AI）、ローカル含む       | ベトナム語     |
| その他            | —                                 | ベトナム語     |

---

## クレジット

- オリジナル [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- 翻訳: OpenAI互換LLM（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic、Ollama、…）
- ローマ字変換: [Kuroshiro](https://github.com/hexenq/kuroshiro)、[Aromanize](https://github.com/fujaru/aromanize-js)、[OpenCC](https://github.com/BYVoid/OpenCC)

---

## おすすめ

このアプリと相性の良いもの:

- テーマ: sanoojsの**[Spicetify Lucid](https://github.com/sanoojes/spicetify-lucid)**。
- TVモード＆全画面モード: **[Spicetify Creator製](https://github.com/daksh2k/Spicetify-stuff/tree/master/Extensions/full-screen)**。
*(どちらもSpicetify Marketplaceからインストール可能)*

---

## ライセンス

[LGPL-2.1](../../LICENSE)

---

*このプロジェクトは活発に開発中です。問題や機能リクエストはお気軽にご報告ください！*
