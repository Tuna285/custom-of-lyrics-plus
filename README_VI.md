# Lyric Plus Translate

[English](README.md)

> Phiên bản tùy chỉnh của **Lyrics Plus** dành cho Spicetify, tập trung vào dịch lời bài hát chất lượng cao, tối ưu cho người dùng Việt Nam. Kết nối tới mọi endpoint LLM tương thích OpenAI — Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, hoặc Ollama local.

> [!NOTE] 
> **Hiện tại, tính năng dịch chỉ hỗ trợ tiếng Việt.** Hỗ trợ cho các ngôn ngữ khác có thể được thêm vào trong các bản cập nhật tương lai nếu được yêu cầu.

---

## Tính năng chính

### 1. Dịch lời bài hát với LLM API

Kết nối tới mọi endpoint LLM tương thích OpenAI (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, Ollama local, ...) để dịch lời bài hát tự nhiên và chính xác.

- **Preset endpoint & model có sẵn** — Dropdown chọn nhanh các provider phổ biến (Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) với danh sách model gợi ý; vẫn nhập URL/model tùy ý được.
- **Hai chế độ hiển thị** — Romaji (Nhật), Romaja (Hàn), Pinyin (Trung) + dịch sang **tiếng Việt** — lý tưởng cho việc học ngoại ngữ.
- **Translation Style** — 6 phong cách (Tự động / Thơ-Lãng mạn / Tuổi trẻ-Anime / Mạnh mẽ-Rap / Cổ điển / Sát nghĩa) phù hợp với mood bài hát.
- **Khóa Pronoun** — 9 cặp đại từ tiếng Việt (Tự động, Anh-Em, Tớ-Cậu, Tao-Mày, ...) giữ giọng dịch nhất quán suốt bài.
- **Pre-translation** — Tự động dịch sẵn bài kế tiếp ở nền trước khi phát, có thể chỉnh thời gian.
- **Xem AI Reasoning real-time** — Icon brain bên cạnh indicator mở cửa sổ kéo thả, stream quá trình suy nghĩ của model trực tiếp (tách tab cho dịch và phiên âm).
- **Định dạng response** — Chọn Prompt Engineering (mọi model) hoặc JSON Schema (parse chắc hơn, tự fallback nếu model không hỗ trợ).
- **Chất lượng cao** — Prompt được tinh chỉnh cho ngữ cảnh âm nhạc, giữ nguyên ý nghĩa và cảm xúc.


| Tiếng Nhật → Romaji | Tiếng Hàn → Romaja | Tiếng Trung → Pinyin |
| ------------------- | ------------------ | -------------------- |
|                     |                    |                      |


### 2. Mini Lyrics trong Picture-in-Picture

Inject lời bài hát đồng bộ trực tiếp vào mini player Picture-in-Picture gốc của Spotify, đọc lyric trong khi làm việc khác. Bật/tắt qua panel cài đặt PiP hoặc phím tắt `Ctrl+Shift+M`.

### 3. Nền video động

Tự động lấy MV YouTube làm nền động cho trang lyrics. Tùy chỉnh scale, dim, blur — kết hợp đẹp với chế độ trong suốt và mọi theme Spicetify.

### 4. Giao diện hiện đại & Trải nghiệm tối ưu

- **Nền trong suốt** — hài hòa với mọi theme Spicetify.
- **Tự động ẩn điều khiển** — nút cài đặt chỉ xuất hiện khi di chuột vào, tối đa hóa không gian hiển thị.
- **Chuyển cảnh mượt mà** — hoạt ảnh tối ưu cho việc chuyển đổi dòng lời liền mạch.
- **Giao diện hoàn toàn Tiếng Việt** — đã localize đầy đủ cho người dùng Việt 🇻🇳.

---

## Cài đặt

> **Yêu cầu:** [Spotify](https://download.scdn.co/SpotifySetup.exe) được cài đặt từ web, KHÔNG phải từ Microsoft Store.

Cài đặt Spicetify:

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

### - Cài đặt nhanh (Khuyên dùng)

Mở **PowerShell** và chạy lệnh:

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### Gỡ cài đặt

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### - Cài đặt thủ công

1. Tải xuống và giải nén file .zip này
  Download
2. Sao chép thư mục `lyrics-plus` vào thư mục CustomApps của Spicetify:
  - **Windows:** `%LocalAppData%\spicetify\CustomApps`
  - **MacOS/Linux:** `~/.config/spicetify/CustomApps`
  - 
3. Mở terminal:
  ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
  ```

---

## Cấu hình

1. Mở Spotify, nhấp vào avatar của bạn → **Lyric Plus Translate config**
2. Vào tab **Translation** và điền:
  - **API Endpoint** — chọn preset (Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) hoặc dán URL OpenAI-compatible bất kỳ.
  - **Model Name** — chọn từ dropdown gợi ý hoặc nhập tên model tùy ý.
  - **API Key** — key của provider (lấy free tại [Google AI Studio](https://aistudio.google.com/)). Hỗ trợ tối đa 2 key luân phiên.
  - **Response Format** — *Prompt Engineering* (chạy mọi model) hoặc *JSON Schema* (tự fallback về Prompt Engineering nếu model không hỗ trợ).
  - **Pre-translation** — bật/tắt + chọn thời gian (số giây trước khi bài hiện tại kết thúc để bắt đầu dịch bài kế).
3. Di chuột qua lời bài hát và nhấp icon dịch (⇄) để tùy chỉnh **Display Mode**, **Translation Style**, và **Pronoun**.
4. *(Tùy chọn)* Nhấn `Ctrl+Shift+M` khi đang phát nhạc để bật/tắt Mini Lyrics trong Picture-in-Picture.

---

## Ngôn ngữ hỗ trợ

### Chế độ Local (Kuromoji, Aromanize, OpenCC)


| Ngôn ngữ nguồn   | Display Mod 1              | Display Mod 2 |
| ---------------- | -------------------------- | ------------- |
| Tiếng Nhật (日本語) | Romaji, Hiragana, Katakana | -             |
| Tiếng Hàn (한국어)  | Romaja                     | -             |
| Tiếng Trung (中文) | Pinyin, Giản thể, Phồn thể | -             |


### Chế độ AI (Dịch bằng LLM)


| Ngôn ngữ nguồn   | Display Mod 1              | Display Mod 2 |
| ---------------- | -------------------------- | ------------- |
| Tiếng Nhật (日本語) | Romaji (AI), bao gồm Local | Tiếng Việt    |
| Tiếng Hàn (한국어)  | Romaja (AI), bao gồm Local | Tiếng Việt    |
| Tiếng Trung (中文) | Pinyin (AI), bao gồm Local | Tiếng Việt    |
| Khác             | -                          | Tiếng Việt    |


---

## Credits

- Bản gốc [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) bởi nhóm Spicetify
- Dịch thuật được hỗ trợ bởi mọi LLM tương thích OpenAI (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, ...)
- Phiên âm: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

## Đề xuất

- Theme: **[Spicetify Lucid](https://github.com/sanoojes/spicetify-lucid)** của sanoojes.
- TV Mode và Fullscreen Mode: **[Tạo bởi Spicetify Creator](https://github.com/daksh2k/Spicetify-stuff/tree/master/Extensions/full-screen)**.
*(Cả hai có thể tải ở Spicetify Marketplace)*

---

## Giấy phép

[LGPL-2.1](LICENSE)

---

*Dự án này đang được phát triển. Vui lòng báo cáo bất kỳ lỗi cũng như đề xuất tính năng và vấn đề nào!*