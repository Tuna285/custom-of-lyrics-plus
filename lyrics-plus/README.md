# Lyrics Plus (Phiên bản tùy chỉnh)

> Phiên bản cá nhân hóa của custom app **Lyrics Plus** cho Spicetify, được xây dựng lại để tập trung vào trải nghiệm dịch thuật lời bài hát chất lượng cao và giao diện người dùng hiện đại.

Phiên bản này đã được thay thế bằng sức mạnh của **Google Gemini API** để mang lại các bản dịch chính xác, tức thì.

---

## ✨ Tính năng chính của bản custom

### 1. Dịch lời bài hát với Gemini API
Tận dụng mô hình LLM của Google để dịch lời bài hát một cách tự nhiên và chính xác.
-   🌐 **Hỗ trợ 2 chế độ hiển thị cùng lúc**: Chuyển ngữ các bài hát sang phiên âm Latinh và các ngôn ngữ khác sang **Tiếng Việt**, lý tưởng cho việc học ngôn ngữ.
-   🎶 **Chất lượng cao**: Bản dịch được tối ưu cho ngữ cảnh âm nhạc, giữ lại ý nghĩa và cảm xúc của bài hát.

### 2. Giao diện hiện đại & Tối ưu trải nghiệm
Giao diện được tinh chỉnh để đẹp mắt, gọn gàng và không gây xao nhãng.
-   🖼️ **Nền trong suốt**: Lời bài hát được hiển thị trên một lớp nền trong suốt, hòa hợp với giao diện của các theme của spicetify.
-   ✍️ **Chữ dễ đọc**: Văn bản có viền nhẹ, đảm bảo luôn rõ nét trên mọi hình nền bìa album.
-   🖱️ **Nút điều khiển tự ẩn**: Các nút cài đặt chỉ xuất hiện khi bạn di chuột vào khu vực lời bài hát, trả lại không gian hiển thị tối đa.
-   🎬 **Hiệu ứng chuyển dòng mượt mà**: Animation được tối ưu để tạo cảm giác chuyển tiếp uyển chuyển giữa các dòng lyric.

### 3. Quản lý API Key thông minh
-   🔑 **Hỗ trợ 2 API Key riêng biệt**: Bạn có thể sử dụng một key cho Display Mode 1 và một key cho Display Mode 2 để quản lý giới hạn request hiệu quả, nếu bạn chỉ cung cấp một API key, cả hai chế độ dịch sẽ tự động sử dụng chung key đó.

### 4. Tối ưu bản dịch thông minh
Hệ thống sẽ tự động xử lý để kết quả hiển thị luôn gọn gàng và hợp lý.
-   **Chống trùng lặp**: Tự động ẩn các bản dịch giống hệt với lời gốc

---

## 🚀 Cài đặt

0.  Cài đặt Spicetify: https://spicetify.app/docs/getting-started

1.  Dán toàn bộ thư mục `lyrics-plus` vào thư mục `CustomApps` của Spicetify với path: 
- Windows: %appdata%\spicetify\CustomApps
- MacOS/Linux: ~/.config/spicetify/CustomApps

2.  Mở terminal hoặc PowerShell và chạy lệnh:
    ```
    spicetify apply
    ```
3. Cách lấy API của Gemini:
- https://www.youtube.com/watch?v=RVGbLSVFtIk


---

## 🛠️ Thiết lập ban đầu

1.  Mở Spotify, vào lyrics plus và nhấn vào avatar chọn **Lyrics Plus config** từ thanh menu bên trái.
2.  Tìm đến `Gemini API Key (Display Mode 1)` và `Gemini API Key (Display Mode 2)` và dán API key của bạn vào.
3.  Mở một bài hát bất kỳ, di chuột vào vùng hiển thị lời bài hát và nhấp vào biểu tượng chuyển ngữ (⇄) để bắt đầu tùy chỉnh chế độ dịch của bạn.
