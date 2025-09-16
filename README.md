# Custom-of-lyrics-plus-CustomApps
# Lyrics Plus (Phiên bản Custom)

> Phiên bản cá nhân hóa của custom app **Lyrics Plus** cho Spicetify, được xây dựng lại để tập trung vào trải nghiệm dịch thuật lời bài hát chất lượng cao và giao diện người dùng hiện đại.

Phiên bản này đã được thay thế bằng sức mạnh của **Google Gemini API** để mang lại các bản dịch chính xác, tức thì.

---

## ✨ Dưới đây là những tính năng bổ sung của phiên bản này:
### 1. Dịch lời bài hát với Gemini API
Dùng mô hình LLM của Google để dịch lời bài hát một cách tự nhiên và chính xác.
-   🌐 **Hỗ trợ 2 chế độ hiển thị cùng lúc**: Chuyển ngữ các bài hát sang Romaji (Tiếng Nhật), Romaja (Tiếng Hàn), Pinyin (Tiếng Trung Phồn-Giản Thể) và dịch lời bài hát sang **Tiếng Việt**, lý tưởng cho việc học ngôn ngữ.
-   🎶 **Chất lượng cao**: Bản dịch được tối ưu cho ngữ cảnh âm nhạc, giữ lại ý nghĩa và cảm xúc của bài hát.
<img width="1919" height="1020" alt="image" src="https://github.com/user-attachments/assets/6b49032b-704e-4f35-8aec-cad9f42083f3" />
<img width="1919" height="1022" alt="image" src="https://github.com/user-attachments/assets/aadf0f62-2c67-4396-89cd-15da4ed6882d" />
<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/90c26e06-d7f0-441f-a766-393e3a9ece72" />
<img width="1919" height="1023" alt="image" src="https://github.com/user-attachments/assets/2a1d4b24-97e4-4c8b-9374-931dfaded08a" />

### 2. Giao diện hiện đại & Tối ưu trải nghiệm
Giao diện được tinh chỉnh để đẹp mắt, gọn gàng và không gây xao nhãng.
-   🖼️ **Nền trong suốt**: Lời bài hát được hiển thị trên một lớp nền trong suốt, hòa hợp với giao diện của các theme của spicetify.
-   🖱️ **Nút điều khiển tự ẩn**: Các nút cài đặt chỉ xuất hiện khi bạn di chuột vào khu vực lời bài hát, trả lại không gian hiển thị tối đa.
-   🎬 **Hiệu ứng chuyển dòng mượt mà**: Animation được tối ưu để tạo cảm giác chuyển tiếp uyển chuyển giữa các dòng lyric.

### 3. Quản lý API Key thông minh
-   🔑 **Hỗ trợ 2 API Key riêng biệt**: Bạn có thể sử dụng một key cho Display Mode 1 và một key cho Display Mode 2 để quản lý giới hạn request hiệu quả, nếu bạn chỉ cung cấp một API key, cả hai chế độ dịch sẽ tự động sử dụng chung key đó.
<img width="1920" height="1021" alt="image" src="https://github.com/user-attachments/assets/9bfe5f3f-9836-4583-8759-7e75ba438147" />

### 4. Tối ưu bản dịch thông minh
Hệ thống sẽ tự động xử lý để kết quả hiển thị luôn gọn gàng và hợp lý.
-   **Chống trùng lặp**: Tự động ẩn các bản dịch giống hệt với lời gốc

---

## 🚀 Cài đặt

0.  **(Yêu cầu Spotify cài đặt từ web, không từ Microsoft Store)** Cài đặt Spicetify và CustomApps (lyrics-plus): https://spicetify.app/docs/getting-started

1.  Tải và giải nén file chứa custom của lyric-plus
<img width="578" height="455" alt="image" src="https://github.com/user-attachments/assets/5f190f70-3185-4e2d-990f-90068d3bcf8d" />
  
2.  Copy và thay thế toàn bộ thư mục `lyrics-plus` đã giải nén vào thư mục `CustomApps` của Spicetify với path: 
- Windows: ```%LocalAppData%\spicetify\CustomApps```
- MacOS/Linux: ```~/.config/spicetify/CustomApps```

3.  Mở terminal hoặc PowerShell và chạy lệnh:
    ```
    spicetify apply
    ```
3. Cách lấy API của Gemini(free):
- https://www.youtube.com/watch?v=RVGbLSVFtIk


---

## 🛠️ Thiết lập ban đầu

1.  Mở Spotify, vào lyrics plus và nhấn vào avatar chọn **Lyrics Plus config** từ thanh menu bên trái.
2.  Tìm đến `Gemini API Key (Display Mode 1)` và `Gemini API Key (Display Mode 2)` và dán API key của bạn vào.
3.  Mở một bài hát bất kỳ, di chuột vào vùng hiển thị lời bài hát và nhấp vào biểu tượng chuyển ngữ (⇄) để bắt đầu tùy chỉnh chế độ dịch của bạn.

---
**(Dự án đang phát triển, nếu có lỗi vui lòng góp ý)**

