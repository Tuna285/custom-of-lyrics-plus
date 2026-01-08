// SyncedLyrics.js - Synced Lyrics Pages

// Robust check for note lines - checks text AND originalText to handle translated data
const isReallyNote = (text) => {
    if (!text) return false;
    if (isNoteLine(text)) return true;
    return typeof text === "string" && text.trim() === "♪";
};

// Check if a lyric line object is a note (checks all text fields)
const isNoteLineObject = (line) => {
    if (!line) return false;
    // Check all possible text fields for note content
    const textIsNote = isReallyNote(line.text);
    const originalIsNote = isReallyNote(line.originalText);
    const text2IsNote = !line.text2 || isReallyNote(line.text2);

    // If original is a note, treat the whole line as a note
    // OR if there's no original and text is a note
    if (originalIsNote) return true;
    if (!line.originalText && textIsNote) return true;
    return false;
};

const SyncedLyricsPage = react.memo(({ lyrics = [], provider, copyright, isKara }) => {
    const [position, setPosition] = useState(0);
    const activeLineEle = useRef();
    const lyricContainerEle = useRef();

    useTrackPosition(() => {
        const newPos = Spicetify.Player.getProgress();
        const delay = CONFIG.visual["global-delay"] + CONFIG.visual.delay;
        if (newPos !== position) {
            setPosition(newPos + delay);
        }
    });

    const lyricWithEmptyLines = useMemo(() => {
        const raw = [emptyLine, emptyLine, ...lyrics];
        const processed = [];
        let newIndex = 0;


        for (let i = 0; i < raw.length; i++) {
            const currentLine = raw[i];
            const nextLine = raw[i + 1];

            processed.push({
                ...currentLine,
                lineNumber: newIndex++,
            });

            // Insert intro indicator after emptyLines but before first lyric
            if (i === 1 && lyrics.length > 0 && lyrics[0].startTime > 5000) {
                processed.push({
                    text: "♪",
                    startTime: 500,
                    lineNumber: newIndex++,
                });
            }

            if (currentLine && nextLine && currentLine.startTime && nextLine.startTime) {
                const textLen = (currentLine.originalText || currentLine.text || "").length;
                // Estimate duration based on text length (120ms per char), min 3s
                const estDur = Math.max(3000, textLen * 120);
                const gap = nextLine.startTime - (currentLine.startTime + estDur);

                // Auto-gap detector: Insert idling indicator if gap is large (>7s)
                // Use isNoteLineObject to check the entire line object, not just text field
                if (gap > 7000 && !isNoteLineObject(currentLine) && !isNoteLineObject(nextLine)) {
                    const insertTime = currentLine.startTime + estDur;
                    processed.push({
                        text: "♪",
                        startTime: insertTime,
                        lineNumber: newIndex++,
                    });
                }
            }
        }

        // Merge consecutive note lines into one
        const merged = [];
        for (let i = 0; i < processed.length; i++) {
            const current = processed[i];
            const prev = merged[merged.length - 1];

            // Use isNoteLineObject to properly detect notes after translation
            if (isNoteLineObject(current)) {
                // Look-back Merge Strategy:
                // Check if the current note should be merged with a previous note (ignoring empty lines).
                // This handles cases where auto-generated notes and original source notes are separated by artifacts.

                // 1. Find the last non-empty item in the merged list
                let lastNonEmptyIndex = merged.length - 1;
                while (lastNonEmptyIndex >= 0) {
                    const item = merged[lastNonEmptyIndex];
                    // Check if item has any meaningful text content
                    const hasContent = item.text && (typeof item.text !== "string" || item.text.trim() !== "");
                    const hasOriginal = item.originalText && (typeof item.originalText !== "string" || item.originalText.trim() !== "");
                    if (hasContent || hasOriginal) {
                        break;
                    }
                    lastNonEmptyIndex--;
                }

                if (lastNonEmptyIndex >= 0 && isNoteLineObject(merged[lastNonEmptyIndex])) {
                    // 2. If the last real item was ALSO a note, merge them.
                    // We do this by removing all intermediate empty lines (truncating the array)
                    // and skipping the addition of the current note (continue).
                    // This effectively extends the duration of the previous note to cover this one.
                    merged.length = lastNonEmptyIndex + 1;
                    continue; // Skip adding current note
                }
            }
            merged.push(current);
        }



        // Capture trailing note timing before removing
        let lastNoteStartTime = null;
        while (merged.length > 0) {
            const last = merged[merged.length - 1];
            // Check both text and originalText for trailing notes
            if (isNoteLineObject(last)) {
                lastNoteStartTime = last.startTime; // Save timing before removal
                merged.pop();
            } else {
                break;
            }
        }
        // Extend the last real line's duration to cover removed trailing notes
        if (lastNoteStartTime && merged.length > 0) {
            merged[merged.length - 1].extendedEndTime = lastNoteStartTime;
        }

        return merged;
    }, [lyrics]);

    const lyricsId = useMemo(() => lyrics[0]?.text || "no-lyrics", [lyrics]);

    const activeLineIndex = useMemo(() => {
        for (let i = lyricWithEmptyLines.length - 1; i > 0; i--) {
            const line = lyricWithEmptyLines[i];
            if (line && position >= (line.startTime || 0)) {
                return i;
            }
        }
        return 0;
    }, [lyricWithEmptyLines, position]);

    const activeLines = useMemo(() => {
        const startIndex = Math.max(activeLineIndex - 1 - CONFIG.visual["lines-before"], 0);
        const linesCount = CONFIG.visual["lines-before"] + CONFIG.visual["lines-after"] + 3;
        return lyricWithEmptyLines.slice(startIndex, startIndex + linesCount);
    }, [activeLineIndex, lyricWithEmptyLines]);

    let offset = lyricContainerEle.current ? lyricContainerEle.current.clientHeight / 2 : 0;
    if (activeLineEle.current) {
        offset += -(activeLineEle.current.offsetTop + activeLineEle.current.clientHeight / 2);
    }

    return react.createElement(
        "div",
        {
            className: "lyrics-lyricsContainer-SyncedLyricsPage",
            ref: lyricContainerEle,
        },
        react.createElement(
            "div",
            {
                className: "lyrics-lyricsContainer-SyncedLyrics",
                style: {
                    "--offset": `${offset}px`,
                    "--lyric-position": CONFIG.visual["lyric-position"] ?? 50,
                },
                key: lyricsId,
            },
            activeLines.map(({ text, lineNumber, startTime, originalText, text2 }, i) => {
                let className = "lyrics-lyricsContainer-LyricsLine";
                const activeElementIndex = Math.min(activeLineIndex, CONFIG.visual["lines-before"] + 1);
                let ref;

                if (i === activeElementIndex) {
                    className += " lyrics-lyricsContainer-LyricsLine-active";
                    ref = activeLineEle;
                }

                let animationIndex;
                if (activeLineIndex <= CONFIG.visual["lines-before"]) {
                    animationIndex = i - activeLineIndex;
                } else {
                    animationIndex = i - CONFIG.visual["lines-before"] - 1;
                }

                const paddingLine = (animationIndex < 0 && -animationIndex > CONFIG.visual["lines-before"]) || animationIndex > CONFIG.visual["lines-after"];
                if (paddingLine) {
                    className += " lyrics-lyricsContainer-LyricsLine-paddingLine";
                }
                const isActive = i === activeElementIndex;
                const { mainText, subText, subText2 } = Utils.getDisplayTexts(text, originalText, text2);

                if (isActive) {
                    ref = activeLineEle;
                }

                // Check if this is a note line - only render IdlingIndicator if ALL texts are notes
                // This prevents duplicate indicators when display mode shows both original and translation
                const isNote = isReallyNote(mainText) && (!subText || isReallyNote(subText)) && (!subText2 || isReallyNote(subText2));

                if (isNote) {
                    // Find next line's start time to calculate progress
                    let nextStartTime = startTime + 5000; // Default fallback

                    // Find the next line index in the full array
                    const currentFullIndex = lineNumber;
                    if (currentFullIndex < lyricWithEmptyLines.length - 1) {
                        nextStartTime = lyricWithEmptyLines[currentFullIndex + 1].startTime;
                    }

                    const duration = nextStartTime - startTime;
                    const elapsed = position - startTime;
                    const progress = Math.min(Math.max(elapsed / duration, 0), 1);

                    return react.createElement(IdlingIndicator, {
                        isActive: isActive,
                        progress: progress,
                        delay: duration / 3,
                        positionIndex: animationIndex,
                        animationIndex: (animationIndex < 0 ? 0 : animationIndex) + 1,
                        blurIndex: Math.abs(animationIndex),
                        isPadding: paddingLine,
                        isExiting: position >= nextStartTime,
                        key: lineNumber,
                        ref: ref
                    });
                }

                return react.createElement(
                    "div",
                    {
                        className,
                        style: {
                            cursor: "pointer",
                            "--position-index": animationIndex,
                            "--animation-index": (animationIndex < 0 ? 0 : animationIndex) + 1,
                            "--blur-index": Math.abs(animationIndex),
                        },
                        dir: "auto",
                        ref,
                        key: lineNumber,
                        onClick: (event) => {
                            if (startTime) {
                                Spicetify.Player.seek(startTime);
                            }
                        },
                    },
                    react.createElement(
                        "p",
                        {
                            onContextMenu: (event) => {
                                event.preventDefault();
                                Spicetify.Platform.ClipboardAPI.copy(Utils.convertParsedToLRC(lyrics).original)
                                    .then(() => Spicetify.showNotification("✓ Lyrics copied to clipboard", false, 2000))
                                    .catch(() => Spicetify.showNotification("Failed to copy lyrics to clipboard", true, 2000));
                            },
                            // For Furigana/Hiragana HTML strings
                            ...(typeof mainText === "string" && !isKara ? { dangerouslySetInnerHTML: { __html: Utils.rubyTextToHTML(mainText) } } : {}),
                        },
                        !isKara ? (typeof mainText === "string" ? null : mainText) : react.createElement(KaraokeLine, { text: mainText, startTime, position, isActive: i === activeElementIndex })
                    ),
                    (() => {
                        if (!subText) return null;
                        const props = {
                            className: "lyrics-lyricsContainer-LyricsLine-sub",
                            style: { "--sub-lyric-color": CONFIG.visual["inactive-color"] },
                        };
                        if (typeof subText === "string") {
                            props.dangerouslySetInnerHTML = { __html: Utils.rubyTextToHTML(subText) };
                            return react.createElement("p", props);
                        }
                        return react.createElement("p", props, subText);
                    })(),
                    (() => {
                        if (!subText2) return null;
                        const props2 = {
                            className: "lyrics-lyricsContainer-LyricsLine-sub",
                            style: { "--sub-lyric-color": CONFIG.visual["inactive-color"] },
                        };
                        if (typeof subText2 === "string") {
                            props2.dangerouslySetInnerHTML = { __html: Utils.rubyTextToHTML(subText2) };
                            return react.createElement("p", props2);
                        }
                        return react.createElement("p", props2, subText2);
                    })()
                );
            })
        ),
        react.createElement(CreditFooter, {
            provider,
            copyright,
        })
    );
});

const SyncedExpandedLyricsPage = react.memo(({ lyrics, provider, copyright, isKara }) => {
    const [position, setPosition] = useState(0);
    const activeLineRef = useRef(null);
    const pageRef = useRef(null);

    useTrackPosition(() => {
        if (!Spicetify.Player.data.is_paused) {
            setPosition(Spicetify.Player.getProgress() + CONFIG.visual["global-delay"] + CONFIG.visual.delay);
        }
    });

    const padded = useMemo(() => {
        const raw = [emptyLine, ...lyrics];
        const processed = [];


        for (let i = 0; i < raw.length; i++) {
            const currentLine = raw[i];
            const nextLine = raw[i + 1];

            processed.push(currentLine);

            // Insert intro indicator after emptyLine but before first lyric
            if (i === 0 && lyrics.length > 0 && lyrics[0].startTime > 5000) {
                processed.push({
                    text: "♪",
                    startTime: 500,
                });
            }

            if (currentLine && nextLine && currentLine.startTime && nextLine.startTime) {
                const textLen = (currentLine.originalText || currentLine.text || "").length;
                // Estimate duration based on text length (120ms per char), min 3s
                const estDur = Math.max(3000, textLen * 120);
                const gap = nextLine.startTime - (currentLine.startTime + estDur);

                // Auto-gap detector: Insert idling indicator if gap is large (>7s)
                // Use isNoteLineObject to check the entire line object, not just text field
                if (gap > 7000 && !isNoteLineObject(currentLine) && !isNoteLineObject(nextLine)) {
                    const insertTime = currentLine.startTime + estDur;
                    processed.push({
                        text: "♪",
                        startTime: insertTime,
                    });
                }
            }
        }

        // Merge consecutive note lines into one
        const merged = [];
        for (let i = 0; i < processed.length; i++) {
            const current = processed[i];
            const prev = merged[merged.length - 1];

            // Use isNoteLineObject to properly detect notes after translation
            if (isNoteLineObject(current)) {
                // Look-back Merge Strategy:
                // Check if the current note should be merged with a previous note (ignoring empty lines).
                // This handles cases where auto-generated notes and original source notes are separated by artifacts.

                // 1. Find the last non-empty item in the merged list
                let lastNonEmptyIndex = merged.length - 1;
                while (lastNonEmptyIndex >= 0) {
                    const item = merged[lastNonEmptyIndex];
                    // Check if item has any meaningful text content
                    const hasContent = item.text && (typeof item.text !== "string" || item.text.trim() !== "");
                    const hasOriginal = item.originalText && (typeof item.originalText !== "string" || item.originalText.trim() !== "");
                    if (hasContent || hasOriginal) {
                        break;
                    }
                    lastNonEmptyIndex--;
                }

                if (lastNonEmptyIndex >= 0 && isNoteLineObject(merged[lastNonEmptyIndex])) {
                    // 2. If the last real item was ALSO a note, merge them.
                    // We do this by removing all intermediate empty lines (truncating the array)
                    // and skipping the addition of the current note (continue).
                    // This effectively extends the duration of the previous note to cover this one.
                    merged.length = lastNonEmptyIndex + 1;
                    continue; // Skip adding current note
                }
            }
            merged.push(current);
        }

        // Capture trailing note timing before removing
        let lastNoteStartTime = null;
        while (merged.length > 0) {
            const last = merged[merged.length - 1];
            // Check both text and originalText for trailing notes
            if (isNoteLineObject(last)) {
                lastNoteStartTime = last.startTime; // Save timing before removal
                merged.pop();
            } else {
                break;
            }
        }
        // Extend the last real line's duration to cover removed trailing notes
        if (lastNoteStartTime && merged.length > 0) {
            merged[merged.length - 1].extendedEndTime = lastNoteStartTime;
        }

        return merged;
    }, [lyrics]);

    const intialScroll = useMemo(() => [false], [lyrics]);

    const lyricsId = useMemo(() => lyrics[0]?.text || "no-lyrics", [lyrics]);

    // Optimize active line calculation with memoization
    const activeLineIndex = useMemo(() => {
        for (let i = padded.length - 1; i >= 0; i--) {
            const line = padded[i];
            if (line && position >= (line.startTime || 0)) {
                return i;
            }
        }
        return 0;
    }, [padded, position]);

    useEffect(() => {
        if (activeLineRef.current && (!intialScroll[0] || isInViewport(activeLineRef.current))) {
            activeLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
            });
            intialScroll[0] = true;
        }
    }, [activeLineRef.current]);

    return react.createElement(
        "div",
        {
            className: "lyrics-lyricsContainer-UnsyncedLyricsPage",
            key: lyricsId,
            ref: pageRef,
        },
        react.createElement("p", {
            className: "lyrics-lyricsContainer-LyricsUnsyncedPadding",
        }),
        padded.map(({ text, startTime, originalText, text2 }, i) => {
            const isActive = i === activeLineIndex;
            const { mainText, subText, subText2 } = Utils.getDisplayTexts(text, originalText, text2);

            let ref;
            if (isActive) {
                ref = activeLineRef;
            }

            let animationIndex;
            if (activeLineIndex <= CONFIG.visual["lines-before"]) {
                animationIndex = i - activeLineIndex;
            } else {
                animationIndex = i - CONFIG.visual["lines-before"] - 1;
            }

            let className = "lyrics-lyricsContainer-LyricsLine";
            if (isActive) {
                className += " lyrics-lyricsContainer-LyricsLine-active";
            }

            const paddingLine = (animationIndex < 0 && -animationIndex > CONFIG.visual["lines-before"]) || animationIndex > CONFIG.visual["lines-after"];
            if (paddingLine) {
                className += " lyrics-lyricsContainer-LyricsLine-paddingLine";
            }

            // Check if this is a note line - only render IdlingIndicator if ALL texts are notes
            // This prevents duplicate indicators when display mode shows both original and translation
            const isNote = isReallyNote(mainText) && (!subText || isReallyNote(subText)) && (!subText2 || isReallyNote(subText2));

            if (isNote) {
                // Find next line's start time
                let nextStartTime = startTime + 5000; // Default fallback
                if (i < padded.length - 1) {
                    nextStartTime = padded[i + 1].startTime;
                }

                const duration = nextStartTime - startTime;
                const elapsed = position - startTime;
                const progress = Math.min(Math.max(elapsed / duration, 0), 1);

                return react.createElement(IdlingIndicator, {
                    isActive: isActive,
                    progress: progress,
                    delay: duration / 3,
                    positionIndex: animationIndex,
                    animationIndex: (animationIndex < 0 ? 0 : animationIndex) + 1,
                    blurIndex: Math.abs(animationIndex),
                    isPadding: paddingLine,
                    isExiting: nextStartTime - position < 500,
                    key: i,
                    ref: ref
                });
            }

            return react.createElement(
                "div",
                {
                    className,
                    style: {
                        cursor: "pointer",
                        "--position-index": animationIndex,
                        "--animation-index": (animationIndex < 0 ? 0 : animationIndex) + 1,
                        "--blur-index": Math.abs(animationIndex),
                    },
                    dir: "auto",
                    ref,
                    key: i,
                    onClick: (event) => {
                        if (startTime) {
                            Spicetify.Player.seek(startTime);
                        }
                    },
                },
                react.createElement(
                    "p",
                    {
                        onContextMenu: (event) => {
                            event.preventDefault();
                            Spicetify.Platform.ClipboardAPI.copy(Utils.convertParsedToLRC(lyrics, belowMode).original)
                                .then(() => Spicetify.showNotification("✓ Lyrics copied to clipboard", false, 2000))
                                .catch(() => Spicetify.showNotification("Failed to copy lyrics to clipboard", true, 2000));
                        },
                    },
                    !isKara ? mainText : react.createElement(KaraokeLine, { text: mainText, startTime, position, isActive })
                ),
                subText && react.createElement("p", {
                    className: "lyrics-lyricsContainer-LyricsLine-sub",
                    style: {
                        "--sub-lyric-color": CONFIG.visual["inactive-color"],
                    },
                    dangerouslySetInnerHTML: {
                        __html: Utils.rubyTextToHTML(subText),
                    },
                }),
                subText2 && react.createElement("p", {
                    className: "lyrics-lyricsContainer-LyricsLine-sub",
                    style: {
                        "--sub-lyric-color": CONFIG.visual["inactive-color"],
                    },
                    dangerouslySetInnerHTML: {
                        __html: Utils.rubyTextToHTML(subText2),
                    },
                })
            );
        }),
        react.createElement("p", {
            className: "lyrics-lyricsContainer-LyricsUnsyncedPadding",
        }),
        react.createElement(CreditFooter, {
            provider,
            copyright,
        }),
        react.createElement(SearchBar, null)
    );
});

// Expose to global scope
window.SyncedLyricsPage = SyncedLyricsPage;
window.SyncedExpandedLyricsPage = SyncedExpandedLyricsPage;
