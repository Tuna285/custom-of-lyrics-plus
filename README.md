# Custom-of-lyrics-plus-CustomApps
# Lyrics Plus (Phiên bản Custom)

> Phiên bản cá nhân hóa cho **Lyrics Plus** của Spicetify, được xây dựng lại để tập trung vào trải nghiệm dịch thuật lời bài hát chất lượng cao, phù hợp cho người Việt Nam, bao gồm tích hợp API cá nhân (Google) và qua [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) hoặc [ProxyPal](https://github.com/heyhuynhgiabuu/proxypal)

---

## Dưới đây là những tính năng bổ sung của phiên bản này:
### 1. Dịch lời bài hát với Gemma API
Dùng mô hình LLM của Google (thông qua API và Proxy) để dịch lời bài hát một cách tự nhiên và chính xác.
-   **Hỗ trợ 2 chế độ hiển thị cùng lúc**: Chuyển ngữ các bài hát sang Romaji (Tiếng Nhật), Romaja (Tiếng Hàn), Pinyin (Tiếng Trung Phồn-Giản Thể) và dịch lời bài hát sang **Tiếng Việt**, lý tưởng cho việc học ngôn ngữ.
-   **Chất lượng cao**: Bản dịch được tối ưu cho ngữ cảnh âm nhạc, giữ lại ý nghĩa và cảm xúc của bài hát.
<img width="1919" height="1020" alt="image" src="https://github.com/user-attachments/assets/6b49032b-704e-4f35-8aec-cad9f42083f3" />
<img width="1919" height="1022" alt="image" src="https://github.com/user-attachments/assets/aadf0f62-2c67-4396-89cd-15da4ed6882d" />
<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/90c26e06-d7f0-441f-a766-393e3a9ece72" />
<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/0c0d6497-5e43-4cb8-9581-218540a38e3f" />

### 2. Giao diện hiện đại & Tối ưu trải nghiệm
Giao diện được tinh chỉnh để đẹp mắt, gọn gàng và không gây xao nhãng.
-   **Nền trong suốt**: Lời bài hát được hiển thị trên một lớp nền trong suốt, hòa hợp với giao diện của các theme của spicetify.
-   **Nút điều khiển tự ẩn**: Các nút cài đặt chỉ xuất hiện khi bạn di chuột vào khu vực lời bài hát, trả lại không gian hiển thị tối đa.
-   **Hiệu ứng chuyển dòng mượt mà**: Animation được tối ưu để tạo cảm giác chuyển tiếp uyển chuyển giữa các dòng lyric.

### 3. Tối ưu bản dịch thông minh
Prompt được tinh chỉnh và tự động xử lý để kết quả hiển thị luôn gọn gàng và hợp lý.

---

## Cài đặt

0.  **(Yêu cầu Spotify cài đặt từ web, không từ Microsoft Store)** Cài đặt [Spicetify và CustomApps (lyrics-plus)](https://spicetify.app/docs/getting-started)
1.  Tải và giải nén file chứa custom của lyric-plus
<img width="578" height="455" alt="image" src="https://github.com/user-attachments/assets/5f190f70-3185-4e2d-990f-90068d3bcf8d" />
  
2.  Copy và thay thế toàn bộ thư mục `lyrics-plus` đã giải nén vào thư mục `CustomApps` của Spicetify với path: 
- Windows: ```%LocalAppData%\spicetify\CustomApps```
- MacOS/Linux: ```~/.config/spicetify/CustomApps```

3.  Mở terminal hoặc PowerShell và chạy lệnh:
    ```
    spicetify apply
    ```
* Cách lấy API Gemma qua [AiStudio](https://www.youtube.com/watch?v=JomWSwhwThg)

* Chi tiết cách cài đặt [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) hoặc [ProxyPal](https://github.com/heyhuynhgiabuu/proxypal)

---

## Thiết lập ban đầu

1.  Mở Spotify, vào lyrics plus và nhấn vào avatar chọn **Lyrics Plus config** từ thanh menu bên trái.
2.  Đến phần Translation chọn API Mode
<img width="600" height="711" alt="image" src="https://github.com/user-attachments/assets/5b819cb2-b800-456d-a8b3-f9f39c61cc5e" />

4.  Mở một bài hát bất kỳ, di chuột vào vùng hiển thị lời bài hát và nhấp vào biểu tượng chuyển ngữ (⇄) để bắt đầu tùy chỉnh chế độ dịch của bạn.

---
**(Dự án đang phát triển, nếu có lỗi vui lòng góp ý)**



