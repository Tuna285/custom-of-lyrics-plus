// Config.js - Configuration and Settings

const APP_NAME = "lyrics-plus";

const ConfigUtils = {
    get(name, defaultVal = true) {
        try {
            const value = localStorage.getItem(name);
            return value !== null ? value === "true" : defaultVal;
        } catch (error) {
            console.warn(`Failed to read config '${name}':`, error);
            return defaultVal;
        }
    },

    getPersisted(key) {
        try {
            const value = Spicetify?.LocalStorage?.get(key);
            if (typeof value === "string") return value;
        } catch (error) {
            console.warn(`Failed to read from Spicetify LocalStorage '${key}':`, error);
        }

        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`Failed to read from localStorage '${key}':`, error);
        }

        return null;
    },

    setPersisted(key, value) {
        const stringValue = String(value);
        let success = false;

        // Try Spicetify LocalStorage first
        try {
            Spicetify?.LocalStorage?.set(key, stringValue);
            success = true;
        } catch (error) {
            console.warn(`Failed to write to Spicetify LocalStorage '${key}':`, error);
        }

        // Fallback to regular localStorage
        try {
            localStorage.setItem(key, stringValue);
            success = true;
        } catch (error) {
            console.warn(`Failed to write to localStorage '${key}':`, error);
        }

        if (!success) {
            console.error(`Failed to persist data for key '${key}'`);
        }
    }
};

// Debug Logger - only logs when debug-mode is enabled
const DebugLogger = {
    log(...args) {
        if (CONFIG?.visual?.["debug-mode"]) {
            console.log("[Lyrics+:DEBUG]", ...args);
        }
    },
    warn(...args) {
        if (CONFIG?.visual?.["debug-mode"]) {
            console.warn("[Lyrics+:DEBUG]", ...args);
        }
    },
    group(label) {
        if (CONFIG?.visual?.["debug-mode"]) {
            console.group(`[Lyrics+:DEBUG] ${label}`);
        }
    },
    groupEnd() {
        if (CONFIG?.visual?.["debug-mode"]) {
            console.groupEnd();
        }
    },
    table(data) {
        if (CONFIG?.visual?.["debug-mode"]) {
            console.table(data);
        }
    }
};

// UpdateChecker has been moved to services/UpdateService.js

const KARAOKE = 0; // deprecated
const SYNCED = 1;
const UNSYNCED = 2;
const GENIUS = 3;

//Configuration & Settings
const CONFIG = {
    visual: {
        "debug-mode": ConfigUtils.getPersisted("lyrics-plus:visual:debug-mode") === "true",
        "ui-language": ConfigUtils.getPersisted("lyrics-plus:visual:ui-language") || "en",
        "playbar-button": ConfigUtils.getPersisted("lyrics-plus:visual:playbar-button") === "true",
        colorful: ConfigUtils.getPersisted("lyrics-plus:visual:colorful") === "true",
        "gradient-background": ConfigUtils.getPersisted("lyrics-plus:visual:gradient-background") === "true",
        "transparent-background": ConfigUtils.getPersisted("lyrics-plus:visual:transparent-background") !== "false",
        "background-brightness": ConfigUtils.getPersisted("lyrics-plus:visual:background-brightness") || "80",
        noise: ConfigUtils.getPersisted("lyrics-plus:visual:noise") === "true",
        "background-color": ConfigUtils.getPersisted("lyrics-plus:visual:background-color") || "#000000",
        "active-color": ConfigUtils.getPersisted("lyrics-plus:visual:active-color") || "var(--spice-text)",
        "inactive-color": ConfigUtils.getPersisted("lyrics-plus:visual:inactive-color") || "rgba(var(--spice-rgb-subtext),0.5)",
        "highlight-color": ConfigUtils.getPersisted("lyrics-plus:visual:highlight-color") || "var(--spice-button)",
        alignment: ConfigUtils.getPersisted("lyrics-plus:visual:alignment") || "center",
        "lines-before": ConfigUtils.getPersisted("lyrics-plus:visual:lines-before") || "0",
        "lines-after": ConfigUtils.getPersisted("lyrics-plus:visual:lines-after") || "2",
        "font-size": ConfigUtils.getPersisted("lyrics-plus:visual:font-size") || "32",
        "lyric-position": Number(ConfigUtils.getPersisted("lyrics-plus:visual:lyric-position")) || 50,
        "translate:translated-lyrics-source": ConfigUtils.getPersisted("lyrics-plus:visual:translate:translated-lyrics-source") || "geminiVi",
        "translate:display-mode": ConfigUtils.getPersisted("lyrics-plus:visual:translate:display-mode") || "replace",
        "translate:detect-language-override": ConfigUtils.getPersisted("lyrics-plus:visual:translate:detect-language-override") || "off",
        "translate:translation-style": ConfigUtils.getPersisted("lyrics-plus:visual:translate:translation-style") || "smart_adaptive",
        "translate:pronoun-mode": ConfigUtils.getPersisted("lyrics-plus:visual:translate:pronoun-mode") || "default",
        "translation-mode:japanese": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode:japanese") || "none",
        "translation-mode:korean": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode:korean") || "none",
        "translation-mode:chinese": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode:chinese") || "none",
        "translation-mode:gemini": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode:gemini") || "none",
        "translation-mode-2:japanese": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode-2:japanese") || "none",
        "translation-mode-2:korean": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode-2:korean") || "none",
        "translation-mode-2:chinese": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode-2:chinese") || "none",
        "translation-mode-2:gemini": ConfigUtils.getPersisted("lyrics-plus:visual:translation-mode-2:gemini") || "none",
        "gemini-api-key": ConfigUtils.getPersisted("lyrics-plus:visual:gemini-api-key") || "",
        "gemini-api-key-romaji": ConfigUtils.getPersisted("lyrics-plus:visual:gemini-api-key-romaji") || "",
        "gemini:api-mode": ConfigUtils.getPersisted("lyrics-plus:visual:gemini:api-mode") || "official",
        "gemini:proxy-model": ConfigUtils.getPersisted("lyrics-plus:visual:gemini:proxy-model") || "gemini-2.5-flash",
        "gemini:proxy-api-key": ConfigUtils.getPersisted("lyrics-plus:visual:gemini:proxy-api-key") || "",
        "gemini:proxy-endpoint": ConfigUtils.getPersisted("lyrics-plus:visual:gemini:proxy-endpoint") || "http://localhost:8317/v1/chat/completions",
        translate: ConfigUtils.getPersisted("lyrics-plus:visual:translate") === "true",
        "ja-detect-threshold": ConfigUtils.getPersisted("lyrics-plus:visual:ja-detect-threshold") || "40",
        "hans-detect-threshold": ConfigUtils.getPersisted("lyrics-plus:visual:hans-detect-threshold") || "40",
        "musixmatch-translation-language": ConfigUtils.getPersisted("lyrics-plus:visual:musixmatch-translation-language") || "none",
        "fade-blur": ConfigUtils.getPersisted("lyrics-plus:visual:fade-blur") === "true",
        "unsynced-auto-scroll": ConfigUtils.getPersisted("lyrics-plus:visual:unsynced-auto-scroll") !== "false",
        "fullscreen-key": ConfigUtils.getPersisted("lyrics-plus:visual:fullscreen-key") || "f12",
        "synced-compact": ConfigUtils.getPersisted("lyrics-plus:visual:synced-compact") !== "false",
        "dual-genius": ConfigUtils.getPersisted("lyrics-plus:visual:dual-genius") === "true",
        "pre-translation": ConfigUtils.getPersisted("lyrics-plus:visual:pre-translation") !== "false",
        "global-delay": Number(ConfigUtils.getPersisted("lyrics-plus:visual:global-delay")) || 0,
        delay: 0,
        // TODO: Video Background feature is WIP - change to ConfigUtils.get(...) when ready
        "video-background": false, // DISABLED - Feature not ready for release
        "video-background-server": localStorage.getItem("lyrics-plus:visual:video-background-server") || "http://localhost:8000",
        "video-background-blur": Number(localStorage.getItem("lyrics-plus:visual:video-background-blur")) || 0,
        "video-background-dim": Number(localStorage.getItem("lyrics-plus:visual:video-background-dim")) || 50,
        "video-host": localStorage.getItem("lyrics-plus:visual:video-host") || "www.youtube.com",
        "video-background-scale": Number(localStorage.getItem("lyrics-plus:visual:video-background-scale")) || 1.0,
    },
    providers: {
        lrclib: {
            on: ConfigUtils.get("lyrics-plus:provider:lrclib:on"),
            desc: "Lyrics sourced from lrclib.net. Supports both synced and unsynced lyrics. LRCLIB is a free and open-source lyrics provider.",
            modes: [SYNCED, UNSYNCED],
        },
        musixmatch: {
            on: ConfigUtils.get("lyrics-plus:provider:musixmatch:on"),
            desc: "Fully compatible with Spotify. Requires a token that can be retrieved from the official Musixmatch app. If you have problems with retrieving lyrics, try refreshing the token by clicking <code>Refresh Token</code> button. You may need to be forced to use your own CORS Proxy to use this provider.",
            token: localStorage.getItem("lyrics-plus:provider:musixmatch:token") || "21051986b9886beabe1ce01c3ce94c96319411f8f2c122676365e3",
            modes: [SYNCED, UNSYNCED],
        },
        spotify: {
            on: ConfigUtils.get("lyrics-plus:provider:spotify:on"),
            desc: "Lyrics sourced from official Spotify API.",
            modes: [SYNCED, UNSYNCED],
        },
        netease: {
            on: ConfigUtils.get("lyrics-plus:provider:netease:on", false),
            desc: "Crowdsourced lyrics provider ran by Chinese developers and users.",
            modes: [SYNCED, UNSYNCED],
        },
        genius: {
            on: Spicetify.Platform.version >= "1.2.31" ? false : ConfigUtils.get("lyrics-plus:provider:genius:on"),
            desc: "Provide unsynced lyrics with insights from artists themselves. Genius is disabled and cannot be used as a provider on <code>1.2.31</code> and higher.",
            modes: [GENIUS],
        },
        local: {
            on: ConfigUtils.get("lyrics-plus:provider:local:on"),
            desc: "Provide lyrics from cache/local files loaded from previous Spotify sessions.",
            modes: [SYNCED, UNSYNCED],
        },
    },
    providersOrder: localStorage.getItem("lyrics-plus:services-order"),
    modes: ["synced", "unsynced", "genius"],
    locked: localStorage.getItem("lyrics-plus:lock-mode") || "-1",
};

CONFIG.visual["video-background-blur"] = Number.parseInt(CONFIG.visual["video-background-blur"]);
CONFIG.visual["video-background-dim"] = Number.parseInt(CONFIG.visual["video-background-dim"]);


try {
    CONFIG.providersOrder = JSON.parse(CONFIG.providersOrder);
    if (!Array.isArray(CONFIG.providersOrder) || Object.keys(CONFIG.providers).length !== CONFIG.providersOrder.length) {
        throw "";
    }
} catch {
    CONFIG.providersOrder = Object.keys(CONFIG.providers);
    localStorage.setItem("lyrics-plus:services-order", JSON.stringify(CONFIG.providersOrder));
}

CONFIG.locked = Number.parseInt(CONFIG.locked);
CONFIG.visual["lines-before"] = Number.parseInt(CONFIG.visual["lines-before"]);
CONFIG.visual["lines-after"] = Number.parseInt(CONFIG.visual["lines-after"]);
CONFIG.visual["font-size"] = Number.parseInt(CONFIG.visual["font-size"]);
CONFIG.visual["background-brightness"] = Number.parseInt(CONFIG.visual["background-brightness"]);
CONFIG.visual["ja-detect-threshold"] = Number.parseInt(CONFIG.visual["ja-detect-threshold"]);
CONFIG.visual["hans-detect-threshold"] = Number.parseInt(CONFIG.visual["hans-detect-threshold"]);

let CACHE = {};

const emptyState = {
    karaoke: null,
    synced: null,
    unsynced: null,
    genius: null,
    genius2: null,
    currentLyrics: null,
    preTranslated: false,
};

// Expose to global scope for other modules
window.CONFIG = CONFIG;
window.CACHE = CACHE;
window.emptyState = emptyState;
