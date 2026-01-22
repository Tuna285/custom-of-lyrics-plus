// English language file for Lyrics Plus
window.LANG_EN = {
  "meta": {
    "language": "English",
    "code": "en",
    "author": "Lyrics Plus"
  },
  "ui": {
    "translating": "Translating...",
    "providedBy": "Lyrics provided by {provider}"
  },
  "tabs": {
    "general": "General",
    "translation": "Translation",
    "providers": "Providers",
    "background": "Background",
    "advanced": "Advanced"
  },
  "sections": {
    "displayControls": "Display & Controls",
    "syncedOptions": "Synced Lyrics Options",
    "unsyncedOptions": "Unsynced Lyrics Options",
    "geminiApi": "Gemini, Gemma API",
    "serviceOrder": "Service Order & Toggle",
    "corsProxy": "CORS Proxy Template"
  },
  "settings": {
    "language": {
      "label": "Language",
      "desc": "Select the language (Reload Spotify to fully apply)."
    },
    "playbarButton": {
      "label": "Playbar button",
      "desc": "Replace Spotify's lyrics button with Lyrics Plus."
    },
    "globalDelay": {
      "label": "Global delay",
      "desc": "Offset (in ms) across all tracks."
    },
    "fontSize": {
      "label": "Font size",
      "desc": "(or Ctrl + Mouse scroll in main app)"
    },
    "alignment": {
      "label": "Alignment",
      "options": {
        "left": "Left",
        "center": "Center",
        "right": "Right"
      }
    },
    "fullscreenKey": {
      "label": "Fullscreen hotkey"
    },
    "linesBefore": {
      "label": "Compact synced: Lines before"
    },
    "linesAfter": {
      "label": "Compact synced: Lines after"
    },
    "fadeBlur": {
      "label": "Compact synced: Fade-out blur"
    },
    "unsyncedAutoScroll": {
      "label": "Unsynced: Smart auto-scroll",
      "desc": "Automatically scroll unsynced lyrics based on song progress. Pauses for 5 seconds when you manually scroll."
    },
    "apiMode": {
      "label": "API Mode",
      "desc": "Choose between official Google API (requires API key) or ProxyPal for free access.",
      "options": {
        "official": "Official (API Key)",
        "proxy": "ProxyPal (Free)"
      }
    },
    "geminiApiKey": {
      "label": "Gemma API Key",
      "desc": "Gemma API for Display Mode"
    },
    "geminiApiKeyRomaji": {
      "label": "Gemma API Key 2",
      "desc": "Gemma API (optional)"
    },
    "proxyModel": {
      "label": "Proxy Model",
      "desc": "Model to use with ProxyPal"
    },
    "proxyApiKey": {
      "label": "Proxy API Key",
      "desc": "API Key (default: proxypal-local)."
    },
    "proxyEndpoint": {
      "label": "Proxy Endpoint",
      "desc": "Full Proxy URL (default: http://localhost:8317/v1/chat/completions)."
    },
    "preTranslation": {
      "label": "Pre-translation",
      "desc": "Automatically translate lyrics 30s before a song starts playing."
    },
    "disableQueue": {
      "label": "Disable Queue (Parallel Requests)",
      "desc": "Process all translation requests in parallel without queuing. May hit rate limits faster but translates quicker."
    },
    "transparentBackground": {
      "label": "Transparent Background",
      "desc": "ON: Transparent background (shows Spicetify theme). OFF: Solid color from album art."
    },
    "noise": {
      "label": "Noise overlay"
    },
    "backgroundBrightness": {
      "label": "Background brightness"
    },
    "videoBackground": {
      "label": "Video Background",
      "desc": "Enable synchronized YouTube video background."
    },
    "videoBackgroundScale": {
      "label": "Video Scale",
      "desc": "Zoom level (1.1x default)"
    },
    "videoBackgroundDim": {
      "label": "Video Brightness",
      "desc": "Adjust video brightness (0-100)"
    },
    "debugMode": {
      "label": "Debug Mode",
      "desc": "Enable detailed console logging for troubleshooting. Shows lyrics processing, translation requests, and timing info."
    },
    "jaDetectThreshold": {
      "label": "Text convertion: Japanese Detection threshold (Advanced)",
      "desc": "Checks if whenever Kana is dominant in lyrics..."
    },
    "hansDetectThreshold": {
      "label": "Text convertion: Tradition-Simplified Detection threshold (Advanced)",
      "desc": "Checks if whenever Traditional or Simplified is dominant..."
    },
    "musixmatchLanguage": {
      "label": "Musixmatch Translation Language.",
      "desc": "Choose the language you want to translate the lyrics to..."
    },
    "clearMemoryCache": {
      "label": "Clear Memory Cache",
      "desc": "Loaded lyrics are cached in memory...",
      "button": "Clear memory cache"
    },
    "corsProxyDesc": "Use this to bypass CORS restrictions. Replace the URL with your cors proxy server of your choice. <code>{url}</code> will be replaced with the request URL.",
    "corsProxyDefault": "Spotify will reload its webview after applying. Leave empty to restore default: <code>https://cors-proxy.spicetify.app/{url}</code>"
  },
  "buttons": {
    "clearCache": "Clear all cached lyrics",
    "noCache": "No cached lyrics",
    "refreshToken": "Refresh token",
    "refreshingToken": "Refreshing token...",
    "tokenRefreshed": "Token refreshed",
    "tooManyAttempts": "Too many attempts",
    "failedRefreshToken": "Failed to refresh token"
  },
  "providers": {
    "local": { "name": "local" },
    "musixmatch": { "name": "musixmatch" },
    "netease": { "name": "netease" },
    "lrclib": { "name": "lrclib" },
    "spotify": { "name": "spotify" },
    "genius": { "name": "genius" }
  },
  "notifications": {
    "translatedIn": "Translated in {duration}ms",
    "settingsChanged": "Settings changed, re-fetching...",
    "autoCached": "Auto-cached lyrics ({lines} lines)",
    "translationFailed": "Translation failed",
    "geminiKeyMissing": "Gemini API key missing. Please add at least one key in Settings.",
    "noLyricsToTranslate": "No lyrics to translate.",
    "emptyResult": "Empty result from Gemini.",
    "lineCountMismatch": "Line count mismatch! Expected: {expected}, Got: {got}",
    "noTrack": "No track playing",
    "invalidId": "Invalid video ID",
    "videoSet": "Video set: {videoId}",
    "videoSynced": "Synced: {videoId} (offset: {offset}s)",
    "syncFailed": "Failed to sync manual video",
    "syncError": "Error syncing manual video",
    "videoReset": "Video reset - fetching...",
    "noLyricsCache": "No lyrics available to cache",
    "cacheDeleted": "Lyrics cache deleted",
    "cacheSuccess": "Lyrics cached successfully",
    "copied": "Copied: {text}"
  },
  "contextMenu": {
    "provider": "Translation Provider",
    "display": "Translation Display",
    "style": "Translation Style",
    "pronoun": "Pronoun Mode",
    "langOverride": "Language Override",
    "displayMode": "Display Mode",
    "displayMode2": "Display Mode 2",
    "langInfo": "Language-specific options",
    "langInfoText": "Language not detected",
    "langInfoHelp": "Display Mode options will appear when CJK languages (Japanese, Korean, Chinese) are detected in the lyrics. You can use Language Override above to force a specific language.",
    "adjustments": "Adjustments",
    "fontSize": "Font size",
    "lyricPos": "Lyric position",
    "trackDelay": "Track delay",
    "preTrans": "Pre-translation",
    "uAutoScroll": "Unsynced: Auto-scroll",
    "dualGenius": "Dual panel",
    "conversions": "Conversions",
    "translationDisplay": {
      "replace": "Replace original",
      "below": "Below original"
    },
    "language": {
      "off": "Off",
      "zhHans": "Chinese (Simplified)",
      "zhHant": "Chinese (Traditional)",
      "ja": "Japanese",
      "ko": "Korean"
    },
    "modeBase": {
      "none": "None"
    },
    "geminiModes": {
      "romaji": "Romaji, Romaja, Pinyin (Gemini, Gemma)",
      "vi": "Vietnamese (Gemini, Gemma)"
    },
    "styles": {
      "smart_adaptive": "Smart Adaptive (Recommended)",
      "poetic_standard": "Poetic & Romantic",
      "youth_story": "Youthful & Narrative (Anime/Indie)",
      "street_bold": "Bold & Street (Rap/Rock)",
      "vintage_classic": "Vintage & Classic (Classic songs)",
      "literal_study": "Literal (Language learning)"
    },
    "pronouns": {
      "default": "Auto (Based on content)",
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
    "conversion": "Conversion",
    "adjustments": "Adjustments",
    "videoSettings": "Video settings",
    "cacheLyrics": "Cache lyrics",
    "lyricsCached": "Lyrics cached",
    "loadFile": "Load lyrics from file",
    "resetCache": "Reset translation cache",
    "openSettings": "Open Settings",
    "openSettings": "Open Settings",
    "preTransNext": "Next song pre-translated",
    "copy": "Copy to clipboard"
  },
  "videoModal": {
    "title": "Video Background Settings",
    "topVideos": "Top Matching Videos",
    "inputId": "YouTube Video ID or URL:",
    "placeholder": "e.g., dQw4w9WgXcQ or https://youtube.com/watch?v=...",
    "totalOffset": "Total Offset:",
    "apply": "Apply",
    "reset": "Reset/Reload",
    "manualVideo": "Manual Video",
    "score": "Score",
    "detectedId": "Detected ID",
    "currentVideo": "Current video"
  },
  "modal": {
    "title": "Lyrics Plus Settings"
  }
};
