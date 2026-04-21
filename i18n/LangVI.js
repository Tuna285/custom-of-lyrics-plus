// Vietnamese language file for Lyrics Plus
// Balanced version: Common UI terms in Vietnamese, specific technical terms in English.
window.LANG_VI = {
  "meta": {
    "language": "Tiếng Việt",
    "code": "vi",
    "author": "Lyrics Plus"
  },
  "ui": {
    "translating": "Đang dịch...",
    "providedBy": "Lời bài hát được cung cấp bởi {provider}",
    "reasoningTitle": "Quá trình suy nghĩ của AI",
    "reasoningPending": "Đang chờ model trả lời. Nếu API chỉ gửi reasoning sau khi xong, nội dung sẽ hiện ở đây.",
    "reasoningEmpty": "Không có đoạn reasoning riêng cho lần gọi này. Nhiều model không hiện thinking, hoặc prompt đang yêu cầu chỉ xuất kết quả.",
    "reasoningTabTranslation": "Dịch",
    "reasoningTabPhonetic": "Phiên âm",
    "preTranslateChip": "Tiếp: {title}"
  },
  "tabs": {
    "general": "Chung",
    "translation": "Dịch thuật",
    "providers": "Nguồn nhạc",
    "background": "Hình nền",
    "appearance": "Giao diện",
    "advanced": "Nâng cao"
  },
  "sections": {
    "displayControls": "Hiển thị & Điều khiển",
    "syncedOptions": "Tùy chọn Lời bài hát (Synced)",
    "unsyncedOptions": "Tùy chọn Lời bài hát (Unsynced)",
    "geminiApi": "API dịch thuật (LLM)",
    "serviceOrder": "Thứ tự Dịch vụ",
    "corsProxy": "CORS Proxy Template",
    "videoBackground": "Video Background",
    "generalBackground": "Nền chung"
  },
  "settings": {
    "language": {
      "label": "Ngôn ngữ",
      "desc": "Chọn ngôn ngữ hiển thị (Reload Spotify để áp dụng hoàn toàn)."
    },
    "playbarButton": {
      "label": "Nút Playbar",
      "desc": "Thay thế nút Lyrics mặc định của Spotify bằng Lyrics Plus."
    },
    "miniLyrics": {
      "label": "Mini Lyrics Overlay",
      "desc": "Hiện panel lyrics nổi trên mọi trang (bật/tắt bằng Ctrl+Shift+M)."
    },
    "globalDelay": {
      "label": "Global Delay",
      "desc": "Chỉnh độ trễ (ms) cho tất cả bài hát."
    },
    "fontSize": {
      "label": "Cỡ chữ",
      "desc": "(Hoặc giữ Ctrl + lăn chuột trong màn hình lyrics)"
    },
    "alignment": {
      "label": "Căn chỉnh",
      "options": {
        "left": "Trái",
        "center": "Giữa",
        "right": "Phải"
      }
    },
    "fullscreenKey": {
      "label": "Phím tắt Toàn màn hình"
    },
    "linesBefore": {
      "label": "Compact Mode: Số dòng trên"
    },
    "linesAfter": {
      "label": "Compact Mode: Số dòng dưới"
    },
    "fadeBlur": {
      "label": "Compact Mode: Độ mờ (Blur)"
    },
    "unsyncedAutoScroll": {
      "label": "Unsynced: Tự động cuộn",
      "desc": "Tự động cuộn theo tiến trình bài hát. Tạm dừng 5s khi cuộn thủ công."
    },
    "apiEndpoint": {
      "label": "API Endpoint",
      "desc": "URL API tương thích OpenAI (<code>/v1/chat/completions</code>). Chọn preset từ dropdown hoặc dán URL tùy ý."
    },
    "modelName": {
      "label": "Tên Model",
      "desc": "Tên model LLM của nhà cung cấp. Chọn model phổ biến hoặc nhập tên tùy ý."
    },
    "apiKey": {
      "label": "API Key",
      "desc": "Key chính cho dịch thuật."
    },
    "apiKey2": {
      "label": "API Key 2",
      "desc": "Key phụ cho phiên âm (tùy chọn, dùng key chính nếu bỏ trống)."
    },
    "responseMode": {
      "label": "Định dạng Response",
      "desc": "'Prompt Engineering' hoạt động với MỌI model. 'JSON Schema' cần model hỗ trợ nhưng cho kết quả ổn định hơn.",
      "options": {
        "prompt": "Prompt Engineering (Mọi model)",
        "json_schema": "JSON Schema"
      },
      "unsupportedToast": "Model này không hỗ trợ JSON Schema — đã tự chuyển sang Prompt Engineering."
    },
    "preTranslation": {
      "label": "Dịch trước (Pre-translation)",
      "desc": "Tự động dịch trước khi bài hát bắt đầu."
    },
    "preTranslationTime": {
      "label": "Thời gian dịch trước",
      "desc": "Bắt đầu dịch trước bao lâu trước khi bài hát kết thúc."
    },
    "disableQueue": {
      "label": "Tắt hàng đợi (Parallel)",
      "desc": "Xử lý song song. Nhanh hơn nhưng dễ bị giới hạn (rate limit)."
    },
    "reasoningEffort": {
      "label": "Mức độ suy luận (Reasoning)",
      "desc": "Model suy nghĩ nhiều hay ít trước khi trả lời. Thấp = nhanh hơn. 'Thấp' là sweet spot cho dịch lyric. Không tác dụng với model không có thinking mode (vd. Gemma 4 26B A4B).",
      "options": {
        "off": "Tắt (nhanh nhất)",
        "low": "Thấp (khuyên dùng)",
        "medium": "Trung bình",
        "high": "Cao (chậm nhất, cho lyric phức tạp)"
      },
      "unsupportedToast": "Model này không thể tắt reasoning lúc chạy — nó vẫn sẽ suy nghĩ."
    },
    "transparentBackground": {
      "label": "Nền trong suốt",
      "desc": "BẬT: Hiện theme Spicetify. TẮT: Màu từ album art."
    },
    "noise": {
      "label": "Lớp phủ Noise"
    },
    "backgroundBrightness": {
      "label": "Độ sáng nền"
    },
    "videoBackground": {
      "label": "Video Background",
      "desc": "Bật hình nền bằng video."
    },
    "videoBackgroundScale": {
      "label": "Tỷ lệ Video",
      "desc": "Mức độ phóng to (mặc định 1.1x)"
    },
    "videoBackgroundDim": {
      "label": "Độ sáng Video",
      "desc": "Điều chỉnh độ sáng video (0-100)"
    },
    "videoBackgroundBlur": {
      "label": "Độ mờ Video"
    },
    "debugMode": {
      "label": "Chế độ Debug",
      "desc": "Hiện log chi tiết trong Console để sửa lỗi."
    },
    "jaDetectThreshold": {
      "label": "Ngưỡng phát hiện tiếng Nhật (Advanced)",
      "desc": "Độ nhạy khi phát hiện Kana."
    },
    "hansDetectThreshold": {
      "label": "Ngưỡng phát hiện Giản/Phồn thể (Advanced)",
      "desc": "Độ nhạy khi phân biệt chữ Hán."
    },
    "musixmatchLanguage": {
      "label": "Ngôn ngữ dịch Musixmatch",
      "desc": "Chọn ngôn ngữ đích cho Musixmatch."
    },
    "clearMemoryCache": {
      "label": "Xóa Cache bộ nhớ",
      "desc": "Xóa lời bài hát đang lưu trong RAM.",
      "button": "Xóa Cache"
    },
    "corsProxyDesc": "Dùng để vượt lỗi CORS. Thay URL bằng server proxy của bạn. <code>{url}</code> là link gốc.",
    "corsProxyDefault": "Spotify sẽ reload sau khi lưu. Để trống để về mặc định: <code>https://cors-proxy.spicetify.app/{url}</code>"
  },
  "buttons": {
    "clearCache": "Xóa Cache đã lưu",
    "noCache": "Không có cache",
    "refreshToken": "Làm mới Token",
    "refreshingToken": "Đang làm mới...",
    "tokenRefreshed": "Đã làm mới Token",
    "tooManyAttempts": "Quá nhiều lần thử",
    "failedRefreshToken": "Làm mới thất bại"
  },
  "providers": {
    "local": { "name": "local" },
    "musixmatch": { "name": "Musixmatch" },
    "lrclib": { "name": "LRCLIB" },
    "spotify": { "name": "Spotify" },
  },
  "notifications": {
    "translatedIn": "Dịch xong trong {duration}",
    "reTranslating": "Đang dịch lại…",
    "cacheClearedShort": "Đã xóa cache dịch",
    "settingsChanged": "Cài đặt thay đổi, đang tải lại...",
    "autoCached": "Đã cache ({lines} dòng)",
    "translationFailed": "Dịch thất bại",
    "geminiKeyMissing": "Thiếu LLM API Key. Vui lòng kiểm tra Settings.",
    "noLyricsToTranslate": "Không có lời để dịch.",
    "emptyResult": "AI trả về rỗng.",
    "lineCountMismatch": "Lỗi số dòng! Kì vọng: {expected}, Thực tế: {got}",
    "noTrack": "Không có bài hát đang phát",
    "invalidId": "Video ID không hợp lệ",
    "videoSet": "Đã chọn Video: {videoId}",
    "videoSynced": "Đã đồng bộ: {videoId} (offset: {offset}s)",
    "syncFailed": "Đồng bộ video thất bại",
    "syncError": "Lỗi khi đồng bộ video",
    "videoReset": "Video reset - đang tải lại...",
    "noLyricsCache": "Không có lời để lưu (Cache)",
    "cacheDeleted": "Đã xóa cache lời bài hát",
    "cacheSuccess": "Đã lưu cache lời bài hát thành công",
    "copied": "Đã sao chép: {text}"
  },
  "contextMenu": {
    "provider": "Nguồn dịch",
    "display": "Kiểu hiển thị",
    "style": "Văn phong",
    "pronoun": "Xưng hô",
    "langOverride": "Ghi đè Ngôn ngữ",
    "displayMode": "Chế độ hiển thị",
    "displayMode2": "Chế độ hiển thị 2",
    "langInfo": "Tùy chọn theo ngôn ngữ",
    "langInfoText": "Chưa phát hiện ngôn ngữ",
    "langInfoHelp": "Các tùy chọn hiển thị sẽ xuất hiện khi phát hiện ngôn ngữ CJK (Nhật, Hàn, Trung). Bạn có thể dùng 'Language Override' ở trên để chọn thủ công.",
    "adjustments": "Tinh chỉnh",
    "fontSize": "Cỡ chữ",
    "lyricPos": "Vị trí lời",
    "trackDelay": "Chỉnh delay bài hát",
    "preTrans": "Dịch trước",
    "uAutoScroll": "Unsynced: Tự động cuộn",
    "conversions": "Chuyển đổi",
    "translationDisplay": {
      "replace": "Thay thế lời gốc",
      "below": "Dưới lời gốc"
    },
    "language": {
      "off": "Tắt",
      "zhHans": "Tiếng Trung (Giản thể)",
      "zhHant": "Tiếng Trung (Phồn thể)",
      "ja": "Tiếng Nhật",
      "ko": "Tiếng Hàn"
    },
    "modeBase": {
      "none": "Không"
    },
    "geminiModes": {
      "romaji": "Romaji, Romaja, Pinyin (AI)",
      "vi": "Tiếng Việt (AI)"
    },
    "styles": {
      "smart_adaptive": "Tự động (Đề xuất)",
      "poetic_standard": "Thơ & Lãng mạn",
      "youth_story": "Tuổi trẻ & Tự sự (Anime/Indie)",
      "street_bold": "Mạnh mẽ & Bụi bặm (Rap/Rock)",
      "vintage_classic": "Cổ điển (Nhạc xưa)",
      "literal_study": "Dịch sát nghĩa (Học ngôn ngữ)"
    },
    "pronouns": {
      "default": "Tự động (Dựa theo nội dung)",
      "anh_em": "Anh - Em",
      "em_anh": "Em - Anh",
      "to_cau": "Tớ - Cậu",
      "minh_ban": "Tôi - Cậu",
      "toi_ban": "Tôi - Bạn",
      "toi_em": "Tôi - Em",
      "ta_nguoi": "Ta - Người",
      "tao_may": "Tao - Mày"
    }
  },
  "tooltips": {
    "conversion": "Chuyển đổi",
    "adjustments": "Tinh chỉnh",
    "videoSettings": "Cài đặt Video",
    "cacheLyrics": "Lưu Cache Lời",
    "lyricsCached": "Đã lưu Cache",
    "loadFile": "Nhập file local (.lrc)",
    "resetCache": "Xóa cache dịch",
    "openSettings": "Mở Cài đặt",
    "preTransNext": "Bài tiếp theo đã được dịch trước",
    "preTranslateChip": "AI đang dịch sẵn bài tiếp theo (nền)",
    "copy": "Sao chép",
    "viewReasoning": "Xem quá trình suy nghĩ"
  },
  "videoModal": {
    "title": "Cài đặt Video Background",
    "topVideos": "Top Video Phù hợp",
    "inputId": "YouTube Video ID hoặc URL:",
    "placeholder": "Ví dụ: dQw4w9WgXcQ hoặc https://youtube.com/...",
    "totalOffset": "Điều chỉnh Offset:",
    "apply": "Áp dụng",
    "reset": "Reset/Reload",
    "manualVideo": "Video Thủ công",
    "score": "Độ khớp",
    "detectedId": "ID tìm thấy",
    "currentVideo": "Video hiện tại"
  },
  "modal": {
    "title": "Cài đặt Lyrics Plus"
  }
};
