// components/LyricsEditorModal.js
// Studio Modal for editing lyrics, timestamps [mm:ss.xx], translations & phonetics

const LyricsEditorModal = (() => {
    const react = Spicetify.React;
    const { useState, useEffect, useRef } = react;

    const SVG_CLOCK = '<path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>';
    const SVG_PLAY = '<path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>';
    const SVG_PLUS = '<path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/>';
    const SVG_TRASH = '<path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>';

    let rowSeq = 1;
    function nextRowId() {
        return `lp-row-${rowSeq++}`;
    }

    function parseTimestampMs(raw) {
        if (raw === null || raw === undefined) return null;
        const cleaned = String(raw).replace(/[\[\]\s]/g, "");
        if (!cleaned) return null;
        const match = cleaned.match(/^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/);
        if (!match) return null;
        const mins = Number(match[1]);
        const secs = Number(match[2]);
        const frac = match[3] ? Number(match[3].padEnd(3, "0").slice(0, 3)) : 0;
        if (!Number.isFinite(mins) || !Number.isFinite(secs) || !Number.isFinite(frac)) return null;
        return mins * 60000 + secs * 1000 + frac;
    }

    function formatTimestampStr(ms) {
        if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return "";
        return Utils.formatTime(Math.max(0, Number(ms)));
    }

    function buildRowsFromState({ baseLyrics, mode1List, mode2List }) {
        const list = Array.isArray(baseLyrics) ? baseLyrics : [];
        return list.map((line, i) => {
            const hasMs = line?.startTime !== undefined && line?.startTime !== null && Number.isFinite(Number(line.startTime));
            const startMs = hasMs ? Number(line.startTime) : null;
            const origText = Utils.extractPlainText(
                line?.originalText !== undefined && line?.originalText !== null ? line.originalText : line?.text
            );
            const m1 = mode1List?.[i]?.text ?? "";
            const m2 = mode2List?.[i]?.text ?? "";
            return {
                id: nextRowId(),
                timeStr: hasMs ? formatTimestampStr(startMs) : "",
                origText: origText || "",
                mode1Text: typeof m1 === "string" ? m1 : Utils.extractPlainText(m1),
                mode2Text: typeof m2 === "string" ? m2 : Utils.extractPlainText(m2),
            };
        });
    }

    function rowsToLrcText(rows) {
        return rows
            .map((r) => {
                const stamp = r.timeStr && parseTimestampMs(r.timeStr) !== null ? `[${r.timeStr.replace(/[\[\]]/g, "")}] ` : "";
                return `${stamp}${r.origText || ""}`.trimEnd();
            })
            .join("\n");
    }

    function lrcTextToRows(lrcText, prevRows = []) {
        const rawLines = String(lrcText || "").replace(/\r\n/g, "\n").split("\n");
        const parsed = [];
        for (const rawLine of rawLines) {
            const trimmed = rawLine.trim();
            if (!trimmed) continue;
            // Skip metadata headers like [ti:...], [ar:...]
            if (/^\[[a-zA-Z]+:.+\]$/.test(trimmed)) continue;
            const timeMatch = trimmed.match(/^\[(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)\]\s*(.*)$/);
            const idx = parsed.length;
            const prev = prevRows[idx];
            if (timeMatch) {
                parsed.push({
                    id: prev?.id || nextRowId(),
                    timeStr: timeMatch[1],
                    origText: timeMatch[2] || "",
                    mode1Text: prev?.mode1Text || "",
                    mode2Text: prev?.mode2Text || "",
                });
            } else {
                parsed.push({
                    id: prev?.id || nextRowId(),
                    timeStr: "",
                    origText: trimmed,
                    mode1Text: prev?.mode1Text || "",
                    mode2Text: prev?.mode2Text || "",
                });
            }
        }
        return parsed;
    }

    function rowsToLyricsPayload(rows, originalProvider) {
        const hasAnyTimestamp = rows.some((r) => parseTimestampMs(r.timeStr) !== null);
        const cleanRows = rows.filter((r) => r.origText.trim() !== "" || parseTimestampMs(r.timeStr) !== null);

        const unsynced = cleanRows.map((r) => ({
            text: r.origText || "♪",
            originalText: r.origText || "♪",
        }));

        let synced = null;
        if (hasAnyTimestamp) {
            synced = cleanRows
                .map((r, i) => {
                    const ms = parseTimestampMs(r.timeStr);
                    return {
                        text: r.origText || "♪",
                        originalText: r.origText || "♪",
                        startTime: ms !== null ? ms : i * 2000,
                    };
                })
                .sort((a, b) => a.startTime - b.startTime);
        }

        const mode1Lines = cleanRows.map((r) => r.mode1Text || "");
        const mode2Lines = cleanRows.map((r) => r.mode2Text || "");

        return {
            synced,
            unsynced,
            provider: originalProvider || "Custom",
            mode1Lines,
            mode2Lines,
        };
    }

    function EditorModalBody({
        trackUri,
        trackTitle,
        trackArtist,
        provider,
        baseLyrics,
        mode1,
        mode2,
        mode1Label,
        mode2Label,
        mode1List,
        mode2List,
        targetLang,
        hasUserEdits,
        focusIndex,
        onSave,
        onReset,
    }) {
        const initialRows = buildRowsFromState({ baseLyrics, mode1List, mode2List });
        const MAX_HISTORY = 60;
        const seedRows =
            initialRows.length > 0
                ? initialRows
                : [{ id: nextRowId(), timeStr: "00:00.00", origText: "", mode1Text: "", mode2Text: "" }];
        const [editorState, setEditorState] = useState(() => ({
            stack: [{ rows: seedRows, rawLrc: rowsToLrcText(seedRows), activeTab: "rows" }],
            index: 0,
        }));
        const currentDoc = editorState.stack[editorState.index];
        const { rows, rawLrc, activeTab } = currentDoc;
        const canUndo = editorState.index > 0;
        const canRedo = editorState.index < editorState.stack.length - 1;
        const [confirmReset, setConfirmReset] = useState(false);
        const [isSaving, setIsSaving] = useState(false);

        const showMode1 = Boolean(mode1 && mode1 !== "none");
        const showMode2 = Boolean(mode2 && mode2 !== "none" && mode2 !== mode1);
        const focusRef = useRef(null);
        const rootRef = useRef(null);
        const lastEditMetaRef = useRef({ key: null, ts: 0 });

        useEffect(() => {
            const saved = [];
            let cur = rootRef.current?.parentElement;
            for (let depth = 0; cur && cur !== document.body && depth < 8; depth += 1) {
                if (cur.classList?.contains("GenericModal__overlay")) break;
                const isShell =
                    cur.matches?.('.GenericModal, .main-trackCreditsModal-container, [role="dialog"], [aria-modal="true"]') ||
                    cur.parentElement?.classList?.contains("GenericModal__overlay");
                saved.push({
                    el: cur,
                    width: cur.style.getPropertyValue("width"),
                    widthPrio: cur.style.getPropertyPriority("width"),
                    maxWidth: cur.style.getPropertyValue("max-width"),
                    maxWidthPrio: cur.style.getPropertyPriority("max-width"),
                    minWidth: cur.style.getPropertyValue("min-width"),
                    minWidthPrio: cur.style.getPropertyPriority("min-width"),
                    overflowX: cur.style.getPropertyValue("overflow-x"),
                    overflowXPrio: cur.style.getPropertyPriority("overflow-x"),
                });
                if (isShell) {
                    cur.style.setProperty("width", "min(980px, 92vw)", "important");
                    cur.style.setProperty("max-width", "92vw", "important");
                    cur.style.setProperty("min-width", "0", "important");
                } else {
                    cur.style.setProperty("width", "100%", "important");
                    cur.style.setProperty("max-width", "100%", "important");
                    cur.style.setProperty("min-width", "0", "important");
                    cur.style.setProperty("overflow-x", "hidden", "important");
                }
                cur = cur.parentElement;
            }
            return () => {
                for (const item of saved) {
                    const restore = (prop, val, prio) => {
                        if (val) item.el.style.setProperty(prop, val, prio);
                        else item.el.style.removeProperty(prop);
                    };
                    restore("width", item.width, item.widthPrio);
                    restore("max-width", item.maxWidth, item.maxWidthPrio);
                    restore("min-width", item.minWidth, item.minWidthPrio);
                    restore("overflow-x", item.overflowX, item.overflowXPrio);
                }
            };
        }, []);

        useEffect(() => {
            if (focusRef.current) {
                setTimeout(() => {
                    focusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                }, 60);
            }
        }, []);

        useEffect(() => {
            if (!confirmReset) return;
            const timer = setTimeout(() => setConfirmReset(false), 3500);
            return () => clearTimeout(timer);
        }, [confirmReset]);

        const commitEdit = (computeNextDoc, coalesceKey = null) => {
            const now = Date.now();
            const shouldCoalesce = Boolean(
                coalesceKey &&
                lastEditMetaRef.current.key === coalesceKey &&
                now - lastEditMetaRef.current.ts < 800
            );
            lastEditMetaRef.current = coalesceKey ? { key: coalesceKey, ts: now } : { key: null, ts: 0 };

            setEditorState((prev) => {
                const cur = prev.stack[prev.index];
                const nextDoc = computeNextDoc(cur);
                if (!nextDoc) return prev;
                if (shouldCoalesce && prev.index > 0) {
                    const nextStack = prev.stack.slice(0, prev.index + 1);
                    nextStack[prev.index] = nextDoc;
                    return { stack: nextStack, index: prev.index };
                }
                const sliced = prev.stack.slice(0, prev.index + 1);
                const appended = [...sliced, nextDoc];
                const overflow = appended.length > MAX_HISTORY ? appended.length - MAX_HISTORY : 0;
                const trimmed = overflow > 0 ? appended.slice(overflow) : appended;
                return { stack: trimmed, index: trimmed.length - 1 };
            });
        };

        const handleUndo = () => {
            lastEditMetaRef.current = { key: null, ts: 0 };
            setEditorState((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
        };

        const handleRedo = () => {
            lastEditMetaRef.current = { key: null, ts: 0 };
            setEditorState((prev) => (prev.index < prev.stack.length - 1 ? { ...prev, index: prev.index + 1 } : prev));
        };

        const switchTab = (nextTab) => {
            lastEditMetaRef.current = { key: null, ts: 0 };
            setEditorState((prev) => {
                const cur = prev.stack[prev.index];
                if (nextTab === cur.activeTab) return prev;
                const nextStack = [...prev.stack];
                if (nextTab === "raw") {
                    nextStack[prev.index] = {
                        ...cur,
                        rawLrc: rowsToLrcText(cur.rows),
                        activeTab: "raw",
                    };
                } else {
                    const parsed = lrcTextToRows(cur.rawLrc, cur.rows);
                    nextStack[prev.index] = {
                        ...cur,
                        rows: parsed.length > 0 ? parsed : cur.rows,
                        activeTab: "rows",
                    };
                }
                return { stack: nextStack, index: prev.index };
            });
        };

        const updateRow = (index, field, value) => {
            commitEdit((cur) => {
                const copy = [...cur.rows];
                copy[index] = { ...copy[index], [field]: value };
                return { ...cur, rows: copy };
            }, `row:${index}:${field}`);
        };

        const updateRawLrc = (value) => {
            commitEdit((cur) => ({ ...cur, rawLrc: value }), "raw:text");
        };

        const insertRowAfter = (index) => {
            commitEdit((cur) => {
                const target = cur.rows[index];
                const prevMs = parseTimestampMs(target?.timeStr);
                const nextMs = prevMs !== null ? prevMs + 2000 : null;
                const copy = [...cur.rows];
                copy.splice(index + 1, 0, {
                    id: nextRowId(),
                    timeStr: nextMs !== null ? formatTimestampStr(nextMs) : "",
                    origText: "",
                    mode1Text: "",
                    mode2Text: "",
                });
                return { ...cur, rows: copy };
            });
        };

        const deleteRow = (index) => {
            commitEdit((cur) => {
                if (cur.rows.length <= 1) return null;
                return { ...cur, rows: cur.rows.filter((_, i) => i !== index) };
            });
        };

        const snapPlaybackTime = (index) => {
            const rawProgress = Spicetify.Player?.getProgress?.() || 0;
            const totalDelay = (CONFIG?.visual?.["global-delay"] || 0) + (CONFIG?.visual?.delay || 0);
            const adjustedMs = Math.max(0, rawProgress + totalDelay);
            commitEdit((cur) => {
                const copy = [...cur.rows];
                copy[index] = { ...copy[index], timeStr: formatTimestampStr(adjustedMs) };
                return { ...cur, rows: copy };
            });
        };

        const seekToRow = (index) => {
            const ms = parseTimestampMs(rows[index]?.timeStr);
            if (ms !== null && Spicetify.Player?.seek) {
                Spicetify.Player.seek(ms);
            }
        };

        const handleSaveClick = async () => {
            setIsSaving(true);
            try {
                const finalRows = activeTab === "raw" ? lrcTextToRows(rawLrc, rows) : rows;
                const payload = rowsToLyricsPayload(finalRows, provider);
                await onSave({
                    trackUri,
                    trackTitle,
                    trackArtist,
                    payload,
                    initialRows,
                    finalRows,
                    mode1,
                    mode2,
                    targetLang,
                });
                Spicetify.PopupModal.hide();
            } catch (e) {
                console.error("[LyricsEditorModal] Failed to save edits:", e);
                Spicetify.showNotification(getText("notifications.saveFailed", {}, "Lưu chỉnh sửa thất bại"), true, 3000);
            } finally {
                setIsSaving(false);
            }
        };

        const handleResetClick = async () => {
            if (!confirmReset) {
                setConfirmReset(true);
                return;
            }
            setConfirmReset(false);
            await onReset?.(trackUri);
            Spicetify.PopupModal.hide();
        };

        const activeCount = (activeTab === "raw" ? lrcTextToRows(rawLrc, rows) : rows).length;

        return react.createElement(
            "div",
            {
                id: "lyrics-plus-editor-modal",
                className: "lp-editor-root",
                ref: rootRef,
                // Prevent deleted row buttons from bubbling click to GenericModal outside-click handler
                onClick: (e) => e.stopPropagation(),
                onKeyDown: (e) => {
                    if (!(e.ctrlKey || e.metaKey)) return;
                    if (e.target?.matches?.("input, textarea")) return;
                    const k = e.key?.toLowerCase();
                    if (k === "z" && !e.shiftKey) {
                        e.preventDefault();
                        handleUndo();
                    } else if ((k === "z" && e.shiftKey) || k === "y") {
                        e.preventDefault();
                        handleRedo();
                    }
                },
            },
            // Header toolbar: Track meta + Undo/Redo + View switcher
            react.createElement(
                "div",
                { className: "lp-editor-topbar" },
                react.createElement(
                    "div",
                    { className: "lp-editor-trackmeta" },
                    react.createElement("span", { className: "lp-editor-trackname" }, trackTitle || getText("editorModal.untitled", {}, "Bài hát hiện tại")),
                    trackArtist && react.createElement("span", { className: "lp-editor-trackartist" }, ` • ${trackArtist}`),
                    provider && react.createElement("span", { className: "lp-editor-badge" }, provider)
                ),
                react.createElement(
                    "div",
                    { className: "lp-editor-topbar-actions" },
                    react.createElement(
                        "div",
                        { className: "lp-editor-history" },
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: "lp-editor-icon-btn",
                                title: `${getText("editorModal.undo", {}, "Hoàn tác")} (Ctrl+Z)`,
                                "aria-label": getText("editorModal.undo", {}, "Hoàn tác"),
                                disabled: !canUndo,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    handleUndo();
                                },
                            },
                            react.createElement("svg", {
                                width: 13,
                                height: 13,
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: 2.2,
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                "aria-hidden": "true",
                            },
                                react.createElement("path", { d: "M3 7v6h6" }),
                                react.createElement("path", { d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" })
                            )
                        ),
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: "lp-editor-icon-btn",
                                title: `${getText("editorModal.redo", {}, "Làm lại")} (Ctrl+Y)`,
                                "aria-label": getText("editorModal.redo", {}, "Làm lại"),
                                disabled: !canRedo,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    handleRedo();
                                },
                            },
                            react.createElement("svg", {
                                width: 13,
                                height: 13,
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: 2.2,
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                "aria-hidden": "true",
                            },
                                react.createElement("path", { d: "M21 7v6h-6" }),
                                react.createElement("path", { d: "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" })
                            )
                        )
                    ),
                    react.createElement(
                        "div",
                        { className: "lp-editor-tabs", role: "tablist" },
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                role: "tab",
                                "aria-selected": activeTab === "rows",
                                className: `lp-editor-tab ${activeTab === "rows" ? "is-active" : ""}`,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    switchTab("rows");
                                },
                            },
                            getText("editorModal.rowMode", {}, "Từng dòng")
                        ),
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                role: "tab",
                                "aria-selected": activeTab === "raw",
                                className: `lp-editor-tab ${activeTab === "raw" ? "is-active" : ""}`,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    switchTab("raw");
                                },
                            },
                            getText("editorModal.rawLrcMode", {}, "Raw LRC")
                        )
                    )
                )
            ),

            // Workspace
            activeTab === "rows"
                ? react.createElement(
                    "div",
                    { className: "lp-editor-table-wrap" },
                    react.createElement(
                        "div",
                        {
                            className: `lp-editor-columns-head ${showMode1 ? "has-m1" : ""} ${showMode2 ? "has-m2" : ""}`,
                        },
                        react.createElement("span", null, "#"),
                        react.createElement("span", null, getText("editorModal.timeColumn", {}, "Thời gian")),
                        react.createElement("span", null, getText("editorModal.originalColumn", {}, "Lời gốc")),
                        showMode1 && react.createElement("span", null, mode1Label || mode1),
                        showMode2 && react.createElement("span", null, mode2Label || mode2),
                        react.createElement("span", null, "")
                    ),
                    react.createElement(
                        "div",
                        { className: "lp-editor-rows" },
                        rows.map((row, idx) => {
                            const isFocused = typeof focusIndex === "number" && focusIndex === idx;
                            return react.createElement(
                                "div",
                                {
                                    key: row.id,
                                    ref: isFocused ? focusRef : null,
                                    className: `lp-editor-row ${showMode1 ? "has-m1" : ""} ${showMode2 ? "has-m2" : ""} ${isFocused ? "is-focused" : ""}`,
                                },
                                react.createElement("span", { className: "lp-editor-idx" }, idx + 1),
                                react.createElement(
                                    "div",
                                    { className: "lp-editor-time-cell" },
                                    react.createElement("input", {
                                        type: "text",
                                        className: "lp-editor-input lp-editor-time-input",
                                        placeholder: "mm:ss.xx",
                                        value: row.timeStr,
                                        onChange: (e) => updateRow(idx, "timeStr", e.target.value),
                                    }),
                                    react.createElement(
                                        "button",
                                        {
                                            type: "button",
                                            className: "lp-editor-icon-btn",
                                            title: getText("editorModal.snapTimeTooltip", {}, "Gán mốc thời gian đang phát"),
                                            "aria-label": "Snap playback timestamp",
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                snapPlaybackTime(idx);
                                            },
                                        },
                                        react.createElement("svg", {
                                            width: 13,
                                            height: 13,
                                            viewBox: "0 0 16 16",
                                            fill: "currentColor",
                                            dangerouslySetInnerHTML: { __html: SVG_CLOCK },
                                        })
                                    ),
                                    parseTimestampMs(row.timeStr) !== null &&
                                        react.createElement(
                                            "button",
                                            {
                                                type: "button",
                                                className: "lp-editor-icon-btn",
                                                title: getText("editorModal.seekToLine", {}, "Phát thử từ dòng này"),
                                                "aria-label": "Seek to timestamp",
                                                onClick: (e) => {
                                                    e.stopPropagation();
                                                    seekToRow(idx);
                                                },
                                            },
                                            react.createElement("svg", {
                                                width: 13,
                                                height: 13,
                                                viewBox: "0 0 16 16",
                                                fill: "currentColor",
                                                dangerouslySetInnerHTML: { __html: SVG_PLAY },
                                            })
                                        )
                                ),
                                react.createElement("input", {
                                    type: "text",
                                    className: "lp-editor-input",
                                    value: row.origText,
                                    placeholder: getText("editorModal.originalPlaceholder", {}, "Lời bài hát..."),
                                    onChange: (e) => updateRow(idx, "origText", e.target.value),
                                }),
                                showMode1 &&
                                    react.createElement("input", {
                                        type: "text",
                                        className: "lp-editor-input",
                                        value: row.mode1Text,
                                        placeholder: mode1Label || mode1,
                                        onChange: (e) => updateRow(idx, "mode1Text", e.target.value),
                                    }),
                                showMode2 &&
                                    react.createElement("input", {
                                        type: "text",
                                        className: "lp-editor-input",
                                        value: row.mode2Text,
                                        placeholder: mode2Label || mode2,
                                        onChange: (e) => updateRow(idx, "mode2Text", e.target.value),
                                    }),
                                react.createElement(
                                    "div",
                                    { className: "lp-editor-row-actions" },
                                    react.createElement(
                                        "button",
                                        {
                                            type: "button",
                                            className: "lp-editor-icon-btn",
                                            title: getText("editorModal.insertRow", {}, "Thêm dòng bên dưới"),
                                            "aria-label": "Insert row below",
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                insertRowAfter(idx);
                                            },
                                        },
                                        react.createElement("svg", {
                                            width: 13,
                                            height: 13,
                                            viewBox: "0 0 16 16",
                                            fill: "currentColor",
                                            dangerouslySetInnerHTML: { __html: SVG_PLUS },
                                        })
                                    ),
                                    react.createElement(
                                        "button",
                                        {
                                            type: "button",
                                            className: "lp-editor-icon-btn is-danger",
                                            title: getText("editorModal.deleteRow", {}, "Xóa dòng"),
                                            "aria-label": "Delete row",
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                deleteRow(idx);
                                            },
                                            disabled: rows.length <= 1,
                                        },
                                        react.createElement("svg", {
                                            width: 13,
                                            height: 13,
                                            viewBox: "0 0 16 16",
                                            fill: "currentColor",
                                            dangerouslySetInnerHTML: { __html: SVG_TRASH },
                                        })
                                    )
                                )
                            );
                        })
                    )
                )
                : react.createElement(
                    "div",
                    { className: "lp-editor-raw-wrap" },
                    react.createElement("textarea", {
                        className: "lp-editor-raw-textarea",
                        value: rawLrc,
                        spellCheck: false,
                        placeholder: "[00:12.34] Lyric line...",
                        onChange: (e) => updateRawLrc(e.target.value),
                    })
                ),

            // Footer Bar
            react.createElement(
                "div",
                { className: "lp-editor-footer" },
                react.createElement(
                    "div",
                    { className: "lp-editor-footer-left" },
                    activeTab === "rows" &&
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: "lp-btn lp-btn-ghost",
                                onClick: () => insertRowAfter(rows.length - 1),
                            },
                            getText("editorModal.addLine", {}, "+ Thêm dòng")
                        ),
                    hasUserEdits &&
                        react.createElement(
                            "button",
                            {
                                type: "button",
                                className: `lp-btn ${confirmReset ? "lp-btn-danger" : "lp-btn-ghost"}`,
                                onClick: handleResetClick,
                            },
                            confirmReset
                                ? getText("editorModal.confirmReset", {}, "Bấm lại để khôi phục mặc định")
                                : getText("editorModal.resetTrackEdits", {}, "Khôi phục bản gốc")
                        )
                ),
                react.createElement(
                    "div",
                    { className: "lp-editor-footer-right" },
                    react.createElement(
                        "span",
                        { className: "lp-editor-count" },
                        getText("editorModal.lineCount", { count: activeCount }, `${activeCount} dòng`)
                    ),
                    react.createElement(
                        "button",
                        {
                            type: "button",
                            className: "lp-btn lp-btn-ghost",
                            onClick: () => Spicetify.PopupModal.hide(),
                        },
                        getText("contextMenu.cancel", {}, "Hủy")
                    ),
                    react.createElement(
                        "button",
                        {
                            type: "button",
                            className: "lp-btn lp-btn-primary",
                            disabled: isSaving,
                            onClick: handleSaveClick,
                        },
                        isSaving
                            ? getText("editorModal.saving", {}, "Đang lưu...")
                            : getText("editorModal.savePermanent", {}, "Lưu vĩnh viễn")
                    )
                )
            )
        );
    }

    function open(options) {
        if (!Spicetify?.PopupModal?.display) return;
        Spicetify.PopupModal.display({
            title: getText("editorModal.title", {}, "Chỉnh sửa Lời & Bản dịch"),
            content: react.createElement(EditorModalBody, options),
            isLarge: true,
        });
    }

    return {
        open,
        _helpers: {
            parseTimestampMs,
            formatTimestampStr,
            rowsToLrcText,
            lrcTextToRows,
            rowsToLyricsPayload,
        },
    };
})();

window.LyricsEditorModal = LyricsEditorModal;
if (window.LyricsPlus) {
    window.LyricsPlus.LyricsEditorModal = LyricsEditorModal;
}
