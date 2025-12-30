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
        const credits = [Spicetify.Locale.get("web-player.lyrics.providedBy", provider)];
        if (copyright) {
            credits.push(...copyright.split("\n"));
        }
        return credits.join(" • ");
    }, [provider, copyright]);

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

// Translation status indicator - shows translating, success, or error states
const TranslatingIndicator = react.memo(({ isVisible, status, text = "Translating..." }) => {
    // Show if translating or has a status to display
    if (!isVisible && !status) return null;

    // Determine display state
    const isSuccess = status?.type === 'success';
    const isError = status?.type === 'error';
    const displayText = status?.text || text;
    const className = `lyrics-translating-indicator${isSuccess ? ' success' : ''}${isError ? ' error' : ''}`;

    return react.createElement(
        "div",
        { className },
        // Show spinner only when translating (not for success/error)
        isVisible && !status && react.createElement(
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
