// MiniLyrics.js — Inject synchronized lyrics into Spotify's PiP miniplayer
// Toggle via native PiP settings panel (fieldset[data-encore-id="formGroup"])
// Self-healing state management handles React re-renders

(function MiniLyricsInit() {
	if (!Spicetify?.Player?.data || !Spicetify?.Platform?.History) {
		setTimeout(MiniLyricsInit, 500);
		return;
	}

	// ── Constants ──────────────────────────────────────────────────────────
	const UPDATE_INTERVAL_MS = 300;
	const PIP_POLL_INTERVAL_MS = 1000;
	const LYRICS_PANEL_ID = "pip-lyrics-plus-panel";
	const HORIZ_OVERLAY_ID = "pip-lyrics-horiz-overlay";
	const TOGGLE_ID = "pip-lyrics-toggle-row";
	const SIZE_ID = "pip-lyrics-size-row";
	const STYLE_ID = "pip-lyrics-plus-style";
	const STORAGE_KEY = "lyrics-plus:pip-config";

	const QUEUE_SELECTORS = [
		"div.qubOuvMZTCFcwTN6U8tl",
		"div.Lhjl2jWI9gfBiVYBeuNi",
	];

	// ── State ─────────────────────────────────────────────────────────────
	/** @type {Window | null} */
	let pipWindow = null;
	/** @type {Document | null} */
	let pipDoc = null;
	/** @type {number | null} */
	let updateTimer = null;
	/** @type {number | null} */
	let pipPollTimer = null;
	/** @type {MutationObserver | null} */
	let settingsObserver = null;
	let lastActiveIdx = -1;
	let lastTrackUri = "";
	let lastLyricsRef = null; // Track lyrics array identity to detect source switch
	let cachedPanel = null; // Cached DOM refs to avoid querying every tick
	let cachedScrollEl = null;
	let lastFontSize = -1; // Avoid redundant style.setProperty calls
	
	// Default config
	const DEFAULT_CONFIG = {
		enabled: true,
		fontSize: 14,
		width: -1,
		height: -1,
	};

	let pipConfig = (() => {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
			return { ...DEFAULT_CONFIG, ...saved };
		} catch (e) {
			return DEFAULT_CONFIG;
		}
	})();

	function saveConfig() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(pipConfig));
	}

	let lyricsEnabled = pipConfig.enabled;
	let lyricFontSize = pipConfig.fontSize;

	// ── CSS ───────────────────────────────────────────────────────────────
	const PIP_CSS = `
		:root {
			--pip-lyric-font-size: 14px;
		}
		#${LYRICS_PANEL_ID} {
			display: flex;
			flex-direction: column;
			overflow: hidden;
			padding: 4px 12px;
			box-sizing: border-box;
			font-family: var(--font-family, CircularSp, sans-serif);
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-scroll {
			flex: 1;
			overflow-y: auto;
			overflow-x: hidden;
			scrollbar-width: none;
			-ms-overflow-style: none;
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-scroll::-webkit-scrollbar {
			display: none;
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-line {
			padding: 4px 0;
			font-size: calc(var(--pip-lyric-font-size) * 0.9);
			line-height: 1.4;
			color: var(--text-subdued, rgba(255,255,255,0.45));
			transition: color 0.25s ease, font-size 0.25s ease;
			cursor: pointer;
			user-select: none;
			text-shadow: 0 1px 4px rgba(0,0,0,0.7);
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-line:hover {
			color: rgba(255,255,255,0.7);
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-line.active {
			color: var(--text-base, #fff);
			font-size: var(--pip-lyric-font-size);
			font-weight: 600;
			text-shadow: 0 1px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.4);
		}
		#${LYRICS_PANEL_ID} .pip-line-main {
			display: block;
		}
		#${LYRICS_PANEL_ID} .pip-line-sub {
			display: block;
			font-size: calc(var(--pip-lyric-font-size) * 0.75);
			font-weight: 400;
			opacity: 0.6;
			margin-top: 1px;
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-line.active .pip-line-sub {
			opacity: 0.8;
		}
		#${LYRICS_PANEL_ID} .pip-lyrics-empty {
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 80px;
			color: var(--text-subdued, rgba(255,255,255,0.4));
			font-size: 12px;
			text-align: center;
			padding: 16px;
		}

		/* Queue hidden: opacity-based to keep React alive */
		.pip-queue-hidden {
			opacity: 0 !important;
			position: absolute !important;
			pointer-events: none !important;
			width: 0 !important;
			height: 0 !important;
			overflow: hidden !important;
		}

		/* Horizontal PiP: single-line lyrics overlay */
		#${HORIZ_OVERLAY_ID} {
			position: fixed;
			top: 50%;
			left: 0;
			right: 0;
			transform: translateY(-50%);
			background: transparent;
			padding: 4px 12px;
			pointer-events: none;
			z-index: 50;
			font-family: var(--font-family, CircularSp, sans-serif);
			text-align: center;
			transition: opacity 0.3s;
		}
		#${HORIZ_OVERLAY_ID} .horiz-main {
			color: var(--text-base, #fff);
			font-size: calc(var(--pip-lyric-font-size) * 0.9);
			font-weight: 600;
			line-height: 1.3;
			text-shadow: 0 1px 3px rgba(0,0,0,0.5);
		}
		#${HORIZ_OVERLAY_ID} .horiz-sub {
			color: var(--text-subdued, rgba(255,255,255,0.65));
			font-size: calc(var(--pip-lyric-font-size) * 0.75);
			line-height: 1.3;
			margin-top: 1px;
			text-shadow: 0 1px 3px rgba(0,0,0,0.5);
			white-space: pre-wrap; /* Preserve newlines if any */
		}

		ruby {
			ruby-position: over;
		}
		rt {
			font-size: 0.6em;
			line-height: normal;
			transform: translateY(-2px); /* Slight lift */
			opacity: 0.8;
			user-select: none;
		}
		rp { display: none; }
		
		/* Font size input styling */
		#${SIZE_ID} input[type="number"] {
			background: rgba(255,255,255,0.1);
			border: 1px solid transparent;
			border-radius: 4px;
			color: #fff;
			font-family: inherit;
			font-size: 12px;
			padding: 4px 0;
			width: 42px;
			text-align: center;
			transition: background 0.2s, border 0.2s;
			outline: none;
			margin-left: auto;
		}
		#${SIZE_ID} input[type="number"]:hover {
			background: rgba(255,255,255,0.2);
		}
		#${SIZE_ID} input[type="number"]:focus {
			background: rgba(255,255,255,0.2);
			border-color: #fff;
		}
		/* Hide spinner */
		#${SIZE_ID} input[type="number"]::-webkit-inner-spin-button,
		#${SIZE_ID} input[type="number"]::-webkit-outer-spin-button {
			-webkit-appearance: none;
			margin: 0;
		}
		#${SIZE_ID} .px-suffix {
			margin-left: 6px;
			color: var(--text-subdued, rgba(255,255,255,0.6));
			font-size: 12px;
		}
	`;

	// ── Lyrics helpers ────────────────────────────────────────────────────
	function parseFurigana(text) {
		if (!text) return "";
		const str = typeof text === "object" ? String(text) : text;
		
		// Case 1: Provider already returned <ruby> tags (e.g. Netease, Musixmatch)
		// Use Utils.rubyTextToHTML which whitelists only ruby/rt/rp tags, escaping all else
		if (str.includes("<ruby>")) {
			return window.Utils?.rubyTextToHTML?.(str) || escapeHTML(str);
		}
		
		// Case 2: Plain text with Kanji(Kana) parenthesized readings
		let safe = escapeHTML(str);
		const regex = /([\u4e00-\u9faf\u3400-\u4dbf]+)[(（]([\u3040-\u309f\u30a0-\u30ff]+)[)）]/g;
		return safe.replace(regex, "<ruby>$1<rt>$2</rt></ruby>");
	}

	function escapeHTML(str) {
		if (!str) return "";
		// Start by creating a text node to let browser handle basic escapes, 
		// but simple regex is faster and enough for lyrics
		return str.replace(/[&<>"']/g, function(m) {
			switch (m) {
				case "&": return "&amp;";
				case "<": return "&lt;";
				case ">": return "&gt;";
				case '"': return "&quot;";
				case "'": return "&#039;";
			}
			return m;
		});
	}

	function stripHTML(str) {
		if (!str) return "";
		return str.replace(/<[^>]*>?/gm, "");
	}
	
	function isNoteLine(text) {
		if (!text) return false;
		return /^[\s♪♩♫♬·•・。.、…~\-]+$/.test(text);
	}

	function findActiveLineIndex(lyrics, position) {
		if (!lyrics?.length) return -1;
		for (let i = lyrics.length - 1; i >= 0; i--) {
			if (lyrics[i] && position >= (lyrics[i].startTime || 0)) return i;
		}
		return 0;
	}

	// Helper to split lines like "Main Text(Translation)"
	// Note: Spicetify Lyrics Plus logic is complex, we use a global helper if available
	// or basic parsing.
	function getLineDisplayTexts(line) {
		if (window.Utils?.getDisplayTexts) {
			// Use the app's own helper (which respects display-mode prefs)
			const res = window.Utils.getDisplayTexts(
				line.text, 
				line.originalText || line.text, 
				line.text2
			);
			return res;
		}

		// Fallback
		let text = line.text;
		let originalText = line.originalText || line.text;
		
		if (originalText === text) originalText = null;
		if (text && !text.trim()) text = null;

		return { 
			mainText: text || originalText || "", 
			subText: null, 
			subText2: null 
		};
	}

	// ── PiP Detection ─────────────────────────────────────────────────────
	function initPiPDetection() {
		if (typeof documentPictureInPicture !== "undefined") {
			documentPictureInPicture.addEventListener("enter", (event) => {
				if (event.window) onPiPWindowFound(event.window);
			});
			if (documentPictureInPicture.window) {
				onPiPWindowFound(documentPictureInPicture.window);
			}
		}
		startPiPPolling();
		console.log("[Lyrics+] PiP MiniLyrics: initialized");
	}

	function startPiPPolling() {
		stopPiPPolling();
		pipPollTimer = setInterval(checkForPiPWindow, PIP_POLL_INTERVAL_MS);
	}

	function stopPiPPolling() {
		if (pipPollTimer) { clearInterval(pipPollTimer); pipPollTimer = null; }
	}

	function checkForPiPWindow() {
		if (typeof documentPictureInPicture !== "undefined") {
			const currentPiPWin = documentPictureInPicture.window;
			
			if (currentPiPWin) {
				// New window opened
				if (pipWindow !== currentPiPWin) {
					onPiPWindowFound(currentPiPWin);
				}
			} else if (pipWindow) {
				// Window previously existed but is now gone
				console.log("[Lyrics+] PiP MiniLyrics: Detected window closure via polling");
				cleanupPiP();
			}
		}
	}

	// ── PiP Window Lifecycle ──────────────────────────────────────────────
	function onPiPWindowFound(win) {
		if (pipWindow === win) return;
		cleanupPiP(true); // Pass true to skip animation restore during window swap
		pipWindow = win;
		pipDoc = win.document;
		console.log("[Lyrics+] PiP MiniLyrics: attaching to PiP window");

		injectStyles(pipDoc);
		// Force apply saved font size on new window
		pipDoc.documentElement.style.setProperty("--pip-lyric-font-size", lyricFontSize + "px");
		
		watchForSettingsPanel(pipDoc);
		startUpdateLoop();
		
		// Restore window size if saved
		if (pipConfig.width > 200 && pipConfig.height > 200) {
			try {
				// Some browsers block resizeTo in PiP, but we try anyway
				win.resizeTo(pipConfig.width, pipConfig.height);
			} catch (e) { /* ignore */ }
		}

		// Save window size on resize
		win.addEventListener("resize", () => {
			if (win.innerWidth > 200 && win.innerHeight > 200) {
				pipConfig.width = win.innerWidth;
				pipConfig.height = win.innerHeight;
				saveConfig();
			}
		});

		// Multiple fallback events to catch window close
		const onClose = () => {
			if (pipWindow === win) {
				console.log("[Lyrics+] PiP MiniLyrics: Detected window closure via event");
				cleanupPiP();
			}
		};
		win.addEventListener("pagehide", onClose);
		win.addEventListener("close", onClose);
		win.addEventListener("unload", onClose);
	}

	// ── Inject Styles ─────────────────────────────────────────────────────
	function injectStyles(doc) {
		if (doc.getElementById(STYLE_ID)) return;
		const style = doc.createElement("style");
		style.id = STYLE_ID;
		style.textContent = PIP_CSS;
		doc.head.appendChild(style);
	}

	// ── Find Queue Container ──────────────────────────────────────────────
	function findQueueInDocument(doc) {
		for (const sel of QUEUE_SELECTORS) {
			const el = doc.querySelector(sel);
			if (el) return el;
		}
		const lists = doc.querySelectorAll("[role='list']");
		for (const list of lists) {
			if (list.querySelector("[data-flip-id]")) return list.parentElement || list;
		}
		return null;
	}

	// ── Self-Healing State Management ─────────────────────────────────────
	// Only called when panel needs to be created or toggled.
	// NOT called every tick — cached refs handle the fast path.
	function maintainLyricsState(doc) {
		if (!doc?.body) return;

		const panel = doc.getElementById(LYRICS_PANEL_ID);
		const queueEl = findQueueInDocument(doc);

		if (lyricsEnabled) {
			if (queueEl && !queueEl.classList.contains("pip-queue-hidden")) {
				queueEl.classList.add("pip-queue-hidden");
			}
			if (!panel && queueEl) {
				createLyricsPanel(doc, queueEl);
			}
		} else {
			if (queueEl) {
				queueEl.classList.remove("pip-queue-hidden");
			}
			if (panel) {
				panel.remove();
				cachedPanel = null;
				cachedScrollEl = null;
				lastActiveIdx = -1;
			}
		}

		// Sync font size only when changed
		if (lyricFontSize !== lastFontSize) {
			lastFontSize = lyricFontSize;
			doc.documentElement.style.setProperty("--pip-lyric-font-size", lyricFontSize + "px");
		}
	}

	function createLyricsPanel(doc, queueEl) {
		const existing = doc.getElementById(LYRICS_PANEL_ID);
		if (existing) existing.remove();

		const queueParent = queueEl.parentElement;
		if (!queueParent) return;

		const panel = doc.createElement("div");
		panel.id = LYRICS_PANEL_ID;
		panel.innerHTML = `<div class="pip-lyrics-scroll"><div class="pip-lyrics-empty">Waiting for lyrics...</div></div>`;

		queueParent.insertBefore(panel, queueEl);
		lastActiveIdx = -1;

		panel.querySelector(".pip-lyrics-scroll").addEventListener("click", (e) => {
			const lineEl = e.target.closest(".pip-lyrics-line");
			if (!lineEl) return;
			const startTime = Number(lineEl.dataset.startTime);
			if (!isNaN(startTime) && startTime >= 0) {
				Spicetify.Player.seek(startTime);
			}
		});

		console.log("[Lyrics+] PiP MiniLyrics: lyrics panel created");
	}

	// ── Settings Panel Toggle Injection ───────────────────────────────────
	// Watches for the native PiP settings panel (fieldset[data-encore-id="formGroup"])
	// and injects a "Lyrics" toggle by cloning the "Queue" toggle label.
	function watchForSettingsPanel(doc) {
		if (settingsObserver) { settingsObserver.disconnect(); settingsObserver = null; }

		settingsObserver = new MutationObserver(() => {
			tryInjectSettingsToggle(doc);
		});

		settingsObserver.observe(doc.body, { childList: true, subtree: true });
	}

	function tryInjectSettingsToggle(doc) {
		// Already injected
		if (doc.getElementById(TOGGLE_ID)) return;

		// Find the settings fieldset using exact Spotify selector
		const fieldset = doc.querySelector('fieldset[data-encore-id="formGroup"]');
		if (!fieldset) return;

		// Find the Queue toggle label
		const allToggles = fieldset.querySelectorAll('label[data-encore-id="formToggle"]');
		let queueLabel = null;
		for (const label of allToggles) {
			const text = label.textContent?.trim();
			if (text?.includes("Queue") || text?.includes("Sub panel")) {
				queueLabel = label;
				break;
			}
		}
		if (!queueLabel) return;

		// Rename original Queue label to "Sub panel"
		const queueSpans = queueLabel.querySelectorAll("span");
		for (const span of queueSpans) {
			if (span.textContent?.trim() === "Queue") {
				span.textContent = "Sub panel";
				break;
			}
		}

		// Clone for identical visual appearance
		const lyricsLabel = queueLabel.cloneNode(true);
		lyricsLabel.id = TOGGLE_ID;

		// Set cloned label text to "Queue / Lyrics"
		const spans = lyricsLabel.querySelectorAll("span");
		for (const span of spans) {
			if (span.textContent?.trim() === "Sub panel") {
				span.textContent = "Queue / Lyrics";
				break;
			}
		}

		// Sync checkbox state
		const checkbox = lyricsLabel.querySelector('input[type="checkbox"]');
		if (checkbox) {
			checkbox.checked = lyricsEnabled;
		}

		// Handle click on this label
		// cloneNode doesn't carry React event listeners, so this is safe.
		// We stop propagation to prevent any parent handlers from firing.
		lyricsLabel.addEventListener("click", (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
			e.preventDefault();

			lyricsEnabled = !lyricsEnabled;
			pipConfig.enabled = lyricsEnabled;
			saveConfig();

			// Update checkbox visual state
			const cb = lyricsLabel.querySelector('input[type="checkbox"]');
			if (cb) cb.checked = lyricsEnabled;

			// Apply immediately
			maintainLyricsState(doc);
		}, true);

		// Insert after Queue label inside the fieldset
		queueLabel.after(lyricsLabel);
		
		// ── Inject Font Size Slider ──
		if (!doc.getElementById(SIZE_ID)) {
			// Clone queueLabel again for the slider row structure
			const sizeRow = queueLabel.cloneNode(true);
			sizeRow.id = SIZE_ID;
			
			// Clean up content to make it a slider row
			// Remove the toggle switch part (wrapper and checkbox)
			const wrapper = sizeRow.querySelector('.Wrapper-sc-16y5c87-0'); // Wrapper-essentialBrightAccent class prefix
			if (wrapper) wrapper.remove();
			const cb = sizeRow.querySelector('input[type="checkbox"]');
			if (cb) cb.remove();
			
			// Change label text
			const spans = sizeRow.querySelectorAll("span");
			for (const span of spans) {
				if (span.textContent?.trim() === "Sub panel") {
					span.textContent = "Font size";
					break;
				}
			}

			// Add number input
			const input = doc.createElement("input");
			input.type = "number";
			input.min = "10";
			input.max = "42";
			input.value = lyricFontSize;
			// Inline styles removed in favor of CSS block above
			
			// Add 'px' suffix
			const pxSpan = doc.createElement("span");
			pxSpan.className = "px-suffix";
			pxSpan.textContent = "px";

			// Prevent label click from doing weird things
			sizeRow.style.cursor = "default";
			sizeRow.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });

			input.addEventListener("input", (e) => {
				e.stopPropagation();
				lyricFontSize = parseInt(e.target.value);
				if (isNaN(lyricFontSize)) return;
				
				pipConfig.fontSize = lyricFontSize;
				saveConfig();
				
				doc.documentElement.style.setProperty("--pip-lyric-font-size", lyricFontSize + "px");
			});

			// Prevent keypress propagation (e.g. spacebar pausing music while typing)
			input.addEventListener("keydown", (e) => { e.stopPropagation(); });

			sizeRow.appendChild(input);
			sizeRow.appendChild(pxSpan);
			lyricsLabel.after(sizeRow);
		}

		console.log("[Lyrics+] PiP MiniLyrics: settings toggle injected");
	}

	// ── Update Loop ───────────────────────────────────────────────────────
	function startUpdateLoop() {
		stopUpdateLoop();
		updateTimer = setInterval(updateLyrics, UPDATE_INTERVAL_MS);
	}

	function stopUpdateLoop() {
		if (updateTimer) { clearInterval(updateTimer); updateTimer = null; }
	}

	// ── Horizontal/Vertical Mode Detection ────────────────────────────────
	function isHorizontalMode() {
		if (!pipWindow) return false;
		return pipWindow.innerWidth > pipWindow.innerHeight;
	}

	function updateLyrics() {
		if (!pipDoc?.body) { cleanupPiP(); return; }

		const horizontal = isHorizontalMode();

		if (horizontal) {
			updateHorizontalLyrics();
		} else {
			// Remove horizontal overlay if switching to vertical
			const hOverlay = pipDoc.getElementById(HORIZ_OVERLAY_ID);
			if (hOverlay) hOverlay.remove();

			// Vertical mode: use cached refs for fast path
			if (!cachedPanel || !cachedPanel.isConnected) {
				// Panel missing or detached (React re-render) — run full state check
				maintainLyricsState(pipDoc);
				cachedPanel = pipDoc.getElementById(LYRICS_PANEL_ID);
				cachedScrollEl = cachedPanel?.querySelector(".pip-lyrics-scroll") || null;
			} else if (lyricFontSize !== lastFontSize) {
				// Only sync font size when changed
				lastFontSize = lyricFontSize;
				pipDoc.documentElement.style.setProperty("--pip-lyric-font-size", lyricFontSize + "px");
			}
			if (!lyricsEnabled) return;

			const panel = cachedPanel;
			if (!panel) return;

			const scrollEl = cachedScrollEl;
			if (!scrollEl) return;

			const lc = window.lyricContainer;
			if (!lc?.state) {
				renderEmpty(scrollEl, "Open Lyrics Plus once to activate");
				return;
			}

			// Detect track change → clear stale lyrics immediately
			const playerUri = Spicetify.Player.data?.item?.uri || "";
			if (playerUri && playerUri !== lastTrackUri) {
				lastTrackUri = playerUri;
				lastActiveIdx = -1;
				renderEmpty(scrollEl, "Loading lyrics...");
				// Don't return — check if lyrics are already available below
			}

			// Show loading if main app is still fetching
			if (lc.state.isLoading) {
				renderEmpty(scrollEl, "Loading lyrics...");
				return;
			}

			// Guard: lyrics state URI must match current track
			const stateUri = lc.state.uri || "";
			if (playerUri && stateUri && playerUri !== stateUri) {
				renderEmpty(scrollEl, "Loading lyrics...");
				return;
			}

			const lyrics = lc.state.currentLyrics || lc.state.synced;
			if (!lyrics?.length) {
				renderEmpty(scrollEl, "♪ No lyrics available");
				return;
			}

			// Force re-render if lyrics source changed (e.g. translations loaded)
			if (lyrics !== lastLyricsRef) {
				lastLyricsRef = lyrics;
				lastActiveIdx = -1;
			}

			const delay = (CONFIG?.visual?.["global-delay"] || 0) + (CONFIG?.visual?.delay || 0);
			const position = Spicetify.Player.getProgress() + delay;
			const activeIdx = findActiveLineIndex(lyrics, position);
			if (activeIdx < 0) return;

			const linesBefore = CONFIG?.visual?.["lines-before"] ?? 2;
			const linesAfter = CONFIG?.visual?.["lines-after"] ?? 2;
			const startIndex = Math.max(activeIdx - linesBefore, 0);
			const endIndex = Math.min(activeIdx + linesAfter + 1, lyrics.length);
			const windowedLyrics = lyrics.slice(startIndex, endIndex);
			const activeInWindow = activeIdx - startIndex;

			if (activeIdx !== lastActiveIdx) {
				lastActiveIdx = activeIdx;
				rebuildLyricsLines(scrollEl, windowedLyrics, activeInWindow);
			}
		}
	}

	// ── Horizontal Mode: Single-line overlay ──────────────────────────────
	function updateHorizontalLyrics() {
		if (!lyricsEnabled) {
			const el = pipDoc.getElementById(HORIZ_OVERLAY_ID);
			if (el) el.remove();
			return;
		}

		const lc = window.lyricContainer;
		if (!lc?.state) return;

		// Detect track change → reset active index
		const playerUri = Spicetify.Player.data?.item?.uri || "";
		if (playerUri && playerUri !== lastTrackUri) {
			lastTrackUri = playerUri;
			lastActiveIdx = -1;
		}

		// Skip if loading or lyrics belong to wrong track
		if (lc.state.isLoading) return;
		const stateUri = lc.state.uri || "";
		if (playerUri && stateUri && playerUri !== stateUri) return;

		const lyrics = lc.state.currentLyrics || lc.state.synced;
		if (!lyrics?.length) return;

		// Force re-render if lyrics source changed (e.g. translations loaded)
		if (lyrics !== lastLyricsRef) {
			lastLyricsRef = lyrics;
			lastActiveIdx = -1;
		}

		const delay = (CONFIG?.visual?.["global-delay"] || 0) + (CONFIG?.visual?.delay || 0);
		const position = Spicetify.Player.getProgress() + delay;
		const activeIdx = findActiveLineIndex(lyrics, position);
		if (activeIdx < 0) return;
		if (activeIdx === lastActiveIdx) return;
		lastActiveIdx = activeIdx;

		const line = lyrics[activeIdx];
		const { mainText, subText, subText2 } = getLineDisplayTexts(line);
		const displayMain = isNoteLine(mainText) ? "♪" : mainText;

		let overlay = pipDoc.getElementById(HORIZ_OVERLAY_ID);
		if (!overlay) {
			overlay = pipDoc.createElement("div");
			overlay.id = HORIZ_OVERLAY_ID;
			pipDoc.body.appendChild(overlay);
		}

		// Use parseFurigana for main text (it escapes safe chars then adds ruby tags)
		let html = `<div class="horiz-main">${parseFurigana(displayMain)}</div>`;
		
		const sub = subText || subText2;
		if (sub && stripHTML(sub) !== displayMain) {
			// Sub text might also have furigana or ruby tags? 
			// Usually translation doesn't have furigana. Escape it safely.
			html += `<div class="horiz-sub">${escapeHTML(stripHTML(sub))}</div>`;
		}
		overlay.innerHTML = html;
	}

	function renderEmpty(scrollEl, message) {
		const emptyEl = scrollEl.querySelector(".pip-lyrics-empty");
		if (emptyEl) {
			if (emptyEl.textContent !== message) emptyEl.textContent = message;
			return;
		}
		scrollEl.innerHTML = `<div class="pip-lyrics-empty">${escapeHTML(message)}</div>`;
		lastActiveIdx = -1;
	}

	function rebuildLyricsLines(scrollEl, lyrics, activeInWindow) {
		const targetDoc = pipDoc || document;
		const fragment = targetDoc.createDocumentFragment();

		for (let i = 0; i < lyrics.length; i++) {
			const line = lyrics[i];
			const { mainText, subText, subText2 } = getLineDisplayTexts(line);
			const displayMain = isNoteLine(mainText) ? "♪" : mainText;
			const isActive = i === activeInWindow;

			const lineEl = targetDoc.createElement("div");
			lineEl.className = `pip-lyrics-line${isActive ? " active" : ""}`;
			
			// Use parseFurigana
			let html = `<span class="pip-line-main">${parseFurigana(displayMain)}</span>`;
			
			if (subText && stripHTML(subText) !== displayMain) {
				html += `<span class="pip-line-sub">${escapeHTML(stripHTML(subText))}</span>`;
			}
			if (subText2 && stripHTML(subText2) !== displayMain && stripHTML(subText2) !== stripHTML(subText)) {
				html += `<span class="pip-line-sub">${escapeHTML(stripHTML(subText2))}</span>`;
			}
			lineEl.innerHTML = html;
			
			// Click to seek
			if (line.startTime) {
				lineEl.onclick = () => {
					Spicetify.Player.seek(line.startTime);
				};
			}

			fragment.appendChild(lineEl);
		}

		scrollEl.innerHTML = "";
		scrollEl.appendChild(fragment);
	}

	// ── Cleanup ───────────────────────────────────────────────────────────
	function cleanupPiP(isSwapping = false) {
		stopUpdateLoop();
		if (settingsObserver) { settingsObserver.disconnect(); settingsObserver = null; }

		if (pipDoc) {
			const panel = pipDoc.getElementById(LYRICS_PANEL_ID);
			if (panel) panel.remove();

			const hOverlay = pipDoc.getElementById(HORIZ_OVERLAY_ID);
			if (hOverlay) hOverlay.remove();

			const toggle = pipDoc.getElementById(TOGGLE_ID);
			if (toggle) toggle.remove();

			const sizeRow = pipDoc.getElementById(SIZE_ID);
			if (sizeRow) sizeRow.remove();

			const hiddenQueues = pipDoc.querySelectorAll(".pip-queue-hidden");
			for (const q of hiddenQueues) {
				q.classList.remove("pip-queue-hidden");
			}
		}

		pipDoc = null;
		cachedPanel = null;
		cachedScrollEl = null;
		pipWindow = null;
		lastActiveIdx = -1;
		lastFontSize = -1;

		// ── Restore animations by reloading web view (Chromium PiP bug) ──
		// Only restore if PiP is TRULY closed (not during window swap)
		if (!isSwapping) {
			setTimeout(() => {
				// The Chromium compositor corruption from documentPictureInPicture
				// is at the process level — no CSS/DOM/React fix works.
				// location.reload() reloads the web view without killing Spotify.
				console.log("[Lyrics+] PiP closed: Reloading web view to fix Chromium animation corruption");
				location.reload();
			}, 500);
		}

	}

	// ── Keyboard shortcut (Ctrl+Shift+M) ──────────────────────────────────
	document.addEventListener("keydown", (e) => {
		if (e.ctrlKey && e.shiftKey && e.key === "M") {
			e.preventDefault();
			lyricsEnabled = !lyricsEnabled;
			pipConfig.enabled = lyricsEnabled;
			saveConfig();
			if (pipDoc) maintainLyricsState(pipDoc);
		}
	});

	// ── Initialize ────────────────────────────────────────────────────────
	initPiPDetection();

	window.MiniLyrics = {
		cleanup: cleanupPiP,
		reinject: () => { cleanupPiP(); checkForPiPWindow(); },
		toggle: () => {
			lyricsEnabled = !lyricsEnabled;
			pipConfig.enabled = lyricsEnabled;
			saveConfig();
			if (pipDoc) maintainLyricsState(pipDoc);
		},
	};
})();
