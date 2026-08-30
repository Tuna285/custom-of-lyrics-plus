
const UpdateService = {
    REPO_URL: "https://github.com/Tuna285/custom-of-lyrics-plus",
    VERSION_URL: "https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/version.json",
    RAW_BASE_URL: "https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main",
    INSTALL_COMMAND: "iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex",
    CURRENT_VERSION: "1.9.0",
    CHECK_INTERVAL: 1800000, // 30 minutes for silent auto-checks

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

            if (!response.ok) {
                if (!silent) {
                    Spicetify.showNotification("⚠️ Không thể kết nối tới máy chủ cập nhật.", true, 3000);
                }
                return null;
            }

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
                this.showUpdateNotification(data.version, data.changelog || data.description);
                return data;
            } else if (!silent) {
                const msg = typeof getText === "function" ? getText("notifications.upToDate", { version: this.CURRENT_VERSION }) : `🎉 Bạn đang sử dụng phiên bản mới nhất (v${this.CURRENT_VERSION})!`;
                Spicetify.showNotification(msg || `🎉 Bạn đang ở phiên bản mới nhất (v${this.CURRENT_VERSION})!`, false, 3000);
            }

            return null;
        } catch (error) {
            console.warn("[Lyrics+] Update check failed:", error.message);
            if (!silent) {
                Spicetify.showNotification("⚠️ Lỗi kiểm tra cập nhật: " + error.message, true, 3000);
            }
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
            Spicetify.showNotification(getText("notifications.installCommandCopied"), false, 3000);
            return true;
        } catch (e) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = this.INSTALL_COMMAND;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Spicetify.showNotification(getText("notifications.installCommandCopied"), false, 3000);
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
        const isVi = (CONFIG?.visual?.["ui-language"] || "vi") === "vi";

        const renderModal = () => {
            Spicetify.PopupModal.display({
                title: isVi ? "🚀 Cập Nhật Lyrics Plus Mới" : "🚀 Lyrics Plus Update Available",
                content: React.createElement("div", { style: { padding: "10px", minWidth: "340px", maxWidth: "480px" } },
                    // Version badge
                    React.createElement("div", {
                        style: {
                            background: "linear-gradient(135deg, var(--spice-button, #1db954) 0%, var(--spice-button-active, #1ed760) 100%)",
                            padding: "16px",
                            borderRadius: "12px",
                            marginBottom: "16px",
                            color: "var(--spice-text, #ffffff)",
                            textAlign: "center",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                        }
                    },
                        React.createElement("div", { style: { fontSize: "26px", fontWeight: "bold", letterSpacing: "0.5px" } }, `v${newVersion}`),
                        React.createElement("div", { style: { fontSize: "13px", opacity: 0.9, marginTop: "4px" } }, 
                            isVi ? `Phiên bản hiện tại: v${this.CURRENT_VERSION}` : `Current version: v${this.CURRENT_VERSION}`
                        )
                    ),

                    // Quick update section
                    React.createElement("div", {
                        style: {
                            background: "var(--spice-card, rgba(255,255,255,0.05))",
                            padding: "16px",
                            borderRadius: "12px",
                            marginBottom: "16px",
                            border: "1px solid rgba(255,255,255,0.08)"
                        }
                    },
                        React.createElement("div", {
                            style: { fontWeight: "bold", marginBottom: "8px", fontSize: "14px", color: "var(--spice-text)" }
                        }, isVi ? "⚡ Cập nhật nhanh (Khuyên dùng)" : "⚡ Quick Update (Recommended)"),
                        React.createElement("p", {
                            style: { fontSize: "12px", color: "var(--spice-subtext)", marginBottom: "10px", lineHeight: "1.4" }
                        }, isVi ? "Chạy lệnh sau trong PowerShell để cập nhật tự động:" : "Run the following command in PowerShell to update:"),
                        React.createElement("div", {
                            style: {
                                background: "var(--spice-sidebar, rgba(0,0,0,0.3))",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                fontFamily: "monospace",
                                fontSize: "11px",
                                wordBreak: "break-all",
                                marginBottom: "12px",
                                color: "var(--spice-subtext)",
                                border: "1px solid rgba(255,255,255,0.05)"
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
                                borderRadius: "24px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "13px"
                            }
                        }, isVi ? "📋 Sao chép lệnh cài đặt" : "📋 Copy Install Command")
                    ),

                    // Manual options
                    React.createElement("div", {
                        style: {
                            display: "flex",
                            gap: "8px",
                            marginTop: "8px"
                        }
                    },
                        React.createElement("button", {
                            onClick: () => {
                                window.open(this.REPO_URL + "/releases", "_blank");
                            },
                            style: {
                                flex: 1,
                                padding: "10px 8px",
                                background: "transparent",
                                color: "var(--spice-text)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 500
                            }
                        }, isVi ? "Xem Chi Tiết" : "Changelog"),
                        React.createElement("button", {
                            onClick: () => {
                                const skippedVersions = JSON.parse(localStorage.getItem("lyrics-plus:skipped-versions") || "[]");
                                if (!skippedVersions.includes(newVersion)) {
                                    skippedVersions.push(newVersion);
                                    localStorage.setItem("lyrics-plus:skipped-versions", JSON.stringify(skippedVersions));
                                }
                                Spicetify.PopupModal.hide();
                                Spicetify.showNotification(isVi ? "Đã bỏ qua thông báo bản này" : "Version skipped", false, 1500);
                            },
                            style: {
                                flex: 1,
                                padding: "10px 8px",
                                background: "transparent",
                                color: "var(--spice-subtext)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "12px"
                            }
                        }, isVi ? "Bỏ Qua Bản Này" : "Skip Version"),
                        React.createElement("button", {
                            onClick: () => Spicetify.PopupModal.hide(),
                            style: {
                                flex: 1,
                                padding: "10px 8px",
                                background: "transparent",
                                color: "var(--spice-subtext)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "20px",
                                cursor: "pointer",
                                fontSize: "12px"
                            }
                        }, isVi ? "Để Sau" : "Later")
                    )
                )
            });
        };

        // Show notification toast first
        try {
            const toastMsg = typeof getText === "function" ? getText("notifications.updateAvailable", { version: newVersion }) : `Lyrics Plus v${newVersion} đã có sẵn!`;
            Spicetify.showNotification(toastMsg || `Lyrics Plus v${newVersion} available!`, false, 5000);
        } catch (_) { }

        // Then display modal
        renderModal();
    }
};

window.UpdateService = UpdateService;
if (window.LyricsPlus) {
    window.LyricsPlus.UpdateService = UpdateService;
}
