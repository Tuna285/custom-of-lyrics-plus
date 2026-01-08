// UnsyncedLyrics.js - Unsynced & Genius Lyrics

const UnsyncedLyricsPage = react.memo(({ lyrics, provider, copyright, trackUri }) => {
    // For very long lyrics (>100 lines), use lighter rendering
    const isLongLyrics = lyrics.length > 100;
    const [renderRange, setRenderRange] = useState({ start: 0, end: isLongLyrics ? 50 : lyrics.length });
    const containerRef = useRef();
    const lyricsRefs = useRef([]);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const autoScrollTimeoutRef = useRef();
    const outroSnapDone = useRef(false);
    const lastManualScrollTime = useRef(0);
    const lastScrolledIndex = useRef(-1);
    const lastAutoScrollTime = useRef(0);

    // Smart auto-scroll based on track progress
    const [anchors, setAnchors] = useState({});

    // Anchors are per-track; clearing them avoids stale calibration leaking into the next song.
    useEffect(() => {
        setAnchors({});
        // Avoid “carry-over” state from the previous track causing sudden scroll jumps.
        outroSnapDone.current = false;
        lastScrolledIndex.current = -1;
        lastAutoScrollTime.current = 0;
        lastManualScrollTime.current = 0;
        lyricsRefs.current = [];
        setIsAutoScrolling(false);
        clearTimeout(autoScrollTimeoutRef.current);

        // Start each track from the top so early lines aren't skipped.
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [trackUri]);

    useTrackPosition(() => {
        if (!CONFIG.visual["unsynced-auto-scroll"]) return;
        if (!containerRef.current || lyrics.length === 0) return;

        const currentTime = Spicetify.Player.getProgress();
        const duration = Spicetify.Player.getDuration();

        if (!duration || duration === 0) return;

        // Don't fight the user: pause auto-scroll briefly after manual scrolling.
        const now = Date.now();
        const USER_OVERRIDE_MS = 8000; // Long enough to read/scan back without snapping away
        if (now - lastManualScrollTime.current < USER_OVERRIDE_MS) return;

        // Throttle to reduce jitter/CPU; unsynced lyrics can't be frame-accurate anyway.
        if (now - lastAutoScrollTime.current < 2000) return;

        // Heuristic mapping from playback time -> estimated line index (no timestamps).
        let targetIndex = 0;
        const hasAnchors = Object.keys(anchors).length > 0;

        // Padding heuristic: when we have no anchors, bias away from intro/outro where lyrics
        // are commonly absent, reducing the most noticeable auto-scroll errors.
        let startBoundary = 0;
        let endBoundary = duration;

        if (!hasAnchors) {
            const MAX_PADDING_MS = 30000; // Cap so we don't compress the active zone too much
            const startPad = Math.min(MAX_PADDING_MS, Math.floor(duration * 0.1));
            const endPad = Math.min(MAX_PADDING_MS, Math.floor(duration * 0.1));

            const candidateStart = startPad;
            const candidateEnd = duration - endPad;

            // Guard against shrinking the active zone to near-zero on short tracks.
            if (candidateEnd > candidateStart + 1000) {
                startBoundary = candidateStart;
                endBoundary = candidateEnd;
            }

            // In intros, staying put is usually less annoying than guessing wrong.
            if (currentTime <= startBoundary) {
                outroSnapDone.current = false;
                return;
            }

            // In outros, settle at the end once to avoid drifting on instrumental tails.
            if (currentTime >= endBoundary) {
                if (outroSnapDone.current) return;
            } else {
                outroSnapDone.current = false;
            }
        }

        const sortedAnchors = hasAnchors
            ? [
                { index: 0, time: 0 },
                ...Object.entries(anchors).map(([i, t]) => ({ index: Number(i), time: t })).sort((a, b) => a.time - b.time),
                { index: lyrics.length - 1, time: duration }
            ]
            : [
                { index: 0, time: startBoundary },
                { index: lyrics.length - 1, time: endBoundary }
            ];

        // Anchors turn the mapping into piecewise segments, improving accuracy where the user cares.
        let prevAnchor = sortedAnchors[0];
        let nextAnchor = sortedAnchors[sortedAnchors.length - 1];

        for (let i = 0; i < sortedAnchors.length - 1; i++) {
            if (currentTime >= sortedAnchors[i].time && currentTime < sortedAnchors[i + 1].time) {
                prevAnchor = sortedAnchors[i];
                nextAnchor = sortedAnchors[i + 1];
                break;
            }
        }

        const timeRange = nextAnchor.time - prevAnchor.time;
        const indexRange = nextAnchor.index - prevAnchor.index;

        if (timeRange > 0) {
            let progressInSegment = (currentTime - prevAnchor.time) / timeRange;
            progressInSegment = Math.min(Math.max(progressInSegment, 0), 1);
            // With no anchors, easing reduces perceived overshoot and makes movement feel calmer.
            let adjustedProgress = progressInSegment;
            if (!hasAnchors) {
                // S-curve biases slower start/end within a segment to reduce sudden jumps.
                adjustedProgress = progressInSegment < 0.5
                    ? 2 * progressInSegment * progressInSegment
                    : 1 - Math.pow(-2 * progressInSegment + 2, 2) / 2;
            }
            targetIndex = prevAnchor.index + (indexRange * adjustedProgress);
        } else {
            targetIndex = prevAnchor.index;
        }

        targetIndex = Math.min(Math.max(0, Math.floor(targetIndex)), lyrics.length - 1);
        // -----------------------------

        // Avoid micro-adjustments that look jittery while reading.
        if (Math.abs(targetIndex - lastScrolledIndex.current) < 3) return;

        // Animated scroll is gentler than snapping, especially for long lyrics.
        const targetLine = lyricsRefs.current[targetIndex];
        if (targetLine && !Spicetify.Player.data.is_paused) {
            lastScrolledIndex.current = targetIndex;
            lastAutoScrollTime.current = now;
            setIsAutoScrolling(true);

            // Prevent repeated snap-to-end during long instrumental outros.
            if (!hasAnchors && currentTime >= endBoundary && targetIndex === lyrics.length - 1) {
                outroSnapDone.current = true;
            }

            // scrollIntoView can be abrupt here; easing feels calmer and more readable.
            const container = containerRef.current;
            const targetTop = targetLine.offsetTop;
            const containerHeight = container.clientHeight;
            const targetScrollTop = targetTop - (containerHeight / 2) + (targetLine.clientHeight / 2);

            const startScrollTop = container.scrollTop;
            const distance = targetScrollTop - startScrollTop;
            const duration = 800; // ms - longer for smoother feel
            const startTime = performance.now();

            const easeInOutCubic = (t) => {
                return t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };

            const animateScroll = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(progress);

                container.scrollTop = startScrollTop + (distance * eased);

                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                }
            };

            requestAnimationFrame(animateScroll);

            // Keep auto-scrolling state true only during our own animation so user interaction
            // detection doesn't mistakenly "pause" itself.
            clearTimeout(autoScrollTimeoutRef.current);
            autoScrollTimeoutRef.current = setTimeout(() => {
                setIsAutoScrolling(false);
            }, duration + 100);
        }
    });

    // Detect manual scroll/wheel to pause auto-scroll temporarily
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleUserInteraction = () => {
            if (!isAutoScrolling) {
                lastManualScrollTime.current = Date.now();
            }
        };

        const handleWheel = () => {
            // Immediately pause on wheel event (more responsive)
            lastManualScrollTime.current = Date.now();
        };

        container.addEventListener("scroll", handleUserInteraction, { passive: true });
        container.addEventListener("wheel", handleWheel, { passive: true });
        container.addEventListener("touchmove", handleUserInteraction, { passive: true });

        return () => {
            container.removeEventListener("scroll", handleUserInteraction);
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("touchmove", handleUserInteraction);
        };
    }, [isAutoScrolling]);

    useEffect(() => {
        if (!isLongLyrics || !containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Expand render range when scrolling near edges
                        setRenderRange((prev) => ({
                            start: Math.max(0, prev.start - 20),
                            end: Math.min(lyrics.length, prev.end + 20),
                        }));
                    }
                });
            },
            { rootMargin: "400px" }
        );

        const sentinel = containerRef.current.lastElementChild;
        if (sentinel) observer.observe(sentinel);

        return () => observer.disconnect();
    }, [isLongLyrics, lyrics.length]);

    const visibleLyrics = isLongLyrics ? lyrics.slice(renderRange.start, renderRange.end) : lyrics;

    return react.createElement(
        "div",
        {
            className: `lyrics-lyricsContainer-UnsyncedLyricsPage${isAutoScrolling ? " auto-scrolling" : ""}`,
            ref: containerRef,
        },
        react.createElement("p", {
            className: "lyrics-lyricsContainer-LyricsUnsyncedPadding",
        }),
        visibleLyrics.map(({ text, originalText, text2 }, index) => {
            const actualIndex = isLongLyrics ? index + renderRange.start : index;
            const { mainText: lineText } = Utils.getDisplayTexts(text, originalText, text2);

            // Convert lyrics to text for comparison
            const belowOrigin = (typeof originalText === "object" ? originalText?.props?.children?.[0] : originalText)?.replace(/\s+/g, "");
            const belowTxt = (typeof text === "object" ? text?.props?.children?.[0] : text)?.replace(/\s+/g, "");

            // Show sub-lines in "below" mode or when we have Mode 2 translation in either mode
            const showTranslatedBelow = CONFIG.visual["translate:display-mode"] === "below";
            const replaceOriginal = CONFIG.visual["translate:display-mode"] === "replace";
            const belowMode = showTranslatedBelow && originalText && belowOrigin !== belowTxt;
            const showMode2 = !!text2 && (showTranslatedBelow || replaceOriginal);
            const isAnchor = anchors[actualIndex] !== undefined;

            return react.createElement(
                "div",
                {
                    className: `lyrics-lyricsContainer-LyricsLine lyrics-lyricsContainer-LyricsLine-active${isAnchor ? " lyrics-anchor" : ""}`,
                    key: actualIndex,
                    dir: "auto",
                    ref: (el) => {
                        if (el) lyricsRefs.current[actualIndex] = el;
                    },
                    onClick: (event) => {
                        // Prevent context menu from triggering
                        if (event.button === 2) return;

                        const currentPos = Spicetify.Player.getProgress();
                        setAnchors(prev => ({ ...prev, [actualIndex]: currentPos }));
                        Spicetify.showNotification("Line synced to current time");
                    },
                },
                react.createElement(
                    "p",
                    {
                        onContextMenu: (event) => {
                            event.preventDefault();
                            Spicetify.Platform.ClipboardAPI.copy(Utils.convertParsedToUnsynced(lyrics, belowMode).original)
                                .then(() => Spicetify.showNotification("✓ Lyrics copied to clipboard", false, 2000))
                                .catch(() => Spicetify.showNotification("Failed to copy lyrics to clipboard", true, 2000));
                        },
                        // Use HTML for ruby when string
                        ...(typeof lineText === "string"
                            ? { dangerouslySetInnerHTML: { __html: Utils.rubyTextToHTML(lineText) } }
                            : {}),
                    },
                    typeof lineText === "string" ? null : lineText
                ),
                belowMode &&
                react.createElement(
                    "p",
                    {
                        style: { opacity: 0.5 },
                        onContextMenu: (event) => {
                            event.preventDefault();
                            Spicetify.Platform.ClipboardAPI.copy(Utils.convertParsedToUnsynced(lyrics, belowMode).conver)
                                .then(() => Spicetify.showNotification("✓ Translation copied to clipboard", false, 2000))
                                .catch(() => Spicetify.showNotification("Failed to copy translation to clipboard", true, 2000));
                        },
                        ...(typeof text === "string"
                            ? { dangerouslySetInnerHTML: { __html: Utils.rubyTextToHTML(text) } }
                            : {}),
                    },
                    typeof text === "string" ? null : text
                ),
                showMode2 &&
                react.createElement(
                    "p",
                    {
                        style: { opacity: 0.5 },
                        onContextMenu: (event) => {
                            event.preventDefault();
                            Spicetify.Platform.ClipboardAPI.copy(text2)
                                .then(() => Spicetify.showNotification("✓ Second translation copied to clipboard", false, 2000))
                                .catch(() => Spicetify.showNotification("Failed to copy second translation to clipboard", true, 2000));
                        },
                        ...(typeof text2 === "string"
                            ? { dangerouslySetInnerHTML: { __html: Utils.rubyTextToHTML(text2) } }
                            : {}),
                    },
                    typeof text2 === "string" ? null : text2
                )
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

const noteContainer = document.createElement("div");
noteContainer.classList.add("lyrics-Genius-noteContainer");
const noteDivider = document.createElement("div");
noteDivider.classList.add("lyrics-Genius-divider");
noteDivider.innerHTML = `<svg width="32" height="32" viewBox="0 0 13 4" fill="currentColor"><path d="M13 10L8 4.206 3 10z"/></svg>`;
noteDivider.style.setProperty("--link-left", 0);
const noteTextContainer = document.createElement("div");
noteTextContainer.classList.add("lyrics-Genius-noteTextContainer");
noteTextContainer.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
};
noteContainer.append(noteDivider, noteTextContainer);

function showNote(parent, note) {
    if (noteContainer.parentElement === parent) {
        noteContainer.remove();
        return;
    }
    noteTextContainer.innerText = note;
    parent.append(noteContainer);
    const arrowPos = parent.offsetLeft - noteContainer.offsetLeft;
    noteDivider.style.setProperty("--link-left", `${arrowPos}px`);
    const box = noteTextContainer.getBoundingClientRect();
    if (box.y + box.height > window.innerHeight) {
        // Wait for noteContainer is mounted
        setTimeout(() => {
            noteContainer.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
            });
        }, 50);
    }
}

const GeniusPage = react.memo(
    ({ lyrics, provider, copyright, versions, versionIndex, onVersionChange, isSplitted, lyrics2, versionIndex2, onVersionChange2 }) => {
        let notes = {};
        let container = null;
        let container2 = null;

        // Fetch notes
        useEffect(() => {
            if (!container) return;
            notes = {};
            let links = container.querySelectorAll("a");
            if (isSplitted && container2) {
                links = [...links, ...container2.querySelectorAll("a")];
            }
            for (const link of links) {
                let id = link.pathname.match(/\/(\d+)\//);
                if (!id) {
                    id = link.dataset.id;
                } else {
                    id = id[1];
                }
                ProviderGenius.getNote(id).then((note) => {
                    notes[id] = note;
                    link.classList.add("fetched");
                });
                link.onclick = (event) => {
                    event.preventDefault();
                    if (!notes[id]) return;
                    showNote(link, notes[id]);
                };
            }
        }, [lyrics, lyrics2]);

        const lyricsEl1 = react.createElement(
            "div",
            null,
            react.createElement(VersionSelector, { items: versions, index: versionIndex, callback: onVersionChange }),
            react.createElement("div", {
                className: "lyrics-lyricsContainer-LyricsLine lyrics-lyricsContainer-LyricsLine-active",
                ref: (c) => {
                    container = c;
                },
                dangerouslySetInnerHTML: {
                    __html: lyrics,
                },
                onContextMenu: (event) => {
                    event.preventDefault();
                    const copylyrics = lyrics.replace(/<br>/g, "\n").replace(/<[^>]*>/g, "");
                    Spicetify.Platform.ClipboardAPI.copy(copylyrics)
                        .then(() => Spicetify.showNotification("✓ Lyrics copied to clipboard", false, 2000))
                        .catch(() => Spicetify.showNotification("Failed to copy lyrics to clipboard", true, 2000));
                },
            })
        );

        const mainContainer = [lyricsEl1];
        const shouldSplit = versions.length > 1 && isSplitted;

        if (shouldSplit) {
            const lyricsEl2 = react.createElement(
                "div",
                null,
                react.createElement(VersionSelector, { items: versions, index: versionIndex2, callback: onVersionChange2 }),
                react.createElement("div", {
                    className: "lyrics-lyricsContainer-LyricsLine lyrics-lyricsContainer-LyricsLine-active",
                    ref: (c) => {
                        container2 = c;
                    },
                    dangerouslySetInnerHTML: {
                        __html: lyrics2,
                    },
                    onContextMenu: (event) => {
                        event.preventDefault();
                        const copylyrics = lyrics.replace(/<br>/g, "\n").replace(/<[^>]*>/g, "");
                        Spicetify.Platform.ClipboardAPI.copy(copylyrics)
                            .then(() => Spicetify.showNotification("✓ Lyrics copied to clipboard", false, 2000))
                            .catch(() => Spicetify.showNotification("Failed to copy lyrics to clipboard", true, 2000));
                    },
                })
            );
            mainContainer.push(lyricsEl2);
        }

        return react.createElement(
            "div",
            {
                className: "lyrics-lyricsContainer-UnsyncedLyricsPage",
            },
            react.createElement("p", {
                className: "lyrics-lyricsContainer-LyricsUnsyncedPadding main-type-ballad",
            }),
            react.createElement("div", { className: shouldSplit ? "split" : "" }, mainContainer),
            react.createElement(CreditFooter, {
                provider,
                copyright,
            }),
            react.createElement(SearchBar, null)
        );
    }
);
