// Components.js - Shared UI Components

// Helper: note/placeholder-only line (e.g., ♪, …)
const isNoteLine = (text) => {
    const t = String(text || "").trim();
    if (!t) return false; // Empty lines are NOT note lines
    return /^[\s♪♩♫♬·•・。.、…~\-]+$/.test(t);
};

// Optimized CreditFooter with better memoization
const CreditFooter = react.memo(({ provider, copyright }) => {
    if (provider === "local" || !provider) return null;

    const credit = useMemo(() => {
        const credits = [getText("ui.providedBy", { provider })];
        if (copyright) {
            credits.push(...copyright.split("\n"));
        }
        return credits.join(" • ");
    }, [provider, copyright, CONFIG.visual["ui-language"]]);

    return react.createElement(
        "p",
        {
            className: "lyrics-lyricsContainer-Provider main-type-mesto",
            dir: "auto",
        },
        credit
    );
});

// Optimized IdlingIndicator with memoization and performance improvements
const IdlingIndicator = react.memo(react.forwardRef(({
    isActive = false,
    progress = 0,
    delay = 0,
    positionIndex = 0,
    animationIndex = 1,
    blurIndex = 0,
    isPadding = false,
    isExiting = false
}, ref) => {
    // Always show indicator, just change active state
    const className = useMemo(() =>
        `lyrics-idling-indicator lyrics-lyricsContainer-LyricsLine ${isActive ? "lyrics-lyricsContainer-LyricsLine-active" : ""} ${isPadding ? "lyrics-lyricsContainer-LyricsLine-paddingLine" : ""} ${isExiting ? "lyrics-idling-indicator-exiting" : ""}`,
        [isActive, isPadding, isExiting]
    );

    const style = useMemo(() => ({
        "--position-index": positionIndex,
        "--animation-index": animationIndex,
        "--blur-index": blurIndex,
        "--indicator-delay": `${delay}ms`,
    }), [delay, positionIndex, animationIndex, blurIndex]);

    // Memoize circle states to avoid unnecessary re-renders
    const circleStates = useMemo(() => [
        progress >= 0.05 ? "active" : "",
        progress >= 0.33 ? "active" : "",
        progress >= 0.66 ? "active" : ""
    ], [progress]);

    return react.createElement(
        "div",
        { className, style, ref },
        react.createElement("div", { className: `lyrics-idling-indicator__circle ${circleStates[0]}` }),
        react.createElement("div", { className: `lyrics-idling-indicator__circle ${circleStates[1]}` }),
        react.createElement("div", { className: `lyrics-idling-indicator__circle ${circleStates[2]}` })
    );
}));

const emptyLine = {
    startTime: 0,
    endTime: 0,
    text: [],
};

const useTrackPosition = (callback) => {
    const callbackRef = useRef();
    const rafIdRef = useRef();
    callbackRef.current = callback;

    useEffect(() => {
        let lastTime = 0;
        const updatePosition = (currentTime) => {
            // Throttle to ~60fps (16ms) instead of running every frame
            if (currentTime - lastTime >= 16) {
                callbackRef.current();
                lastTime = currentTime;
            }
            rafIdRef.current = requestAnimationFrame(updatePosition);
        };

        rafIdRef.current = requestAnimationFrame(updatePosition);

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);
};

const KaraokeLine = ({ text, isActive, position, startTime }) => {
    if (!isActive) {
        return text.map(({ word }) => word).join("");
    }

    return text.map(({ word, time }) => {
        const isWordActive = position >= startTime;
        startTime += time;
        return react.createElement(
            "span",
            {
                className: `lyrics-lyricsContainer-Karaoke-Word${isWordActive ? " lyrics-lyricsContainer-Karaoke-WordActive" : ""}`,
                style: {
                    "--word-duration": `${time}ms`,
                    // don't animate unless we have to
                    transition: !isWordActive ? "all 0s linear" : "",
                },
            },
            word
        );
    });
};

const SearchBar = class SearchBar extends react.Component {
    constructor() {
        super();
        this.state = {
            hidden: true,
            atNode: 0,
            foundNodes: [],
        };
        this.container = null;
    }

    componentDidMount() {
        this.viewPort = document.querySelector(".main-view-container .os-viewport");
        this.mainViewOffsetTop = document.querySelector(".Root__main-view").offsetTop;
        this.toggleCallback = () => {
            if (!(Spicetify.Platform.History.location.pathname === "/lyrics-plus" && this.container)) return;

            if (this.state.hidden) {
                this.setState({ hidden: false });
                this.container.focus();
            } else {
                this.setState({ hidden: true });
                this.container.blur();
            }
        };
        this.unFocusCallback = () => {
            this.container.blur();
            this.setState({ hidden: true });
        };
        this.loopThroughCallback = (event) => {
            if (!this.state.foundNodes.length) {
                return;
            }

            if (event.key === "Enter") {
                const dir = event.shiftKey ? -1 : 1;
                let atNode = this.state.atNode + dir;
                if (atNode < 0) {
                    atNode = this.state.foundNodes.length - 1;
                }
                atNode %= this.state.foundNodes.length;
                const rects = this.state.foundNodes[atNode].getBoundingClientRect();
                this.viewPort.scrollBy(0, rects.y - 100);
                this.setState({ atNode });
            }
        };

        Spicetify.Mousetrap().bind("mod+shift+f", this.toggleCallback);
        Spicetify.Mousetrap(this.container).bind("mod+shift+f", this.toggleCallback);
        Spicetify.Mousetrap(this.container).bind("enter", this.loopThroughCallback);
        Spicetify.Mousetrap(this.container).bind("shift+enter", this.loopThroughCallback);
        Spicetify.Mousetrap(this.container).bind("esc", this.unFocusCallback);
    }

    componentWillUnmount() {
        Spicetify.Mousetrap().unbind("mod+shift+f", this.toggleCallback);
        Spicetify.Mousetrap(this.container).unbind("mod+shift+f", this.toggleCallback);
        Spicetify.Mousetrap(this.container).unbind("enter", this.loopThroughCallback);
        Spicetify.Mousetrap(this.container).unbind("shift+enter", this.loopThroughCallback);
        Spicetify.Mousetrap(this.container).unbind("esc", this.unFocusCallback);
    }

    getNodeFromInput(event) {
        const value = event.target.value.toLowerCase();
        if (!value) {
            this.setState({ foundNodes: [] });
            this.viewPort.scrollTo(0, 0);
            return;
        }

        const lyricsPage = document.querySelector(".lyrics-lyricsContainer-UnsyncedLyricsPage");
        const walker = document.createTreeWalker(
            lyricsPage,
            NodeFilter.SHOW_TEXT,
            (node) => {
                if (node.textContent.toLowerCase().includes(value)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            },
            false
        );

        const foundNodes = [];
        while (walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            foundNodes.push(range);
        }

        if (!foundNodes.length) {
            this.viewPort.scrollBy(0, 0);
        } else {
            const rects = foundNodes[0].getBoundingClientRect();
            this.viewPort.scrollBy(0, rects.y - 100);
        }

        this.setState({ foundNodes, atNode: 0 });
    }

    render() {
        let y = 0;
        let height = 0;
        if (this.state.foundNodes.length) {
            const node = this.state.foundNodes[this.state.atNode];
            const rects = node.getBoundingClientRect();
            y = rects.y + this.viewPort.scrollTop - this.mainViewOffsetTop;
            height = rects.height;
        }
        return react.createElement(
            "div",
            {
                className: `lyrics-Searchbar${this.state.hidden ? " hidden" : ""}`,
            },
            react.createElement("input", {
                ref: (c) => {
                    this.container = c;
                },
                onChange: this.getNodeFromInput.bind(this),
            }),
            react.createElement("svg", {
                width: 16,
                height: 16,
                viewBox: "0 0 16 16",
                fill: "currentColor",
                dangerouslySetInnerHTML: {
                    __html: Spicetify.SVGIcons.search,
                },
            }),
            react.createElement(
                "span",
                {
                    hidden: this.state.foundNodes.length === 0,
                },
                `${this.state.atNode + 1}/${this.state.foundNodes.length}`
            ),
            react.createElement("div", {
                className: "lyrics-Searchbar-highlight",
                style: {
                    "--search-highlight-top": `${y}px`,
                    "--search-highlight-height": `${height}px`,
                },
            })
        );
    }
};

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

const VersionSelector = react.memo(({ items, index, callback }) => {
    if (items.length < 2) {
        return null;
    }
    return react.createElement(
        "div",
        {
            className: "lyrics-versionSelector",
        },
        react.createElement(
            "select",
            {
                onChange: (event) => {
                    callback(items, event.target.value);
                },
                value: index,
            },
            items.map((a, i) => {
                return react.createElement("option", { value: i }, a.title);
            })
        ),
        react.createElement(
            "svg",
            {
                height: "16",
                width: "16",
                fill: "currentColor",
                viewBox: "0 0 16 16",
            },
            react.createElement("path", {
                d: "M3 6l5 5.794L13 6z",
            })
        )
    );
});

const LoadingIcon = react.createElement(
    "svg",
    {
        width: "200px",
        height: "200px",
        viewBox: "0 0 100 100",
        preserveAspectRatio: "xMidYMid",
    },
    react.createElement(
        "circle",
        {
            cx: "50",
            cy: "50",
            r: "0",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
        },
        react.createElement("animate", {
            attributeName: "r",
            repeatCount: "indefinite",
            dur: "1s",
            values: "0;40",
            keyTimes: "0;1",
            keySplines: "0 0.2 0.8 1",
            calcMode: "spline",
            begin: "0s",
        }),
        react.createElement("animate", {
            attributeName: "opacity",
            repeatCount: "indefinite",
            dur: "1s",
            values: "1;0",
            keyTimes: "0;1",
            keySplines: "0.2 0 0.8 1",
            calcMode: "spline",
            begin: "0s",
        })
    ),
    react.createElement(
        "circle",
        {
            cx: "50",
            cy: "50",
            r: "0",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
        },
        react.createElement("animate", {
            attributeName: "r",
            repeatCount: "indefinite",
            dur: "1s",
            values: "0;40",
            keyTimes: "0;1",
            keySplines: "0 0.2 0.8 1",
            calcMode: "spline",
            begin: "-0.5s",
        }),
        react.createElement("animate", {
            attributeName: "opacity",
            repeatCount: "indefinite",
            dur: "1s",
            values: "1;0",
            keyTimes: "0;1",
            keySplines: "0.2 0 0.8 1",
            calcMode: "spline",
            begin: "-0.5s",
        })
    )
);

// Translation status indicator - shows translating, in-progress message, success, or error
const TranslatingIndicator = react.memo(({ isVisible, status, text = getText("ui.translating") }) => {
    // Show if translating or has a status to display
    if (!isVisible && !status) return null;

    // Determine display state
    const isSuccess = status?.type === 'success';
    const isError = status?.type === 'error';
    const isProgress = status?.type === 'progress';
    const displayText = status?.text || text;
    const className = `lyrics-translating-indicator${isSuccess ? ' success' : ''}${isError ? ' error' : ''}`;
    const showSpinner = (isVisible && !status) || isProgress;

    return react.createElement(
        "div",
        { className },
        showSpinner && react.createElement(
            "div",
            { className: "lyrics-translating-spinner" },
            react.createElement("div", { className: "lyrics-translating-dot" }),
            react.createElement("div", { className: "lyrics-translating-dot" }),
            react.createElement("div", { className: "lyrics-translating-dot" })
        ),
        // Show check icon for success
        isSuccess && react.createElement("span", { className: "lyrics-translating-icon" }, "✓"),
        // Show X icon for error
        isError && react.createElement("span", { className: "lyrics-translating-icon error" }, "✗"),
        react.createElement("span", { className: "lyrics-translating-text" }, displayText)
    );
});

/** Lucide "sparkles" (viewBox 24×24) — universally read as "AI / thinking" */
const REASONING_ICON_PATHS = [
    "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
    "M20 3v4",
    "M22 5h-4",
    "M4 17v2",
    "M5 18H3",
];

/**
 * Translating pill + optional reasoning button (same corner row). Reasoning appears after the model returns stripped &lt;thought&gt; / similar blocks.
 */
const TranslatingIndicatorRow = react.memo(
    ({
        isVisible,
        status,
        text = getText("ui.translating"),
        reasoningStreams = {},
        onReasoningClick,
        isReasoningOpen = false,
    }) => {
        const showPill = isVisible || !!status;
        const hasReasoningText = !!(
            (reasoningStreams.translation && reasoningStreams.translation.trim()) ||
            (reasoningStreams.phonetic && reasoningStreams.phonetic.trim())
        );
        // Brain only shows alongside the active pill. Once translation finishes the pill (and brain) disappear; the modal — if user opened it — stays open independently.
        const showBrain = showPill;
        if (!showPill) return null;

        return react.createElement(
            "div",
            { className: "lyrics-translating-indicator-row" },
            showPill &&
                react.createElement(TranslatingIndicator, {
                    isVisible,
                    status,
                    text,
                }),
            showBrain &&
                react.createElement(
                    "div",
                    {
                        role: "button",
                        tabIndex: 0,
                        className: `lyrics-reasoning-icon-btn${isReasoningOpen ? " is-open" : ""}${isVisible && !hasReasoningText ? " is-pending" : ""}`,
                        title: getText("tooltips.viewReasoning"),
                        "aria-label": getText("tooltips.viewReasoning"),
                        "aria-expanded": !!isReasoningOpen,
                        // Fire on pointerdown so Electron drag/hover overlays can't swallow the click
                        onPointerDown: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try { onReasoningClick && onReasoningClick(); } catch (_) {}
                        },
                        onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        },
                        onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                try { onReasoningClick && onReasoningClick(); } catch (_) {}
                            }
                        },
                    },
                    react.createElement(
                        "svg",
                        {
                            width: 16,
                            height: 16,
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            "aria-hidden": true,
                            style: { pointerEvents: "none" },
                        },
                        ...REASONING_ICON_PATHS.map((d, i) => react.createElement("path", { key: i, d }))
                    )
                )
        );
    }
);

/** Small chip: background LLM work for the upcoming track (pre-translate). */
const PreTranslateChip = react.memo(({ chip, currentUri, enabled }) => {
    if (!enabled || !chip?.uri || chip.uri === currentUri) return null;
    const title = (chip.title && String(chip.title).trim()) || chip.uri.split(":").pop() || "—";
    return react.createElement(
        "div",
        {
            className: "lyrics-pretranslate-chip",
            title: getText("tooltips.preTranslateChip"),
        },
        react.createElement("span", { className: "lyrics-pretranslate-chip-pulse" }),
        react.createElement("span", { className: "lyrics-pretranslate-chip-text" }, getText("ui.preTranslateChip", { title }))
    );
});

window.TranslatingIndicator = TranslatingIndicator;
window.TranslatingIndicatorRow = TranslatingIndicatorRow;
window.PreTranslateChip = PreTranslateChip;

/**
 * Track the bounding rect of the active lyrics container so a portal'd overlay can
 * be positioned over the lyrics-plus area (instead of floating in the viewport corner).
 */
const useLyricsContainerRect = () => {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        let raf = 0;
        let stopped = false;
        const update = () => {
            if (stopped) return;
            // Prefer the deepest visible lyrics container (handles fullscreen / fad / normal)
            const candidates = [
                document.querySelector("#lyrics-fullscreen-container .lyrics-lyricsContainer-LyricsContainer"),
                document.querySelector(".lyrics-lyricsContainer-LyricsContainer.fad-enabled"),
                document.querySelector(".lyrics-lyricsContainer-LyricsContainer"),
            ].filter(Boolean);
            const el = candidates.find((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
            if (!el) {
                setRect((prev) => (prev ? null : prev));
                return;
            }
            const r = el.getBoundingClientRect();
            setRect((prev) => {
                if (!prev) return r;
                if (
                    Math.abs(prev.top - r.top) < 0.5 &&
                    Math.abs(prev.right - r.right) < 0.5 &&
                    Math.abs(prev.width - r.width) < 0.5 &&
                    Math.abs(prev.height - r.height) < 0.5
                ) return prev;
                return r;
            });
        };
        const tick = () => { update(); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        const onResize = () => update();
        window.addEventListener("resize", onResize);
        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return rect;
};

/**
 * Portal-rendered indicator stack pinned to the top-right corner of the lyrics container.
 * Solves both the click-being-swallowed issue (escapes lyrics overlay tree) and the
 * "floating outside the lyrics area" issue (position recomputed every frame).
 */
const TranslationStatusOverlay = ({
    isVisible,
    status,
    reasoningStreams,
    onReasoningClick,
    isReasoningOpen,
    preTranslateChip,
    currentUri,
    preTranslateEnabled,
}) => {
    const rect = useLyricsContainerRect();
    if (!rect) return null;
    const reactDOMRef = (typeof Spicetify !== "undefined" && Spicetify.ReactDOM) || window.ReactDOM;
    if (!reactDOMRef || !reactDOMRef.createPortal || typeof document === "undefined") return null;

    const style = {
        position: "fixed",
        top: `${Math.round(rect.top + 20)}px`,
        left: `${Math.round(rect.right - 24)}px`,
        transform: "translateX(-100%)",
        zIndex: 2147483000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
        pointerEvents: "auto",
        WebkitAppRegion: "no-drag",
        isolation: "isolate",
    };

    const node = react.createElement(
        "div",
        { className: "lyrics-translation-status-stack", style },
        react.createElement(TranslatingIndicatorRow, {
            isVisible,
            status,
            reasoningStreams,
            onReasoningClick,
            isReasoningOpen,
        }),
        react.createElement(PreTranslateChip, {
            chip: preTranslateChip,
            currentUri,
            enabled: !!preTranslateEnabled,
        })
    );
    return reactDOMRef.createPortal(node, document.body);
};

window.TranslationStatusOverlay = TranslationStatusOverlay;

/**
 * Draggable reasoning window (modelTest.html-style):
 *  - Header is the drag handle
 *  - Body auto-scrolls to bottom while user is near the bottom (sticky tail)
 *  - Close button collapses
 *  - Initial position: anchored just under the brain icon (top-right of lyrics area)
 */
const REASONING_TAB_LABELS = {
    translation: () => getText("ui.reasoningTabTranslation") || "Translation",
    phonetic: () => getText("ui.reasoningTabPhonetic") || "Phonetic",
};

// Persisted geometry key — survives close, song change, and Spotify restart.
const REASONING_WINDOW_GEOMETRY_KEY = "lyrics-plus:reasoning-window-geometry";

const ReasoningWindow = ({ open, streams = {}, activeTab, onTabChange, isStreaming, onClose, anchorRect }) => {
    const reactDOMRef = (typeof Spicetify !== "undefined" && Spicetify.ReactDOM) || window.ReactDOM;

    // Build the list of available tabs from streams that have content
    const availableTabs = useMemo(() => {
        const tabs = [];
        for (const key of ["translation", "phonetic"]) {
            const v = streams[key];
            if (v && String(v).trim()) tabs.push(key);
        }
        return tabs;
    }, [streams.translation, streams.phonetic]);

    // Effective active tab — fall back to first available
    const effectiveTab = useMemo(() => {
        if (activeTab && availableTabs.includes(activeTab)) return activeTab;
        return availableTabs[0] || activeTab || null;
    }, [activeTab, availableTabs]);

    // Compute a sensible initial geometry based on the anchor container.
    // Used as fallback when no persisted geometry exists in localStorage.
    const initialGeometry = useMemo(() => {
        const vw = window.innerWidth || 1280;
        const vh = window.innerHeight || 800;

        const anchorW = anchorRect?.width || vw;
        const anchorH = anchorRect?.height || vh;
        const w = Math.round(Math.max(300, Math.min(420, anchorW * 0.38)));
        const h = Math.round(Math.max(240, Math.min(380, anchorH * 0.5)));

        let top, left;
        if (anchorRect) {
            top = Math.round(anchorRect.bottom - h - 20);
            left = Math.round(anchorRect.right - w - 20);
        } else {
            top = vh - h - 80;
            left = vw - w - 32;
        }

        // Clamp to viewport (8px safety margin)
        top = Math.max(8, Math.min(vh - h - 8, top));
        left = Math.max(8, Math.min(vw - w - 8, left));

        return { top, left, w, h };
    }, [anchorRect?.bottom, anchorRect?.right, anchorRect?.width, anchorRect?.height]);

    // Load persisted geometry once on mount, clamped to current viewport so a smaller
    // window after restart never leaves the panel hidden off-screen.
    const loadPersistedGeometry = () => {
        try {
            const raw = localStorage.getItem(REASONING_WINDOW_GEOMETRY_KEY);
            if (!raw) return null;
            const saved = JSON.parse(raw);
            if (!saved || typeof saved !== "object") return null;
            const vw = window.innerWidth || 1280;
            const vh = window.innerHeight || 800;
            const w = Math.max(260, Math.min(720, Number(saved.w) || initialGeometry.w));
            const h = Math.max(180, Math.min(640, Number(saved.h) || initialGeometry.h));
            const top = Math.max(8, Math.min(vh - h - 8, Number(saved.top) || initialGeometry.top));
            const left = Math.max(8, Math.min(vw - w - 8, Number(saved.left) || initialGeometry.left));
            return { top, left, w, h };
        } catch (_) {
            return null;
        }
    };

    const [pos, setPos] = useState(() => {
        const persisted = loadPersistedGeometry();
        return persisted
            ? { top: persisted.top, left: persisted.left }
            : { top: initialGeometry.top, left: initialGeometry.left };
    });
    const [size, setSize] = useState(() => {
        const persisted = loadPersistedGeometry();
        return persisted
            ? { w: persisted.w, h: persisted.h }
            : { w: initialGeometry.w, h: initialGeometry.h };
    });
    const dragRef = useRef(null);
    const bodyRef = useRef(null);
    const stickToBottomRef = useRef(true);
    const wasOpenRef = useRef(false);

    // Persist geometry whenever it changes so the window restores to the same spot
    // across closes, song changes, and Spotify restarts.
    useEffect(() => {
        try {
            localStorage.setItem(
                REASONING_WINDOW_GEOMETRY_KEY,
                JSON.stringify({ top: pos.top, left: pos.left, w: size.w, h: size.h })
            );
        } catch (_) { /* ignore quota errors */ }
    }, [pos.top, pos.left, size.w, size.h]);

    // Reset sticky flag each time the window re-opens (geometry is preserved across opens).
    useEffect(() => {
        if (open && !wasOpenRef.current) {
            stickToBottomRef.current = true;
        }
        wasOpenRef.current = open;
    }, [open]);

    // When user switches tabs, snap back to bottom (sticky again)
    useEffect(() => {
        stickToBottomRef.current = true;
    }, [effectiveTab]);

    // Pointer-based drag (works on mouse + touch + Spotify Electron)
    const onHeaderPointerDown = useCallback((e) => {
        if (e.target && e.target.closest && e.target.closest(".reasoning-window-close")) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startTop = pos.top;
        const startLeft = pos.left;
        const onMove = (ev) => {
            const nx = ev.clientX - startX;
            const ny = ev.clientY - startY;
            setPos({
                top: Math.max(8, Math.min((window.innerHeight || 800) - 60, startTop + ny)),
                left: Math.max(8, Math.min((window.innerWidth || 1200) - 80, startLeft + nx)),
            });
        };
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }, [pos.top, pos.left]);

    // Resize from bottom-right corner
    const onResizePointerDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = size.w;
        const startH = size.h;
        const onMove = (ev) => {
            const nw = Math.max(260, Math.min(720, startW + (ev.clientX - startX)));
            const nh = Math.max(180, Math.min(640, startH + (ev.clientY - startY)));
            setSize({ w: nw, h: nh });
        };
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }, [size.w, size.h]);

    // Detect manual scroll to disable auto-stick
    const onBodyScroll = useCallback(() => {
        const el = bodyRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distFromBottom < 24;
    }, []);

    const currentText = effectiveTab ? (streams[effectiveTab] || "") : "";

    // Auto-scroll to latest token while sticky (re-runs on content + tab change)
    useEffect(() => {
        if (!open) return;
        const el = bodyRef.current;
        if (!el) return;
        if (stickToBottomRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [currentText, open, effectiveTab]);

    if (!open) return null;
    if (!reactDOMRef || !reactDOMRef.createPortal || typeof document === "undefined") return null;

    const text = currentText.trim();
    const placeholder = !text
        ? (isStreaming ? getText("ui.reasoningPending") : getText("ui.reasoningEmpty"))
        : "";

    // Tab bar appears whenever there is more than one stream OR streaming is active (so user can preview the in-flight task)
    const showTabs = availableTabs.length > 1 || (isStreaming && availableTabs.length >= 1);

    const tabBar = showTabs && react.createElement(
        "div",
        { className: "reasoning-window-tabs" },
        ...availableTabs.map((key) => {
            const isActive = key === effectiveTab;
            const labelFn = REASONING_TAB_LABELS[key];
            const label = labelFn ? labelFn() : key;
            return react.createElement(
                "button",
                {
                    key,
                    type: "button",
                    className: `reasoning-window-tab${isActive ? " is-active" : ""}`,
                    onPointerDown: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isActive) onTabChange && onTabChange(key);
                    },
                    onClick: (e) => { e.preventDefault(); e.stopPropagation(); },
                },
                label
            );
        })
    );

    const node = react.createElement(
        "div",
        {
            ref: dragRef,
            className: "reasoning-window",
            style: {
                top: `${pos.top}px`,
                left: `${pos.left}px`,
                width: `${size.w}px`,
                height: `${size.h}px`,
            },
            onClick: (e) => e.stopPropagation(),
        },
        react.createElement(
            "div",
            {
                className: "reasoning-window-header",
                onPointerDown: onHeaderPointerDown,
            },
            react.createElement(
                "div",
                { className: "reasoning-window-title" },
                react.createElement(
                    "span",
                    { className: `reasoning-window-dot${isStreaming ? " is-live" : ""}`, "aria-hidden": "true" }
                ),
                react.createElement("span", { className: "reasoning-window-title-text" }, getText("ui.reasoningTitle"))
            ),
            react.createElement(
                "button",
                {
                    type: "button",
                    className: "reasoning-window-close",
                    "aria-label": "Close",
                    onPointerDown: (e) => { e.preventDefault(); e.stopPropagation(); onClose && onClose(); },
                    onClick: (e) => { e.preventDefault(); e.stopPropagation(); },
                },
                "×"
            )
        ),
        tabBar,
        react.createElement(
            "div",
            {
                ref: bodyRef,
                className: "reasoning-window-body",
                onScroll: onBodyScroll,
            },
            placeholder
                ? react.createElement("p", { className: "reasoning-window-placeholder" }, placeholder)
                : text
        ),
        react.createElement("div", {
            className: "reasoning-window-resize",
            onPointerDown: onResizePointerDown,
        })
    );

    return reactDOMRef.createPortal(node, document.body);
};

window.ReasoningWindow = ReasoningWindow;
