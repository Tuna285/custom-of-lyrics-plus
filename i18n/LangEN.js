// English language file for Lyrics Plus
window.LANG_EN = {
  "meta": {
    "language": "English",
    "code": "en",
    "author": "Lyrics Plus"
  },
  "ui": {
    "translating": "Translating...",
    "providedBy": "Lyrics provided by {provider}",
    "reasoningTitle": "AI Reasoning Process",
    "reasoningPending": "Still waiting for the model response. If your endpoint returns reasoning only after the full reply, text will appear here when ready.",
    "reasoningEmpty": "No separate reasoning text for this response. Many models hide thinking, or your prompt asks for output only.",
    "reasoningTabTranslation": "Translation",
    "reasoningTabPhonetic": "Phonetic",
    "preTranslateChip": "Next: {title}"
  },
  "tabs": {
    "general": "General",
    "translation": "Translation",
    "providers": "Providers",
    "background": "Background",
    "appearance": "Appearance",
    "advanced": "Advanced"
  },
  "sections": {
    "displayControls": "Display & Controls",
    "syncedOptions": "Synced Lyrics Options",
    "unsyncedOptions": "Unsynced Lyrics Options",
    "geminiApi": "LLM API",
    "serviceOrder": "Service Order & Toggle",
    "corsProxy": "CORS Proxy Template",
    "videoBackground": "Video Background",
    "generalBackground": "General Background",
    "appearanceColors": "Colors",
    "appearanceButton": "Button Style"
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
    "miniLyrics": {
      "label": "Mini Lyrics Overlay",
      "desc": "Show a floating lyrics panel on any page (toggle with Ctrl+Shift+M)."
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
    "apiEndpoint": {
      "label": "API Endpoint",
      "desc": "OpenAI-compatible API URL (<code>/v1/chat/completions</code>). Pick a preset from the dropdown or paste a custom URL."
    },
    "modelName": {
      "label": "Model Name",
      "desc": "LLM model name from your provider. Pick a popular model or type any custom name."
    },
    "apiKey": {
      "label": "API Key",
      "desc": "Primary API key for translation."
    },
    "apiKey2": {
      "label": "API Key 2",
      "desc": "Secondary API key for phonetic/romaji (optional, falls back to primary key)."
    },
    "responseMode": {
      "label": "Response Format",
      "desc": "'Prompt Engineering' works with ALL models. 'JSON Schema' requires model support but produces more reliable structured output.",
      "options": {
        "prompt": "Prompt Engineering (Universal)",
        "json_schema": "JSON Schema"
      },
      "unsupportedToast": "This model doesn't support JSON Schema — auto-switched to Prompt Engineering."
    },
    "preTranslation": {
      "label": "Pre-translation",
      "desc": "Automatically translate lyrics before a song starts playing."
    },
    "preTranslationTime": {
      "label": "Pre-translation time",
      "desc": "How long before song ends to start pre-translating the next track."
    },
    "disableQueue": {
      "label": "Disable Queue (Parallel Requests)",
      "desc": "Process all translation requests in parallel without queuing. May hit rate limits faster but translates quicker."
    },
    "reasoningEffort": {
      "label": "Reasoning Effort",
      "desc": "How much thinking the model does before answering. Lower = faster. 'Low' is the sweet spot for lyric translation. Ignored by models without thinking mode (e.g. Gemma 4 26B A4B).",
      "options": {
        "off": "Off (fastest)",
        "low": "Low (recommended)",
        "medium": "Medium",
        "high": "High (slowest, for complex lyrics)"
      },
      "unsupportedToast": "This model's reasoning cannot be disabled at runtime — it will still think."
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
    "videoBackgroundBlur": {
      "label": "Video Blur"
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
    "uiSwitchOnColor": {
      "label": "Toggle active color",
      "desc": "Color of enabled circular toggle buttons."
    },
    "uiSwitchOffColor": {
      "label": "Toggle inactive color",
      "desc": "Color of disabled/inactive circular toggle buttons."
    },
    "uiAccentColor": {
      "label": "Accent/hover outline color",
      "desc": "Border and glow color used for focus/hover outlines in settings controls."
    },
    "uiButtonBgColor": {
      "label": "Modal button background",
      "desc": "Background color for modal action buttons."
    },
    "uiButtonTextColor": {
      "label": "Modal button text",
      "desc": "Text/icon color for modal action buttons."
    },
    "uiFabBgColor": {
      "label": "Quick button background",
      "desc": "Background color of in-player quick action buttons."
    },
    "uiFabIconColor": {
      "label": "Quick button icon",
      "desc": "Icon color of in-player quick action buttons."
    },
    "providerTokenPlaceholder": "Paste provider token here",
    "corsProxyDesc": "Use this to bypass CORS restrictions. Replace the URL with your cors proxy server of your choice. <code>{url}</code> will be replaced with the request URL.",
    "corsProxyDefault": "Spotify will reload its webview after applying. Leave empty to restore default: <code>https://cors-proxy.spicetify.app/{url}</code>",
    "activeColor": {
      "label": "Active lyric color",
      "desc": "Color of the currently playing line."
    },
    "inactiveColor": {
      "label": "Inactive lyric color",
      "desc": "Color of non-playing lyric lines."
    },
    "highlightColor": {
      "label": "Accent color",
      "desc": "Color for buttons and UI highlights."
    },
    "usingThemeColor": "Using theme default"
  },
  "buttons": {
    "clearCache": "Clear all cached lyrics",
    "noCache": "No cached lyrics",
    "refreshToken": "Refresh token",
    "refreshingToken": "Refreshing token...",
    "tokenRefreshed": "Token refreshed",
    "tooManyAttempts": "Too many attempts",
    "failedRefreshToken": "Failed to refresh token",
    "resetToTheme": "Reset"
  },
  "providers": {
    "local": { "name": "local", "desc": "Provide lyrics from cache/local files loaded from previous Spotify sessions." },
    "musixmatch": { "name": "musixmatch", "desc": "Fully compatible with Spotify. Requires a token from the official Musixmatch app. If lyrics fail to load, refresh the token via the <code>Refresh Token</code> button. A CORS proxy may be required." },
    "lrclib": { "name": "lrclib", "desc": "Lyrics sourced from lrclib.net. Supports both synced and unsynced lyrics. Free and open-source." },
    "spotify": { "name": "spotify", "desc": "Lyrics sourced from the official Spotify API." },
    "netease": { "name": "NetEase", "desc": "Lyrics sourced from NetEase Cloud Music. Excellent coverage for indie JP/KR/CN artists. Requires a session Cookie from music.163.com." }
  },
  "notifications": {
    "translatedIn": "Translated in {duration}",
    "reTranslating": "Re-translating…",
    "cacheClearedShort": "Translation cache cleared",
    "settingsChanged": "Settings changed, re-fetching...",
    "autoCached": "Auto-cached lyrics ({lines} lines)",
    "translationFailed": "Translation failed",
    "geminiKeyMissing": "LLM API key missing. Please add at least one key in Settings.",
    "noLyricsToTranslate": "No lyrics to translate.",
    "emptyResult": "Empty result from AI.",
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
      "romaji": "Romaji, Romaja, Pinyin (AI)",
      "vi": "Vietnamese (AI)"
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
    "preTransNext": "Next song pre-translated",
    "preTranslateChip": "AI is preparing the next track in the background",
    "copy": "Copy to clipboard",
    "viewReasoning": "View AI reasoning"
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
