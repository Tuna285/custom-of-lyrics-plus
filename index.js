// Run "npm i @types/react" to have this type package available in workspace
/// <reference types="react" />
/// <reference path="../../globals.d.ts" />

/** @type {React} */
const react = Spicetify.React;
const { useState, useEffect, useCallback, useMemo, useRef } = react;
/** @type {import("react").ReactDOM} */
const reactDOM = Spicetify.ReactDOM;
const spotifyVersion = Spicetify.Platform.version;

function render() {
	// Check for updates silently on startup (once per 24h)
	setTimeout(() => UpdateChecker.checkForUpdates(true), 3000);
	return react.createElement(LyricsContainer, null);
}

// Config, Cache, and RateLimiter have been moved to their own modules.


let lyricContainerUpdate;
let reloadLyrics;

const fontSizeLimit = { min: 16, max: 256, step: 4 };

const thresholdSizeLimit = { min: 0, max: 100, step: 5 };

//Lyrics Container
class LyricsContainer extends react.Component {
	constructor() {
		super();
		this.state = {
			karaoke: null,
			synced: null,
			unsynced: null,
			genius: null,
			genius2: null,
			currentLyrics: null,
			romaji: null,
			furigana: null,
			hiragana: null,
			hangul: null,
			romaja: null,
			katakana: null,
			cn: null,
			hk: null,
			tw: null,
			musixmatchTranslation: null,
			neteaseTranslation: null,
			uri: "",
			provider: "",
			colors: {
				background: "",
				inactive: "",
			},
			tempo: "0.25s",
			explicitMode: -1,
			lockMode: CONFIG.locked,
			mode: -1,
			isLoading: false,
			versionIndex: 0,
			versionIndex2: 0,
			isFullscreen: false,
			isFADMode: false,
			isCached: false,
			language: null,
			isTranslating: false,
			translationStatus: null, // { type: 'success'|'error', text: string }
		};
		this.currentTrackUri = "";
		this.nextTrackUri = "";
		this.availableModes = [];
		this.styleVariables = {};
		this.fullscreenContainer = document.createElement("div");
		this.fullscreenContainer.id = "lyrics-fullscreen-container";
		this.mousetrap = null;
		this.containerRef = react.createRef(null);
		this.fileInputRef = react.createRef(null);
		this.translator = null;
		this.initMoustrap();
		//Cache last state
		this.languageOverride = CONFIG.visual["translate:detect-language-override"];
		this.reRenderLyricsPage = false;
		this.displayMode = null;

		//Prevent infinite render loops
		this.lastProcessedUri = null;
		this.lastProcessedMode = null;

		//Pre-translation state
		this.pretranslatedUri = null;
		this.pretranslateInterval = null;
	}

	infoFromTrack(track) {
		const meta = track?.metadata;
		if (!meta) {
			return null;
		}
		return {
			duration: Number(meta.duration),
			album: meta.album_title,
			artist: meta.artist_name,
			title: meta.title,
			uri: track.uri,
			image: meta.image_url,
		};
	}

	async fetchColors(uri) {
		let vibrant = 0;
		try {
			try {
				const { fetchExtractedColorForTrackEntity } = Spicetify.GraphQL.Definitions;
				const { data } = await Spicetify.GraphQL.Request(fetchExtractedColorForTrackEntity, { uri });
				const { hex } = data.trackUnion.albumOfTrack.coverArt.extractedColors.colorDark;
				vibrant = Number.parseInt(hex.replace("#", ""), 16);
			} catch {
				const colors = await Spicetify.CosmosAsync.get(`https://spclient.wg.spotify.com/colorextractor/v1/extract-presets?uri=${uri}&format=json`);
				vibrant = colors.entries[0].color_swatches.find((color) => color.preset === "VIBRANT_NON_ALARMING").color;
			}
		} catch {
			vibrant = 8747370;
		}

		this.setState({
			colors: {
				background: Utils.convertIntToRGB(vibrant),
				inactive: Utils.convertIntToRGB(vibrant, 3),
			},
		});
	}

	async fetchTempo(uri) {
		const audio = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/audio-features/${uri.split(":")[2]}`);
		let tempo = audio.tempo;

		const MIN_TEMPO = 60;
		const MAX_TEMPO = 150;
		const MAX_PERIOD = 0.4;
		if (!tempo) tempo = 105;
		if (tempo < MIN_TEMPO) tempo = MIN_TEMPO;
		if (tempo > MAX_TEMPO) tempo = MAX_TEMPO;

		let period = MAX_PERIOD - ((tempo - MIN_TEMPO) / (MAX_TEMPO - MIN_TEMPO)) * MAX_PERIOD;
		period = Math.round(period * 100) / 100;

		this.setState({
			tempo: `${String(period)}s`,
		});
	}

	async tryServices(trackInfo, mode = -1) {
		const currentMode = CONFIG.modes[mode] || "";
		let finalData = { ...emptyState, uri: trackInfo.uri };
		for (const id of CONFIG.providersOrder) {
			const service = CONFIG.providers[id];
			if (spotifyVersion >= "1.2.31" && id === "genius") continue;
			if (!service.on) continue;
			if (mode !== -1 && !service.modes.includes(mode)) continue;

			let data;
			try {
				data = await Providers[id](trackInfo);
			} catch (e) {
				console.error(e);
				continue;
			}

			if (data.error || (!data.karaoke && !data.synced && !data.unsynced && !data.genius)) continue;
			if (mode === -1) {
				finalData = data;
				return finalData;
			}

			if (!data[currentMode]) {
				for (const key in data) {
					if (!finalData[key]) {
						finalData[key] = data[key];
					}
				}
				continue;
			}

			for (const key in data) {
				if (!finalData[key]) {
					finalData[key] = data[key];
				}
			}

			if (data.provider !== "local" && finalData.provider && finalData.provider !== data.provider) {
				const styledMode = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
				finalData.copyright = `${styledMode} lyrics provided by ${data.provider}\n${finalData.copyright || ""}`.trim();
			}

			if (finalData.musixmatchTranslation && typeof finalData.musixmatchTranslation[0].startTime === "undefined" && finalData.synced) {
				finalData.musixmatchTranslation = finalData.synced.map((line) => ({
					...line,
					text:
						finalData.musixmatchTranslation.find((l) => Utils.processLyrics(l?.originalText || "") === Utils.processLyrics(line?.text || ""))?.text ?? (line?.text || ""),
				}));
			}

			return finalData;
		}

		return finalData;
	}

	async fetchLyrics(track, mode = -1, refresh = false) {
		const info = this.infoFromTrack(track);
		if (!info) {
			this.setState({ error: "No track info" });
			return;
		}

		//Keep artist/title for prompts
		this.setState({ artist: info.artist, title: info.title });

		let isCached = this.lyricsSaved(info.uri);

		this.fetchColors(info.uri);

		this.fetchTempo(info.uri);
		this.resetDelay();

		let tempState;
		//If lyrics are cached
		if ((mode === -1 && CACHE[info.uri]) || CACHE[info.uri]?.[CONFIG.modes?.[mode]]) {
			tempState = { ...CACHE[info.uri], isCached };
			if (CACHE[info.uri]?.mode) {
				this.state.explicitMode = CACHE[info.uri]?.mode;
				tempState = { ...tempState, mode: CACHE[info.uri]?.mode };
			}
		} else {
			//Save current mode before loading to maintain UI consistency
			const currentMode = this.getCurrentMode();
			this.lastModeBeforeLoading = currentMode !== -1 ? currentMode : SYNCED;
			this.setState({ ...emptyState, isLoading: true, isCached: false });

			try {
				const resp = await this.tryServices(info, mode);

				// Critical check: Ensure we are still on the same track before updating state
				if (info.uri !== this.currentTrackUri) return;

				if (resp.provider) {
					// Cache lyrics
					CacheManager.set(resp.uri, resp);
					//Auto-save to localStorage (persistent)
					this.saveLocalLyrics(resp.uri, resp);
				}

				// Logic for manual cache to localStorage
				isCached = this.lyricsSaved(resp.uri);

				// Handle rapid track skipping to prevent setting wrong lyrics
				if (resp.uri === this.currentTrackUri) {
					tempState = { ...resp, isLoading: false, isCached };
				} else {
					return;
				}
			} catch (e) {
				console.error("[Lyrics+] Fetch error:", e);
				this.setState({ error: "Failed to load lyrics", isLoading: false });
				return;
			}
		}

		if (!tempState) return;

		// Final safety check
		if (info.uri !== this.currentTrackUri) return;

		let finalMode = mode;
		if (mode === -1) {
			if (this.state.explicitMode !== -1 && this.state.explicitMode !== KARAOKE) {
				finalMode = this.state.explicitMode;
			} else if (this.state.lockMode !== -1 && this.state.lockMode !== KARAOKE) {
				finalMode = this.state.lockMode;
			} else {
				// Auto switch (karaoke disabled): prefer synced, then unsynced, then genius
				if (tempState.synced) {
					finalMode = SYNCED;
				} else if (tempState.unsynced) {
					finalMode = UNSYNCED;
				} else if (tempState.genius) {
					finalMode = GENIUS;
				}
			}
		}

		// Handle song change or refresh requests
		if (tempState.uri !== this.state.uri || refresh) {
			// Detect language from new lyrics data
			let defaultLanguage = null;
			if (tempState.synced) {
				defaultLanguage = Utils.detectLanguage(tempState.synced);
			} else if (tempState.unsynced) {
				defaultLanguage = Utils.detectLanguage(tempState.unsynced);
			} else if (tempState.genius) {
				//For genius lyrics, we need to convert HTML to text first
				const geniusText = tempState.genius.replace(/<br>/g, "\n").replace(/<[^>]*>/g, "");
				defaultLanguage = Utils.detectLanguage([{ text: geniusText }]);
			}

			//Debug logging
			if (window.lyricsPlusDebug) {
				console.log("fetchLyrics language detection:", {
					uri: tempState.uri,
					defaultLanguage,
					hasSynced: !!tempState.synced,
					hasUnsynced: !!tempState.unsynced,
					hasGenius: !!tempState.genius
				});
			}

			// Reset state and apply, preserving cached translations if any
			// Set currentLyrics immediately with original lyrics so UI renders while translation runs
			const initialCurrentLyrics = tempState.currentLyrics || tempState.synced || tempState.unsynced || [];
			this.setState({
				furigana: null,
				romaji: null,
				hiragana: null,
				katakana: null,
				hangul: null,
				romaja: null,
				cn: null,
				hk: null,
				tw: null,
				musixmatchTranslation: null,
				neteaseTranslation: null,
				...tempState,
				language: defaultLanguage,
				currentLyrics: initialCurrentLyrics,
				//Preserve cached translations if they exist in tempState
				...(tempState.romaji && { romaji: tempState.romaji }),
				...(tempState.furigana && { furigana: tempState.furigana }),
				...(tempState.hiragana && { hiragana: tempState.hiragana }),
				...(tempState.katakana && { katakana: tempState.katakana }),
				...(tempState.hangul && { hangul: tempState.hangul }),
				...(tempState.romaja && { romaja: tempState.romaja }),
				...(tempState.cn && { cn: tempState.cn }),
				...(tempState.hk && { hk: tempState.hk }),
				...(tempState.tw && { tw: tempState.tw }),
				...(tempState.musixmatchTranslation && { musixmatchTranslation: tempState.musixmatchTranslation }),
				...(tempState.neteaseTranslation && { neteaseTranslation: tempState.neteaseTranslation }),
			});
			return;
		}

		//Preserve cached translations when not changing songs
		const initialCurrentLyrics2 = tempState.currentLyrics || tempState.synced || tempState.unsynced || [];
		this.setState({
			...tempState,
			currentLyrics: initialCurrentLyrics2,
			//Preserve cached translations if they exist in tempState
			...(tempState.romaji && { romaji: tempState.romaji }),
			...(tempState.furigana && { furigana: tempState.furigana }),
			...(tempState.hiragana && { hiragana: tempState.hiragana }),
			...(tempState.katakana && { katakana: tempState.katakana }),
			...(tempState.hangul && { hangul: tempState.hangul }),
			...(tempState.romaja && { romaja: tempState.romaja }),
			...(tempState.cn && { cn: tempState.cn }),
			...(tempState.hk && { hk: tempState.hk }),
			...(tempState.tw && { tw: tempState.tw }),
			...(tempState.musixmatchTranslation && { musixmatchTranslation: tempState.musixmatchTranslation }),
			...(tempState.neteaseTranslation && { neteaseTranslation: tempState.neteaseTranslation }),
		});
	}

	lyricsSource(lyricsState, mode) {
		if (!lyricsState) return;

		let lyrics = lyricsState[CONFIG.modes[mode]];
		//Fallback: if the preferred mode has no lyrics, use any available lyrics
		if (!lyrics) {
			lyrics = lyricsState.synced || lyricsState.unsynced || lyricsState.genius || null;
			if (!lyrics) {
				this.setState({ currentLyrics: [] });
				return;
			}
		}

		//Clean up any existing progress flags from previous songs
		const currentUri = lyricsState.uri;
		if (this.lastCleanedUri !== currentUri) {
			//Remove all progress flags
			Object.keys(this).forEach(key => {
				if (key.includes(':inProgress')) {
					delete this[key];
				}
			});
			//Reset per-track progressive results
			this._dmResults = {};

			//Clean up inflight requests for OLD tracks only, keep current track
			if (this._inflightGemini) {
				const keysToDelete = [];
				this._inflightGemini.forEach((value, key) => {
					//Key format: "uri:mode:style:pronoun", only delete if URI doesn't match current
					if (!key.startsWith(currentUri + ':')) {
						keysToDelete.push(key);
					}
				});
				keysToDelete.forEach(key => this._inflightGemini.delete(key));
			}

			this.lastCleanedUri = currentUri;
		}

		//Handle translation and display modes efficiently
		const originalLanguage = this.provideLanguageCode(lyrics);
		let friendlyLanguage = null;

		if (originalLanguage) {
			try {
				friendlyLanguage = new Intl.DisplayNames(["en"], { type: "language" }).of(originalLanguage.split("-")[0])?.toLowerCase();
			} catch (error) {
				console.warn("Failed to get friendly language name:", error);
			}
		}

		// Debug logging for troubleshooting
		if (window.lyricsPlusDebug) {
			console.log("Language detection debug:", {
				originalLanguage,
				friendlyLanguage,
				lyricsLength: lyrics?.length,
				firstLineText: lyrics?.[0]?.text?.substring(0, 50),
				languageOverride: CONFIG.visual["translate:detect-language-override"],
				stateLanguage: this.state.language
			});
		}

		// For Gemini mode, use generic keys if no specific language detected
		const provider = CONFIG.visual["translate:translated-lyrics-source"];
		const modeKey = provider === "geminiVi" && !friendlyLanguage ? "gemini" : friendlyLanguage;

		const displayMode1 = CONFIG.visual[`translation-mode:${modeKey}`];
		const displayMode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];

		this.language = originalLanguage;
		this.displayMode = displayMode1; // Keep for legacy compatibility
		this.displayMode2 = displayMode2;

		const processMode = async (mode, baseLyrics) => {
			if (!mode || mode === "none") return null;
			try {
				if (String(mode).startsWith("gemini")) {
					return await this.getGeminiTranslation(lyricsState, baseLyrics, mode);
				} else {
					return await this.getTraditionalConversion(lyricsState, baseLyrics, originalLanguage, mode);
				}
			} catch (error) {
				const modeDisplayName = mode === "gemini_romaji" ? "Romaji, Romaja, Pinyin translation" : "Vietnamese translation";
				Spicetify.showNotification(`${modeDisplayName} failed: ${error.message || "Unknown error"}`, true, 4000);
				return null; // Return null on failure
			}
		};

		const { uri } = lyricsState; // Capture the URI for this specific request

		// If no display modes are active, just optimize the original lyrics (e.g., to handle note lines)
		if ((!displayMode1 || displayMode1 === "none") && (!displayMode2 || displayMode2 === "none")) {
			const optimizedLyrics = this.optimizeTranslations(lyrics, null, null);
			this.setState({ currentLyrics: Array.isArray(optimizedLyrics) ? optimizedLyrics : [] });
			return;
		}

		// Progressive loading: keep results per track so Mode 1 does not disappear when Mode 2 finishes
		this._dmResults[currentUri] = this._dmResults[currentUri] || { mode1: null, mode2: null };
		let lyricsMode1 = this._dmResults[currentUri].mode1;
		let lyricsMode2 = this._dmResults[currentUri].mode2;

		const updateCombinedLyrics = () => {
			// Guard clause to prevent race conditions from previous songs
			if (this.state.uri !== uri) {
				return;
			}
			// Smart deduplication and optimization
			const optimizedTranslations = this.optimizeTranslations(lyrics, lyricsMode1, lyricsMode2);
			this.setState({ currentLyrics: Array.isArray(optimizedTranslations) ? optimizedTranslations : [] });
		};

		// If both modes already have results (e.g., from pre-translation), update UI immediately
		if (lyricsMode1 || lyricsMode2) {
			updateCombinedLyrics();
		} else {
			// No cache yet - show original lyrics immediately so UI isn't blank while waiting for translation
			const optimizedOriginal = this.optimizeTranslations(lyrics, null, null);
			this.setState({ currentLyrics: Array.isArray(optimizedOriginal) ? optimizedOriginal : [] });
		}

		// Start both requests, but don't wait for both to finish to update UI
		const promise1 = processMode(displayMode1, lyrics);
		const promise2 = processMode(displayMode2, lyrics);

		promise1.then(result => {
			// Early exit if track changed while translating
			if (this.state.uri !== uri) return;
			lyricsMode1 = result;
			if (this._dmResults?.[currentUri]) this._dmResults[currentUri].mode1 = result;
			updateCombinedLyrics();
		}).catch(error => {
			if (this.state.uri !== uri) return;
			console.warn("Display Mode 1 translation failed:", error.message);
			updateCombinedLyrics();
		});

		promise2.then(result => {
			// Early exit if track changed while translating
			if (this.state.uri !== uri) return;
			lyricsMode2 = result;
			if (this._dmResults?.[currentUri]) this._dmResults[currentUri].mode2 = result;
			updateCombinedLyrics();
		}).catch(error => {
			if (this.state.uri !== uri) return;
			console.warn("Display Mode 2 translation failed:", error.message);
			updateCombinedLyrics();
		});

		// Auto-save cache after all translations complete
		Promise.allSettled([promise1, promise2]).then(() => {
			// Only save if still on the same track
			if (this.state.uri !== uri) {
				console.log(`[Lyrics+] Skip cache - track changed`);
				return;
			}

			const currentLyrics = this.state.currentLyrics;
			if (!currentLyrics || currentLyrics.length === 0) {
				console.log(`[Lyrics+] Skip cache - no currentLyrics`);
				return;
			}

			// Validate line count matches original lyrics
			const originalLyrics = lyricsState.synced || lyricsState.unsynced || [];
			const originalCount = Array.isArray(originalLyrics) ? originalLyrics.length : 0;
			const translatedCount = currentLyrics.length;

			if (originalCount > 0 && translatedCount !== originalCount) {
				console.warn(`[Lyrics+] Skip cache - line count mismatch: original=${originalCount}, translated=${translatedCount}`);
				return;
			}

			// All validations passed - cache immediately
			const fullData = {
				synced: lyricsState.synced,
				unsynced: lyricsState.unsynced,
				provider: lyricsState.provider,
				copyright: lyricsState.copyright,
				uri: uri,
				// Include all translation data from state
				romaji: this.state.romaji,
				furigana: this.state.furigana,
				hiragana: this.state.hiragana,
				katakana: this.state.katakana,
				hangul: this.state.hangul,
				romaja: this.state.romaja,
				cn: this.state.cn,
				hk: this.state.hk,
				tw: this.state.tw,
				musixmatchTranslation: this.state.musixmatchTranslation,
				neteaseTranslation: this.state.neteaseTranslation,
				currentLyrics: currentLyrics,
				language: this.state.language,
			};
			this.saveLocalLyrics(uri, fullData);
			console.log(`[Lyrics+] Auto-cached lyrics (${translatedCount} lines) for: ${uri.split(':').pop()}`);
		});
	}

	/**
	 * Smart optimization for translations - removes duplicates and identical content
	 * @param {Array} originalLyrics - Original lyrics
	 * @param {Array} mode1 - Translation from Display Mode 1
	 * @param {Array} mode2 - Translation from Display Mode 2
	 * @returns {Array} Optimized lyrics with smart deduplication
	 */
	optimizeTranslations(originalLyrics, mode1, mode2) {
		if (!Array.isArray(originalLyrics)) return originalLyrics;

		// Helper: note/placeholder-only line (e.g., ♪, …)
		const isNoteLine = (text) => {
			const t = String(text || "").trim();
			if (!t) return true;
			return /^[\s♪♩♫♬·•・。.、…~\-]+$/.test(t);
		};

		// Helper function to normalize text for comparison
		const normalizeForComparison = (text) => {
			if (!text || typeof text !== 'string') return '';
			return text.toLowerCase()
				.replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation/symbols but keep letters/numbers of any script
				.replace(/\s+/g, ' ')
				.trim();
		};

		// Helper function to check if two translations are similar (>85% similarity)
		const areTranslationsSimilar = (text1, text2) => {
			if (!text1 || !text2) return false;
			const norm1 = normalizeForComparison(text1);
			const norm2 = normalizeForComparison(text2);
			if (!norm1 || !norm2) return false;
			if (norm1 === norm2) return true;
			const words1 = norm1.split(' ').filter(w => w.length > 2);
			const words2 = norm2.split(' ').filter(w => w.length > 2);
			if (words1.length === 0 || words2.length === 0) return false;
			const commonWords = words1.filter(word => words2.includes(word));
			const similarity = commonWords.length / Math.max(words1.length, words2.length);
			return similarity > 0.85;
		};

		// If no translations provided, return original lyrics as-is
		// Don't set originalText so getDisplayTexts returns mainText=text, subText=null (no duplicate)
		if (!mode1 && !mode2) {
			return originalLyrics;
		}

		// Process each line to determine what to display
		const processedLyrics = originalLyrics.map((line, i) => {
			const originalText = line?.text || '';
			let translation1 = mode1?.[i]?.text || '';
			let translation2 = mode2?.[i]?.text || '';

			// If original is a note/placeholder line, never show sub-lines
			if (isNoteLine(originalText)) {
				return { ...line, originalText, text: null, text2: null };
			}

			// Ignore translations that are notes-only
			if (isNoteLine(translation1)) translation1 = '';
			if (isNoteLine(translation2)) translation2 = '';

			const normalizedOriginal = normalizeForComparison(originalText);
			const normalizedTrans1 = normalizeForComparison(translation1);
			const normalizedTrans2 = normalizeForComparison(translation2);

			const trans1SameAsOriginal = normalizedTrans1 && normalizedTrans1 === normalizedOriginal;
			const trans2SameAsOriginal = normalizedTrans2 && normalizedTrans2 === normalizedOriginal;
			const translationsSame = normalizedTrans1 && normalizedTrans2 &&
				(normalizedTrans1 === normalizedTrans2 || areTranslationsSimilar(translation1, translation2));

			let finalText = null;
			let finalText2 = null;

			if (translationsSame) {
				if (!trans1SameAsOriginal) {
					finalText = translation1 || translation2;
				}
			} else {
				if (!trans1SameAsOriginal && translation1) finalText = translation1;
				if (!trans2SameAsOriginal && translation2) finalText2 = translation2;
				if (!finalText && finalText2) { finalText = finalText2; finalText2 = null; }
			}

			return { ...line, originalText, text: finalText, text2: finalText2 };
		});

		return processedLyrics;
	}

	getGeminiTranslation(lyricsState, lyrics, mode, silent = false) {
		return (new Promise((resolve, reject) => {
			const apiMode = CONFIG.visual["gemini:api-mode"] || "official";
			const viKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-key`);
			const romajiKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-key-romaji`);
			const proxyApiKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini:proxy-api-key`);

			// Determine mode type and API key
			// Determine mode type
			if (mode === "gemini_romaji") {
				wantSmartPhonetic = true;
			}

			// Determine API key based on mode and settings
			if (apiMode === "proxy") {
				// Proxy mode - use proxy API key
				apiKey = proxyApiKey || "proxy-default";
			} else if (wantSmartPhonetic) {
				// Official mode - Romaji specific key or fallback
				apiKey = romajiKey || viKey;
			} else {
				// Official mode - Default key
				apiKey = viKey || romajiKey;
			}

			// Only require API key for official mode
			if (apiMode === "official" && !apiKey) {
				return reject(new Error("Gemini API key missing. Please add at least one key in Settings."));
			}

			if (!Array.isArray(lyrics) || lyrics.length === 0) {
				return reject(new Error("No lyrics to translate."));
			}

			// Include style and pronoun in cache key to avoid incorrect cache hits
			const styleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
			const pronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";
			const cacheKey = mode;
			const cacheKey2 = `${lyricsState.uri}:${cacheKey}:${styleKey}:${pronounKey}`;
			const cached = CacheManager.get(cacheKey2);

			if (cached) {
				return resolve(cached);
			}

			// Try to load from persistent localStorage cache
			try {
				const persistKey = `${APP_NAME}:gemini-cache`;
				const persistedCache = JSON.parse(localStorage.getItem(persistKey)) || {};
				const persisted = persistedCache[cacheKey2];

				if (persisted && persisted.data) {
					// Verify cache is for current settings
					if (persisted.styleKey === styleKey && persisted.pronounKey === pronounKey) {
						// Load into CacheManager for this session
						CacheManager.set(cacheKey2, persisted.data);
						return resolve(persisted.data);
					}
				}
			} catch (e) {
				console.warn("[Lyrics+] Failed to load persisted Gemini cache:", e);
			}

			// De-duplicate concurrent requests for the same translation
			this._inflightGemini = this._inflightGemini || new Map();
			if (this._inflightGemini.has(cacheKey2)) {
				// Return existing in-flight promise instead of making a new request
				return this._inflightGemini.get(cacheKey2).then(resolve).catch(reject);
			}

			const text = lyrics.map((l) => l?.text || "").filter(Boolean).join("\n");

			// Show translating indicator immediately (not silent = foreground request)
			if (!silent) {
				this.setState({ isTranslating: true });
			}

			// Create the translation promise
			const inflightPromise = Translator.callGemini({
				apiKey,
				artist: lyricsState.artist || this.state.artist,
				title: lyricsState.title || this.state.title,
				text,
				styleKey,
				pronounKey,
				wantSmartPhonetic,
				priority: !silent,
				taskId: cacheKey2
			})
				.then(({ vi, phonetic, duration }) => {
					// Show success in indicator instead of toast
					if (duration && !silent) {
						this.setState({
							isTranslating: false,
							translationStatus: { type: 'success', text: `Translated in ${duration}ms` }
						});
						// Auto-hide success message after 3 seconds
						setTimeout(() => {
							this.setState({ translationStatus: null });
						}, 3000);
					}

					let outText = wantSmartPhonetic ? phonetic : vi;

					if (!outText) throw new Error("Empty result from Gemini.");

					// Handle both array and string formats
					let lines;
					if (Array.isArray(outText)) {
						lines = outText;
					} else if (typeof outText === 'string') {
						lines = outText.split("\n");
					} else {
						throw new Error("Invalid translation format received from Gemini.");
					}

					const mapped = lyrics.map((line, i) => ({
						...line,
						text: lines[i]?.trim() || line?.text || "",
						originalText: line?.text || "",
					}));

					CacheManager.set(cacheKey2, mapped);

					// Persist Gemini translations to localStorage for long-term storage
					try {
						const persistKey = `${APP_NAME}:gemini-cache`;
						const persistedCache = JSON.parse(localStorage.getItem(persistKey)) || {};
						persistedCache[cacheKey2] = {
							data: mapped,
							timestamp: Date.now(),
							styleKey,
							pronounKey
						};

						// Limit localStorage cache to 50 entries (prevent overflow)
						const entries = Object.entries(persistedCache);
						if (entries.length > 50) {
							entries
								.sort((a, b) => a[1].timestamp - b[1].timestamp)
								.slice(0, 10)
								.forEach(([key]) => delete persistedCache[key]);
						}

						localStorage.setItem(persistKey, JSON.stringify(persistedCache));
					} catch (e) {
						console.warn("[Lyrics+] Failed to persist Gemini cache:", e);
					}

					return mapped;
				})
				.finally(() => {
					// Clean up in-flight tracking
					this._inflightGemini.delete(cacheKey2);
					// Only reset translating if not already set by success/error handlers
					if (this.state.isTranslating) {
						this.setState({ isTranslating: false });
					}
				});

			// Store the in-flight promise
			this._inflightGemini.set(cacheKey2, inflightPromise);

			// Attach resolve/reject handlers
			inflightPromise
				.then(resolve)
				.catch(err => {
					// Show error in indicator
					if (!silent) {
						this.setState({
							isTranslating: false,
							translationStatus: { type: 'error', text: err.message || 'Translation failed' }
						});
						// Auto-hide error after 5 seconds
						setTimeout(() => {
							this.setState({ translationStatus: null });
						}, 5000);
					}
					reject(err);
				});
		}));
	}

	getTraditionalConversion(lyricsState, lyrics, language, displayMode) {
		return new Promise((resolve, reject) => {
			if (!Array.isArray(lyrics)) return reject(new Error("Invalid lyrics format for conversion."));

			const cacheKey = `${lyricsState.uri}:trad:${language}:${displayMode}`;
			const cached = CacheManager.get(cacheKey);
			if (cached) return resolve(cached);

			// De-duplicate concurrent calls per (uri, language, mode)
			this._inflightTrad = this._inflightTrad || new Map();
			const inflightKey = `${lyricsState.uri}:trad:${language}:${displayMode}`;
			if (this._inflightTrad.has(inflightKey)) {
				return this._inflightTrad.get(inflightKey).then(resolve).catch(reject);
			}

			// Show pending notification if conversion takes longer than 3s
			const pendingTimer = setTimeout(() => {
				try {
					Spicetify.showNotification("Still converting...", false, 2000);
				} catch (e) {
					// Notification API may not be available in some contexts
					if (window.lyricsPlusDebug) console.warn("[Lyrics+] Could not show notification:", e);
				}
			}, 3000);

			const inflightPromise = this.translateLyrics(language, lyrics, displayMode)
				.then((translated) => {
					if (translated !== undefined && translated !== null) {
						CacheManager.set(cacheKey, translated);
						return translated;
					}
					throw new Error("Empty result from conversion.");
				})
				.finally(() => {
					clearTimeout(pendingTimer);
					this._inflightTrad.delete(inflightKey);
				});

			this._inflightTrad.set(inflightKey, inflightPromise);
			inflightPromise.then(resolve).catch(reject);
		});
	}

	provideLanguageCode(lyrics) {
		if (!lyrics) return null;

		const provider = CONFIG.visual["translate:translated-lyrics-source"];

		// For Gemini API, always detect language from lyrics (no override needed)
		if (provider === "geminiVi") {
			// If we have a cached language in state, use it
			if (this.state.language) {
				if (window.lyricsPlusDebug) {
					console.log("Gemini mode - Using cached language:", this.state.language);
				}
				return this.state.language;
			}

			// Otherwise, detect language from lyrics
			const detectedLanguage = Utils.detectLanguage(lyrics);

			// Debug logging
			if (window.lyricsPlusDebug) {
				console.log("Gemini mode - Language detection result:", {
					detectedLanguage,
					lyricsLength: lyrics?.length,
					firstLineText: lyrics?.[0]?.text?.substring(0, 50)
				});
			}

			return detectedLanguage;
		}

		// For Kuromoji mode, use language override if set
		if (CONFIG.visual["translate:detect-language-override"] !== "off") {
			const overrideLanguage = CONFIG.visual["translate:detect-language-override"];
			// Debug logging
			if (window.lyricsPlusDebug) {
				console.log("Traditional mode - Using language override:", overrideLanguage);
			}
			return overrideLanguage;
		}

		// If we have a cached language in state, use it
		if (this.state.language) {
			if (window.lyricsPlusDebug) {
				console.log("Traditional mode - Using cached language:", this.state.language);
			}
			return this.state.language;
		}

		// Otherwise, detect language from lyrics
		const detectedLanguage = Utils.detectLanguage(lyrics);

		// Debug logging
		if (window.lyricsPlusDebug) {
			console.log("Kuromoji mode - Language detection result:", {
				detectedLanguage,
				lyricsLength: lyrics?.length,
				firstLineText: lyrics?.[0]?.text?.substring(0, 50)
			});
		}

		return detectedLanguage;
	}

	async translateLyrics(language, lyrics, targetConvert) {
		if (!language || !Array.isArray(lyrics) || String(targetConvert).startsWith("gemini")) {
			return lyrics;
		}

		if (!this.translator) {
			this.translator = new Translator(language);
		}
		await this.translator.awaitFinished(language);

		let result;
		try {
			if (language === "ja") {
				// Japanese
				const map = {
					romaji: { target: "romaji", mode: "spaced" },
					furigana: { target: "hiragana", mode: "furigana" },
					hiragana: { target: "hiragana", mode: "normal" },
					katakana: { target: "katakana", mode: "normal" },
				};

				if (!map[targetConvert]) return lyrics;

				result = await Promise.all(
					lyrics.map(async (lyric) => await this.translator.romajifyText(lyric?.text || "", map[targetConvert].target, map[targetConvert].mode))
				);
			} else if (language === "ko") {
				// Korean
				if (targetConvert !== "romaja") return lyrics;
				result = await Promise.all(lyrics.map(async (lyric) => await this.translator.convertToRomaja(lyric?.text || "", targetConvert)));
			} else if (language === "zh-hans") {
				// Chinese (Simplified)
				if (targetConvert === "pinyin") {
					result = await Promise.all(
						lyrics.map(async (lyric) => await this.translator.convertToPinyin(lyric?.text || "", { toneType: "mark", type: "string" }))
					);
					// Warn if pinyin conversion produced no visible changes (likely CDN blocked -> fallback)
					const anyChanged = lyrics.some((lyric, i) => (result?.[i] ?? "") !== (lyric?.text || ""));
					if (!anyChanged) {
						Spicetify.showNotification("Pinyin library unavailable. Showing original. Allow jsDelivr or unpkg.", true, 4000);
					}
				} else {
					const map = {
						cn: { from: "cn", target: "cn" },
						tw: { from: "cn", target: "tw" },
						hk: { from: "cn", target: "hk" },
					};

					// Prevent self-conversion
					if (targetConvert === "cn") {
						Spicetify.showNotification("Conversion skipped: Already in Simplified Chinese", false, 2000);
						return lyrics;
					}

					result = await Promise.all(
						lyrics.map(async (lyric) => await this.translator.convertChinese(lyric?.text || "", map[targetConvert].from, map[targetConvert].target))
					);
				}
			} else if (language === "zh-hant") {
				// Chinese (Traditional)
				if (targetConvert === "pinyin") {
					result = await Promise.all(
						lyrics.map(async (lyric) => await this.translator.convertToPinyin(lyric?.text || "", { toneType: "mark", type: "string" }))
					);
					// Warn if pinyin conversion produced no visible changes (likely CDN blocked -> fallback)
					const anyChanged = lyrics.some((lyric, i) => (result?.[i] ?? "") !== (lyric?.text || ""));
					if (!anyChanged) {
						Spicetify.showNotification("Pinyin library unavailable. Showing original. Allow jsDelivr or unpkg.", true, 4000);
					}
				} else {
					const map = {
						cn: { from: "t", target: "cn" },
						hk: { from: "t", target: "hk" },
						tw: { from: "t", target: "tw" },
					};

					if (!map[targetConvert]) return lyrics;

					// Allow conversion from Traditional Chinese to different variants/simplified
					result = await Promise.all(
						lyrics.map(async (lyric) => await this.translator.convertChinese(lyric?.text || "", map[targetConvert].from, map[targetConvert].target))
					);
				}
			}

			const res = Utils.processTranslatedLyrics(result, lyrics);
			Spicetify.showNotification("✓ Conversion completed successfully", false, 2000);
			return res;
		} catch (error) {
			Spicetify.showNotification(`Conversion failed: ${error.message || "Unknown error"}`, true, 3000);
			console.error("Translation error:", error);
		}
	}

	resetDelay() {
		CONFIG.visual.delay = Number(localStorage.getItem(`lyrics-delay:${Spicetify.Player.data.item.uri}`)) || 0;
	}

	async onVersionChange(items, index) {
		if (this.state.mode === GENIUS) {
			this.setState({
				...emptyLine,
				genius2: this.state.genius2,
				isLoading: true,
			});
			const lyrics = await ProviderGenius.fetchLyricsVersion(items, index);
			this.setState({
				genius: lyrics,
				versionIndex: index,
				isLoading: false,
			});
		}
	}

	async onVersionChange2(items, index) {
		if (this.state.mode === GENIUS) {
			this.setState({
				...emptyLine,
				genius: this.state.genius,
				isLoading: true,
			});
			const lyrics = await ProviderGenius.fetchLyricsVersion(items, index);
			this.setState({
				genius2: lyrics,
				versionIndex2: index,
				isLoading: false,
			});
		}
	}

	async saveLocalLyrics(uri, lyrics) {
		// Create a copy to avoid modifying the original state object
		const lyricsToSave = { ...lyrics };

		if (lyricsToSave.genius) {
			lyricsToSave.unsynced = lyricsToSave.genius.split("<br>").map((lyc) => {
				return {
					text: lyc.replace(/<[^>]*>/g, ""),
				};
			});
			lyricsToSave.genius = null;
		}

		// Cache translations and conversions
		const fullLyricsData = {
			...lyricsToSave,
			// Japanese conversions
			romaji: this.state.romaji,
			furigana: this.state.furigana,
			hiragana: this.state.hiragana,
			katakana: this.state.katakana,
			// Korean conversions
			hangul: this.state.hangul,
			romaja: this.state.romaja,
			// Chinese conversions
			cn: this.state.cn,
			hk: this.state.hk,
			tw: this.state.tw,
			// Translation services
			musixmatchTranslation: this.state.musixmatchTranslation,
			neteaseTranslation: this.state.neteaseTranslation,
			// Current display mode results
			currentLyrics: this.state.currentLyrics,
			// Language detection
			language: this.state.language,
			timestamp: Date.now()
		};

		try {
			// Save to IndexedDB (Main Storage)
			await DBManager.set(uri, fullLyricsData);

			// Save a lightweight flag to localStorage for quick UI checks
			const cachedUris = JSON.parse(localStorage.getItem(`${APP_NAME}:cached-uris`) || "[]");
			if (!cachedUris.includes(uri)) {
				cachedUris.push(uri);
				// Limit flag list to last 500 items
				if (cachedUris.length > 500) cachedUris.shift();
				localStorage.setItem(`${APP_NAME}:cached-uris`, JSON.stringify(cachedUris));
			}

			this.setState({ isCached: true });
		} catch (e) {
			console.error("[Lyrics+] Failed to save to IndexedDB:", e);
		}
	}

	async deleteLocalLyrics(uri) {
		try {
			await DBManager.delete(uri);
			const cachedUris = JSON.parse(localStorage.getItem(`${APP_NAME}:cached-uris`) || "[]");
			const index = cachedUris.indexOf(uri);
			if (index > -1) {
				cachedUris.splice(index, 1);
				localStorage.setItem(`${APP_NAME}:cached-uris`, JSON.stringify(cachedUris));
			}
			this.setState({ isCached: false });
		} catch (e) {
			console.error("[Lyrics+] Failed to delete from IndexedDB:", e);
		}
	}

	lyricsSaved(uri) {
		const cachedUris = JSON.parse(localStorage.getItem(`${APP_NAME}:cached-uris`) || "[]");
		return cachedUris.includes(uri);
	}

	resetTranslationCache(uri) {
		// Clear translation cache for this URI (in-memory)
		const clearedCount = CacheManager.clearByUri(uri);

		// Clear persistent localStorage cache (local-lyrics)
		this.deleteLocalLyrics(uri);

		// Clear persistent Gemini cache from localStorage
		let geminiClearedCount = 0;
		try {
			const persistKey = `${APP_NAME}:gemini-cache`;
			const persistedCache = JSON.parse(localStorage.getItem(persistKey)) || {};
			const keysToDelete = Object.keys(persistedCache).filter(key => key.includes(uri));
			keysToDelete.forEach(key => {
				delete persistedCache[key];
				geminiClearedCount++;
			});
			localStorage.setItem(persistKey, JSON.stringify(persistedCache));
		} catch (e) {
			console.warn("[Lyrics+] Failed to clear persisted Gemini cache:", e);
		}

		// Clear progressive results for this track
		if (this._dmResults && this._dmResults[uri]) {
			delete this._dmResults[uri];
		}

		// Clear inflight Gemini requests for this track
		if (this._inflightGemini) {
			const keysToDelete = [];
			for (const [key] of this._inflightGemini) {
				if (key.includes(uri)) {
					keysToDelete.push(key);
				}
			}
			keysToDelete.forEach(key => this._inflightGemini.delete(key));
		}

		// Check if there are any translations to reset
		const hasTranslations = this.state.romaji || this.state.furigana || this.state.hiragana ||
			this.state.katakana || this.state.hangul || this.state.romaja ||
			this.state.cn || this.state.hk || this.state.tw ||
			this.state.musixmatchTranslation || this.state.neteaseTranslation;

		// Reset translation states
		this.setState({
			romaji: null,
			furigana: null,
			hiragana: null,
			katakana: null,
			hangul: null,
			romaja: null,
			cn: null,
			hk: null,
			tw: null,
			musixmatchTranslation: null,
			neteaseTranslation: null,
		});

		// Force re-process lyrics with current display modes
		const currentMode = this.getCurrentMode();
		this.lyricsSource(this.state, currentMode);

		const totalCleared = clearedCount + geminiClearedCount;
		if (totalCleared > 0) {
			Spicetify.showNotification(`✓ Cleared ${totalCleared} translation cache entries`, false, 2000);
		} else if (hasTranslations) {
			Spicetify.showNotification("✓ Translation state reset", false, 2000);
		} else {
			Spicetify.showNotification("✓ Translation cache cleared (no entries found)", false, 2000);
		}
	}

	processLyricsFromFile(event) {
		const file = event.target.files;
		if (!file.length) return;
		const reader = new FileReader();

		if (file[0].size > 1024 * 1024) {
			Spicetify.showNotification("File too large: Maximum size is 1MB", true, 3000);
			return;
		}

		reader.onload = (e) => {
			try {
				const localLyrics = Utils.parseLocalLyrics(e.target.result);
				const parsedKeys = Object.keys(localLyrics)
					.filter((key) => localLyrics[key] && localLyrics[key].length > 0)
					.map((key) => key[0].toUpperCase() + key.slice(1));

				if (!parsedKeys.length) {
					Spicetify.showNotification("No valid lyrics found in file", true, 3000);
					return;
				}

				// Determine which lyrics to show immediately
				const newCurrentLyrics = localLyrics.synced || localLyrics.unsynced || [];

				const newState = {
					...emptyState, // Reset previous states (Genius, etc.)
					...localLyrics,
					provider: "local",
					uri: this.currentTrackUri,
					currentLyrics: newCurrentLyrics,
					// Preserve cached translations if they happened to be in the file (rare but possible)
					...(localLyrics.romaji && { romaji: localLyrics.romaji }),
					...(localLyrics.furigana && { furigana: localLyrics.furigana }),
					...(localLyrics.language && { language: localLyrics.language }),
					isCached: true
				};

				this.setState(newState);

				// Update Cache & LocalStorage
				CACHE[this.currentTrackUri] = newState;
				this.saveLocalLyrics(this.currentTrackUri, newState);

				Spicetify.showNotification(`✓ Loaded ${parsedKeys.join(", ")} lyrics from file`, false, 3000);
			} catch (e) {
				console.error(e);
				Spicetify.showNotification("Failed to load lyrics: Invalid file format", true, 3000);
			}
		};

		reader.onerror = (e) => {
			console.error(e);
			Spicetify.showNotification("Failed to read file: File may be corrupted", true, 3000);
		};

		reader.readAsText(file[0]);
		event.target.value = "";
	}

	async tryPretranslateNext() {
		// Safety checks for pre-translation
		const queue = Spicetify.Queue;
		if (!queue) return;

		// Try to get next track from queue
		let nextTrack = null;

		if (queue.track?.queued?.[0]) {
			nextTrack = queue.track.queued[0];
		} else if (queue.track?.nextUp?.[0]) {
			nextTrack = queue.track.nextUp[0];
		} else if (queue.nextTracks && queue.nextTracks.length > 0) {
			nextTrack = queue.nextTracks[0].contextTrack;
		}

		if (!nextTrack) return;

		const nextInfo = this.infoFromTrack(nextTrack);
		if (!nextInfo) return;

		// Avoid re-processing the same track
		if (this.pretranslatedUri === nextInfo.uri) return;

		// Check current track status to avoid spam
		const duration = Spicetify.Player.getDuration();
		const progress = Spicetify.Player.getProgress();

		// Only pre-translate if current song is long enough (>45s) and has played for a bit (>5s)
		if (duration < 45000 || progress < 5000) return;

		console.log(`[Lyrics+] Pre-translating next track: ${nextInfo.artist} - ${nextInfo.title}`);
		this.pretranslatedUri = nextInfo.uri;

		// 1. Check/Fetch Raw Lyrics (without setting state)
		let lyricsData = CACHE[nextInfo.uri];

		if (!lyricsData) {
			try {
				lyricsData = await this.tryServices(nextInfo);
				if (lyricsData.provider) {
					CACHE[nextInfo.uri] = lyricsData;
				}
			} catch (e) {
				console.warn("[Lyrics+] Pre-translation fetch failed:", e);
				this.pretranslatedUri = null;
				return;
			}
		}

		if (!lyricsData) {
			this.pretranslatedUri = null;
			return;
		}

		// 2. Trigger Translation (background only)
		const lyricsToTranslate = lyricsData.synced || lyricsData.unsynced || lyricsData.genius;
		if (!lyricsToTranslate) {
			// No lyrics to translate, but we fetched them. 
			// Keep pretranslatedUri set so we don't keep trying to fetch empty lyrics?
			// Or reset? If we reset, we'll keep fetching empty lyrics every 3s.
			// Better to NOT reset here if we successfully got "no lyrics".
			return;
		}

		// Check if we need translation
		const provider = CONFIG.visual["translate:translated-lyrics-source"];

		// Only pre-translate for Gemini modes as they are the slow ones
		if (provider !== "geminiVi") return;

		// Ensure metadata is present for translation prompt
		const lyricsStateForTranslation = {
			...lyricsData,
			uri: nextInfo.uri, // Explicitly ensure URI matches for deduplication
			artist: nextInfo.artist,
			title: nextInfo.title
		};

		// Determine language
		const originalLanguage = this.provideLanguageCode(lyricsToTranslate);
		let friendlyLanguage = null;
		if (originalLanguage) {
			try {
				friendlyLanguage = new Intl.DisplayNames(["en"], { type: "language" }).of(originalLanguage.split("-")[0])?.toLowerCase();
			} catch (e) {
				// Intl.DisplayNames may not support all language codes
				if (window.lyricsPlusDebug) console.warn("[Lyrics+] Could not get friendly language name:", e);
			}
		}

		const modeKey = !friendlyLanguage ? "gemini" : friendlyLanguage;
		const displayMode1 = CONFIG.visual[`translation-mode:${modeKey}`];
		const displayMode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];

		const triggerTranslation = async (mode) => {
			if (!mode || mode === "none") return;
			if (String(mode).startsWith("gemini")) {
				// Silent translation in background
				await this.getGeminiTranslation(lyricsStateForTranslation, lyricsToTranslate, mode, true).catch(e => {
					console.warn(`[Lyrics+] Pre-translation for mode ${mode} failed:`, e);
					// Reset flag to allow retry in next interval (after backoff)
					this.pretranslatedUri = null;
				});
			}
		};

		// Trigger translations in parallel
		triggerTranslation(displayMode1);
		triggerTranslation(displayMode2);
	}
	initMoustrap() {
		if (!this.mousetrap && Spicetify.Mousetrap) {
			this.mousetrap = new Spicetify.Mousetrap();
		}
	}

	componentDidMount() {
		// Register instance for external access
		window.lyricContainer = this;

		// Enable debug mode for troubleshooting
		window.lyricsPlusDebug = localStorage.getItem("lyrics-plus:debug") === "true";

		// Add global function to toggle debug mode
		window.toggleLyricsPlusDebug = () => {
			window.lyricsPlusDebug = !window.lyricsPlusDebug;
			localStorage.setItem("lyrics-plus:debug", window.lyricsPlusDebug.toString());
			console.log("Lyrics Plus debug mode:", window.lyricsPlusDebug ? "ON" : "OFF");
		};

		this.onQueueChange = async ({ data: queue }) => {
			this.state.explicitMode = this.state.lockMode;
			this.currentTrackUri = queue.current.uri;
			this.fetchLyrics(queue.current, this.state.explicitMode);
			this.viewPort.scrollTo(0, 0);

			// Reset pre-translation state when track changes
			this.pretranslatedUri = null;
			this.setState({ preTranslated: false });

			// 1. Get next track info
			const nextTrack = queue.queued?.[0] || queue.nextUp?.[0];
			if (!nextTrack) return;

			const nextUri = nextTrack.uri;
			// Debounce next track fetch
			if (nextUri === this.nextTrackUri) return;
			this.nextTrackUri = nextUri;

			// 2. Check cache for raw lyrics
			let rawLyrics = CacheManager.get(nextUri);

			if (!rawLyrics) {
				// Fetch raw lyrics if not cached
				const nextInfo = {
					uri: nextUri,
					artist: nextTrack.metadata.artist_name,
					title: nextTrack.metadata.title,
					duration: nextTrack.metadata.duration,
					album: nextTrack.metadata.album_title,
					images: nextTrack.metadata.image_url
				};

				// Note: tryServices returns data but doesn't set state
				rawLyrics = await this.tryServices(nextInfo);

				if (rawLyrics) {
					CacheManager.set(nextUri, rawLyrics);
				}
			}
		};

		if (Spicetify.Player?.data?.item) {
			this.state.explicitMode = this.state.lockMode;
			this.currentTrackUri = Spicetify.Player.data.item.uri;
			this.fetchLyrics(Spicetify.Player.data.item, this.state.explicitMode);
		}

		this.updateVisualOnConfigChange();
		Utils.addQueueListener(this.onQueueChange);

		lyricContainerUpdate = () => {
			this.reRenderLyricsPage = !this.reRenderLyricsPage;
			this.updateVisualOnConfigChange();
			this.forceUpdate();
		};

		reloadLyrics = () => {
			CACHE = {};
			this.updateVisualOnConfigChange();
			this.forceUpdate();
			this.fetchLyrics(Spicetify.Player.data.item, this.state.explicitMode, true);
		};

		this.viewPort =
			document.querySelector(".Root__main-view .os-viewport") ?? document.querySelector(".Root__main-view .main-view-container__scroll-node");

		this.configButton = new Spicetify.Menu.Item("Lyrics Plus config", false, openConfig, "lyrics");
		this.configButton.register();

		this.onFontSizeChange = (event) => {
			if (!event.ctrlKey) return;
			const dir = event.deltaY < 0 ? 1 : -1;
			let temp = CONFIG.visual["font-size"] + dir * fontSizeLimit.step;
			if (temp < fontSizeLimit.min) {
				temp = fontSizeLimit.min;
			} else if (temp > fontSizeLimit.max) {
				temp = fontSizeLimit.max;
			}
			CONFIG.visual["font-size"] = temp;
			localStorage.setItem("lyrics-plus:visual:font-size", temp);
			lyricContainerUpdate();
		};

		this.toggleFullscreen = () => {
			const isEnabled = !this.state.isFullscreen;
			if (isEnabled) {
				document.body.append(this.fullscreenContainer);
				document.documentElement.requestFullscreen();
				this.mousetrap.bind("esc", this.toggleFullscreen);
			} else {
				this.fullscreenContainer.remove();
				document.exitFullscreen();
				this.mousetrap.unbind("esc");
			}

			this.setState({
				isFullscreen: isEnabled,
			});
		};
		this.mousetrap.reset();
		this.mousetrap.bind(CONFIG.visual["fullscreen-key"], this.toggleFullscreen);
		window.addEventListener("fad-request", lyricContainerUpdate);

		// Start pre-translation check interval (clear existing to prevent duplicates)
		if (this.pretranslateInterval) clearInterval(this.pretranslateInterval);
		this.pretranslateInterval = setInterval(() => {
			// Optimization: Skip check if music is paused or pre-translation is disabled
			if (Spicetify.Player.data.is_paused || !CONFIG.visual["pre-translation"]) return;

			const duration = Spicetify.Player.getDuration();
			const progress = Spicetify.Player.getProgress();

			// Check if we are within the last 30 seconds of the song
			if (duration > 0 && duration - progress < 30000) {
				this.tryPretranslateNext();
			}
		}, 3000);
	}

	componentWillUnmount() {
		Utils.removeQueueListener(this.onQueueChange);
		this.configButton.deregister();
		this.mousetrap.reset();
		window.removeEventListener("fad-request", lyricContainerUpdate);

		if (this.pretranslateInterval) {
			clearInterval(this.pretranslateInterval);
		}

		// Clean up global reference
		if (window.lyricContainer === this) {
			delete window.lyricContainer;
		}
	}

	updateVisualOnConfigChange() {
		this.availableModes = CONFIG.modes.filter((_, id) => {
			return Object.values(CONFIG.providers).some((p) => p.on && p.modes.includes(id));
		});

		const brightness = CONFIG.visual["background-brightness"] / 100;

		if (CONFIG.visual["transparent-background"]) {
			this.styleVariables = {
				"--lyrics-color-active": CONFIG.visual["active-color"],
				"--lyrics-color-inactive": CONFIG.visual["inactive-color"],
				"--lyrics-color-background": "transparent",
				"--lyrics-highlight-background": CONFIG.visual["highlight-color"],
				"--lyrics-background-noise": CONFIG.visual.noise ? "var(--background-noise)" : "unset",
				"--lyrics-background-brightness": `brightness(${brightness})`,
			};
		} else {
			this.styleVariables = {
				"--lyrics-color-active": "white",
				"--lyrics-color-inactive": "rgba(255, 255, 255, 0.5)",
				"--lyrics-color-background": this.state.colors.background || CONFIG.visual["background-color"],
				"--lyrics-highlight-background": this.state.colors.inactive || CONFIG.visual["highlight-color"],
				"--lyrics-background-noise": CONFIG.visual.noise ? "var(--background-noise)" : "unset",
				"--lyrics-background-brightness": `brightness(${brightness})`,
			};
		}

		this.styleVariables = {
			...this.styleVariables,
			"--lyrics-align-text": CONFIG.visual.alignment,
			"--lyrics-font-size": `${CONFIG.visual["font-size"]}px`,
			"--animation-tempo": this.state.tempo,
		};

		this.mousetrap.reset();
		this.mousetrap.bind(CONFIG.visual["fullscreen-key"], this.toggleFullscreen);
	}

	getCurrentMode() {
		let mode = -1;
		if (this.state.explicitMode !== -1 && this.state.explicitMode !== KARAOKE) {
			mode = this.state.explicitMode;
		} else if (this.state.lockMode !== -1 && this.state.lockMode !== KARAOKE) {
			mode = this.state.lockMode;
		} else {
			// Auto switch (karaoke disabled)
			if (this.state.synced) {
				mode = SYNCED;
			} else if (this.state.unsynced) {
				mode = UNSYNCED;
			} else if (this.state.genius) {
				mode = GENIUS;
			}
		}
		return mode;
	}

	render() {
		const fadLyricsContainer = document.getElementById("fad-lyrics-plus-container");
		this.state.isFADMode = !!fadLyricsContainer;

		const brightness = CONFIG.visual["background-brightness"];
		const brightnessVal = (brightness !== undefined && brightness !== null) ? brightness : 100;

		if (this.state.isFADMode) {
			// Text colors will be set by FAD extension
			this.styleVariables = {};
		} else if (CONFIG.visual["transparent-background"]) {
			// Transparent mode - use theme colors
			this.styleVariables = {
				"--lyrics-color-active": CONFIG.visual["active-color"],
				"--lyrics-color-inactive": CONFIG.visual["inactive-color"],
				"--lyrics-color-background": "transparent",
				"--lyrics-highlight-background": CONFIG.visual["highlight-color"],
				"--lyrics-background-noise": CONFIG.visual.noise ? "var(--background-noise)" : "unset",
				"--lyrics-background-brightness": `brightness(${brightnessVal / 100})`,
			};
		} else {
			// Non-transparent mode - use album colors or fallback
			const bgColor = this.state.colors?.background || CONFIG.visual["background-color"] || "#121212";
			const highlightColor = this.state.colors?.inactive || CONFIG.visual["highlight-color"] || "rgba(255, 255, 255, 0.2)";
			this.styleVariables = {
				"--lyrics-color-active": "white",
				"--lyrics-color-inactive": "rgba(255, 255, 255, 0.5)",
				"--lyrics-color-background": bgColor,
				"--lyrics-highlight-background": highlightColor,
				"--lyrics-background-noise": CONFIG.visual.noise ? "var(--background-noise)" : "unset",
				"--lyrics-background-brightness": `brightness(${brightnessVal / 100})`,
			};
		}

		const backgroundStyle = {};
		// Apply brightness to the gradient background layer as well
		if (!CONFIG.visual["transparent-background"]) {
			const bgColor = this.state.colors?.background || CONFIG.visual["background-color"] || "#121212";
			backgroundStyle.backgroundColor = bgColor;
			backgroundStyle.filter = `brightness(${brightnessVal / 100})`;
		}

		this.styleVariables = {
			...this.styleVariables,
			"--lyrics-align-text": CONFIG.visual.alignment,
			"--lyrics-font-size": `${CONFIG.visual["font-size"]}px`,
			"--animation-tempo": this.state.tempo,
		};

		let mode = this.getCurrentMode();

		let activeItem;
		let showTranslationButton;

		// Get current display modes to track changes
		const originalLanguage = this.provideLanguageCode(this.state.currentLyrics);
		const friendlyLanguage = originalLanguage && new Intl.DisplayNames(["en"], { type: "language" }).of(originalLanguage.split("-")[0])?.toLowerCase();

		// For Gemini mode, use generic keys if no specific language detected
		const provider = CONFIG.visual["translate:translated-lyrics-source"];
		const modeKey = provider === "geminiVi" && !friendlyLanguage ? "gemini" : friendlyLanguage;

		const displayMode1 = CONFIG.visual[`translation-mode:${modeKey}`];
		const displayMode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];
		const currentModeKey = `${mode}_${displayMode1 || 'none'}_${displayMode2 || 'none'}`;

		// Only call lyricsSource on state/mode/translation changes, not every render
		if (this.lastProcessedUri !== this.state.uri || this.lastProcessedMode !== currentModeKey) {
			this.lastProcessedUri = this.state.uri;
			this.lastProcessedMode = currentModeKey;
			this.lyricsSource(this.state, mode);
		}
		const hasTranslation = this.state.neteaseTranslation !== null || this.state.musixmatchTranslation !== null;

		// Always render the Conversions button on synced/unsynced pages.
		// Previously it was gated by detected language/loading state, causing it to
		// be hidden on initial load or for non-target languages (e.g., English).
		const potentialMode = this.state.explicitMode !== -1 ? this.state.explicitMode :
			this.state.lockMode !== -1 ? this.state.lockMode :
				(this.state.isLoading ? (this.lastModeBeforeLoading || SYNCED) : mode);

		showTranslationButton = (potentialMode === SYNCED || potentialMode === UNSYNCED || mode === -1);

		// Fallback: if currentLyrics not ready yet (translation pending), show original lyrics
		const getLyricsForRender = (preferredMode) => {
			if (Array.isArray(this.state.currentLyrics) && this.state.currentLyrics.length > 0) {
				return this.state.currentLyrics;
			}
			// currentLyrics not ready - fall back to original lyrics so UI isn't blank
			const original = preferredMode === SYNCED ? this.state.synced : this.state.unsynced;
			return Array.isArray(original) ? original : [];
		};

		if (mode !== -1) {

			if (mode === SYNCED && this.state.synced) {
				activeItem = react.createElement(CONFIG.visual["synced-compact"] ? SyncedLyricsPage : SyncedExpandedLyricsPage, {
					trackUri: this.state.uri,
					lyrics: getLyricsForRender(SYNCED),
					provider: this.state.provider,
					copyright: this.state.copyright,
					reRenderLyricsPage: this.reRenderLyricsPage,
				});
			} else if (mode === UNSYNCED && this.state.unsynced) {
				activeItem = react.createElement(UnsyncedLyricsPage, {
					trackUri: this.state.uri,
					lyrics: getLyricsForRender(UNSYNCED),
					provider: this.state.provider,
					copyright: this.state.copyright,
					reRenderLyricsPage: this.reRenderLyricsPage,
				});
			} else if (mode === GENIUS && this.state.genius) {
				activeItem = react.createElement(GeniusPage, {
					isSplitted: CONFIG.visual["dual-genius"],
					trackUri: this.state.uri,
					lyrics: this.state.genius,
					provider: this.state.provider,
					copyright: this.state.copyright,
					versions: this.state.versions,
					versionIndex: this.state.versionIndex,
					onVersionChange: this.onVersionChange.bind(this),
					lyrics2: this.state.genius2,
					versionIndex2: this.state.versionIndex2,
					onVersionChange2: this.onVersionChange2.bind(this),
					reRenderLyricsPage: this.reRenderLyricsPage,
				});
			}
		}

		if (!activeItem) {
			activeItem = react.createElement(
				"div",
				{
					className: "lyrics-lyricsContainer-LyricsUnavailablePage",
				},
				react.createElement(
					"span",
					{
						className: "lyrics-lyricsContainer-LyricsUnavailableMessage",
					},
					this.state.isLoading ? LoadingIcon : "(• _ • )"
				)
			);
		}

		this.state.mode = mode;

		const out = react.createElement(
			"div",
			{
				className: `lyrics-lyricsContainer-LyricsContainer${CONFIG.visual["fade-blur"] ? " blur-enabled" : ""}${fadLyricsContainer ? " fad-enabled" : ""
					}`,
				style: this.styleVariables,
				ref: (el) => {
					if (!el) return;
					el.onmousewheel = this.onFontSizeChange;
				},
			},
			react.createElement("div", {
				id: "lyrics-plus-gradient-background",
				style: backgroundStyle,
			}),
			react.createElement("div", {
				className: "lyrics-lyricsContainer-LyricsBackground",
			}),
			// Translation in progress indicator
			react.createElement(TranslatingIndicator, {
				isVisible: this.state.isTranslating,
				status: this.state.translationStatus,
				text: "Translating..."
			}),
			react.createElement(
				"div",
				{
					className: "lyrics-config-button-container",
				},
				// Pre-translation Indicator
				this.state.preTranslated && react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{ label: "Next song pre-translated" },
					react.createElement("div", {
						className: "lyrics-config-button",
						style: { cursor: "default", color: "var(--spice-button)" }
					}, react.createElement("svg", {
						width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor",
						dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons["check"] || '<path d="M13.985 2.383L5.127 12.754 1.388 8.375l-.658.77 4.397 5.149 9.618-11.262z"/>' }
					}))
				),
				showTranslationButton &&
				react.createElement(TranslationMenu, {
					friendlyLanguage,
					hasTranslation: {
						musixmatch: this.state.musixmatchTranslation !== null,
						netease: this.state.neteaseTranslation !== null,
					},
				}),
				react.createElement(AdjustmentsMenu, { mode }),
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: this.state.isCached ? "Lyrics cached" : "Cache lyrics",
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							onClick: () => {
								const { synced, unsynced, karaoke, genius } = this.state;
								if (!synced && !unsynced && !karaoke && !genius) {
									Spicetify.showNotification("No lyrics available to cache", true, 2000);
									return;
								}

								if (this.state.isCached) {
									this.deleteLocalLyrics(this.currentTrackUri);
									Spicetify.showNotification("✓ Lyrics cache deleted", false, 2000);
								} else {
									this.saveLocalLyrics(this.currentTrackUri, { synced, unsynced, karaoke, genius });
									Spicetify.showNotification("✓ Lyrics cached successfully", false, 2000);
								}
							},
						},
						react.createElement("svg", {
							width: 16,
							height: 16,
							viewBox: "0 0 16 16",
							fill: "currentColor",
							dangerouslySetInnerHTML: {
								__html: Spicetify.SVGIcons[this.state.isCached ? "downloaded" : "download"],
							},
						})
					)
				),
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: "Load lyrics from file",
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							onClick: () => {
								this.fileInputRef.current.click();
							},
						},
						react.createElement("input", {
							type: "file",
							ref: this.fileInputRef,
							accept: ".lrc,.txt",
							onChange: this.processLyricsFromFile.bind(this),
							style: {
								display: "none",
							},
						}),
						react.createElement("svg", {
							width: 16,
							height: 16,
							viewBox: "0 0 16 16",
							fill: "currentColor",
							dangerouslySetInnerHTML: {
								__html: Spicetify.SVGIcons["plus-alt"],
							},
						})
					)
				),
				(() => {
					const hasLyrics = this.state.synced || this.state.unsynced || this.state.genius;
					if (window.lyricsPlusDebug) {
						console.log("Reset button debug:", {
							hasLyrics,
							synced: !!this.state.synced,
							unsynced: !!this.state.unsynced,
							genius: !!this.state.genius,
							romaji: !!this.state.romaji,
							furigana: !!this.state.furigana,
							musixmatchTranslation: !!this.state.musixmatchTranslation,
							neteaseTranslation: !!this.state.neteaseTranslation
						});
					}
					return hasLyrics;
				})() &&
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: "Reset translation cache",
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							onClick: () => {
								this.resetTranslationCache(this.currentTrackUri);
							},
						},
						react.createElement("svg", {
							width: 16,
							height: 16,
							viewBox: "0 0 16 16",
							fill: "currentColor",
							dangerouslySetInnerHTML: {
								__html: Spicetify.SVGIcons["x"] || Spicetify.SVGIcons["close"] || Spicetify.SVGIcons["cross"] ||
									// Simple X icon as fallback for reset
									'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>',
							},
						})
					)
				)
			),
			activeItem
		);

		if (this.state.isFullscreen) return reactDOM.createPortal(out, this.fullscreenContainer);
		if (fadLyricsContainer) return reactDOM.createPortal(out, fadLyricsContainer);
		return out;
	}
}
