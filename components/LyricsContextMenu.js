// components/LyricsContextMenu.js
// Floating right-click context menu + inline quick-edit popover for lyric lines

const LyricsContextMenu = (() => {
    const react = Spicetify.React;
    const { useState, useEffect, useRef, useMemo } = react;

    const SVG_PENCIL = '<path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286z"/>';
    const SVG_COPY = '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25z"/>';
    const SVG_LRC = '<path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h6.793a1.5 1.5 0 0 1 1.06.44l2.207 2.206A1.5 1.5 0 0 1 14 4.707V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5zm1.5 0v11h9V5h-2.75A1.25 1.25 0 0 1 8.5 3.75V1.5zm1 4a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 4.5 6.5zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75z"/>';
    const SVG_STUDIO = '<path d="M1.75 2.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5zm0 4.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5zm0 4.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5zm10.22-3.22a.75.75 0 0 1 1.06 0l1.19 1.19a.75.75 0 0 1 0 1.06l-3.47 3.47H9v-1.75l2.97-2.97z"/>';

    const SvgIcon = ({ html, size = 14 }) =>
        react.createElement("svg", {
            width: size,
            height: size,
            viewBox: "0 0 16 16",
            fill: "currentColor",
            className: "lp-menu-icon",
            "aria-hidden": "true",
            dangerouslySetInnerHTML: { __html: html },
        });

    const MenuButton = ({ icon, label, onClick, className = "", disabled = false }) =>
        react.createElement(
            "button",
            {
                type: "button",
                disabled,
                className: `lp-line-menu-item ${className}`,
                onClick: (e) => {
                    e.stopPropagation();
                    if (!disabled) onClick();
                },
            },
            react.createElement(SvgIcon, { html: icon }),
            react.createElement("span", null, label)
        );

    function clampPosition(x, y, width, height) {
        const margin = 12;
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;
        return {
            left: Math.max(margin, Math.min(x, vw - width - margin)),
            top: Math.max(margin, Math.min(y, vh - height - margin)),
        };
    }

    const Popover = react.memo(
        function Popover({
            menuState,
            lyrics,
            trackUri,
            onClose,
            onOpenEditor,
        }) {
            const [isEditing, setIsEditing] = useState(false);
            const [copyScope, setCopyScope] = useState("line");
            const [origVal, setOrigVal] = useState("");
            const [mode1Val, setMode1Val] = useState("");
            const [mode2Val, setMode2Val] = useState("");
            const containerRef = useRef(null);
            const onCloseRef = useRef(onClose);
            onCloseRef.current = onClose;

        const controller = window.lyricContainer;
        const unified = window.LyricsPlus?.UnifiedDB || window.UnifiedDB;

        const modeContext = useMemo(() => {
            if (!menuState) return null;
            const resolvedModes = controller?._getActiveEditorModes?.(lyrics);
            const mode1 = resolvedModes?.mode1 || controller?.displayMode || "none";
            const mode2 = resolvedModes?.mode2 || controller?.displayMode2 || "none";
            const activeMode1 = mode1 && mode1 !== "none" ? mode1 : null;
            const activeMode2 = mode2 && mode2 !== "none" && mode2 !== mode1 ? mode2 : null;
            const targetLang = resolvedModes?.targetLang || CONFIG?.visual?.["translate:target-language"] || "vi";
            const friendlyLang = controller?.provideLanguageCode
                ? (() => {
                    const code = controller.provideLanguageCode(lyrics);
                    try {
                        return code ? new Intl.DisplayNames(["en"], { type: "language" }).of(code.split("-")[0])?.toLowerCase() : null;
                    } catch { return null; }
                })()
                : null;
            const labelFor = (m, resolvedLabel) => {
                if (!m) return "";
                if (resolvedLabel) return resolvedLabel;
                if (window.LyricsPlus?.getDisplayModeOptionLabel) {
                    return window.LyricsPlus.getDisplayModeOptionLabel(m, friendlyLang);
                }
                return m;
            };
            const dm = controller?._dmResults?.[trackUri] || {};
            const idx = menuState.rawIndex;
            const rawLine = lyrics?.[idx] || menuState.line || {};
            const origText = Utils.extractPlainText(
                rawLine.originalText !== undefined && rawLine.originalText !== null ? rawLine.originalText : rawLine.text
            );
            const rawMode1Text = activeMode1
                ? (dm[activeMode1]?.[idx]?.text ?? (rawLine.originalText !== undefined && rawLine.originalText !== rawLine.text ? rawLine.text : "") ?? "")
                : "";
            const rawMode2Text = activeMode2
                ? (dm[activeMode2]?.[idx]?.text ?? rawLine.text2 ?? (!activeMode1 ? (menuState.lineTransText || (rawLine.originalText !== undefined && rawLine.originalText !== rawLine.text ? rawLine.text : "")) : "") ?? "")
                : "";

            const cleanMode1Text = Utils.extractPlainText(
                rawMode1Text || (activeMode1 && !activeMode2 ? menuState.lineTransText : "")
            );
            const cleanMode2Text = Utils.extractPlainText(rawMode2Text);

            const isSynced = Array.isArray(lyrics) && lyrics.some((l) => l?.startTime !== undefined);

            const hasMode1Override = Boolean(activeMode1 && unified?.getModeOverrides?.(trackUri, activeMode1, targetLang)?.lines?.[String(idx)] !== undefined);
            const hasMode2Override = Boolean(activeMode2 && unified?.getModeOverrides?.(trackUri, activeMode2, targetLang)?.lines?.[String(idx)] !== undefined);
            const hasLineOverride = hasMode1Override || hasMode2Override;

            return {
                idx,
                rawLine,
                origText,
                activeMode1,
                activeMode2,
                mode1Label: labelFor(activeMode1, resolvedModes?.mode1Label),
                mode2Label: labelFor(activeMode2, resolvedModes?.mode2Label),
                rawMode1Text,
                rawMode2Text,
                cleanMode1Text,
                cleanMode2Text,
                mode1List: activeMode1 && Array.isArray(dm[activeMode1]) ? dm[activeMode1] : null,
                mode2List: activeMode2 && Array.isArray(dm[activeMode2]) ? dm[activeMode2] : null,
                targetLang,
                isSynced,
                hasLineOverride,
            };
        }, [menuState, lyrics, trackUri]);

        useEffect(() => {
            if (!menuState || !modeContext) return;
            setIsEditing(false);
            setCopyScope("line");
            setOrigVal(modeContext.origText || "");
            setMode1Val(modeContext.rawMode1Text || (modeContext.activeMode1 && !modeContext.activeMode2 ? modeContext.cleanMode1Text : "") || "");
            setMode2Val(modeContext.rawMode2Text || "");
        }, [menuState?.rawIndex, menuState?.x, menuState?.y, trackUri]);

        useEffect(() => {
            if (!menuState) return;
            const handleDown = (e) => {
                if (containerRef.current && !containerRef.current.contains(e.target)) {
                    onCloseRef.current?.();
                }
            };
            const handleKey = (e) => {
                if (e.key === "Escape") onCloseRef.current?.();
            };
            document.addEventListener("mousedown", handleDown);
            document.addEventListener("keydown", handleKey);
            return () => {
                document.removeEventListener("mousedown", handleDown);
                document.removeEventListener("keydown", handleKey);
            };
        }, [menuState]);

        const prevUriRef = useRef(trackUri);
        useEffect(() => {
            if (prevUriRef.current !== trackUri) {
                prevUriRef.current = trackUri;
                if (menuState) onCloseRef.current?.();
            }
        }, [trackUri, menuState]);

        if (!menuState || !modeContext) return null;

        const copyToClipboard = (text, messageKey, fallbackMsg) => {
            if (!text) return;
            const label = getText(messageKey, {}, fallbackMsg);
            Spicetify.Platform.ClipboardAPI.copy(text)
                .then(() => Spicetify.showNotification(`✓ ${label}`, false, 2000))
                .catch(() => Spicetify.showNotification(getText("notifications.lyricsCopyFailed", {}, "Copy failed"), true, 2000));
            onCloseRef.current?.();
        };

        const handleSaveInline = async () => {
            if (!controller?.handleInlineLineSave) {
                onCloseRef.current?.();
                return;
            }
            await controller.handleInlineLineSave({
                trackUri,
                rawIndex: modeContext.idx,
                origText: origVal,
                prevOrigText: modeContext.origText,
                mode1: modeContext.activeMode1,
                mode1Text: mode1Val,
                prevMode1Text: modeContext.rawMode1Text,
                mode2: modeContext.activeMode2,
                mode2Text: mode2Val,
                prevMode2Text: modeContext.rawMode2Text,
                targetLang: modeContext.targetLang,
            });
            onCloseRef.current?.();
        };

        const handleRevertInline = async () => {
            if (!controller?.handleRevertLineOverrides) {
                onCloseRef.current?.();
                return;
            }
            await controller.handleRevertLineOverrides({
                trackUri,
                rawIndex: modeContext.idx,
                mode1: modeContext.activeMode1,
                mode2: modeContext.activeMode2,
                targetLang: modeContext.targetLang,
            });
            onCloseRef.current?.();
        };

        const width = isEditing ? 360 : 288;
        const height = isEditing ? (modeContext.activeMode2 ? 380 : 320) : 290;
        const pos = clampPosition(menuState.x, menuState.y, width, height);

        const timeLabel = modeContext.rawLine?.startTime !== undefined
            ? `[${Utils.formatTime(Number(modeContext.rawLine.startTime) || 0)}]`
            : `#${modeContext.idx + 1}`;

        const copyModeLists = { mode1List: modeContext.mode1List, mode2List: modeContext.mode2List };
        const hasAnyMode = Boolean(modeContext.activeMode1 || modeContext.activeMode2);
        const lineAllText = (() => {
            const parts = [];
            for (const val of [modeContext.origText, modeContext.cleanMode1Text, modeContext.cleanMode2Text]) {
                if (val && !parts.includes(val)) parts.push(val);
            }
            return parts.join("\n");
        })();

        const content = isEditing
            ? react.createElement(
                "div",
                { className: "lp-inline-edit-body" },
                react.createElement(
                    "div",
                    { className: "lp-line-menu-header" },
                    react.createElement("span", { className: "lp-line-time-badge" }, timeLabel),
                    react.createElement(
                        "span",
                        { className: "lp-line-menu-title" },
                        getText("contextMenu.editLineTitle", {}, "Chỉnh sửa dòng")
                    )
                ),
                react.createElement(
                    "div",
                    { className: "lp-inline-field" },
                    react.createElement("label", null, getText("editorModal.originalColumn", {}, "Lời gốc")),
                    react.createElement("input", {
                        type: "text",
                        value: origVal,
                        onChange: (e) => setOrigVal(e.target.value),
                        onKeyDown: (e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !modeContext.activeMode1)) handleSaveInline();
                        },
                    })
                ),
                modeContext.activeMode1 &&
                    react.createElement(
                        "div",
                        { className: "lp-inline-field" },
                        react.createElement("label", null, modeContext.mode1Label),
                        react.createElement("textarea", {
                            rows: 2,
                            autoFocus: true,
                            value: mode1Val,
                            onChange: (e) => setMode1Val(e.target.value),
                            onKeyDown: (e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveInline();
                                }
                            },
                        })
                    ),
                modeContext.activeMode2 &&
                    react.createElement(
                        "div",
                        { className: "lp-inline-field" },
                        react.createElement("label", null, modeContext.mode2Label),
                        react.createElement("input", {
                            type: "text",
                            autoFocus: !modeContext.activeMode1,
                            value: mode2Val,
                            onChange: (e) => setMode2Val(e.target.value),
                            onKeyDown: (e) => {
                                if (e.key === "Enter") handleSaveInline();
                            },
                        })
                    ),
                react.createElement(
                    "div",
                    { className: "lp-inline-actions" },
                    modeContext.hasLineOverride &&
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: "lp-btn lp-btn-ghost lp-btn-sm",
                                onClick: handleRevertInline,
                            },
                            getText("contextMenu.revertLine", {}, "Khôi phục")
                        ),
                    react.createElement("div", { style: { flex: 1 } }),
                    react.createElement(
                        "button",
                        {
                            type: "button",
                            className: "lp-btn lp-btn-ghost lp-btn-sm",
                            onClick: () => setIsEditing(false),
                        },
                        getText("contextMenu.cancel", {}, "Hủy")
                    ),
                    react.createElement(
                        "button",
                        {
                            type: "button",
                            className: "lp-btn lp-btn-primary lp-btn-sm",
                            onClick: handleSaveInline,
                        },
                        getText("contextMenu.save", {}, "Lưu")
                    )
                )
            )
            : react.createElement(
                "div",
                { className: "lp-line-menu-list" },
                react.createElement(
                    "div",
                    { className: "lp-line-menu-preview" },
                    react.createElement("span", { className: "lp-line-time-badge" }, timeLabel),
                    react.createElement("span", { className: "lp-line-preview-text" }, modeContext.origText || "...")
                ),
                react.createElement(MenuButton, {
                    icon: SVG_PENCIL,
                    label: getText("contextMenu.editThisLine", {}, "Chỉnh sửa dòng này"),
                    className: "is-highlight",
                    onClick: () => setIsEditing(true),
                }),
                react.createElement("div", { className: "lp-line-menu-divider" }),
                react.createElement(
                    "div",
                    { className: "lp-copy-bar" },
                    react.createElement(
                        "span",
                        { className: "lp-copy-bar-label" },
                        getText("contextMenu.copyHeader", {}, "Sao chép")
                    ),
                    react.createElement(
                        "div",
                        { className: "lp-copy-scope-tabs" },
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: `lp-copy-scope-btn ${copyScope === "line" ? "is-active" : ""}`,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    setCopyScope("line");
                                },
                            },
                            getText("contextMenu.scopeLine", {}, "Dòng này")
                        ),
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: `lp-copy-scope-btn ${copyScope === "all" ? "is-active" : ""}`,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    setCopyScope("all");
                                },
                            },
                            getText("contextMenu.scopeAll", {}, "Toàn bài")
                        )
                    )
                ),
                react.createElement(MenuButton, {
                    icon: SVG_COPY,
                    label: getText("contextMenu.copyOriginal", {}, "Lời gốc"),
                    onClick: () =>
                        copyScope === "line"
                            ? copyToClipboard(modeContext.origText, "notifications.lineCopied", "Đã chép dòng lời")
                            : copyToClipboard(
                                Utils.formatLyricsForCopy(lyrics, "original-plain"),
                                "notifications.lyricsCopied",
                                "Lyrics copied to clipboard"
                            ),
                }),
                modeContext.activeMode1 &&
                    react.createElement(MenuButton, {
                        icon: SVG_COPY,
                        label: modeContext.mode1Label,
                        disabled: copyScope === "line" && !modeContext.cleanMode1Text,
                        onClick: () =>
                            copyScope === "line"
                                ? copyToClipboard(modeContext.cleanMode1Text, "notifications.translationLineCopied", "Đã chép dòng")
                                : copyToClipboard(
                                    Utils.formatLyricsForCopy(lyrics, "mode1-plain", copyModeLists),
                                    "notifications.lyricsCopied",
                                    "Lyrics copied to clipboard"
                                ),
                    }),
                modeContext.activeMode2 &&
                    react.createElement(MenuButton, {
                        icon: SVG_COPY,
                        label: modeContext.mode2Label,
                        disabled: copyScope === "line" && !modeContext.cleanMode2Text,
                        onClick: () =>
                            copyScope === "line"
                                ? copyToClipboard(modeContext.cleanMode2Text, "notifications.translationLineCopied", "Đã chép dòng")
                                : copyToClipboard(
                                    Utils.formatLyricsForCopy(lyrics, "mode2-plain", copyModeLists),
                                    "notifications.lyricsCopied",
                                    "Lyrics copied to clipboard"
                                ),
                    }),
                hasAnyMode &&
                    react.createElement(MenuButton, {
                        icon: SVG_COPY,
                        label: getText("contextMenu.copyAllDisplayed", {}, "Tất cả đang hiển thị"),
                        disabled: copyScope === "line" && !lineAllText,
                        onClick: () =>
                            copyScope === "line"
                                ? copyToClipboard(lineAllText, "notifications.bilingualLineCopied", "Đã chép dòng song ngữ")
                                : copyToClipboard(
                                    Utils.formatLyricsForCopy(lyrics, "all-plain", copyModeLists),
                                    "notifications.lyricsCopied",
                                    "Lyrics copied to clipboard"
                                ),
                    }),
                copyScope === "all" && modeContext.isSynced &&
                    react.createElement(MenuButton, {
                        icon: SVG_LRC,
                        label: getText("contextMenu.copyLrc", {}, "Định dạng .LRC"),
                        onClick: () =>
                            copyToClipboard(
                                Utils.formatLyricsForCopy(lyrics, "original-lrc"),
                                "notifications.lrcCopied",
                                "Đã chép định dạng LRC"
                            ),
                    }),
                react.createElement("div", { className: "lp-line-menu-divider" }),
                react.createElement(MenuButton, {
                    icon: SVG_STUDIO,
                    label: getText("contextMenu.openFullEditor", {}, "Chỉnh sửa toàn bộ lời & bản dịch"),
                    onClick: () => {
                        const idx = modeContext.idx;
                        onCloseRef.current?.();
                        onOpenEditor?.(idx);
                    },
                })
            );

        const el = react.createElement(
            "div",
            {
                ref: containerRef,
                className: `lp-line-popover ${isEditing ? "is-editing" : ""}`,
                style: {
                    left: `${pos.left}px`,
                    top: `${pos.top}px`,
                    width: `${width}px`,
                },
                onClick: (e) => e.stopPropagation(),
                onContextMenu: (e) => e.preventDefault(),
            },
            content
        );

        return Spicetify.ReactDOM?.createPortal ? Spicetify.ReactDOM.createPortal(el, document.body) : el;
    },
    (prev, next) =>
        prev.menuState === next.menuState &&
        prev.lyrics === next.lyrics &&
        prev.trackUri === next.trackUri &&
        prev.onOpenEditor === next.onOpenEditor
    );

    return { Popover };
})();

window.LyricsContextMenu = LyricsContextMenu;
if (window.LyricsPlus) {
    window.LyricsPlus.LyricsContextMenu = LyricsContextMenu;
}
