# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README.md) | [Tiếng Việt](README_VI.md) | [한국어](assets/readme/README_KO.md) | [日本語](assets/readme/README_JA.md) | [中文（简体）](assets/readme/README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)



> Phiên bản tùy chỉnh của **Lyrics Plus** dành cho Spicetify, tập trung vào dịch lời bài hát chất lượng cao, hỗ trợ đa ngôn ngữ, phiên âm Romaji/Furigana, mini lyrics PiP và video nền động. Kết nối tới mọi endpoint LLM tương thích OpenAI — Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, hoặc Ollama local.

> [!TIP]
> **Hiện đã hỗ trợ dịch sang 6 ngôn ngữ:** Tiếng Việt (`vi`), English (`en`), 日本語 (`ja`), 한국어 (`ko`), 中文 (`zh`), và Українська (`uk`) với chuẩn mực nhịp điệu ca từ và tùy chỉnh phong cách đa dạng.

---

## Tính năng chính

### 1. Dịch lời bài hát với LLM API

Kết nối tới mọi endpoint LLM tương thích OpenAI (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, Ollama local, ...) để dịch lời bài hát tự nhiên và chính xác.

- **6 ngôn ngữ mục tiêu** — Dịch sang Tiếng Việt, Tiếng Anh, Tiếng Nhật, Tiếng Hàn, Tiếng Trung, hoặc Tiếng Ukraina với quy tắc ngữ pháp và văn phong riêng biệt.
- **Ca từ chuẩn mực & Nhịp điệu tự nhiên** — Bảo toàn 100% hình ảnh thi ca, ẩn dụ và mạch cốt truyện gốc mà vẫn giữ nhịp thở và thanh điệu mượt mà, không cưỡng ép gieo vần làm biến dạng ngữ nghĩa.
- **Preset endpoint & model có sẵn** — Dropdown chọn nhanh các model mới nhất (Gemini 3.8/3.7/3.6 Flash, Gemma 4, v.v.); hỗ trợ nhập URL/model tùy ý.
- **Hai chế độ hiển thị đồng thời** — Furigana (chú âm hán tự Nhật `<ruby>`), Romaji (Nhật), Romaja (Hàn), Pinyin (Trung) + Bản dịch AI theo ngôn ngữ bạn chọn.
- **Translation Style** — 6 phong cách dịch (Tự động / Thơ-Lãng mạn / Tuổi trẻ-Anime / Mạnh mẽ-Rap / Cổ điển / Sát nghĩa).
- **Khóa Pronoun** — 9 cặp đại từ tiếng Việt (Tự động, Anh-Em, Tớ-Cậu, Tao-Mày, ...) giữ giọng dịch nhất quán suốt bài.
- **Xoay vòng đa API Key** — Thêm không giới hạn API key, tự động cân bằng tải xoay vòng và tự động chuyển key ngay khi gặp lỗi hạn mức (quota/429).
- **Kiểm soát AI Thinking Budget** — Tùy chỉnh mức độ suy nghĩ (`off`, `low`, `medium`, `high`, `auto`) kèm cửa sổ stream suy luận thời gian thực.
- **Pre-translation** — Tự động dịch sẵn bài kế tiếp ở nền trước khi phát, có thể chỉnh thời gian.
- **Định dạng response** — Chọn Prompt Engineering (mọi model) hoặc JSON Schema (parse chuẩn xác trên model hỗ trợ).

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Tìm kiếm lời bài hát thủ công đa nguồn

Hộp thoại tìm kiếm thủ công được nâng cấp toàn diện, cho phép tra cứu lời bài hát xuyên suốt các nguồn (**NetEase**, **LRCLIB**, và **Musixmatch**) với các thẻ lọc nguồn nhanh, thuật toán khớp thời lượng và huy hiệu phân loại (`Synced`, `Unsynced`).

### 3. Mini Lyrics trong Picture-in-Picture

Inject lời bài hát đồng bộ trực tiếp vào mini player Picture-in-Picture gốc của Spotify, đọc lyric trong khi làm việc khác. Bật/tắt qua panel cài đặt PiP hoặc phím tắt `Ctrl+Shift+M`.

### 4. Nền video động & Cinema Mode

Tự động lấy MV YouTube làm nền động cho trang lyrics theo thuật toán đề xuất gốc của YouTube, tự động vượt quảng cáo YouTube và hỗ trợ chế độ Cinema phủ trọn toàn màn hình (`100vw x 100vh`) kèm tùy chỉnh scale, dim, blur.

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 5. Giao diện hiện đại & Trải nghiệm tối ưu

- **Nền trong suốt** — hài hòa với mọi theme Spicetify.
- **Giao diện đa ngôn ngữ** — hỗ trợ 5 ngôn ngữ UI: Tiếng Việt, English, 日本語, 한국어, 中文（简体）.
- **Tự động ẩn điều khiển** — nút cài đặt chỉ xuất hiện khi di chuột vào, tối đa hóa không gian hiển thị.
- **Chuyển cảnh mượt mà** — chuyển đổi dòng lời theo đường cong Apple Music mượt mà kèm hiệu ứng nghỉ nhạc.

---

## Cài đặt

> **Yêu cầu:** [Spotify](https://download.scdn.co/SpotifySetup.exe) được cài đặt từ web, KHÔNG phải từ Microsoft Store.

Cài đặt Spicetify:

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

### Cài đặt nhanh (Khuyên dùng)

Mở **PowerShell** và chạy:

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### Gỡ cài đặt

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### Cài đặt thủ công

1. Tải về và giải nén repository này
2. Sao chép thư mục `lyrics-plus` vào thư mục CustomApps của Spicetify:
   - **Windows:** `%LocalAppData%\spicetify\CustomApps`
   - **MacOS/Linux:** `~/.config/spicetify/CustomApps`

<img width="498" height="367" alt="image" src="https://github.com/user-attachments/assets/31a5b810-ee06-447d-91f4-1e463a601dee" />

3. Chạy trong terminal:
   ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

---

## Cấu hình

1. Mở Spotify, bấm vào avatar cá nhân → **Lyric Plus Translate config**
2. Vào tab **Dịch (Translation)** và thiết lập:
   - **API Endpoint** — chọn preset (Gemini, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) hoặc dán link tương thích OpenAI.
   - **Tên Model** — chọn model có sẵn (`gemini-3.8-flash`, `gemini-3.7-flash`, ...) hoặc nhập model tùy ý.
   - **API Keys** — thêm một hoặc nhiều API key (lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/)). Nhiều key sẽ tự động xoay vòng và chuyển đổi khi hết hạn mức.
   - **Reasoning Effort** — chỉnh mức độ suy nghĩ (`off`, `low`, `medium`, `high`, `auto`).
   - **Định dạng phản hồi** — *Prompt Engineering* hoặc *JSON Schema*.
   - **Pre-translation** — bật/tắt và chọn số giây dịch trước.
3. Rê chuột vào lời bài hát và bấm biểu tượng chuyển đổi (⇄) để tùy chỉnh **Ngôn ngữ đích**, **Chế độ hiển thị**, **Phong cách dịch** và **Đại từ**.
4. *(Tùy chọn)* Bấm `Ctrl+Shift+M` khi đang phát nhạc để bật/tắt Mini Lyrics trong Picture-in-Picture.

---

## Ngôn ngữ hỗ trợ

### Chế độ Local (Kuromoji, Aromanize, OpenCC)

| Ngôn ngữ gốc      | Kiểu hiển thị 1                 | Kiểu hiển thị 2 |
| ----------------- | ------------------------------- | --------------- |
| Tiếng Nhật (日本語) | Romaji, Hiragana, Katakana      | —               |
| Tiếng Hàn (한국어)  | Romaja                          | —               |
| Tiếng Trung (中文)  | Pinyin, Giản thể, Phồn thể      | —               |

### Chế độ AI (Dịch thuật LLM)

| Ngôn ngữ gốc      | Kiểu hiển thị 1                 | Kiểu hiển thị 2 (Ngôn ngữ dịch)   |
| ----------------- | ------------------------------- | --------------------------------- |
| Tiếng Nhật (日本語) | Furigana (AI), Romaji (AI)      | Tiếng Việt, Tiếng Anh, Tiếng Nhật |
| Tiếng Hàn (한국어)  | Romaja (AI)                     | Tiếng Hàn, Tiếng Trung, Ukraina   |
| Tiếng Trung (中文)  | Pinyin (AI)                     |                                   |
| Mọi ngôn ngữ khác | Phiên âm chế độ Local           |                                   |


---

## Credits

- Bản gốc [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) bởi nhóm Spicetify
- Dịch thuật được hỗ trợ bởi mọi LLM tương thích OpenAI (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, ...)
- Phiên âm: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## Giấy phép

[LGPL-2.1](LICENSE)

---

*Dự án này đang được phát triển. Vui lòng báo cáo bất kỳ lỗi cũng như đề xuất tính năng và vấn đề nào!*