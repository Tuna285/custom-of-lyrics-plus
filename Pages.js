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
const IdlingIndicator = react.memo(({ isActive = false, progress = 0, delay = 0 }) => {
	const className = useMemo(() => 
		`lyrics-idling-indicator ${!isActive ? "lyrics-idling-indicator-hidden" : ""} lyrics-lyricsContainer-LyricsLine lyrics-lyricsContainer-LyricsLine-active`,
		[isActive]
	);

	const style = useMemo(() => ({
		"--position-index": 0,
		"--animation-index": 1,
		"--indicator-delay": `${delay}ms`,
	}), [delay]);

	// Memoize circle states to avoid unnecessary re-renders
	const circleStates = useMemo(() => [
		progress >= 0.05 ? "active" : "",
		progress >= 0.33 ? "active" : "",
		progress >= 0.66 ? "active" : ""
	], [progress]);

	return react.createElement(
		"div",
		{ className, style },
		react.createElement("div", { className: `lyrics-idling-indicator__circle ${circleStates[0]}` }),
		react.createElement("div", { className: `lyrics-idling-indicator__circle ${circleStates[1]}` }),
		react.createElement("div", { className: `lyrics-idling-indicator__circle ${circleStates[2]}` })
	);
});

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

	const lyricWithEmptyLines = useMemo(
		() =>
			[emptyLine, emptyLine, ...lyrics].map((line, i) => ({
				...line,
				lineNumber: i,
			})),
		[lyrics]
	);

	const lyricsId = useMemo(() => lyrics[0]?.text || "no-lyrics", [lyrics]);

	// Optimize active line calculation with memoization
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
		// 3 lines = 1 padding top + 1 padding bottom + 1 active
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
				},
				key: lyricsId,
			},
			activeLines.map(({ text, lineNumber, startTime, originalText, text2 }, i) => {
				if (i === 1 && activeLineIndex === 1) {
					const nextLine = activeLines[2];
					const nextStartTime = nextLine?.startTime || 1;
					return react.createElement(IdlingIndicator, {
						progress: position / nextStartTime,
						delay: nextStartTime / 3,
					});
				}

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
				const displayMode = CONFIG.visual["translate:display-mode"];
				const showTranslatedBelow = displayMode === "below";
				const replaceOriginal = displayMode === "replace";
				
				let mainText = text;
				let subText = null;
				let subText2 = null;

				if (showTranslatedBelow && originalText) {
					mainText = originalText;
					subText = text;
					subText2 = text2;
				} else if (replaceOriginal) {
					// When replacing original, show translations
					mainText = text || originalText;
					subText = text2; // Show Mode 2 translation as sub-text
					subText2 = null;
				}

				if (isActive) {
					ref = activeLineEle;
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

class SearchBar extends react.Component {
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
}

function isInViewport(element) {
	const rect = element.getBoundingClientRect();
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
}

const SyncedExpandedLyricsPage = react.memo(({ lyrics, provider, copyright, isKara }) => {
	const [position, setPosition] = useState(0);
	const activeLineRef = useRef(null);
	const pageRef = useRef(null);

	useTrackPosition(() => {
		if (!Spicetify.Player.data.is_paused) {
			setPosition(Spicetify.Player.getProgress() + CONFIG.visual["global-delay"] + CONFIG.visual.delay);
		}
	});

	const padded = useMemo(() => [emptyLine, ...lyrics], [lyrics]);

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
			if (i === 0) {
				const nextLine = padded[1];
				const nextStartTime = nextLine?.startTime || 1;
				return react.createElement(IdlingIndicator, {
					isActive: activeLineIndex === 0,
					progress: position / nextStartTime,
					delay: nextStartTime / 3,
				});
			}

			const isActive = i === activeLineIndex;
			const displayMode = CONFIG.visual["translate:display-mode"];
			const showTranslatedBelow = displayMode === "below";
			const replaceOriginal = displayMode === "replace";
			
			let mainText = text;
			let subText = null;
			let subText2 = null;

			if (showTranslatedBelow && originalText) {
				mainText = originalText;
				subText = text;
				subText2 = text2;
			} else if (replaceOriginal) {
				// When replacing original, show translations
				mainText = text || originalText;
				subText = text2; // Show Mode 2 translation as sub-text
				subText2 = null;
			}

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

			const paddingLine = (animationIndex < 0 && -animationIndex > CONFIG.visual["lines-before"]) || animationIndex > CONFIG.visual["lines-after"];
			if (paddingLine) {
				className += " lyrics-lyricsContainer-LyricsLine-paddingLine";
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

const UnsyncedLyricsPage = react.memo(({ lyrics, provider, copyright }) => {
	// For very long lyrics (>100 lines), use lighter rendering
	const isLongLyrics = lyrics.length > 100;
	const [renderRange, setRenderRange] = useState({ start: 0, end: isLongLyrics ? 50 : lyrics.length });
	const containerRef = useRef();
	const lyricsRefs = useRef([]);
	const [isAutoScrolling, setIsAutoScrolling] = useState(false);
	const autoScrollTimeoutRef = useRef();
	const lastManualScrollTime = useRef(0);
	const lastScrolledIndex = useRef(-1);
	const lastAutoScrollTime = useRef(0);
	
	// Smart auto-scroll based on track progress
	useTrackPosition(() => {
		// Check if auto-scroll is enabled
		if (!CONFIG.visual["unsynced-auto-scroll"]) return;
		if (!containerRef.current || lyrics.length === 0) return;
		
		const currentTime = Spicetify.Player.getProgress();
		const duration = Spicetify.Player.getDuration();
		
		if (!duration || duration === 0) return;
		
		// Check if user manually scrolled recently (within last 5 seconds)
		const now = Date.now();
		if (now - lastManualScrollTime.current < 5000) return;
		
		// Throttle auto-scroll updates (only every 2 seconds)
		if (now - lastAutoScrollTime.current < 2000) return;
		
		// Calculate which line should be visible based on progress
		const progress = currentTime / duration;
		const estimatedLineIndex = Math.floor(progress * lyrics.length);
		const targetIndex = Math.min(Math.max(0, estimatedLineIndex), lyrics.length - 1);
		
		// Only scroll if target changed significantly (at least 3 lines difference)
		if (Math.abs(targetIndex - lastScrolledIndex.current) < 3) return;
		
		// Scroll to estimated line with ultra-smooth animation
		const targetLine = lyricsRefs.current[targetIndex];
		if (targetLine && !Spicetify.Player.data.is_paused) {
			lastScrolledIndex.current = targetIndex;
			lastAutoScrollTime.current = now;
			setIsAutoScrolling(true);
			
			// Use custom smooth scroll with better easing
			const container = containerRef.current;
			const targetTop = targetLine.offsetTop;
			const containerHeight = container.clientHeight;
			const targetScrollTop = targetTop - (containerHeight / 2) + (targetLine.clientHeight / 2);
			
			// Smooth scroll with custom easing
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
			
			// Reset auto-scroll flag after animation
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
			const displayMode = CONFIG.visual["translate:display-mode"];
			const showTranslatedBelow = displayMode === "below";
			const replaceOriginal = displayMode === "replace";
			
			// Determine what to show as main text
			let lineText;
			if (showTranslatedBelow && originalText) {
				lineText = originalText;
			} else if (replaceOriginal) {
				lineText = text || originalText;
			} else {
				lineText = text;
			}

			// Convert lyrics to text for comparison
			const belowOrigin = (typeof originalText === "object" ? originalText?.props?.children?.[0] : originalText)?.replace(/\s+/g, "");
			const belowTxt = (typeof text === "object" ? text?.props?.children?.[0] : text)?.replace(/\s+/g, "");

			// Show sub-lines in "below" mode or when we have Mode 2 translation in either mode
			const belowMode = showTranslatedBelow && originalText && belowOrigin !== belowTxt;
			const showMode2 = !!text2 && (showTranslatedBelow || replaceOriginal);

			return react.createElement(
				"div",
				{
					className: "lyrics-lyricsContainer-LyricsLine lyrics-lyricsContainer-LyricsLine-active",
					key: actualIndex,
					dir: "auto",
					ref: (el) => {
						if (el) lyricsRefs.current[actualIndex] = el;
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
noteDivider.innerHTML = `<svg width="32" height="32" viewBox="0 0 13 4" fill="currentColor"><path d=\"M13 10L8 4.206 3 10z\"/></svg>`;
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
