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

const UpdateChecker = {
    REPO_URL: "https://github.com/Tuna285/custom-of-lyrics-plus",
    VERSION_URL: "https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/version.json",
    CURRENT_VERSION: "1.2.2",
    CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours

    async checkForUpdates(silent = false) {
        try {
            const lastCheck = localStorage.getItem("lyrics-plus:last-update-check");
            const now = Date.now();

            if (lastCheck && (now - parseInt(lastCheck)) < this.CHECK_INTERVAL && silent) {
                return null;
            }

            const response = await fetch(this.VERSION_URL + "?t=" + now, {
                cache: "no-cache"
            });

            if (!response.ok) return null;

            const data = await response.json();
            localStorage.setItem("lyrics-plus:last-update-check", String(now));

            if (this.compareVersions(data.version, this.CURRENT_VERSION) > 0) {
                console.log(`[Lyrics+] New version available: ${data.version} (current: ${this.CURRENT_VERSION})`);
                this.showUpdateNotification(data.version);
                return data;
            }

            return null;
        } catch (error) {
            console.warn("[Lyrics+] Update check failed:", error.message);
            return null;
        }
    },

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    },

    showUpdateNotification(newVersion) {
        try {
            Spicetify.showNotification(
                `Lyrics Plus v${newVersion} available!`,
                false,
                5000
            );

            Spicetify.PopupModal.display({
                title: "Lyrics Plus Update Available",
                content: Spicetify.React.createElement("div", { style: { padding: "10px" } },
                    Spicetify.React.createElement("p", null, `A new version (v${newVersion}) is available!`),
                    Spicetify.React.createElement("p", null, `Current version: v${this.CURRENT_VERSION}`),
                    Spicetify.React.createElement("div", { style: { marginTop: "15px", display: "flex", gap: "10px" } },
                        Spicetify.React.createElement("button", {
                            onClick: () => {
                                window.open(this.REPO_URL, "_blank");
                                Spicetify.PopupModal.hide();
                            },
                            style: {
                                padding: "10px 20px",
                                background: "var(--spice-button)",
                                color: "var(--spice-text)",
                                border: "none",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }
                        }, "Download Update"),
                        Spicetify.React.createElement("button", {
                            onClick: () => Spicetify.PopupModal.hide(),
                            style: {
                                padding: "10px 20px",
                                background: "transparent",
                                color: "var(--spice-subtext)",
                                border: "1px solid var(--spice-subtext)",
                                borderRadius: "20px",
                                cursor: "pointer"
                            }
                        }, "Later")
                    )
                )
            });
        } catch (e) {
            console.warn("[Lyrics+] Could not show update notification:", e);
        }
    }
};

const KARAOKE = 0; // deprecated
const SYNCED = 1;
const UNSYNCED = 2;
const GENIUS = 3;

//Configuration & Settings
const CONFIG = {
    visual: {
        "debug-mode": ConfigUtils.get("lyrics-plus:visual:debug-mode", false),
        "playbar-button": ConfigUtils.get("lyrics-plus:visual:playbar-button", false),
        colorful: ConfigUtils.get("lyrics-plus:visual:colorful"),
        "gradient-background": ConfigUtils.get("lyrics-plus:visual:gradient-background"),
        "transparent-background": ConfigUtils.get("lyrics-plus:visual:transparent-background", true),
        "background-brightness": localStorage.getItem("lyrics-plus:visual:background-brightness") || "80",
        noise: ConfigUtils.get("lyrics-plus:visual:noise"),
        "background-color": localStorage.getItem("lyrics-plus:visual:background-color") || "#000000",
        "active-color": localStorage.getItem("lyrics-plus:visual:active-color") || "var(--spice-text)",
        "inactive-color": localStorage.getItem("lyrics-plus:visual:inactive-color") || "rgba(var(--spice-rgb-subtext),0.5)",
        "highlight-color": localStorage.getItem("lyrics-plus:visual:highlight-color") || "var(--spice-button)",
        alignment: localStorage.getItem("lyrics-plus:visual:alignment") || "center",
        "lines-before": localStorage.getItem("lyrics-plus:visual:lines-before") || "0",
        "lines-after": localStorage.getItem("lyrics-plus:visual:lines-after") || "2",
        "font-size": localStorage.getItem("lyrics-plus:visual:font-size") || "32",
        "translate:translated-lyrics-source": localStorage.getItem("lyrics-plus:visual:translate:translated-lyrics-source") || "geminiVi",
        "translate:display-mode": localStorage.getItem("lyrics-plus:visual:translate:display-mode") || "replace",
        "translate:detect-language-override": localStorage.getItem("lyrics-plus:visual:translate:detect-language-override") || "off",
        "translate:translation-style": localStorage.getItem("lyrics-plus:visual:translate:translation-style") || "smart_adaptive",
        "translate:pronoun-mode": localStorage.getItem("lyrics-plus:visual:translate:pronoun-mode") || "default",
        "translation-mode:japanese": localStorage.getItem("lyrics-plus:visual:translation-mode:japanese") || "none",
        "translation-mode:korean": localStorage.getItem("lyrics-plus:visual:translation-mode:korean") || "none",
        "translation-mode:chinese": localStorage.getItem("lyrics-plus:visual:translation-mode:chinese") || "none",
        "translation-mode:gemini": localStorage.getItem("lyrics-plus:visual:translation-mode:gemini") || "none",
        "translation-mode-2:japanese": localStorage.getItem("lyrics-plus:visual:translation-mode-2:japanese") || "none",
        "translation-mode-2:korean": localStorage.getItem("lyrics-plus:visual:translation-mode-2:korean") || "none",
        "translation-mode-2:chinese": localStorage.getItem("lyrics-plus:visual:translation-mode-2:chinese") || "none",
        "translation-mode-2:gemini": localStorage.getItem("lyrics-plus:visual:translation-mode-2:gemini") || "none",
        "gemini-api-key": ConfigUtils.getPersisted("lyrics-plus:visual:gemini-api-key") || "",
        "gemini-api-key-romaji": ConfigUtils.getPersisted("lyrics-plus:visual:gemini-api-key-romaji") || "",
        "gemini:api-mode": localStorage.getItem("lyrics-plus:visual:gemini:api-mode") || "official",
        "gemini:proxy-model": localStorage.getItem("lyrics-plus:visual:gemini:proxy-model") || "gemini-3-flash-preview",
        "gemini:proxy-api-key": ConfigUtils.getPersisted("lyrics-plus:visual:gemini:proxy-api-key") || "",
        "gemini:proxy-endpoint": localStorage.getItem("lyrics-plus:visual:gemini:proxy-endpoint") || "http://localhost:8317/v1/chat/completions",
        translate: ConfigUtils.get("lyrics-plus:visual:translate", false),
        "ja-detect-threshold": localStorage.getItem("lyrics-plus:visual:ja-detect-threshold") || "40",
        "hans-detect-threshold": localStorage.getItem("lyrics-plus:visual:hans-detect-threshold") || "40",
        "musixmatch-translation-language": localStorage.getItem("lyrics-plus:visual:musixmatch-translation-language") || "none",
        "fade-blur": ConfigUtils.get("lyrics-plus:visual:fade-blur"),
        "unsynced-auto-scroll": ConfigUtils.get("lyrics-plus:visual:unsynced-auto-scroll", true),
        "fullscreen-key": localStorage.getItem("lyrics-plus:visual:fullscreen-key") || "f12",
        "synced-compact": ConfigUtils.get("lyrics-plus:visual:synced-compact"),
        "dual-genius": ConfigUtils.get("lyrics-plus:visual:dual-genius"),
        "pre-translation": ConfigUtils.get("lyrics-plus:visual:pre-translation", true),
        "global-delay": Number(localStorage.getItem("lyrics-plus:visual:global-delay")) || 0,
        delay: 0,
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
