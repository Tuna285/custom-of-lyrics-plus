// Run "npm i @types/react" to have this type package available in workspace
/// <reference types="react" />
/// <reference path="../../globals.d.ts" />

/** @type {React} */
const react = Spicetify.React;
const { useState, useEffect, useCallback, useMemo, useRef } = react;
/** @type {import("react").ReactDOM} */
const spotifyVersion = Spicetify.Platform.version;

// Define a function called "render" to specify app entry point
// This function will be used to mount app to main view.
function render() {
	syncConfigWithLocalStorage();
	return react.createElement(LyricsContainer, null);
}

function getConfig(name, defaultVal = true) {
	const value = localStorage.getItem(name);
	return value ? value === "true" : defaultVal;
}

// APP_NAME is already declared in utils/Config.js
const MUSIXMATCH_TRANSLATION_PREFIX_DEFAULT = "musixmatchTranslation:";
const MUSIXMATCH_TRANSLATION_PREFIX_GLOBAL_KEY = "__lyricsPlusMusixmatchTranslationPrefix";
const MUSIXMATCH_TRANSLATION_FETCH_MESSAGE = "Fetching translation...";
const MUSIXMATCH_TRANSLATION_FETCH_FAILED_MESSAGE = "Failed to fetch translation, please try again in a few minutes";
const MUSIXMATCH_TRANSLATION_PREFIX =
	typeof window !== "undefined" && typeof window[MUSIXMATCH_TRANSLATION_PREFIX_GLOBAL_KEY] === "string"
		? window[MUSIXMATCH_TRANSLATION_PREFIX_GLOBAL_KEY]
		: MUSIXMATCH_TRANSLATION_PREFIX_DEFAULT;

if (typeof window !== "undefined") {
	window[MUSIXMATCH_TRANSLATION_PREFIX_GLOBAL_KEY] = MUSIXMATCH_TRANSLATION_PREFIX;
}

function syncConfigWithLocalStorage() {
	if (typeof CONFIG === "undefined") return;

	if (typeof CONFIG.providersOrder !== "undefined") {
		CONFIG.providersOrder = localStorage.getItem("lyrics-plus:services-order") || CONFIG.providersOrder;
	}

	try {
		CONFIG.providersOrder = JSON.parse(CONFIG.providersOrder);
		if (!Array.isArray(CONFIG.providersOrder) || Object.keys(CONFIG.providers).length !== CONFIG.providersOrder.length) {
			throw "";
		}
	} catch {
		CONFIG.providersOrder = Object.keys(CONFIG.providers);
		localStorage.setItem("lyrics-plus:services-order", JSON.stringify(CONFIG.providersOrder));
	}

	CONFIG.locked = Number.parseInt(CONFIG.locked);
	CONFIG.visual["lines-before"] = Number.parseInt(CONFIG.visual["lines-before"]);
	CONFIG.visual["lines-after"] = Number.parseInt(CONFIG.visual["lines-after"]);
	CONFIG.visual["font-size"] = Number.parseInt(CONFIG.visual["font-size"]);
	CONFIG.visual["ja-detect-threshold"] = Number.parseInt(CONFIG.visual["ja-detect-threshold"]);
	CONFIG.visual["hans-detect-threshold"] = Number.parseInt(CONFIG.visual["hans-detect-threshold"]);

	if (CONFIG.visual["translate:translated-lyrics-source"] === "musixmatchTranslation") {
		const language = CONFIG.visual["musixmatch-translation-language"];
		const normalizedLanguage = language && language !== "none" ? language : "none";
		const upgradedValue = normalizedLanguage !== "none" ? `${MUSIXMATCH_TRANSLATION_PREFIX}${normalizedLanguage}` : "none";
		CONFIG.visual["translate:translated-lyrics-source"] = upgradedValue;
		localStorage.setItem(`${APP_NAME}:visual:translate:translated-lyrics-source`, upgradedValue);
	}

	if (typeof CONFIG.visual["translate:translated-lyrics-source"] === "string") {
		const sourceValue = CONFIG.visual["translate:translated-lyrics-source"];
		if (sourceValue.startsWith(MUSIXMATCH_TRANSLATION_PREFIX)) {
			const language = sourceValue.slice(MUSIXMATCH_TRANSLATION_PREFIX.length) || "none";
			if (CONFIG.visual["musixmatch-translation-language"] !== language) {
				CONFIG.visual["musixmatch-translation-language"] = language;
				localStorage.setItem(`${APP_NAME}:visual:musixmatch-translation-language`, language);
			}
		}
	}

	if (
		CONFIG.visual.translate &&
		typeof CONFIG.visual["translate:translated-lyrics-source"] === "string" &&
		CONFIG.visual["translate:translated-lyrics-source"] !== "none"
	) {
		CONFIG.visual.translate = false;
		localStorage.setItem(`${APP_NAME}:visual:translate`, "false");
	}
}

// CACHE and emptyState are declared in utils/Config.js
if (typeof window.CACHE !== "undefined") {
	CACHE = window.CACHE;
}
if (typeof window.emptyState !== "undefined") {
	Object.assign(emptyState, {
		musixmatchAvailableTranslations: null,
		musixmatchTrackId: null,
		musixmatchTranslationLanguage: null,
	});
}

let lyricContainerUpdate;
let reloadLyrics;
let refreshMusixmatchTranslation;

const fontSizeLimit = { min: 16, max: 256, step: 4 };

const thresholdSizeLimit = { min: 0, max: 100, step: 5 };

function resolveTranslationSource(source) {
	if (typeof source !== "string") {
		return { key: source, language: null };
	}

	if (source.startsWith(MUSIXMATCH_TRANSLATION_PREFIX)) {
		const language = source.slice(MUSIXMATCH_TRANSLATION_PREFIX.length) || null;
		return { key: "musixmatchTranslation", language };
	}

	return { key: source, language: null };
}

class LyricsContainer extends react.Component {
	constructor() {
		super();
		window.lyricContainer = this;
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
			musixmatchTranslationLanguage: null,
			musixmatchAvailableTranslations: [],
			musixmatchTrackId: null,
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
			error: null,
		};
		this.currentTrackUri = "";
		this.nextTrackUri = "";
		this.availableModes = [];
		this.styleVariables = {};
		this.fullscreenContainer = document.createElement("div");
		this.fullscreenContainer.id = "lyrics-fullscreen-container";
		this.mousetrap = null;
		this.containerRef = react.createRef(null);
		this.translator = null;
		this.initMoustrap();
		// Cache last state
		this.languageOverride = CONFIG.visual["translate:detect-language-override"];
		this.translate = CONFIG.visual.translate;
		this.reRenderLyricsPage = false;
		this.displayMode = null;
		this.currentMusixmatchLanguage = CONFIG.visual["musixmatch-translation-language"];
		this._musixmatchTranslationRequestId = null;
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
		const audio = await Spicetify.CosmosAsync.get(
			`https://spclient.wg.spotify.com/audio-attributes/v1/audio-features/${uri.split(":")[2]}?format=json`
		);
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

	toggleReasoning = () => {
		this.setState((prevState) => ({
			isReasoningVisible: !prevState.isReasoningVisible,
		}));
	};

	openVideoSettingsModal() {
		if (typeof window.LyricsPlus?.openVideoSettingsModal === "function") {
			window.LyricsPlus.openVideoSettingsModal(this);
		}
	}

	async refreshMusixmatchTranslation() {
		const selectedLanguage = CONFIG.visual["musixmatch-translation-language"] || "none";
		const availableTranslations = this.state.musixmatchAvailableTranslations || [];
		const trackId = this.state.musixmatchTrackId;
		const currentUri = this.state.uri;
		const currentRequestId = Symbol("musixmatchTranslationRequest");
		this._musixmatchTranslationRequestId = currentRequestId;
		const isLatestRequest = () => this._musixmatchTranslationRequestId === currentRequestId;
		const finishRequest = () => {
			if (isLatestRequest()) {
				this._musixmatchTranslationRequestId = null;
			}
		};

		const clearTranslation = () => {
			if (this.state.musixmatchTranslation !== null || this.state.musixmatchTranslationLanguage !== null) {
				this.setState({
					musixmatchTranslation: null,
					musixmatchTranslationLanguage: null,
				});
			}
			if (CACHE[currentUri]) {
				CACHE[currentUri].musixmatchTranslation = null;
				CACHE[currentUri].musixmatchTranslationLanguage = null;
			}
		};

		if (!trackId || !selectedLanguage || selectedLanguage === "none") {
			clearTranslation();
			finishRequest();
			return;
		}

		if (!availableTranslations.includes(selectedLanguage)) {
			clearTranslation();
			finishRequest();
			return;
		}

		const baseLyrics = this.state.synced ?? this.state.unsynced;
		if (!baseLyrics) {
			finishRequest();
			return;
		}

		const currentLanguage = selectedLanguage;

		Spicetify.showNotification(MUSIXMATCH_TRANSLATION_FETCH_MESSAGE, false, 1000);

		this.setState({
			musixmatchTranslation: null,
			musixmatchTranslationLanguage: null,
		});

		let translation;
		try {
			translation = await ProviderMusixmatch.getTranslation(trackId);
		} catch (error) {
			console.error(error);
			if (isLatestRequest()) {
				Spicetify.showNotification(MUSIXMATCH_TRANSLATION_FETCH_FAILED_MESSAGE, true, 3000);
				if (CACHE[currentUri]) {
					CACHE[currentUri].musixmatchTranslation = null;
					CACHE[currentUri].musixmatchTranslationLanguage = null;
				}
			}
			finishRequest();
			return;
		}

		if (!translation) {
			if (isLatestRequest()) {
				Spicetify.showNotification(MUSIXMATCH_TRANSLATION_FETCH_FAILED_MESSAGE, true, 3000);
				if (CACHE[currentUri]) {
					CACHE[currentUri].musixmatchTranslation = null;
					CACHE[currentUri].musixmatchTranslationLanguage = null;
				}
			}
			finishRequest();
			return;
		}

		if (
			currentLanguage !== CONFIG.visual["musixmatch-translation-language"] ||
			trackId !== this.state.musixmatchTrackId ||
			currentUri !== this.state.uri ||
			!isLatestRequest()
		) {
			finishRequest();
			return;
		}

		const latestBaseLyrics = this.state.synced ?? this.state.unsynced;
		if (!latestBaseLyrics) {
			finishRequest();
			return;
		}

		const mappedTranslation = latestBaseLyrics.map((line) => {
			const originalText = line.originalText ?? line.text;
			const matched = translation.find((entry) => Utils.processLyrics(entry.matchedLine) === Utils.processLyrics(originalText));

			return {
				...line,
				text: matched?.translation ?? line.text,
				originalText,
			};
		});

		if (!isLatestRequest()) {
			finishRequest();
			return;
		}

		this.setState({
			musixmatchTranslation: mappedTranslation,
			musixmatchTranslationLanguage: currentLanguage,
		});
		if (CACHE[currentUri]) {
			CACHE[currentUri].musixmatchTranslation = mappedTranslation;
			CACHE[currentUri].musixmatchTranslationLanguage = currentLanguage;
		}
		finishRequest();
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
						finalData.musixmatchTranslation.find((l) => Utils.processLyrics(l.originalText) === Utils.processLyrics(line.text))?.text ?? line.text,
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

		let isCached = this.lyricsSaved(info.uri);

		if (CONFIG.visual.colorful) {
			this.fetchColors(info.uri);
		}

		this.fetchTempo(info.uri);
		this.resetDelay();

		let tempState;
		// if lyrics are cached
		if ((mode === -1 && CACHE[info.uri]) || CACHE[info.uri]?.[CONFIG.modes?.[mode]]) {
			tempState = { ...emptyState, ...CACHE[info.uri], isCached };
			if (CACHE[info.uri]?.mode) {
				this.state.explicitMode = CACHE[info.uri]?.mode;
				tempState = { ...tempState, mode: CACHE[info.uri]?.mode };
			}
		} else {
			this.setState({ ...emptyState, isLoading: true, isCached: false });

			const resp = await this.tryServices(info, mode);
			if (resp.provider) {
				// Cache lyrics
				CACHE[resp.uri] = resp;
			}

			// This True when the user presses the Cache Lyrics button and saves it to localStorage.
			isCached = this.lyricsSaved(resp.uri);

			// In case user skips tracks too fast and multiple callbacks
			// set wrong lyrics to current track.
			if (resp.uri === this.currentTrackUri) {
				tempState = { ...emptyState, ...resp, isLoading: false, isCached };
			} else {
				return;
			}
		}

		const selectedMusixmatchLanguage = CONFIG.visual["musixmatch-translation-language"] || "none";
		const shouldRefreshMusixmatchTranslation =
			tempState.musixmatchTrackId &&
			selectedMusixmatchLanguage !== "none" &&
			Array.isArray(tempState.musixmatchAvailableTranslations) &&
			tempState.musixmatchAvailableTranslations.includes(selectedMusixmatchLanguage) &&
			(tempState.musixmatchTranslationLanguage !== selectedMusixmatchLanguage || !tempState.musixmatchTranslation);
		if (
			selectedMusixmatchLanguage !== "none" &&
			(!Array.isArray(tempState.musixmatchAvailableTranslations) || !tempState.musixmatchAvailableTranslations.includes(selectedMusixmatchLanguage))
		) {
			if (
				typeof CONFIG.visual["translate:translated-lyrics-source"] === "string" &&
				CONFIG.visual["translate:translated-lyrics-source"].startsWith(MUSIXMATCH_TRANSLATION_PREFIX)
			) {
				CONFIG.visual["translate:translated-lyrics-source"] = "none";
				localStorage.setItem(`${APP_NAME}:visual:translate:translated-lyrics-source`, "none");
			}
			CONFIG.visual["musixmatch-translation-language"] = "none";
			localStorage.setItem(`${APP_NAME}:visual:musixmatch-translation-language`, "none");
		}
		const translationOverrides = shouldRefreshMusixmatchTranslation ? { musixmatchTranslation: null, musixmatchTranslationLanguage: null } : {};

		let finalMode = mode;
		if (mode === -1) {
			if (this.state.explicitMode !== -1) {
				finalMode = this.state.explicitMode;
			} else if (this.state.lockMode !== -1) {
				finalMode = this.state.lockMode;
			} else {
				// Auto switch
				if (tempState.karaoke) {
					finalMode = KARAOKE;
				} else if (tempState.synced) {
					finalMode = SYNCED;
				} else if (tempState.unsynced) {
					finalMode = UNSYNCED;
				} else if (tempState.genius) {
					finalMode = GENIUS;
				}
			}
		}

		this.lyricsSource(tempState, finalMode);

		// if song changed one time
		if (tempState.uri !== this.state.uri || refresh) {
			// when a song starts for the first time and language-override is selected, the lyrics are converted to the specified language.
			// however, when switching it off again, the detected language needs to be known, so defaultLanguage has been introduced.
			const newLyrics = tempState.synced || tempState.unsynced || tempState.genius || [];
			const defaultLanguage = Utils.detectLanguage(newLyrics);
			const language =
				CONFIG.visual["translate:detect-language-override"] !== "off" ? CONFIG.visual["translate:detect-language-override"] : defaultLanguage;
			const friendlyLanguage = language && new Intl.DisplayNames(["en"], { type: "language" }).of(language.split("-")[0])?.toLowerCase();
			const targetConvert = CONFIG.visual[`translation-mode:${friendlyLanguage}`];

			const isMemory = CACHE[tempState.uri]?.[targetConvert];
			if (CONFIG.visual.translate && defaultLanguage && !isMemory) {
				this.translateLyrics(language, newLyrics, targetConvert).then((translated) => {
					const res = { [targetConvert]: translated };
					// Cache translated lyrics
					CACHE[tempState.uri] = { ...CACHE[tempState.uri], ...res };
					this.setState({ ...res });
				});
			}

			// reset and apply
			this.setState(
				{
					furigana: null,
					romaji: null,
					hiragana: null,
					katakana: null,
					hangul: null,
					romaja: null,
					cn: null,
					hk: null,
					tw: null,
					neteaseTranslation: null,
					...tempState,
					...translationOverrides,
					language: defaultLanguage,
				},
				() => {
					this.currentMusixmatchLanguage = CONFIG.visual["musixmatch-translation-language"];
					if (shouldRefreshMusixmatchTranslation) {
						this.refreshMusixmatchTranslation();
					}
				}
			);
			return;
		}

		this.setState({ ...tempState, ...translationOverrides }, () => {
			this.currentMusixmatchLanguage = CONFIG.visual["musixmatch-translation-language"];
			if (shouldRefreshMusixmatchTranslation) {
				this.refreshMusixmatchTranslation();
			}
		});
	}

	lyricsSource(lyricsState, mode) {
		if (window.LyricsPlus?.TranslationCoordinator) {
			window.LyricsPlus.TranslationCoordinator.lyricsSource(this, lyricsState, mode);
		}
	}

	resetTranslationCache(uri, modesToClear) {
		if (window.LyricsPlus?.TranslationCoordinator) {
			window.LyricsPlus.TranslationCoordinator.resetTranslationCache(this, uri, modesToClear);
		}
	}

	_setCurrentLyrics(arr) {
		if (!Array.isArray(arr)) {
			if (this.state.currentLyrics !== arr) {
				this.setState({ currentLyrics: arr });
			}
			return;
		}
		const source = this.state.synced || this.state.unsynced;
		const newLyrics = this._reattachTiming(arr, source);
		
		// Prevent infinite render loop by checking if new lyrics are identical to current state
		let isSame = Array.isArray(this.state.currentLyrics) && this.state.currentLyrics.length === newLyrics.length;
		if (isSame) {
			for (let i = 0; i < newLyrics.length; i++) {
				if (
					this.state.currentLyrics[i].text !== newLyrics[i].text ||
					this.state.currentLyrics[i].text2 !== newLyrics[i].text2 ||
					this.state.currentLyrics[i].startTime !== newLyrics[i].startTime ||
					this.state.currentLyrics[i].endTime !== newLyrics[i].endTime
				) {
					isSame = false;
					break;
				}
			}
		}
		
		if (!isSame) {
			this.setState({ currentLyrics: newLyrics });
		}
	}

	_reattachTiming(target, source) {
		if (!Array.isArray(target)) return target;
		if (!Array.isArray(source) || source.length !== target.length) return target;
		const needsRepair = target.some(l => l && (typeof l.startTime !== "number" || !isFinite(l.startTime)));
		if (!needsRepair) return target;
		return target.map((line, i) => {
			const src = source[i];
			if (!src) return line;
			return {
				...line,
				startTime: (typeof line?.startTime === "number" && isFinite(line.startTime)) ? line.startTime : src.startTime,
				endTime: (typeof line?.endTime === "number" && isFinite(line.endTime)) ? line.endTime : src.endTime,
			};
		});
	}

	provideLanguageCode(lyrics) {
		if (!lyrics) return;

		if (CONFIG.visual["translate:detect-language-override"] !== "off") {
			return CONFIG.visual["translate:detect-language-override"];
		}
		if (this.state.language) {
			return this.state.language;
		}
		return Utils.detectLanguage(lyrics);
	}

	async translateLyrics(language, lyrics, targetConvert) {
		if (!language) return;

		Spicetify.showNotification("Converting...", false, 1000);
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

				result = await Promise.all(
					lyrics.map(async (lyric) => await this.translator.romajifyText(lyric.text, map[targetConvert].target, map[targetConvert].mode))
				);
			} else if (language === "ko") {
				// Korean
				result = await Promise.all(lyrics.map(async (lyric) => await this.translator.convertToRomaja(lyric.text, "romaji")));
			} else if (language === "zh-hans") {
				// Chinese (Simplified)
				const map = {
					cn: { from: "cn", target: "cn" },
					tw: { from: "cn", target: "tw" },
					hk: { from: "cn", target: "hk" },
				};

				// prevent conversion between the same language.
				if (targetConvert === "cn") {
					Spicetify.showNotification("No conversion is needed", false, 1000);
					return lyrics;
				}

				result = await Promise.all(
					lyrics.map(async (lyric) => await this.translator.convertChinese(lyric.text, map[targetConvert].from, map[targetConvert].target))
				);
			} else if (language === "zh-hant") {
				// Chinese (Traditional)
				const map = {
					cn: { from: "t", target: "cn" },
					hk: { from: "t", target: "hk" },
					tw: { from: "t", target: "tw" },
				};

				// prevent conversion between the same language.
				if (targetConvert === "tw") {
					Spicetify.showNotification("No conversion is needed", false, 1000);
					return lyrics;
				}

				result = await Promise.all(
					lyrics.map(async (lyric) => await this.translator.convertChinese(lyric.text, map[targetConvert].from, map[targetConvert].target))
				);
			}

			const res = Utils.processTranslatedLyrics(result, lyrics);
			Spicetify.showNotification("Converting...", false, 0);
			return res;
		} catch (error) {
			Spicetify.showNotification("Convert Error!", true);
			console.error(error);
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

	saveLocalLyrics(uri, lyrics) {
		if (lyrics.genius) {
			lyrics.unsynced = lyrics.genius.split("<br>").map((lyc) => {
				return {
					text: lyc.replace(/<[^>]*>/g, ""),
				};
			});
			lyrics.genius = null;
		}

		const localLyrics = JSON.parse(localStorage.getItem(`${APP_NAME}:local-lyrics`)) || {};
		localLyrics[uri] = lyrics;
		localStorage.setItem(`${APP_NAME}:local-lyrics`, JSON.stringify(localLyrics));
		this.setState({ isCached: true });
	}

	deleteLocalLyrics(uri) {
		const localLyrics = JSON.parse(localStorage.getItem(`${APP_NAME}:local-lyrics`)) || {};
		delete localLyrics[uri];
		localStorage.setItem(`${APP_NAME}:local-lyrics`, JSON.stringify(localLyrics));
		console.log(localLyrics);
		this.setState({ isCached: false });
	}

	lyricsSaved(uri) {
		const localLyrics = JSON.parse(localStorage.getItem(`${APP_NAME}:local-lyrics`)) || {};
		return !!localLyrics[uri];
	}

	processLyricsFromFile(event) {
		if (window.LyricsPlus?.TranslationCoordinator) {
			window.LyricsPlus.TranslationCoordinator.processLyricsFromFile(this, event);
		}
	}
	initMoustrap() {
		if (!this.mousetrap && Spicetify.Mousetrap) {
			this.mousetrap = new Spicetify.Mousetrap();
		}
	}

	componentDidMount() {
		this.onQueueChange = async ({ data: queue }) => {
			this.state.explicitMode = this.state.lockMode;
			this.currentTrackUri = queue.current.uri;
			this.fetchLyrics(queue.current, this.state.explicitMode);
			this.viewPort.scrollTo(0, 0);

			// Fetch next track
			const nextTrack = queue.queued?.[0] || queue.nextUp?.[0];
			const nextInfo = this.infoFromTrack(nextTrack);
			// Debounce next track fetch
			if (!nextInfo || nextInfo.uri === this.nextTrackUri) return;
			this.nextTrackUri = nextInfo.uri;
			this.tryServices(nextInfo, this.state.explicitMode).then((resp) => {
				if (resp.provider) {
					// Cache lyrics
					CACHE[resp.uri] = resp;
				}
			});
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

			if (this.currentMusixmatchLanguage !== CONFIG.visual["musixmatch-translation-language"]) {
				this.currentMusixmatchLanguage = CONFIG.visual["musixmatch-translation-language"];
				this.refreshMusixmatchTranslation();
			}
		};

		refreshMusixmatchTranslation = this.refreshMusixmatchTranslation.bind(this);

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

		this.pretranslateInterval = setInterval(() => {
			if (Spicetify.Player?.data?.is_paused || !CONFIG.visual["pre-translation"]) return;
			const duration = Spicetify.Player.getDuration();
			const progress = Spicetify.Player.getProgress();
			const preTransTime = (Number(CONFIG.visual["pre-translation-time"]) || 30) * 1000;
			if (duration > 0 && duration - progress < preTransTime) {
				if (window.LyricsPlus?.TranslationCoordinator) {
					window.LyricsPlus.TranslationCoordinator.tryPretranslateNext(this);
				}
			}
		}, 3000);
	}

	componentWillUnmount() {
		if (this.pretranslateInterval) {
			clearInterval(this.pretranslateInterval);
		}
		window.lyricContainer = null;
		Utils.removeQueueListener(this.onQueueChange);
		this.configButton.deregister();
		this.mousetrap.reset();
		window.removeEventListener("fad-request", lyricContainerUpdate);
		refreshMusixmatchTranslation = null;
	}

	componentDidCatch(error, info) {
		this.setState({ error: `${error.message}\n${error.stack}` });
	}

	updateVisualOnConfigChange() {
		this.availableModes = CONFIG.modes.filter((_, id) => {
			return Object.values(CONFIG.providers).some((p) => p.on && p.modes.includes(id));
		});

		if (!CONFIG.visual.colorful) {
			this.styleVariables = {
				"--lyrics-color-active": CONFIG.visual["active-color"],
				"--lyrics-color-inactive": CONFIG.visual["inactive-color"],
				"--lyrics-color-background": CONFIG.visual["background-color"],
				"--lyrics-highlight-background": CONFIG.visual["highlight-color"],
				"--lyrics-background-noise": CONFIG.visual.noise ? "var(--background-noise)" : "unset",
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

	render() {
		if (this.state.error) {
			return react.createElement(
				"div",
				{
					style: {
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						height: "100%",
						width: "100%",
						backgroundColor: "#2b1010",
						color: "#ff6b6b",
						padding: "30px",
						fontFamily: "monospace",
						whiteSpace: "pre-wrap",
						fontSize: "12px",
						overflowY: "auto",
						zIndex: 9999,
						position: "absolute",
						top: 0,
						left: 0,
					},
				},
				react.createElement("h2", { style: { marginBottom: "15px", color: "#ff8b8b" } }, "Lyrics Plus Error Caught:"),
				react.createElement("p", null, this.state.error),
				react.createElement(
					"button",
					{
						style: {
							marginTop: "20px",
							padding: "10px 20px",
							backgroundColor: "#ff6b6b",
							color: "white",
							border: "none",
							borderRadius: "5px",
							cursor: "pointer",
						},
						onClick: () => this.setState({ error: null }),
					},
					"Dismiss"
				)
			);
		}
		const fadLyricsContainer = document.getElementById("fad-lyrics-plus-container");
		this.state.isFADMode = !!fadLyricsContainer;

		if (this.state.isFADMode) {
			// Text colors will be set by FAD extension
			this.styleVariables = {};
		} else if (CONFIG.visual.colorful) {
			this.styleVariables = {
				"--lyrics-color-active": "white",
				"--lyrics-color-inactive": "rgba(255, 255, 255, 0.35)",
				"--lyrics-color-background": this.state.colors.background || "transparent",
				"--lyrics-highlight-background": this.state.colors.inactive,
				"--lyrics-background-noise": CONFIG.visual.noise ? "var(--background-noise)" : "unset",
			};
		}

		this.styleVariables = {
			...this.styleVariables,
			"--lyrics-align-text": CONFIG.visual.alignment,
			"--lyrics-font-size": `${CONFIG.visual["font-size"]}px`,
			"--animation-tempo": this.state.tempo,
		};

		let mode = -1;
		if (this.state.explicitMode !== -1) {
			mode = this.state.explicitMode;
		} else if (this.state.lockMode !== -1) {
			mode = this.state.lockMode;
		} else {
			// Auto switch
			if (this.state.karaoke) {
				mode = KARAOKE;
			} else if (this.state.synced) {
				mode = SYNCED;
			} else if (this.state.unsynced) {
				mode = UNSYNCED;
			} else if (this.state.genius) {
				mode = GENIUS;
			}
		}

		let activeItem;
		let showTranslationButton;

		this.lyricsSource(this.state, mode);
		const lang = this.provideLanguageCode(this.state.currentLyrics);
		const friendlyLanguage = lang && new Intl.DisplayNames(["en"], { type: "language" }).of(lang.split("-")[0])?.toLowerCase();
		const hasMusixmatchLanguages = Array.isArray(this.state.musixmatchAvailableTranslations) && this.state.musixmatchAvailableTranslations.length > 0;
		const hasTranslation = this.state.neteaseTranslation !== null || this.state.musixmatchTranslation !== null || hasMusixmatchLanguages;
		const hasPerformer = !!this.state.currentLyrics?.some((line) => line.performer);

		if (mode !== -1) {
			showTranslationButton = (friendlyLanguage || hasTranslation) && (mode === SYNCED || mode === UNSYNCED);

			if (mode === KARAOKE && this.state.karaoke) {
				activeItem = react.createElement(CONFIG.visual["synced-compact"] ? SyncedLyricsPage : SyncedExpandedLyricsPage, {
					isKara: true,
					trackUri: this.state.uri,
					lyrics: this.state.karaoke,
					provider: this.state.provider,
					copyright: this.state.copyright,
					reRenderLyricsPage: this.reRenderLyricsPage,
				});
			} else if (mode === SYNCED && this.state.synced) {
				activeItem = react.createElement(CONFIG.visual["synced-compact"] ? SyncedLyricsPage : SyncedExpandedLyricsPage, {
					trackUri: this.state.uri,
					lyrics: this.state.currentLyrics,
					provider: this.state.provider,
					copyright: this.state.copyright,
					reRenderLyricsPage: this.reRenderLyricsPage,
				});
			} else if (mode === UNSYNCED && this.state.unsynced) {
				activeItem = react.createElement(UnsyncedLyricsPage, {
					trackUri: this.state.uri,
					lyrics: this.state.currentLyrics,
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

		const trackUriNow = this.state.uri;
		const translationStatusForTrack =
			this.state.translationStatus &&
			(!this.state.translationStatus.trackUri || this.state.translationStatus.trackUri === trackUriNow)
				? this.state.translationStatus
				: null;
		const translationIndicatorVisible =
			!!(this.state.isTranslating && this.state.translationIndicatorUri === trackUriNow);
		const hasReasoningText = !!(
			(this.state.reasoningStreams?.translation && this.state.reasoningStreams.translation.length > 0) ||
			(this.state.reasoningStreams?.phonetic && this.state.reasoningStreams.phonetic.length > 0)
		);

		const out = react.createElement(
			"div",
			{
				className: `lyrics-lyricsContainer-LyricsContainer${CONFIG.visual["fade-blur"] ? " blur-enabled" : ""}${
					fadLyricsContainer ? " fad-enabled" : ""
				}`,
				style: this.styleVariables,
				ref: (el) => {
					if (!el) return;
					el.onmousewheel = this.onFontSizeChange;
				},
			},
			react.createElement("div", {
				className: "lyrics-lyricsContainer-LyricsBackground",
			}),
			react.createElement(window.TranslationStatusOverlay, {
				isVisible: translationIndicatorVisible,
				status: translationStatusForTrack,
				hasReasoningText,
				onReasoningClick: this.toggleReasoning,
				isReasoningOpen: !!this.state.isReasoningVisible,
				preTranslateChip: this.state.preTranslateChip,
				currentUri: trackUriNow,
				preTranslateEnabled: !!CONFIG.visual["pre-translation"],
			}),
			react.createElement(
				"div",
				{
					className: "lyrics-config-button-container",
				},
				showTranslationButton &&
					react.createElement(TranslationMenu, {
						friendlyLanguage,
						hasTranslation: {
							musixmatch: this.state.musixmatchTranslation !== null,
							netease: this.state.neteaseTranslation !== null,
						},
						musixmatchLanguages: this.state.musixmatchAvailableTranslations || [],
						musixmatchSelectedLanguage: this.state.musixmatchTranslationLanguage || CONFIG.visual["musixmatch-translation-language"],
					}),
				react.createElement(AdjustmentsMenu, { mode, hasPerformer }),
				// 3. NetEase Search button (N)
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: getText("tooltips.searchNetease", {}, "Search NetEase"),
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							onClick: () => {
								if (typeof ProviderNetease?.openManualSearchModal === "function") {
									ProviderNetease.openManualSearchModal((selectedLyrics) => {
										if (selectedLyrics) {
											if (CACHE[selectedLyrics.uri]) {
												const resetKeys = ["romaji", "furigana", "hiragana", "katakana", "hangul", "romaja", "cn", "hk", "tw", "musixmatchTranslation", "musixmatchTranslationLanguage", "neteaseTranslation"];
												for (const k of resetKeys) {
													delete CACHE[selectedLyrics.uri][k];
												}
											}
											CACHE[selectedLyrics.uri] = {
												...CACHE[selectedLyrics.uri],
												...selectedLyrics
											};
											let finalMode = -1;
											if (selectedLyrics.karaoke) {
												finalMode = KARAOKE;
											} else if (selectedLyrics.synced) {
												finalMode = SYNCED;
											} else if (selectedLyrics.unsynced) {
												finalMode = UNSYNCED;
											} else if (selectedLyrics.genius) {
												finalMode = GENIUS;
											}
											this.state.explicitMode = finalMode;
											const newCurrentLyrics = selectedLyrics.synced || selectedLyrics.unsynced || selectedLyrics.genius || null;
											this.setState({
												...emptyState,
												...selectedLyrics,
												currentLyrics: newCurrentLyrics,
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
												musixmatchTranslationLanguage: null,
												neteaseTranslation: selectedLyrics.neteaseTranslation ?? null,
												mode: finalMode,
												isLoading: false,
												isCached: this.lyricsSaved(selectedLyrics.uri),
											});
										}
									});
								}
							},
							style: { color: "var(--lp-fab-icon, var(--spice-button))" },
						},
						"N"
					)
				),
				// 4. Video Background Settings Button (▶)
				CONFIG.visual["video-background"] &&
					react.createElement(
						Spicetify.ReactComponent.TooltipWrapper,
						{ label: getText("tooltips.videoSettings", {}, "Video Settings") },
						react.createElement(
							"button",
							{
								className: "lyrics-config-button",
								onClick: () => {
									this.openVideoSettingsModal();
								},
								style: { color: "var(--lp-fab-icon, var(--spice-button))" },
							},
							react.createElement("svg", {
								width: 16,
								height: 16,
								viewBox: "0 0 16 16",
								fill: "currentColor",
								dangerouslySetInnerHTML: {
									__html: '<path d="M14.5 13.5h-13A.5.5 0 011 13V3a.5.5 0 01.5-.5h13a.5.5 0 01.5.5v10a.5.5 0 01-.5.5zM2 12h12V4H2v8z"/><path d="M6 6l4 2-4 2V6z"/>',
								},
							})
						)
					),
				// 5. Cache lyrics button (↓)
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
									Spicetify.showNotification("No lyrics to cache", true);
									return;
								}

								if (this.state.isCached) {
									this.deleteLocalLyrics(this.currentTrackUri);
									Spicetify.showNotification("Delete lyrics cache");
								} else {
									this.saveLocalLyrics(this.currentTrackUri, { synced, unsynced, karaoke, genius });
									Spicetify.showNotification("Lyrics cached");
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
				// 6. Load lyrics from file button (+)
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
								document.getElementById("lyrics-file-input").click();
							},
						},
						react.createElement("input", {
							type: "file",
							id: "lyrics-file-input",
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
				// 7. Reset translation cache button (✕)
				(this.state.synced || this.state.unsynced || this.state.genius) &&
					react.createElement(
						Spicetify.ReactComponent.TooltipWrapper,
						{
							label: getText("tooltips.resetCache", {}, "Reset Translation Cache"),
						},
						react.createElement(
							"button",
							{
								className: "lyrics-config-button",
								style: { color: "var(--lp-fab-icon, var(--spice-button))" },
								onClick: () => {
									const modeKey = this.modeKey || "gemini";
									const mode1 = CONFIG.visual[`translation-mode:${modeKey}`];
									const mode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];
									const modesToClear = [mode1, mode2].filter((m) => m && m !== "none");
									this.resetTranslationCache(this.currentTrackUri, modesToClear.length > 0 ? modesToClear : null);
								},
							},
							react.createElement("svg", {
								width: 16,
								height: 16,
								viewBox: "0 0 16 16",
								fill: "currentColor",
								dangerouslySetInnerHTML: {
									__html:
										Spicetify.SVGIcons["x"] ||
										Spicetify.SVGIcons["close"] ||
										Spicetify.SVGIcons["cross"] ||
										'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>',
								},
							})
						)
					),
				// 8. Open Settings modal button (⚙)tton
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: getText("tooltips.openSettings", {}, "Open Settings"),
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							style: { color: "var(--lp-fab-icon, var(--spice-button))" },
							onClick: () => {
								openConfig();
							},
						},
						react.createElement("svg", {
							width: 16,
							height: 16,
							viewBox: "0 0 16 16",
							fill: "currentColor",
							dangerouslySetInnerHTML: {
								__html:
									Spicetify.SVGIcons["settings"] ||
									Spicetify.SVGIcons["preferences"] ||
									'<path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>',
								},
							})
						)
					)
			),
			activeItem,
			typeof window.ReasoningWindow === "function" &&
				react.createElement(window.ReasoningWindow, {
					open: !!this.state.isReasoningVisible,
					streams: this.state.reasoningStreams || {},
					activeTab: this.state.reasoningActiveTab,
					onTabChange: (tab) => this.setState({ reasoningActiveTab: tab }),
					isStreaming: !!this.state.isTranslating,
					onClose: this.toggleReasoning,
				})
		);

		if (this.state.isFullscreen) return Spicetify.ReactDOM.createPortal(out, this.fullscreenContainer);
		if (fadLyricsContainer) return Spicetify.ReactDOM.createPortal(out, fadLyricsContainer);
		return out;
	}
}
