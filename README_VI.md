# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README.md) | [Tiếng Việt](README_VI.md) | [한국어](assets/readme/README_KO.md) | [日本語](assets/readme/README_JA.md) | [中文（简体）](assets/readme/README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)

<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

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
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Mini Lyrics trong Picture-in-Picture

Inject lời bài hát đồng bộ trực tiếp vào mini player Picture-in-Picture gốc của Spotify, đọc lyric trong khi làm việc khác. Bật/tắt qua panel cài đặt PiP hoặc phím tắt `Ctrl+Shift+M`.

### 3. Nền video động

Tự động lấy MV YouTube làm nền động cho trang lyrics. Tùy chỉnh scale, dim, blur — kết hợp đẹp với chế độ trong suốt và mọi theme Spicetify.

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

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

### Quick Install (Khuyên dùng)

Mở **PowerShell** và chạy lệnh:

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### Gỡ cài đặt

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### Cài đặt thủ công

1. Tải về và giải nén repository này
2. Copy thư mục `lyrics-plus` vào thư mục CustomApps của Spicetify:
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

1. Mở Spotify, click vào avatar của bạn → **Cấu hình Lyric Plus Translate**
2. Chuyển sang tab **Dịch thuật** và điền:
   - **API Endpoint** — chọn preset (Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) hoặc dán URL tùy ý tương thích OpenAI.
   - **Tên Model** — chọn từ dropdown có sẵn hoặc tự gõ tên model.
   - **API Key** — key của provider (lấy free tại [Google AI Studio](https://aistudio.google.com/)). Hỗ trợ tối đa 2 key để xoay vòng round-robin.
   - **Định dạng Response** — *Prompt Engineering* (chạy trên mọi model) hoặc *JSON Schema* (tự fallback về Prompt Engineering nếu model không hỗ trợ).
   - **Pre-translation** — bật/tắt và chọn thời gian dịch trước (bao nhiêu giây trước khi bài hiện tại kết thúc thì bắt đầu dịch bài kế tiếp).
3. Di chuột lên lyric và click icon dịch (⇄) để tùy chỉnh **Chế độ hiển thị**, **Phong cách dịch**, và **Đại từ**.
4. *(Tùy chọn)* Bấm `Ctrl+Shift+M` khi đang phát nhạc để bật/tắt Mini Lyrics trong Picture-in-Picture.

---

## Hỗ trợ ngôn ngữ

### Chế độ Cục bộ (Kuromoji, Aromanize, OpenCC)

| Ngôn ngữ gốc       | Chế độ hiển thị 1               | Chế độ hiển thị 2 |
| ------------------ | ------------------------------- | ----------------- |
| Tiếng Nhật (日本語) | Romaji, Hiragana, Katakana      | —                 |
| Tiếng Hàn (한국어)   | Romaja                          | —                 |
| Tiếng Trung (中文)  | Pinyin, Giản thể, Phồn thể      | —                 |

### Chế độ AI (LLM Translation)

| Ngôn ngữ gốc       | Chế độ hiển thị 1               | Chế độ hiển thị 2 |
| ------------------ | ------------------------------- | ----------------- |
| Tiếng Nhật (日本語) | Romaji (AI), gồm Chế độ cục bộ  | Tiếng Việt        |
| Tiếng Hàn (한국어)   | Romaja (AI), gồm Chế độ cục bộ  | Tiếng Việt        |
| Tiếng Trung (中文)  | Pinyin (AI), gồm Chế độ cục bộ  | Tiếng Việt        |
| Ngôn ngữ khác      | —                               | Tiếng Việt        |

---

## Tác giả & Ghi danh

- Bản gốc [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) phát triển bởi đội ngũ Spicetify
- Dịch thuật vận hành bởi các LLM tương thích OpenAI (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, …)
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

*Dự án đang trong quá trình phát triển tích cực. Nếu gặp lỗi vui lòng báo cáo tại mục Issues!*