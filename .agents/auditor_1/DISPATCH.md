## 2026-08-18T12:42:30Z
You are the independent post-victory auditor.
Working directory for audit report: c:\Users\LENOVO\AppData\Local\spicetify\CustomApps\lyrics-plus\.agents\auditor_1

<original_task>
This is a single self-contained fix; keep it small and focused.

Khắc phục toàn diện các vấn đề về chất lượng dịch lời bài hát Tiếng Nhật (J-Pop/Anime) sang Tiếng Việt trong utils/Prompts.js và nâng cấp độ bền vững của bộ Parser/Reasoning trong services/GeminiClient.js (xử lý lỗi rò rỉ suy nghĩ thought leakage và chống vỡ format).

Working directory: c:\Users\LENOVO\AppData\Local\spicetify\CustomApps\lyrics-plus
Integrity mode: development

## Requirements

### R1. Tối ưu hóa System Prompt dịch Tiếng Nhật & CJK trong utils/Prompts.js
- Gỡ bẫy cấm lặp từ cực đoan (Rule 8): Chuyển từ việc cấm dùng lại từ Hán-Việt/thi vị trong toàn bài sang "Ưu tiên mạch cảm xúc tự nhiên (Natural Flow)". Cho phép lặp lại các core motifs cảm xúc quen thuộc của J-pop (想い omoi, 心 kokoro, 優しい yasashii, 世界 sekai...) khi ngữ cảnh bài hát đòi hỏi, chỉ cấm lặp từ cẩu thả ở 2 dòng liên tiếp.
- Neo giữ cốt truyện & Ngữ pháp J-pop (Thematic & Narrative Anchoring): Bổ sung hướng dẫn nhận diện quan hệ đại từ nhân vật (Boku/Kimi, Watashi/Anata), xử lý đúng câu vắt dòng (Enjambment & Mệnh đề bổ nghĩa đi trước danh từ), và giải mã đúng nghĩa bóng/văn hóa J-Pop thay vì dịch thô từ vựng.
- Tối ưu Reasoning Guide: Cho phép AI trong phần suy nghĩ phân tích ngắn gọn các câu có ẩn dụ lạ/từ tượng hình (Gitaigo) trước khi sinh bản dịch cuối.

### R2. Khắc phục lỗi Rò rỉ Suy nghĩ (Thought Leakage) & Thẻ <thought> mồ côi trong services/GeminiClient.js
- Xử lý Unclosed Thought Tags trong stripReasoningBlocks: Nâng cấp regex để bóc tách sạch sẽ cả các thẻ <thought>, <think>, <|channel>thought bị cụt (mở mà không đóng </thought>).
- Chặn rò rỉ suy nghĩ ở Fallback Split: Ở tầng Priority 3 (isFallbackSplit), nếu phát hiện các đoạn text chứa từ khóa reasoning tiếng Anh (như <thought>, Initiating, Refining, Analysis, Vietnamese is the target), không được gán vào lời bài hát mà phải kích hoạt failover retry sạch sẽ.

### R3. Nâng cấp Parser và ổn định Format cho Prompt Engineering & Furigana trong services/GeminiClient.js
- Hỗ trợ thẻ ngoặc toàn giác (Full-width brackets): Mở rộng tagRegex để nhận diện các thẻ tag ＜1＞...＜/1＞, 【1】...【/1】 tránh bị rớt sang fallback khi gặp tiếng Nhật.
- Tinh chỉnh Redraft Detector khi Streaming: Tránh việc ngắt kết nối stream nhầm khi dòng lời bài hát tiếng Nhật hoặc Furigana có chứa số hoặc thẻ ruby.

## Acceptance Criteria

### Quality & Robustness
- [ ] Lời dịch bài hát tiếng Nhật (J-Pop/Anime) mượt mà, đúng mạch cảm xúc, không còn từ Hán-Việt dị biệt do bí từ, không bị lệch ngôi kể giữa các dòng.
- [ ] Tuyệt đối không bao giờ hiển thị nội dung suy nghĩ (tiếng Anh <thought>...) lên giao diện hiển thị lời bài hát.
- [ ] Parser xử lý trơn tru mọi định dạng tag (Half-width và Full-width), không còn tình trạng Prompt Engineering bị văng lỗi format validation liên tục ở bài tiếng Nhật.
- [ ] Kiểm tra cú pháp JavaScript (node -c utils/Prompts.js, node -c services/GeminiClient.js) hoàn toàn hợp lệ, không có lỗi runtime.
</original_task>
