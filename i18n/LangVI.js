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
    "providedBy": "Lời bài hát được cung cấp bởi {provider}"
  },
  "tabs": {
    "general": "Chung",
    "translation": "Dịch thuật",
    "providers": "Nguồn nhạc",
    "background": "Giao diện",
    "advanced": "Nâng cao"
  },
  "sections": {
    "displayControls": "Hiển thị & Điều khiển",
    "syncedOptions": "Tùy chọn Lời bài hát (Synced)",
    "unsyncedOptions": "Tùy chọn Lời bài hát (Unsynced)",
    "geminiApi": "API Gemini, Gemma",
    "serviceOrder": "Thứ tự Dịch vụ",
    "corsProxy": "CORS Proxy Template"
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
    "apiMode": {
      "label": "Chế độ API",
      "desc": "Chọn API: Google Official (cần key) hoặc ProxyPal (miễn phí).",
      "options": {
        "official": "Official (API Key)",
        "proxy": "ProxyPal (Free)"
      }
    },
    "geminiApiKey": {
      "label": "Gemma API Key",
      "desc": "Key API cho chế độ hiển thị chính."
    },
    "geminiApiKeyRomaji": {
      "label": "Gemma API Key 2",
      "desc": "Key API phụ (nếu cần)."
    },
    "proxyModel": {
      "label": "Proxy Model",
      "desc": "Model sử dụng với ProxyPal."
    },
    "proxyApiKey": {
      "label": "Proxy API Key",
      "desc": "API Key (mặc định: proxypal-local)."
    },
    "proxyEndpoint": {
      "label": "Proxy Endpoint",
      "desc": "URL của Proxy (mặc định: http://localhost:8317/v1/chat/completions)."
    },
    "preTranslation": {
      "label": "Dịch trước (Pre-translation)",
      "desc": "Tự động dịch 30s trước khi khi bài hát bắt đầu."
    },
    "disableQueue": {
      "label": "Tắt hàng đợi (Parallel)",
      "desc": "Xử lý song song. Nhanh hơn nhưng dễ bị giới hạn (rate limit)."
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
    "netease": { "name": "Netease" },
    "lrclib": { "name": "LRCLIB" },
    "spotify": { "name": "Spotify" },
    "genius": { "name": "Genius" }
  },
  "notifications": {
    "translatedIn": "Dịch xong trong {duration}ms",
    "settingsChanged": "Cài đặt thay đổi, đang tải lại...",
    "autoCached": "Đã cache ({lines} dòng)",
    "translationFailed": "Dịch thất bại",
    "geminiKeyMissing": "Thiếu Gemini API Key. Vui lòng kiểm tra Settings.",
    "noLyricsToTranslate": "Không có lời để dịch.",
    "emptyResult": "Gemini trả về rỗng.",
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
    "dualGenius": "Chia đôi màn hình",
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
      "romaji": "Romaji, Romaja, Pinyin (Gemma)",
      "vi": "Tiếng Việt (Gemma)"
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
    "copy": "Sao chép"
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
