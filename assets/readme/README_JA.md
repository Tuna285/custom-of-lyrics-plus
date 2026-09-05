# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)



<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> Spicetify向けの**Lyrics Plus**パーソナライズ版。高品質な歌詞翻訳、多言語サポート、発音・ふりがな/ローマ字表示、PiPミニ歌詞、動画背景に特化して再構築されました。OpenAI互換のLLMエンドポイントに接続可能 — Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude、またはローカルOllama。

> [!TIP]
> **現在6つの言語への翻訳をサポートしています:** ベトナム語 (`vi`)、英語 (`en`)、日本語 (`ja`)、韓国語 (`ko`)、中国語 (`zh`)、ウクライナ語 (`uk`)。歌詞本来の流れや音楽性を大切にした翻訳と、好みに合わせた作詞スタイルを選択できます。

---

## 主な機能

### 1. LLM APIを使った歌詞翻訳

OpenAI互換のLLMエンドポイント（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic Claude、ローカルOllamaなど）に接続し、自然かつ正確に歌詞を翻訳します。

- **6つのターゲット言語** — ベトナム語、英語、日本語、韓国語、中国語、ウクライナ語への翻訳に対応。専用のスタイルガイドラインと表現ガードレールを備えています。
- **音楽的な自然な流れ (Lyrical Flow)** — 原曲のコアな情景、比喩、ストーリー性を100%忠実に保持しながら、意味を損なう無理な音数合わせや不自然な押韻を避け、ボーカルとして自然に歌える言葉の流れを実現。
- **組み込みエンドポイント＆モデルプリセット** — 人気プロバイダー（Gemini 3.8/3.7/3.6、Gemma、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）向けのワンクリック選択。カスタムURL/モデルも対応。
- **デュアル表示モード** — ふりがな（日本語 `<ruby>`）、ローマ字（日本語）、ローマ字（韓国語）、ピンイン（中国語）＋選択したターゲット言語へのAI翻訳。
- **翻訳スタイル** — 6つのトーン（スマート自動 / 詩的 / 青春・アニメ / ストリート・ラップ / ヴィンテージ / 直訳）で曲の雰囲気に合わせた翻訳。
- **代名詞モード** — ベトナム語向けの文脈に応じた代名詞マッピング（自動、Anh-Em、Tớ-Cậu、Tao-Mày…）でトラック全体の一貫した語り口を維持。
- **複数APIキーのローテーション** — 複数のAPIキーを登録し、自動ラウンドロビン負荷分散とクォータ/レートリミット時の即時フェイルオーバーを実現。
- **動的推論（思考時間）制御** — AIの思考バジェット（`off`、`low`、`medium`、`high`、`auto`）を調整可能。推論プロセスのリアルタイムストリーミングウィンドウも搭載。
- **事前翻訳** — 再生前にバックグラウンドで次のトラックを翻訳。リードタイムを調整可能。
- **レスポンス形式** — プロンプトエンジニアリング（汎用）またはJSONスキーマ（対応モデルでより厳密なパース、非対応時は自動フォールバック）を選択。

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. 統合マルチプロバイダー手動検索

**NetEase**、**LRCLIB**、**Musixmatch**を横断して歌詞を検索できる強化された手動検索ダイアログ。対話型フィルターチップ、曲の長さに基づくスコアリング、ステータスバッジ（`Synced`、`Unsynced`）を搭載。

### 3. ピクチャーインピクチャーのミニ歌詞

Spotifyのネイティブピクチャーインピクチャーミニプレーヤーに同期された歌詞を直接注入し、他のアプリで作業しながら歌詞を読めます。PiP設定パネルまたは`Ctrl+Shift+M`で切り替え。

### 4. 動画背景＆シネマモード

歌詞ページ向けのYouTubeミュージックビデオアニメーション背景。YouTubeのネイティブおすすめアルゴリズムによる候補マッチング、動画広告の自動スキップ、フルウィンドウのシネマモード（`100vw x 100vh`）に対応（スケール、明るさ、ブラー調整可能）。

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 5. モダンなインターフェースと最適化されたエクスペリエンス

- **透明背景** — あらゆるSpicetifyテーマと調和。
- **多言語UI** — 5つの言語に完全ローカライズ：英語、ベトナム語、日本語、韓国語、中国語（簡体字）。
- **自動非表示コントロール** — 設定ボタンはホバー時のみ表示され、表示スペースを最大化。
- **スムーズなトランジション** — テンポに適応するApple Music風の滑らかなイージングライン遷移と休符アニメーション。

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

<img width="498" height="367" alt="image" src="https://github.com/user-attachments/assets/31a5b810-ee06-447d-91f4-1e463a601dee" />

3. ターミナルで実行:
   ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

---

## 設定

1. Spotifyを開き、アバターをクリック → **Lyric Plus Translate config**
2. **Translation**タブに移動して設定:
   - **API Endpoint** — プリセット選択（Gemini、OpenRouter、OpenAI、DeepSeek、Claude、Ollama）またはOpenAI互換URLを貼り付け。
   - **Model Name** — プリセット（`gemini-3.8-flash`、`gemini-3.7-flash`など）から選択またはカスタムモデル名を入力。
   - **API Keys** — 1つ以上のAPIキーを追加（[Google AI Studio](https://aistudio.google.com/)で無料枠あり）。複数キー登録時は自動ラウンドロビンとクォータ時フェイルオーバーが有効。
   - **Reasoning Effort** — 思考バジェットの調整（`off`、`low`、`medium`、`high`、`auto`）。
   - **Response Format** — *Prompt Engineering*（汎用）または*JSON Schema*。
   - **Pre-translation** — オン/オフと先行時間の調整。
3. 歌詞の上にマウスを置き、翻訳アイコン（⇄）をクリックして**ターゲット言語**、**表示モード**、**翻訳スタイル**、**代名詞**をカスタマイズ。
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

| ソース言語        | 表示モード 1                      | 表示モード 2 (ターゲット言語) |
| ----------------- | --------------------------------- | ----------------------------- |
| 日本語 (日本語)   | ふりがな (AI)、ローマ字 (AI)      | ベトナム語、英語、日本語、    |
| 韓国語 (한국어)   | ローマ字 (AI)                     | 韓国語、中国語、ウクライナ語  |
| 中国語 (中文)     | ピンイン (AI)                     |                               |
| すべての言語      | ローカルモードの発音              |                               |

---

## クレジット

- オリジナル [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- 翻訳: OpenAI互換LLM（Google Gemini/Gemma、OpenRouter、OpenAI、DeepSeek、Anthropic、Ollama、…）
- ローマ字変換: [Kuroshiro](https://github.com/hexenq/kuroshiro)、[Aromanize](https://github.com/fujaru/aromanize-js)、[OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## ライセンス

[LGPL-2.1](../../LICENSE)

---

*このプロジェクトは活発に開発中です。問題や機能リクエストはお気軽にご報告ください！*


