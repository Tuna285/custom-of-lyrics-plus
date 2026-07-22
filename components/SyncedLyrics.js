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

// === Idling indicator timing constants ===
// All providers (Spotify, LRCLIB, Musixmatch synced) only give startTime per line.
// We must estimate when each line actually finishes singing using char count + a per-song tempo.
const DEFAULT_MS_PER_CHAR = 120;
const MIN_LINE_DUR = 2800;
// Grace period: keep "♪" hidden for this long after the estimated line end,
// so it doesn't pop in while a held note is still ringing out.
const IDLE_GRACE_MS = 1500;
// Minimum time the "♪" must remain visible before the next lyric, otherwise skip it.
// Set to 5s to guarantee comfortable, unhurried 3-dot animation without fast flashing.
const IDLE_MIN_VISIBLE_MS = 5000;
// Minimum raw interval between consecutive lines before we'll even consider inserting "♪".
// Raised to 8.5s: True musical instrumental breaks are >= 8.5s.
const GAP_THRESHOLD_MIN = 10500;
const GAP_THRESHOLD_MAX = 16000;
// Safety floor ratio: assume singer holds line for at most this fraction of the interval.
const LINE_END_INTERVAL_FLOOR_RATIO = 0.78;
const INTRO_THRESHOLD_MIN = 3000;
const INTRO_THRESHOLD_MAX = 8000;

// Compute the song's own tempo from consecutive line pairs.
// Pairs spaced > 10s apart are treated as pauses and excluded so they don't bias the estimate.
const computeTimingStats = (lyrics) => {
    const fallback = {
        msPerChar: DEFAULT_MS_PER_CHAR,
        avgLineDur: 4000,
        gapThreshold: 8500,
        introThreshold: 5000,
    };
    if (!Array.isArray(lyrics) || lyrics.length < 2) return fallback;

    const charRates = [];
    const consecutiveDurs = [];

    for (let i = 0; i < lyrics.length - 1; i++) {
        const curr = lyrics[i];
        const next = lyrics[i + 1];
        if (!curr?.startTime || !next?.startTime) continue;
        const dur = next.startTime - curr.startTime;
        if (dur <= 0 || dur > 10000) continue;

        const text = curr.originalText || curr.text || "";
        if (typeof text !== "string") continue;
        const len = text.trim().length;
        if (len < 2) continue;

        charRates.push(dur / len);
        consecutiveDurs.push(dur);
    }

    if (charRates.length < 4) return fallback;

    const median = (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    };

    // Clamp to sane musical range: fastest rap ~50ms/char, slowest ballad ~400ms/char
    const msPerChar = Math.min(400, Math.max(50, median(charRates)));
    const avgLineDur = median(consecutiveDurs);

    // Fast songs flag pauses sooner; slow songs need longer pauses to feel idle.
    const gapThreshold = Math.min(GAP_THRESHOLD_MAX, Math.max(GAP_THRESHOLD_MIN, avgLineDur * 1.8));
    const introThreshold = Math.min(INTRO_THRESHOLD_MAX, Math.max(INTRO_THRESHOLD_MIN, avgLineDur * 1.5));

    return { msPerChar, avgLineDur, gapThreshold, introThreshold };
};

// Estimate how long a line actually plays. Prefers provider-supplied endTime when present
// (e.g. Musixmatch karaoke richsync), falls back to char-count × per-song tempo.
const estimateLineDuration = (line, stats) => {
    if (line?.endTime && line?.startTime && line.endTime > line.startTime) {
        return line.endTime - line.startTime;
    }
    const text = line?.originalText || line?.text || "";
    const len = typeof text === "string" ? text.trim().length : 0;
    return Math.max(MIN_LINE_DUR, len * (stats?.msPerChar || DEFAULT_MS_PER_CHAR));
};

const SyncedLyricsPage = react.memo(({ lyrics: rawLyrics, provider, copyright, isKara, trackUri, ...props }) => {
    const lyrics = rawLyrics || [];
    const isReallySynced = lyrics.length > 0 && lyrics.some(l => l.startTime !== undefined);
    if (!isReallySynced && lyrics.length > 0) {
        return react.createElement(SyncedExpandedLyricsPage, {
            lyrics,
            provider,
            copyright,
            isKara,
            trackUri,
            ...props
        });
    }

    const [position, setPosition] = useState(0);
    const activeLineEle = useRef();
    const lyricContainerEle = useRef();
    const handleSyncedWheel = useCallback((event) => {
        // Synced page is transform-driven (not scroll container).
        // Prevent wheel from bubbling to Spotify root and scrolling the main page.
        if (event.ctrlKey) return;
        event.preventDefault();
        event.stopPropagation();
    }, []);

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
        const timingStats = computeTimingStats(lyrics);


        for (let i = 0; i < raw.length; i++) {
            const currentLine = raw[i];
            const nextLine = raw[i + 1];

            processed.push({
                ...currentLine,
                lineNumber: newIndex++,
            });

            // Insert intro indicator after emptyLines but before first lyric
            if (i === 1 && lyrics.length > 0 && lyrics[0].startTime > timingStats.introThreshold) {
                processed.push({
                    text: "♪",
                    startTime: 500,
                    lineNumber: newIndex++,
                });
            }

            if (currentLine && nextLine && currentLine.startTime && nextLine.startTime) {
                const interval = nextLine.startTime - currentLine.startTime;
                const estDur = estimateLineDuration(currentLine, timingStats);
                const silentDuration = nextLine.startTime - (currentLine.startTime + estDur);

                const canInsert =
                    silentDuration >= 4500 &&
                    !isNoteLineObject(currentLine) &&
                    !isNoteLineObject(nextLine);

                if (canInsert) {
                    const lineEnd = currentLine.startTime + estDur;
                    const insertTime = lineEnd + 1000;
                    if (nextLine.startTime - insertTime >= 3000) {
                        processed.push({
                            text: "♪",
                            startTime: insertTime,
                            lineNumber: newIndex++,
                        });
                    }
                }
            }
        }

        // Merge & Filter note lines
        const merged = [];
        for (let i = 0; i < processed.length; i++) {
            const current = processed[i];

            if (isNoteLineObject(current)) {
                // Find next non-note line to determine duration
                let nextRealLine = null;
                for (let j = i + 1; j < processed.length; j++) {
                    if (!isNoteLineObject(processed[j])) {
                        nextRealLine = processed[j];
                        break;
                    }
                }
                const durationToNext = nextRealLine ? (nextRealLine.startTime - current.startTime) : 0;

                // Drop short note lines (< 9000ms) so previous real lyric line holds continuously
                if (durationToNext > 0 && durationToNext < 9000 && nextRealLine) {
                    continue;
                }

                // Look-back Merge Strategy: merge consecutive note lines
                let lastNonEmptyIndex = merged.length - 1;
                while (lastNonEmptyIndex >= 0) {
                    const item = merged[lastNonEmptyIndex];
                    const hasContent = item.text && (typeof item.text !== "string" || item.text.trim() !== "");
                    const hasOriginal = item.originalText && (typeof item.originalText !== "string" || item.originalText.trim() !== "");
                    if (hasContent || hasOriginal) {
                        break;
                    }
                    lastNonEmptyIndex--;
                }

                if (lastNonEmptyIndex >= 0 && isNoteLineObject(merged[lastNonEmptyIndex])) {
                    merged.length = lastNonEmptyIndex + 1;
                    continue;
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
            onWheel: handleSyncedWheel,
        },
        react.createElement(
            "div",
            {
                className: "lyrics-lyricsContainer-SyncedLyrics",
                style: {
                    "--offset": `${offset}px`,
                    "--lyric-position": CONFIG.visual["lyric-position"] ?? 50,
                },
                key: trackUri || lyricsId,
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

                    // Find the next line in the activeLines array
                    if (i < activeLines.length - 1) {
                        nextStartTime = activeLines[i + 1].startTime;
                    }

                    const rawDuration = nextStartTime - startTime;
                    if (rawDuration >= 4000) {
                        const duration = Math.max(rawDuration, 5000);
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
                            isExiting: animationIndex < 0 || position >= nextStartTime,
                            key: lineNumber,
                            ref: ref
                        });
                    }
                    // Hide short note lines (< 4000ms) so raw "♪" text does not render between lines
                    return null;
                }

                let lineInterval = 4000;
                if (i < activeLines.length - 1 && activeLines[i + 1]?.startTime && startTime) {
                    lineInterval = activeLines[i + 1].startTime - startTime;
                }
                const lineDurationSec = `${Math.min(0.60, Math.max(0.20, (lineInterval * 0.08) / 1000)).toFixed(2)}s`;

                return react.createElement(
                    "div",
                    {
                        className,
                        style: {
                            cursor: "pointer",
                            "--position-index": animationIndex,
                            "--animation-index": (animationIndex < 0 ? 0 : animationIndex) + 1,
                            "--blur-index": Math.abs(animationIndex),
                            "--line-transition-duration": lineDurationSec,
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
                                Spicetify.Platform.ClipboardAPI.copy(Utils.convertParsedToLRC(lyrics, CONFIG.visual["translate:display-mode"] === "below").original)
                                    .then(() => Spicetify.showNotification("✓ " + getText("notifications.lyricsCopied"), false, 2000))
                                    .catch(() => Spicetify.showNotification(getText("notifications.lyricsCopyFailed"), true, 2000));
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

const SyncedExpandedLyricsPage = react.memo(({ lyrics: rawLyrics, provider, copyright, isKara, trackUri }) => {
    const lyrics = rawLyrics || [];
    const [position, setPosition] = useState(0);
    const activeLineRef = useRef(null);
    const pageRef = useRef(null);

    useTrackPosition(() => {
        if (Spicetify.Player?.data && !Spicetify.Player.data.is_paused) {
            setPosition(Spicetify.Player.getProgress() + CONFIG.visual["global-delay"] + CONFIG.visual.delay);
        }
    });

    const padded = useMemo(() => {
        const raw = [emptyLine, ...lyrics];
        const processed = [];
        const timingStats = computeTimingStats(lyrics);


        for (let i = 0; i < raw.length; i++) {
            const currentLine = raw[i];
            const nextLine = raw[i + 1];

            processed.push(currentLine);

            // Insert intro indicator after emptyLine but before first lyric
            if (i === 0 && lyrics.length > 0 && lyrics[0].startTime > timingStats.introThreshold) {
                processed.push({
                    text: "♪",
                    startTime: 500,
                });
            }

            if (currentLine && nextLine && currentLine.startTime && nextLine.startTime) {
                const interval = nextLine.startTime - currentLine.startTime;
                // Auto-gap detector with adaptive threshold + grace period.
                const canInsert =
                    silentDuration >= 4500 &&
                    !isNoteLineObject(currentLine) &&
                    !isNoteLineObject(nextLine);

                if (canInsert) {
                    const estDur = estimateLineDuration(currentLine, timingStats);
                    const text = currentLine.originalText || currentLine.text || "";
                    const len = typeof text === "string" ? text.trim().length : 0;
                    // Dynamic safety floor ratio based on character length.
                    const ratio = len < 10 ? 0.85 : len < 20 ? 0.80 : LINE_END_INTERVAL_FLOOR_RATIO;

                    const lineEnd = currentLine.startTime + Math.min(
                        Math.max(estDur, interval * ratio),
                        estDur * 1.5
                    );
                    const insertTime = lineEnd + IDLE_GRACE_MS;
                    if (nextLine.startTime - insertTime >= IDLE_MIN_VISIBLE_MS) {
                        processed.push({
                            text: "♪",
                            startTime: insertTime,
                        });
                    }
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
                // Find next non-note line to determine duration
                let nextRealLine = null;
                for (let j = i + 1; j < processed.length; j++) {
                    if (!isNoteLineObject(processed[j])) {
                        nextRealLine = processed[j];
                        break;
                    }
                }
                const durationToNext = nextRealLine ? (nextRealLine.startTime - current.startTime) : 0;

                // Drop short note lines (< 9000ms) so previous real lyric line holds continuously
                if (durationToNext > 0 && durationToNext < 9000 && nextRealLine) {
                    continue;
                }

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

    const isReallySynced = useMemo(() => lyrics.length > 0 && lyrics.some(l => l.startTime !== undefined), [lyrics]);

    useEffect(() => {
        if (isReallySynced && activeLineRef.current && (!intialScroll[0] || isInViewport(activeLineRef.current))) {
            activeLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
            });
            intialScroll[0] = true;
        }
    }, [activeLineRef.current, isReallySynced]);

    return react.createElement(
        "div",
        {
            className: "lyrics-lyricsContainer-UnsyncedLyricsPage",
            key: trackUri || lyricsId,
            ref: pageRef,
        },
        react.createElement("p", {
            className: "lyrics-lyricsContainer-LyricsUnsyncedPadding",
        }),
        padded.map(({ text, startTime, originalText, text2 }, i) => {
            const isActive = !isReallySynced || i === activeLineIndex;
            const { mainText, subText, subText2 } = Utils.getDisplayTexts(text, originalText, text2);

            let ref;
            if (isReallySynced && isActive) {
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

                const rawDuration = nextStartTime - startTime;
                if (rawDuration >= 4000) {
                    const duration = Math.max(rawDuration, 5000);
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
                        isExiting: animationIndex < 0 || position >= nextStartTime,
                        key: i,
                        ref: ref
                    });
                }
                // Hide short note lines (< 4000ms) so raw "♪" text does not render between lines
                return null;
            }

            let lineInterval = 4000;
            if (i < merged.length - 1 && merged[i + 1]?.startTime && startTime) {
                lineInterval = merged[i + 1].startTime - startTime;
            }
            const lineDurationSec = `${Math.min(0.60, Math.max(0.20, (lineInterval * 0.08) / 1000)).toFixed(2)}s`;

            return react.createElement(
                "div",
                {
                    className,
                    style: {
                        cursor: "pointer",
                        "--position-index": animationIndex,
                        "--animation-index": (animationIndex < 0 ? 0 : animationIndex) + 1,
                        "--blur-index": Math.abs(animationIndex),
                        "--line-transition-duration": lineDurationSec,
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
                            Spicetify.Platform.ClipboardAPI.copy(Utils.convertParsedToLRC(lyrics, CONFIG.visual["translate:display-mode"] === "below").original)
                                .then(() => Spicetify.showNotification("✓ " + getText("notifications.lyricsCopied"), false, 2000))
                                .catch(() => Spicetify.showNotification(getText("notifications.lyricsCopyFailed"), true, 2000));
                        },
                        // For Furigana/Hiragana HTML strings
                        ...(typeof mainText === "string" && !isKara ? { dangerouslySetInnerHTML: { __html: Utils.rubyTextToHTML(mainText) } } : {}),
                    },
                    !isKara ? (typeof mainText === "string" ? null : mainText) : react.createElement(KaraokeLine, { text: mainText, startTime, position, isActive })
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
