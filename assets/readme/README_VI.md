# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)



<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> Phiên bản tùy chỉnh của **Lyrics Plus** dành cho Spicetify, tập trung vào dịch lời bài hát chất lượng cao bằng Google Gemini API, hỗ trợ đa ngôn ngữ, phiên âm Romaji/Furigana và video nền động.

> [!NOTE]
> **Hỗ trợ dịch 6 ngôn ngữ:** Tiếng Việt (`vi`), English (`en`), 日本語 (`ja`), 한국어 (`ko`), 中文 (`zh`), và Українська (`uk`).

---

## Tính năng chính

### 1. Dịch lời bài hát với Google Gemini API

Sử dụng Google Gemini API để dịch lời bài hát tự nhiên và chính xác.

- **Hỗ trợ 6 ngôn ngữ dịch** — Dịch sang Tiếng Việt, Tiếng Anh, Tiếng Nhật, Tiếng Hàn, Tiếng Trung hoặc Tiếng Ukraina.
- **Model có sẵn** — Dropdown chọn nhanh các model Gemini (`gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, ...) hoặc nhập model tùy ý.
- **Hai chế độ hiển thị đồng thời** — Furigana (Nhật `<ruby>`), Romaji (Nhật), Romaja (Hàn), Pinyin (Trung) + dịch thuật AI theo ngôn ngữ lựa chọn.
- **Translation Style** — 6 phong cách dịch (Tự động / Thơ-Lãng mạn / Tuổi trẻ-Anime / Mạnh mẽ-Rap / Cổ điển / Sát nghĩa) phù hợp với mood bài hát.
- **Khóa Pronoun** — 9 cặp đại từ tiếng Việt (Tự động, Anh-Em, Tớ-Cậu, Tao-Mày, ...) giữ giọng dịch nhất quán suốt bài.
- **Multi-Key API** — Thêm nhiều API key (miễn phí từ [Google AI Studio](https://aistudio.google.com/)) tự động xoay vòng và đổi key khi hết hạn mức.
- **Xem AI Reasoning real-time** — Cửa sổ stream trực tiếp quá trình suy nghĩ của model.
- **Pre-translation** — Tự động dịch sẵn bài kế tiếp ở nền trước khi phát, có thể chỉnh thời gian.
- **Định dạng response** — Chọn Prompt Engineering (mọi model) hoặc JSON Schema.

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Nền video động


Tự động lấy MV YouTube làm nền động cho trang lyrics. Hỗ trợ tự bỏ qua quảng cáo, chế độ Cinema toàn màn hình cùng tùy chỉnh scale, dim, blur — kết hợp đẹp với chế độ trong suốt và mọi theme Spicetify.

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 3. Giao diện hiện đại & Trải nghiệm tối ưu

- **Nền trong suốt** — hài hòa với mọi theme Spicetify.
- **Tự động ẩn điều khiển** — nút cài đặt chỉ xuất hiện khi di chuột vào, tối đa hóa không gian hiển thị.
- **Chuyển cảnh mượt mà** — hoạt ảnh tối ưu cho việc chuyển đổi dòng lời liền mạch.
- **Giao diện đa ngôn ngữ** — hỗ trợ Tiếng Việt, English, 日本語, 한국어, 中文（简体）.

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
   - **API Endpoint** — mặc định sử dụng Google Gemini (hỗ trợ dán endpoint proxy nếu cần).
   - **Tên Model** — chọn model có sẵn (`gemini-3.8-flash`, `gemini-3.7-flash`, ...) hoặc nhập model tùy ý.
   - **API Keys** — thêm một hoặc nhiều API key (lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/)). Nhiều key sẽ tự động xoay vòng và chuyển đổi khi hết hạn mức.
   - **Reasoning Effort** — chỉnh mức độ suy nghĩ (`off`, `low`, `medium`, `high`, `auto`).
   - **Định dạng phản hồi** — *Prompt Engineering* hoặc *JSON Schema*.
   - **Pre-translation** — bật/tắt và chọn số giây dịch trước.
3. Rê chuột vào lời bài hát và bấm biểu tượng chuyển đổi (⇄) để tùy chỉnh **Ngôn ngữ đích**, **Chế độ hiển thị**, **Phong cách dịch** và **Đại từ**.

---

## Ngôn ngữ hỗ trợ

### Chế độ Local (Kuromoji, Aromanize, OpenCC)

| Ngôn ngữ gốc      | Kiểu hiển thị 1                 | Kiểu hiển thị 2 |
| ----------------- | ------------------------------- | --------------- |
| Tiếng Nhật (日本語) | Romaji, Hiragana, Katakana      | —               |
| Tiếng Hàn (한국어)  | Romaja                          | —               |
| Tiếng Trung (中文)  | Pinyin, Giản thể, Phồn thể      | —               |

### Chế độ AI (Dịch thuật LLM)

| Ngôn ngữ gốc      | Kiểu hiển thị 1 (Phiên âm)      | Kiểu hiển thị 2 (Bản dịch)        |
| ----------------- | ------------------------------- | --------------------------------- |
| Tiếng Nhật (日本語) | Furigana, Romaji (AI / Local)   | 6 ngôn ngữ (VI, EN, JA, KO, ZH, UK) |
| Tiếng Hàn (한국어)  | Romaja (AI / Local)             | 6 ngôn ngữ (VI, EN, JA, KO, ZH, UK) |
| Tiếng Trung (中文)  | Pinyin (AI / Local)             | 6 ngôn ngữ (VI, EN, JA, KO, ZH, UK) |
| Mọi ngôn ngữ khác | Phiên âm chế độ Local           | 6 ngôn ngữ (VI, EN, JA, KO, ZH, UK) |



---

## Credits

- Bản gốc [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) bởi nhóm Spicetify
- Dịch thuật: [Google Gemini API](https://aistudio.google.com/)
- Phiên âm: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## Giấy phép

[LGPL-2.1](../../LICENSE)

---

*Dự án này đang được phát triển. Vui lòng báo cáo bất kỳ lỗi cũng như đề xuất tính năng và vấn đề nào!*

