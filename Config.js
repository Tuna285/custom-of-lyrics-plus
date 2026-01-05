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
    RAW_BASE_URL: "https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main",
    INSTALL_COMMAND: "iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex",
    CURRENT_VERSION: "1.2.5",
    CHECK_INTERVAL: 0,

    // List of files to download for update
    UPDATE_FILES: [
        "index.js", "style.css", "manifest.json", "Utils.js", "Config.js", "Cache.js",
        "Prompts.js", "GeminiClient.js", "Translator.js", "Components.js",
        "ProviderLRCLIB.js", "ProviderMusixmatch.js", "ProviderNetease.js",
        "ProviderGenius.js", "Providers.js", "SyncedLyrics.js", "UnsyncedLyrics.js",
        "TabBar.js", "Settings.js", "OptionsMenu.js", "PlaybarButton.js", "version.json"
    ],

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
                // Check if version is skipped (only for silent/auto checks)
                if (silent) {
                    const skippedVersions = JSON.parse(localStorage.getItem("lyrics-plus:skipped-versions") || "[]");
                    if (skippedVersions.includes(data.version)) {
                        console.log(`[Lyrics+] Skipping update notification for v${data.version} (user skipped)`);
                        return null;
                    }
                }

                console.log(`[Lyrics+] New version available: ${data.version} (current: ${this.CURRENT_VERSION})`);
                this.showUpdateNotification(data.version, data.changelog);
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

    // Copy install command to clipboard
    async copyInstallCommand() {
        try {
            await navigator.clipboard.writeText(this.INSTALL_COMMAND);
            Spicetify.showNotification("Install command copied! Paste in PowerShell", false, 3000);
            return true;
        } catch (e) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = this.INSTALL_COMMAND;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Spicetify.showNotification("Install command copied! Paste in PowerShell", false, 3000);
            return true;
        }
    },

    // Download all update files and store in localStorage for offline update
    async downloadUpdateFiles(progressCallback) {
        const downloadedFiles = {};
        const totalFiles = this.UPDATE_FILES.length;
        let downloaded = 0;
        let failed = [];

        for (const file of this.UPDATE_FILES) {
            try {
                const url = `${this.RAW_BASE_URL}/${file}?t=${Date.now()}`;
                const response = await fetch(url);

                if (!response.ok) {
                    failed.push(file);
                    continue;
                }

                const content = await response.text();
                downloadedFiles[file] = content;
                downloaded++;

                if (progressCallback) {
                    progressCallback({
                        current: downloaded,
                        total: totalFiles,
                        file: file,
                        percent: Math.round((downloaded / totalFiles) * 100)
                    });
                }
            } catch (e) {
                failed.push(file);
                console.warn(`[Update] Failed to download: ${file}`, e);
            }
        }

        // Store in localStorage for manual installation
        if (Object.keys(downloadedFiles).length > 0) {
            try {
                localStorage.setItem("lyrics-plus:pending-update", JSON.stringify({
                    files: downloadedFiles,
                    timestamp: Date.now(),
                    failed: failed
                }));
            } catch (e) {
                console.warn("[Update] Failed to store update files:", e);
            }
        }

        return { downloaded, failed, files: downloadedFiles };
    },

    showUpdateNotification(newVersion, changelog = null) {
        const React = Spicetify.React;

        // State management for the modal
        let isDownloading = false;
        let downloadProgress = 0;
        let downloadStatus = "";

        const renderModal = () => {
            Spicetify.PopupModal.display({
                title: "🎵 Lyrics Plus Update Available",
                content: React.createElement("div", { style: { padding: "15px", minWidth: "350px" } },
                    // Version info
                    React.createElement("div", {
                        style: {
                            background: "linear-gradient(135deg, var(--spice-button) 0%, var(--spice-button-active) 100%)",
                            padding: "15px",
                            borderRadius: "10px",
                            marginBottom: "15px",
                            color: "white",
                            textAlign: "center"
                        }
                    },
                        React.createElement("div", { style: { fontSize: "24px", fontWeight: "bold" } }, `v${newVersion}`),
                        React.createElement("div", { style: { fontSize: "12px", opacity: 0.8 } }, `Current: v${this.CURRENT_VERSION}`)
                    ),

                    // Quick update section
                    React.createElement("div", {
                        style: {
                            background: "var(--spice-card)",
                            padding: "15px",
                            borderRadius: "10px",
                            marginBottom: "15px"
                        }
                    },
                        React.createElement("div", {
                            style: { fontWeight: "bold", marginBottom: "10px", fontSize: "14px" }
                        }, "⚡ Quick Update (Recommended)"),
                        React.createElement("p", {
                            style: { fontSize: "12px", color: "var(--spice-subtext)", marginBottom: "10px" }
                        }, "Copy the command below and paste it in PowerShell:"),
                        React.createElement("div", {
                            style: {
                                background: "var(--spice-sidebar)",
                                padding: "10px",
                                borderRadius: "5px",
                                fontFamily: "monospace",
                                fontSize: "11px",
                                wordBreak: "break-all",
                                marginBottom: "10px"
                            }
                        }, this.INSTALL_COMMAND),
                        React.createElement("button", {
                            onClick: async () => {
                                await this.copyInstallCommand();
                            },
                            style: {
                                width: "100%",
                                padding: "12px",
                                background: "var(--spice-button)",
                                color: "var(--spice-text)",
                                border: "none",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px"
                            }
                        }, "📋 Copy Install Command")
                    ),

                    // Manual options
                    React.createElement("div", {
                        style: {
                            display: "flex",
                            gap: "10px",
                            marginTop: "10px"
                        }
                    },
                        React.createElement("button", {
                            onClick: () => {
                                window.open(this.REPO_URL + "/releases", "_blank");
                            },
                            style: {
                                flex: 1,
                                padding: "10px",
                                background: "transparent",
                                color: "var(--spice-subtext)",
                                border: "1px solid var(--spice-subtext)",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "12px"
                            }
                        }, "View Changelog"),
                        React.createElement("button", {
                            onClick: () => {
                                const skippedVersions = JSON.parse(localStorage.getItem("lyrics-plus:skipped-versions") || "[]");
                                if (!skippedVersions.includes(newVersion)) {
                                    skippedVersions.push(newVersion);
                                    localStorage.setItem("lyrics-plus:skipped-versions", JSON.stringify(skippedVersions));
                                }
                                Spicetify.PopupModal.hide();
                                Spicetify.showNotification("Update skipped", false, 1500);
                            },
                            style: {
                                flex: 1,
                                padding: "10px",
                                background: "transparent",
                                color: "var(--spice-subtext)",
                                border: "1px solid var(--spice-subtext)",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "12px"
                            }
                        }, "Skip This Version"),
                        React.createElement("button", {
                            onClick: () => Spicetify.PopupModal.hide(),
                            style: {
                                flex: 1,
                                padding: "10px",
                                background: "transparent",
                                color: "var(--spice-subtext)",
                                border: "1px solid var(--spice-subtext)",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "12px"
                            }
                        }, "Later")
                    ),

                    // Instructions
                    React.createElement("div", {
                        style: {
                            marginTop: "15px",
                            padding: "10px",
                            background: "rgba(var(--spice-rgb-button), 0.1)",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "var(--spice-subtext)"
                        }
                    },
                        React.createElement("div", { style: { fontWeight: "bold", marginBottom: "5px" } }, "📝 After running the command:"),
                        React.createElement("div", null, "1. Wait for download to complete"),
                        React.createElement("div", null, "2. Restart Spotify"),
                        React.createElement("div", null, "3. Enjoy the new features! 🎉")
                    )
                )
            });
        };

        // Show notification toast first
        try {
            Spicetify.showNotification(
                `Lyrics Plus v${newVersion} available! Click to update`,
                false,
                5000
            );
        } catch (e) { }

        // Then show modal
        renderModal();
    }
};

const KARAOKE = 0; // deprecated
const SYNCED = 1;
const UNSYNCED = 2;
const GENIUS = 3;

//Configuration & Settings
const CONFIG = {
    visual: {
        "debug-mode": ConfigUtils.getPersisted("lyrics-plus:visual:debug-mode") === "true",
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
