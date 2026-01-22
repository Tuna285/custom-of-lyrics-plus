
const UpdateService = {
    REPO_URL: "https://github.com/Tuna285/custom-of-lyrics-plus",
    VERSION_URL: "https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/version.json",
    RAW_BASE_URL: "https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main",
    INSTALL_COMMAND: "iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex",
    CURRENT_VERSION: "1.3.0",
    CHECK_INTERVAL: 0,

    UPDATE_FILES: [
        "index.js", "style.css", "manifest.json", "version.json", "types.d.ts", "variables.css",
        "utils/Namespace.js", "utils/Utils.js", "utils/Config.js", "utils/Cache.js", "utils/Prompts.js", "utils/TranslationUtils.js",
        "i18n/I18n.js", "i18n/LangEN.js", "i18n/LangVI.js",
        "parsers/LRCParser.js",
        "services/AdBlocker.js", "services/IDBCache.js", "services/LyricsFetcher.js", "services/GeminiClient.js", "services/Translator.js", "services/UpdateService.js",
        "components/Components.js", "components/SyncedLyrics.js", "components/UnsyncedLyrics.js", "components/TabBar.js", "components/Settings.js", "components/OptionsMenu.js", "components/PlaybarButton.js", "components/VideoBackground.js", "components/VideoManager.js",
        "providers/ProviderLRCLIB.js", "providers/ProviderMusixmatch.js", "providers/Providers.js",
        "assets/preview.gif"
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
