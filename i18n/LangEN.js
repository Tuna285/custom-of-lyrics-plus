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
    "reasoningTabInsights": "Song Insights",
    "reasoningTabTranslation": "Translation",
    "reasoningTabPhonetic": "Phonetic",
    "insightsLoading": "Searching song background and lyric notes via Google Search…",
    "insightsKeyMissing": "Please enter a Gemini API Key in Settings to use Song Insights.",
    "insightsNoTrack": "Could not retrieve track information from Spotify.",
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
    "appearanceButton": "Button Style",
    "aboutAndUpdates": "About & Updates"
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
      "label": "Translation Model",
      "desc": "LLM model for translating song lyrics (e.g. gemini-3.5-flash)."
    },
    "phoneticModelName": {
      "label": "Phonetic Model",
      "desc": "LLM model for generating Romaji/Furigana. Use a light, fast model (e.g. gemini-3.5-flash-lite) to save premium quota."
    },
    "apiKeys": {
      "label": "Gemini API Keys",
      "desc": "Add multiple keys to auto-rotate and avoid rate limits."
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
    "smartPreload": {
      "label": "Smart Pre-load",
      "desc": "Prepare and cache lyrics translation & video background for the next song in the background."
    },
    "smartPreloadTime": {
      "label": "Pre-load Trigger Time",
      "desc": "How long before the current song ends to start preloading the next track."
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
    "videoBackgroundFullscreen": {
      "label": "Cover entire window",
      "desc": "Make the video background cover the entire Spotify window instead of being restricted to the lyrics panel."
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
    "usingThemeColor": "Using theme default",
    "checkForUpdates": "Check for Updates",
    "updateAppSubtitle": "AI-powered lyrics translation & video background"
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
    "netease": { "name": "NetEase", "desc": "Lyrics sourced from NetEase Cloud Music. Excellent coverage for indie JP/KR/CN artists. Optional: session Cookie from music.163.com may improve results." }
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
    "copied": "Copied: {text}",
    "neteaseNoSynced": "No synced lyrics for this track.",
    "neteaseLyricsLoaded": "Lyrics loaded: {songName}",
    "lyricsCopied": "Lyrics copied to clipboard",
    "lyricsCopyFailed": "Failed to copy lyrics to clipboard",
    "invalidClipboardUrl": "Clipboard does not contain a valid YouTube link/ID",
    "failedReadClipboard": "Failed to read clipboard. Please paste manually.",
    "videoSetSaved": "Video set: {videoId} (saved)",
    "translationFailedWithReason": "{mode} failed: {reason}",
    "languageOverrideReset": "Language Override reset to 'Off' for AI mode",
    "stillConverting": "Still converting...",
    "pinyinLibraryUnavailable": "Pinyin library unavailable. Showing original. Allow jsDelivr or unpkg.",
    "conversionSkippedAlreadySimplified": "Conversion skipped: Already in Simplified Chinese",
    "conversionFailed": "Conversion failed: {error}",
    "fileTooLarge": "File too large: Maximum size is 1MB",
    "noLyricsInFile": "No valid lyrics found in file",
    "loadedLyricsFromFile": "Loaded {types} lyrics from file",
    "failedLoadLyricsInvalidFormat": "Failed to load lyrics: Invalid file format",
    "failedReadFileCorrupted": "Failed to read file: File may be corrupted",
    "installCommandCopied": "Install command copied! Paste in PowerShell",
    "updateSkipped": "Update skipped",
    "updateAvailable": "Lyrics Plus v{version} available! Click to update",
    "upToDate": "You are already using the latest version (v{version})!"
  },
  "contextMenu": {
    "provider": "Translation Provider",
    "display": "Translation Display",
    "targetLanguage": "Target Language",
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
      "vi": "Vietnamese (AI)",
      "furigana": "Furigana (AI)"
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
    "searchYoutube": "Search on YouTube",
    "searchNetease": "Search on NetEase",
    "manualSearch": "Manual Lyrics Search",
    "viewReasoning": "View AI reasoning"
  },
  "videoModal": {
    "title": "Video Background",
    "topVideos": "Top Matching Videos",
    "searchQuery": "Search keyword:",
    "search": "Search",
    "inputId": "YouTube Video ID or URL:",
    "placeholder": "e.g., dQw4w9WgXcQ or https://youtube.com/watch?v=...",
    "totalOffset": "Total Offset:",
    "apply": "Apply",
    "reset": "Reset/Reload",
    "manualVideo": "Manual Video",
    "score": "Score",
    "detectedId": "Detected ID",
    "currentVideo": "Current video",
    "pasteCopied": "Paste copied link:",
    "paste": "Paste from clipboard",
    "noResults": "No matching videos found.",
    "change": "Change",
    "remove": "Remove",
    "enterManual": "Enter ID/URL manually",
    "save": "Save",
    "searchYoutubeLink": "← Search on YouTube",
    "active": "Active",
    "done": "Done",
    "backToSync": "← Back to Sync",
    "unsynced": "unsynced",
    "syncHint": "Drag slider to sync: negative values play video earlier, positive values play it later.",
    "searchPlaceholder": "Search video title...",
    "aiSuggestions": "CJK Phonetic Suggestions:"
  },
  "modal": {
    "title": "Lyrics Plus Settings"
  },
  "neteaseModal": {
    "title": "Search NetEase",
    "placeholder": "Search by original name (kanji, hangul, romaji...)",
    "search": "Search",
    "failed": "Search failed",
    "noResults": "No results found. Try searching by original name or romaji."
  },
  "manualSearchModal": {
    "title": "Manual Lyrics Search",
    "placeholder": "Search by song title, artist, or romaji...",
    "search": "Search",
    "all": "All",
    "searching": "Searching across providers…",
    "failed": "Search failed",
    "noResults": "No lyrics found across any provider. Try searching by original name or romaji.",
    "cjkSuggestions": "CJK Phonetic Suggestions:",
    "lyricsLoaded": "Lyrics loaded from {provider}: {songName}"
  },
  "updateModal": {
    "title": "Lyrics Plus Update Available",
    "currentVersion": "Current version: v{version}",
    "quickUpdate": "Quick Update (Recommended)",
    "quickUpdateDesc": "Run the following command in PowerShell to update:",
    "copyCommand": "Copy Install Command",
    "changelog": "View Changelog",
    "skipVersion": "Skip This Version",
    "later": "Later"
  }
};
