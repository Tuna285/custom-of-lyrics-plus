// Run "npm i @types/react" to have this type package available in workspace
/// <reference types="react" />
/// <reference path="../../globals.d.ts" />

/** @type {React} */
const react = Spicetify.React;
const { useState, useEffect, useCallback, useMemo, useRef } = react;
/** @type {import("react").ReactDOM} */
const reactDOM = Spicetify.ReactDOM;
const spotifyVersion = Spicetify.Platform.version;

// Initialize Netease Provider
if (window.ProviderNetease) {
	window.ProviderNetease.setWorkerUrl(CONFIG.visual["netease-worker-url"]);
}


function render() {
	// Check for updates silently on startup (once per 24h)
	setTimeout(() => UpdateService.checkForUpdates(true), 3000);
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
		videoBackground: null, // { video_id: string, sync_offset: number, title: string, has_subtitles: boolean }
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

	async fetchVideoBackgroundWithLyrics(track, lyrics = []) {
        console.log(`[LyricsPlus] fetchVideoBackgroundWithLyrics called for: ${track?.metadata?.title}`);
		const info = this.infoFromTrack(track);
        if (!info) {
             console.warn("[LyricsPlus] infoFromTrack returned null");
             return;
        }

        // Mark this URI as the current active video request
        // If another request comes in, it will overwrite this value
        this._lastVideoRequestUri = info.uri;

        // PRE-EMPTIVE CLEAR: Stop showing previous video immediately if track changed
        if (this.state.videoBackground && this.state.videoBackground.uri !== info.uri) {
             // Show loading indicator instantly
             this.setState({ videoBackground: { loading: true, uri: info.uri } }); 
        }

		// Delegate to VideoManager (ivLyrics Client-Only)
		const videoData = await VideoManager.fetchVideoForTrack(info);
        console.log("[LyricsPlus] VideoManager returned:", videoData);
		
        // RACE CONDITION FIX: Check if a newer request has started
        // If _lastVideoRequestUri was overwritten by a newer request, ignore this stale response
        if (this._lastVideoRequestUri !== info.uri) {
            console.log(`[LyricsPlus] Ignored stale video response for: ${info.title}`);
            return; // Don't update state with stale data
        }

		if (videoData) {
			this.setState({ videoBackground: videoData });
		} else {
			// Explicitly clear video if none found (fixes persistence bug)
			this.setState({ videoBackground: null });
		}
	}

openVideoSettingsModal() {
	const react = Spicetify.React;
	const currentVideo = this.state.videoBackground?.video_id || "";
	const currentOffset = this.state.videoBackground?.sync_offset || 0;
	const track = Spicetify.Player.data.item;
	const info = this.infoFromTrack(track);
	
	if (!info) {
		Spicetify.showNotification(getText("notifications.noTrack"), true, 2000);
		return;
	}
	
	// Store reference to 'this' for use in callbacks
	const self = this;

	// Modal content component (simplified - no server search)
	const ModalContent = () => {
		const [offset, setOffset] = react.useState(currentOffset);
		const [videoId, setVideoId] = react.useState(currentVideo);
		const [manualInput, setManualInput] = react.useState("");

		return react.createElement("div", { 
			style: { 
				padding: "10px", 
				maxWidth: "450px",
				color: "#fff"
			} 
		},
			// Current Track Info
			react.createElement("div", {
				style: {
					marginBottom: "10px",
					padding: "8px",
					background: "rgba(255,255,255,0.05)",
					borderRadius: "6px",
					display: "flex",
					alignItems: "center",
					gap: "10px"
				}
			},
				info.image && react.createElement("img", {
					src: info.image,
					style: {
						width: "40px",
						height: "40px",
						borderRadius: "4px",
						objectFit: "cover"
					}
				}),
				react.createElement("div", { style: { flex: 1 } },
					react.createElement("div", { 
						style: { fontWeight: "bold", fontSize: "14px", marginBottom: "4px" } 
					}, info.title),
					react.createElement("div", { 
						style: { fontSize: "12px", color: "#aaa" } 
					}, info.artist)
				),
				// Copy Button
				react.createElement(Spicetify.ReactComponent.TooltipWrapper, { label: getText("tooltips.copy") || "Copy to search" },
					react.createElement("button", {
						className: "lyrics-config-button",
						style: {
							background: "transparent",
							border: "none",
							color: "#aaa",
							cursor: "pointer",
							padding: "5px",
							marginLeft: "5px"
						},
						onClick: () => {
							const textToCopy = `${info.artist} - ${info.title}`;
							Spicetify.Platform.ClipboardAPI.copy(textToCopy);
							const msg = getText("notifications.copied").replace("{text}", textToCopy);
							Spicetify.showNotification(msg);
						}
					}, react.createElement("svg", {
						width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor",
						dangerouslySetInnerHTML: { __html: '<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>' }
					}))
				)
			),

			// Manual Input Section
			react.createElement("div", {
				style: { marginBottom: "10px" }
			},
				react.createElement("label", { 
					style: { 
						display: "block", 
						marginBottom: "5px", 
						fontSize: "12px",
						fontWeight: "bold",
						color: "var(--spice-button)"
					} 
				}, getText("videoModal.inputId")),
				react.createElement("input", {
					type: "text",
					placeholder: getText("videoModal.placeholder"),
					value: manualInput || videoId,
					onChange: (e) => {
						const val = e.target.value.trim();
						setManualInput(val);
						// Auto-extract video ID from URL or direct ID
						const urlMatch = val.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
						if (urlMatch) {
							setVideoId(urlMatch[1]);
						} else if (val.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(val)) {
							setVideoId(val);
						}
					},
					style: { 
						width: "100%", 
						padding: "6px 10px", 
						borderRadius: "4px", 
						border: "1px solid #555", 
						background: "#222", 
						color: "#fff",
						fontSize: "13px"
					}
				}),
				videoId && videoId !== manualInput && react.createElement("div", {
					style: {
						marginTop: "8px",
						padding: "8px",
						background: "rgba(29,185,84,0.1)",
						borderRadius: "4px",
						fontSize: "11px",
						color: "#1db954"
					}
				}, `✓ ${getText("videoModal.detectedId")}: ${videoId}`)
			),

			// Offset adjustment
			react.createElement("div", { 
				style: { marginBottom: "5px" } 
			},
				react.createElement("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "5px"
					}
				},
					react.createElement("label", { 
						style: { 
							fontSize: "13px",
							fontWeight: "bold"
						} 
					}, getText("videoModal.totalOffset")),
					react.createElement("div", {
						style: { display: "flex", alignItems: "center", gap: "5px" }
					},
						react.createElement("input", {
							type: "number",
							step: "0.1",
							value: offset,
							onChange: (e) => setOffset(parseFloat(e.target.value) || 0),
							style: {
								width: "80px",
								padding: "4px",
								borderRadius: "4px",
								border: "1px solid #555",
								background: "var(--spice-card)",
								color: "var(--spice-text)",
								fontSize: "13px",
								textAlign: "center"
							}
						}),
						react.createElement("span", { style: { fontSize: "12px", color: "#888" } }, "s")
					)
				),
				react.createElement("input", {
					type: "range",
					min: "-30",
					max: "30",
					step: "0.5",
					value: offset,
					onChange: (e) => setOffset(parseFloat(e.target.value)),
					style: {
						width: "100%",
						height: "6px",
						borderRadius: "3px"
					}
				}),
				react.createElement("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						fontSize: "10px",
						color: "#888",
						marginTop: "2px"
					}
				},
					react.createElement("span", null, "-30s"),
					react.createElement("span", null, "0"),
					react.createElement("span", null, "+30s")
				)
			),

			// Action Buttons
			react.createElement("div", { 
				style: { 
					display: "flex", 
					gap: "10px" 
				} 
			},
				react.createElement("button", {
					onClick: () => {
						if (!videoId || videoId.length !== 11) {
							Spicetify.showNotification(getText("notifications.invalidId"), true, 2000);
							return;
						}
						
						// Use simplified client-only setManualVideo
						const result = VideoManager.setManualVideo(info, videoId, offset);
						if (result) {
							self.setState({ videoBackground: result });
							// Save offset AND manual video ID to IndexedDB for persistence
							VideoManager.saveOffset(info.uri, offset);
							VideoManager.saveManualVideo(info.uri, videoId);
							Spicetify.showNotification(`✓ Video set: ${videoId} (saved)`, false, 2000);
						}
						Spicetify.PopupModal.hide();
					},
					style: { 
						flex: 1, 
						padding: "8px", 
						borderRadius: "6px", 
						background: "var(--spice-button)", 
						color: "#fff", 
						border: "none",
						cursor: "pointer",
						fontWeight: "bold",
						fontSize: "13px"
					}
				}, getText("videoModal.apply")),
				react.createElement("button", {
					onClick: () => {
						// Simple client-only reset
						VideoManager.reset();
						self.setState({ videoBackground: null });
						Spicetify.PopupModal.hide();
						Spicetify.showNotification(getText("notifications.videoReset"), false, 2000);
						
						// Force re-fetch from ivLyrics
						const track = Spicetify.Player.data.item;
						self.fetchVideoBackgroundWithLyrics(track);
					},
					style: { 
						flex: 1,
						padding: "8px", 
						borderRadius: "6px", 
						background: "#444", 
						color: "#fff", 
						border: "none",
						cursor: "pointer",
						fontWeight: "bold",
						fontSize: "13px"
					}
				}, getText("videoModal.reset"))
			)
		);
	};

	Spicetify.PopupModal.display({
		title: getText("videoModal.title"),
		content: react.createElement(ModalContent)
	});
}

infoFromTrack(track) {
		// Delegate to LyricsFetcher
		return LyricsFetcher.infoFromTrack(track);
	}

	async fetchColors(uri) {
		// Delegate to LyricsFetcher, then update state
		const colors = await LyricsFetcher.fetchColors(uri);
		// Only update if request still valid (colors not null)
		if (colors) this.setState({ colors });
	}

	async fetchTempo(uri) {
		// Delegate to LyricsFetcher, then update state
		const tempo = await LyricsFetcher.fetchTempo(uri);
		this.setState({ tempo });
	}

	async tryServices(trackInfo, mode = -1) {
		// Delegate to LyricsFetcher
		return LyricsFetcher.tryServices(trackInfo, mode);
	}

	async fetchLyrics(track, mode = -1, refresh = false) {
		const info = this.infoFromTrack(track);
		if (!info) {
			this.setState({ error: "No track info" });
			return;
		}

		// Track current request to prevent stale responses
		LyricsFetcher.setCurrentRequest(info.uri);

		//Keep artist/title for prompts
		this.setState({ artist: info.artist, title: info.title });

		let isCached = this.lyricsSaved(info.uri);

		this.fetchColors(info.uri);

		this.fetchTempo(info.uri);
		this.resetDelay();

		// Start video background fetch in parallel (no await - independent of lyrics)
		if (CONFIG.visual["video-background"]) {
			this.fetchVideoBackgroundWithLyrics(track).catch(e => 
				console.warn("[LyricsPlus] Video background fetch failed:", e)
			);
		}

		let tempState;
		
		// === L1 RAM Cache Check (Sync, Fast) ===
		const l1Cached = CacheManager.getSync(info.uri);
		
		// L1 contains full lyrics data if present, not mode-specific
		// Simply check if L1 has valid content for this URI
		if (l1Cached && (l1Cached.synced?.length > 0 || l1Cached.unsynced?.length > 0 || l1Cached.genius?.length > 0)) {
			console.log(`[Lyrics+] L1 Cache HIT for: ${info.uri.split(':').pop()}`);
			tempState = { ...l1Cached, isCached };
			if (l1Cached?.mode) {
				this.state.explicitMode = l1Cached.mode;
				tempState = { ...tempState, mode: l1Cached.mode };
			}
		} else {
			// === L2 IndexedDB Cache Check (Async, Persistent) ===
			const l2Cached = await CacheManager.get(info.uri);
			
			// Check for actual content (not empty arrays)
			const hasSynced = l2Cached?.synced?.length > 0;
			const hasUnsynced = l2Cached?.unsynced?.length > 0;
			const hasGenius = l2Cached?.genius?.length > 0;
			const hasContent = hasSynced || hasUnsynced || hasGenius;

			// === Level Hierarchy Decision ===
			// Level 3: Synced (Max) → Use cache immediately
			// Level 2: Unsynced → Check if upgrade is needed (once per session)
			// Level 1: None → Fetch from network
			
			let shouldFetch = false;
			
			if (hasContent) {
				if (hasSynced) {
					// Level 3: Max quality, use cache
					console.log(`[Lyrics+] L2 Cache HIT (Synced) for: ${info.uri.split(':').pop()}`);
					CacheManager.set(info.uri, l2Cached, false); // Promote to L1
					tempState = { ...l2Cached, isCached: true };
				} else if (hasUnsynced || hasGenius) {
					// Level 2: Check if we already tried upgrading this session
					const upgradeAttempted = l2Cached._upgradeAttempted;
					
					if (upgradeAttempted) {
						// Already tried this session, use cached result
						console.log(`[Lyrics+] L2 Cache HIT (Unsynced - Upgrade already attempted) for: ${info.uri.split(':').pop()}`);
						CacheManager.set(info.uri, l2Cached, false); // Promote to L1
						tempState = { ...l2Cached, isCached: true };
					} else {
						// First time this session, check if better providers exist
						const syncCapableProviders = ["musixmatch", "spotify"];
						const enabledSyncProviders = syncCapableProviders.filter(p => CONFIG.providers[p]?.on);
						
						if (enabledSyncProviders.length > 0) {
							console.log(`[Lyrics+] Smart Cache: Attempting upgrade from Unsynced (${l2Cached.provider})`);
							shouldFetch = true;
							// Mark as attempted BEFORE fetching to prevent loops
							l2Cached._upgradeAttempted = true;
							CacheManager.set(info.uri, l2Cached, true); // Update L2 with flag
						} else {
							// No better providers, use cache
							console.log(`[Lyrics+] L2 Cache HIT (Unsynced - No sync providers) for: ${info.uri.split(':').pop()}`);
							CacheManager.set(info.uri, l2Cached, false);
							tempState = { ...l2Cached, isCached: true };
						}
					}
				}
			} else {
				// Level 1: No content in cache
				shouldFetch = true;
			}
			
			// === Network Fetch ===
			if (shouldFetch) {
				console.log(`[Lyrics+] Fetching from network...`);
				const currentMode = this.getCurrentMode();
				this.lastModeBeforeLoading = currentMode !== -1 ? currentMode : SYNCED;
				this.setState({ ...emptyState, isLoading: true, isCached: false });

				try {
					const resp = await this.tryServices(info, mode);

					// Critical: Ensure we are still on the same track
					if (info.uri !== this.currentTrackUri) return;

					if (resp.provider) {
						// Mark upgrade as attempted for this session
						resp._upgradeAttempted = true;
						// Cache to L1 and L2
						CacheManager.set(resp.uri, resp);
						this.saveLocalLyrics(resp.uri, resp);
					}

					isCached = this.lyricsSaved(resp.uri);

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
		}
		
		// === Sanitization (Always run) ===
		// Fix for persistent duplicate copyright in old cache
		if (tempState?.copyright && tempState?.provider) {
			const providerName = tempState.provider;
			const duplicatePattern = new RegExp(`(synced|unsynced)?\\s*lyrics provided by ${providerName}`, 'i');
			
			const lines = tempState.copyright.split('\n');
			const cleanLines = lines.filter(line => !duplicatePattern.test(line));
			
			if (cleanLines.length !== lines.length) {
				tempState.copyright = cleanLines.join('\n').trim();
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
			// Preserve existing Gemini translations if available to prevent UI flicker
			const initialCurrentLyrics = this.state.currentLyrics?.length > 0 && this.state.currentLyrics?.some(l => l.text || l.text2)
				? this.state.currentLyrics
				: (tempState.currentLyrics || tempState.synced || tempState.unsynced || []);
			
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
			// Preserve videoBackground state to avoid reloading
			videoBackground: this.state.videoBackground,
		});
		// Video background is fetched independently in parallel
		return;
	}

		// Preserve cached translations when not changing songs
		const initialCurrentLyrics2 = this.state.currentLyrics?.length > 0 && this.state.currentLyrics?.some(l => l.text || l.text2)
			? this.state.currentLyrics
			: (tempState.currentLyrics || tempState.synced || tempState.unsynced || []);
		
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
		// Preserve videoBackground state
		videoBackground: this.state.videoBackground,
	});
	// Video background is fetched independently in parallel
}

	async lyricsSource(lyricsState, mode) {
		if (!lyricsState) return;

		// Timestamp to verify if this request is still the active one
		const requestTimestamp = Date.now();
		this.activeRequestTimestamp = requestTimestamp;

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
		this.modeKey = modeKey; // Save for reset button to use
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
		// CRITICAL: Use ||= instead of || to avoid resetting cached data on subsequent calls
		this._dmResults = this._dmResults || {};
		if (!this._dmResults[currentUri]) {
			this._dmResults[currentUri] = { mode1: null, mode2: null };
		}

	// Settings change detection logic adjusted to ignore initial undefined state
	const currentStyleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
	const currentPronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";

	// If _lastStyleKey is undefined (first run), we initialize it and don't count it as a change
	if (this._lastStyleKey === undefined || this._lastPronounKey === undefined) {
		this._lastStyleKey = currentStyleKey;
		this._lastPronounKey = currentPronounKey;
	}

	const settingsChanged = (this._lastStyleKey !== currentStyleKey || this._lastPronounKey !== currentPronounKey);

	if (settingsChanged && this._dmResults[currentUri]) {
		// Clear cached results for this URI to force re-fetch with new settings
		// Old translation continues to display via currentLyrics until new arrives
		this._dmResults[currentUri] = { mode1: null, mode2: null };
		console.log(`[Lyrics+] Settings changed (${this._lastStyleKey}/${this._lastPronounKey} → ${currentStyleKey}/${currentPronounKey}), re-fetching...`);
	}
	
	// Update tracking for next call
	this._lastStyleKey = currentStyleKey;
	this._lastPronounKey = currentPronounKey;

	// ... [existing code] ...

	// Fix Uncaught Promise in onQueueChange
	this.onQueueChange = async ({ data: queue }) => {
		try {
			if (!queue) return;

			this.state.explicitMode = this.state.lockMode;
			this.currentTrackUri = queue.current.uri;
			
			// Pre-emptive clear: If not in L1 cache, clear lyrics immediately to prevent showing old song's lyrics
			// This addresses "Lyrics don't switch" by ensuring at least a blank slate while fetching
			if (!CacheManager.getSync(queue.current.uri)) {
				this.setState({ currentLyrics: [] });
			}

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
			let rawLyrics = await CacheManager.get(nextUri);

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
				try {
					rawLyrics = await this.tryServices(nextInfo);
				} catch (err) {
					console.warn("[Lyrics+] Failed to pre-fetch next track lyrics:", err);
				}

				if (rawLyrics) {
					CacheManager.set(nextUri, rawLyrics);
				}
			}
		} catch (error) {
			console.error("[Lyrics+] Error in onQueueChange:", error);
		}
	};

		// Async cache preload: Check CacheManager for cached translations
		const tryLoadCachedTranslation = async (mode) => {
			if (!mode || mode === "none" || !String(mode).startsWith("gemini")) return null;
			try {
				const styleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
				const pronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";
				const cacheKey2 = `${currentUri}:${mode}:${styleKey}:${pronounKey}`;

				// Check cache first (async - L1 then L2)
				const memCached = await CacheManager.get(cacheKey2);
				if (memCached) return memCached;

				// Check persistent localStorage (legacy fallback)
				const persistKey = `${APP_NAME}:gemini-cache`;
				const persistedCache = JSON.parse(localStorage.getItem(persistKey)) || {};
				const persisted = persistedCache[cacheKey2];

				if (persisted?.data && persisted.styleKey === styleKey && persisted.pronounKey === pronounKey) {
					CacheManager.set(cacheKey2, persisted.data); // Load into session cache
					return persisted.data;
				}
			} catch (e) {
				console.warn("[Lyrics+] Cache preload failed:", e);
			}
			return null;
		};

		// Preload cached translations (async)
		if (!this._dmResults[currentUri].mode1 && displayMode1) {
			this._dmResults[currentUri].mode1 = await tryLoadCachedTranslation(displayMode1);
		}
		if (!this._dmResults[currentUri].mode2 && displayMode2) {
			this._dmResults[currentUri].mode2 = await tryLoadCachedTranslation(displayMode2);
		}

		// Get current results - always read from _dmResults to avoid stale closure
		const getResults = () => ({
			mode1: this._dmResults?.[currentUri]?.mode1 || null,
			mode2: this._dmResults?.[currentUri]?.mode2 || null
		});

		const updateCombinedLyrics = (force = false) => {
			// Guard clause to prevent race conditions from previous songs or requests
			if (this.state.uri !== uri || this.activeRequestTimestamp !== requestTimestamp) {
				return;
			}

			const { mode1, mode2 } = getResults();

			// If display mode is set but no result yet and not forced, skip update
			// This prevents overwriting with original lyrics when translation is pending
			if (!force && displayMode1 && displayMode1 !== "none" && !mode1 && !mode2) {
				// Still waiting for translation - don't overwrite existing display
				return;
			}

			// Smart deduplication and optimization
			const optimizedTranslations = this.optimizeTranslations(lyrics, mode1, mode2);
			this.setState({ currentLyrics: Array.isArray(optimizedTranslations) ? optimizedTranslations : [] });
		};

		// Check if we already have cached results
		const { mode1: cachedMode1, mode2: cachedMode2 } = getResults();

		// Debug logging for cache check
		if (window.lyricsPlusDebug) {
			console.log("[Lyrics+] lyricsSource debug:", {
				displayMode1, displayMode2,
				cachedMode1: !!cachedMode1, cachedMode2: !!cachedMode2,
				currentUri
			});
		}

		// If we have cached results, show them immediately
		// IMPORTANT: Only return early if ALL active modes are cached
		// Otherwise proceed to fetch the missing ones
		const activeMode1 = displayMode1 && displayMode1 !== "none";
		const activeMode2 = displayMode2 && displayMode2 !== "none";
		const missingMode1 = activeMode1 && !cachedMode1;
		const missingMode2 = activeMode2 && !cachedMode2;

		if ((cachedMode1 || cachedMode2)) {
			updateCombinedLyrics(true);
		}

		if (!missingMode1 && !missingMode2) {
			// All active modes are cached, no need to fetch
			return;
		}

		// No cache yet - show original lyrics immediately so UI isn't blank while waiting
		const optimizedOriginal = this.optimizeTranslations(lyrics, null, null);
		this.setState({ currentLyrics: Array.isArray(optimizedOriginal) ? optimizedOriginal : [] });

		// Staggered parallel execution: Phonetic starts first, Translation starts 500ms later
		// This avoids API contention while keeping total time close to parallel
		const isMode1Phonetic = String(displayMode1).includes('romaji') || String(displayMode1).includes('pinyin') || String(displayMode1).includes('romaja');
		const isMode2Phonetic = String(displayMode2).includes('romaji') || String(displayMode2).includes('pinyin') || String(displayMode2).includes('romaja');

		// Determine which mode is Phonetic (should start first) and which is Translation (delayed)
		let firstMode, secondMode, firstModeKey, secondModeKey;
		if (isMode2Phonetic && !isMode1Phonetic) {
			firstMode = displayMode2; secondMode = displayMode1;
			firstModeKey = 'mode2'; secondModeKey = 'mode1';
		} else if (isMode1Phonetic && !isMode2Phonetic) {
			firstMode = displayMode1; secondMode = displayMode2;
			firstModeKey = 'mode1'; secondModeKey = 'mode2';
		} else {
			// Both same type or neither Phonetic - just use order as-is
			firstMode = displayMode1; secondMode = displayMode2;
			firstModeKey = 'mode1'; secondModeKey = 'mode2';
		}

		// Start first request immediately (non-blocking)
		const promise1 = processMode(firstMode, lyrics).then(result => {
			if (this.state.uri !== uri || this.activeRequestTimestamp !== requestTimestamp) return;
			if (this._dmResults?.[currentUri]) this._dmResults[currentUri][firstModeKey] = result;
			updateCombinedLyrics(true);
		}).catch(error => {
			if (this.state.uri !== uri) return;
			console.warn(`Display ${firstModeKey} failed:`, error.message);
			updateCombinedLyrics(true);
		});

		// Delay 500ms then start second request (staggered to avoid API contention)
		const promise2 = new Promise(resolve => setTimeout(resolve, 500)).then(() => {
			return processMode(secondMode, lyrics).then(result => {
				if (this.state.uri !== uri || this.activeRequestTimestamp !== requestTimestamp) return;
				if (this._dmResults?.[currentUri]) this._dmResults[currentUri][secondModeKey] = result;
				updateCombinedLyrics(true);
			}).catch(error => {
				if (this.state.uri !== uri) return;
				console.warn(`Display ${secondModeKey} failed:`, error.message);
				updateCombinedLyrics(true);
			});
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
		// Delegate to TranslationUtils
		return TranslationUtils.optimizeTranslations(originalLyrics, mode1, mode2);
	}

	async getGeminiTranslation(lyricsState, lyrics, mode, silent = false) {
		const apiMode = CONFIG.visual["gemini:api-mode"] || "official";
		const viKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-key`);
		const romajiKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-key-romaji`);
		const proxyApiKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini:proxy-api-key`);

		// --- 1. CONFIG VALIDATION (Sync) ---
		let wantSmartPhonetic = (mode === "gemini_romaji");
		let apiKey;

		if (apiMode === "proxy") {
			apiKey = proxyApiKey || "proxy-default";
		} else if (wantSmartPhonetic) {
			apiKey = romajiKey || viKey;
		} else {
			apiKey = viKey || romajiKey;
		}

		if (apiMode === "official" && !apiKey) {
			throw new Error("Gemini API key missing. Please add at least one key in Settings.");
		}

		if (!Array.isArray(lyrics) || lyrics.length === 0) {
			throw new Error("No lyrics to translate.");
		}

		// --- 2. CACHE CHECK (Async) ---
		const styleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
		const pronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";
		const cacheKey = mode;
		const cacheKey2 = `${lyricsState.uri}:${cacheKey}:${styleKey}:${pronounKey}`;

		// Await Cache (L1 -> L2 logic inside CacheManager)
		const cached = await CacheManager.get(cacheKey2);
		if (cached) {
			return cached;
		}

		// --- 3. IN-FLIGHT DEDUPLICATION ---
		this._inflightGemini = this._inflightGemini || new Map();
		if (this._inflightGemini.has(cacheKey2)) {
			return this._inflightGemini.get(cacheKey2); // Return existing Promise
		}

		// --- 4. PREPARE REQUEST ---
		const text = lyrics.map((l) => l?.text || " ").join("\n");
		if (!silent) this.setState({ isTranslating: true });

		// --- 5. EXECUTE (Async) ---
		const executionPromise = (async () => {
			try {
				const { vi, phonetic, duration } = await Translator.callGemini({
					apiKey,
					artist: lyricsState.artist || this.state.artist,
					title: lyricsState.title || this.state.title,
					text,
					styleKey,
					pronounKey,
					wantSmartPhonetic,
					priority: !silent,
					taskId: cacheKey2
				});

				// UI Feedback
				if (duration && !silent) {
					this.setState({
						isTranslating: false,
						translationStatus: { type: 'success', text: getText("notifications.translatedIn", { duration }) }
					});
					setTimeout(() => this.setState({ translationStatus: null }), 3000);
				}

				// Process Result
				let outText = wantSmartPhonetic ? phonetic : vi;
				if (!outText) throw new Error("Empty result from Gemini.");

				let lines = Array.isArray(outText) ? outText : (typeof outText === 'string' ? outText.split("\n") : null);
				if (!lines) throw new Error("Invalid translation format.");

				const mapped = lyrics.map((line, i) => ({
					...line,
					text: lines[i]?.trim() || line?.text || "",
					originalText: line?.text || "",
				}));

				// --- 6. SAVE TO CACHE (Fire & Forget) ---
				CacheManager.set(cacheKey2, mapped);

				return mapped;

			} catch (err) {
				// UI Error Handling
				if (!silent) {
					this.setState({
						isTranslating: false,
						translationStatus: { type: 'error', text: err.message || getText("notifications.translationFailed") }
					});
					setTimeout(() => this.setState({ translationStatus: null }), 5000);
				}
				throw err;
			} finally {
				// Cleanup
				this._inflightGemini.delete(cacheKey2);
				if (this.state.isTranslating) this.setState({ isTranslating: false });
			}
		})();

		// Store the promise for deduplication
		this._inflightGemini.set(cacheKey2, executionPromise);

		return executionPromise;
	}

	async getTraditionalConversion(lyricsState, lyrics, language, displayMode) {
		// Debug logging
		if (window.lyricsPlusDebug) {
			console.log("[Lyrics+] getTraditionalConversion called:", { language, displayMode, lyricsCount: lyrics?.length, uri: lyricsState?.uri?.split(':').pop() });
		}

		if (!Array.isArray(lyrics)) {
			if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - REJECTED: lyrics is not array");
			throw new Error("Invalid lyrics format for conversion.");
		}

		const cacheKey = `${lyricsState.uri}:trad:${language}:${displayMode}`;

		// Await Cache
		const cached = await CacheManager.get(cacheKey);
		if (cached) {
			if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - CACHE HIT, returning cached");
			// Handle legacy cache format (string array)
			if (Array.isArray(cached) && cached.length > 0 && typeof cached[0] === 'string') {
				return cached.map(t => ({ text: t }));
			}
			return cached;
		}

		// De-duplicate concurrent calls
		this._inflightTrad = this._inflightTrad || new Map();
		const inflightKey = cacheKey;
		if (this._inflightTrad.has(inflightKey)) {
			if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - INFLIGHT HIT, waiting for existing request");
			return this._inflightTrad.get(inflightKey);
		}

		if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - Proceeding to translateLyrics");

		// Execution Promise
		const executionPromise = (async () => {
			let pendingTimer = null;
			try {
				// Show pending notification if conversion takes longer than 3s
				pendingTimer = setTimeout(() => {
					try {
						Spicetify.showNotification("Still converting...", false, 2000);
					} catch (e) {
						if (window.lyricsPlusDebug) console.warn("[Lyrics+] Could not show notification:", e);
					}
				}, 3000);

				const translated = await this.translateLyrics(language, lyrics, displayMode);

				if (translated !== undefined && translated !== null) {
					// Standardize format
					let formattedResult = translated;
					if (Array.isArray(translated) && translated.length > 0 && typeof translated[0] === 'string') {
						formattedResult = translated.map(t => ({ text: t }));
					}

					CacheManager.set(cacheKey, formattedResult);
					return formattedResult;
				}
				throw new Error("Empty result from conversion.");

			} finally {
				if (pendingTimer) clearTimeout(pendingTimer);
				this._inflightTrad.delete(inflightKey);
			}
		})();

		this._inflightTrad.set(inflightKey, executionPromise);
		return executionPromise;
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
		// Debug logging
		if (window.lyricsPlusDebug) {
			console.log("[Lyrics+] translateLyrics called:", { language, targetConvert, lyricsCount: lyrics?.length });
		}

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

	/**
	 * Reset translation cache for a URI
	 * @param {string} uri - Spotify track URI
	 * @param {string[]|null} modesToClear - Optional specific modes to clear (e.g., ["gemini_vi", "gemini_romaji"]).
	 *                                       If null, clears ALL cache for the URI.
	 */
	resetTranslationCache(uri, modesToClear = null) {
		const styleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
		const pronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";
		
		let clearedCount = 0;
		let geminiClearedCount = 0;
		
		if (modesToClear && modesToClear.length > 0) {
			// Selective clear: only specified modes
			modesToClear.forEach(mode => {
				if (!mode || mode === "none") return;
				const cacheKey = `${uri}:${mode}:${styleKey}:${pronounKey}`;
				if (CacheManager.delete(cacheKey)) clearedCount++;
			});
			
			// Clear from persistent localStorage (gemini-cache)
			try {
				const persistKey = `${APP_NAME}:gemini-cache`;
				const persistedCache = JSON.parse(localStorage.getItem(persistKey)) || {};
				modesToClear.forEach(mode => {
					if (!mode || mode === "none") return;
					const cacheKey = `${uri}:${mode}:${styleKey}:${pronounKey}`;
					if (persistedCache[cacheKey]) {
						delete persistedCache[cacheKey];
						geminiClearedCount++;
					}
				});
				localStorage.setItem(persistKey, JSON.stringify(persistedCache));
			} catch (e) {
				console.warn("[Lyrics+] Failed to clear persisted Gemini cache:", e);
			}
			
			// Clear only the specified modes from _dmResults
			if (this._dmResults && this._dmResults[uri]) {
				// Use saved modeKey from lyricsSource() for correct CONFIG lookup
				const mKey = this.modeKey || "gemini";
				const currentMode1 = CONFIG.visual[`translation-mode:${mKey}`];
				const currentMode2 = CONFIG.visual[`translation-mode-2:${mKey}`];
				
				modesToClear.forEach(mode => {
					if (mode === currentMode1) this._dmResults[uri].mode1 = null;
					if (mode === currentMode2) this._dmResults[uri].mode2 = null;
				});
			}
			
			// Clear currentLyrics state to force UI refresh showing original lyrics
			// This ensures the translation lines disappear immediately while re-fetching
			this.setState({ currentLyrics: null });
		} else {
			// Full clear: all translations for this URI (original behavior)
			clearedCount = CacheManager.clearByUri(uri);
			this.deleteLocalLyrics(uri);
			
			// Clear ALL Gemini cache entries for this URI
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
			
			// Clear all progressive results for this track
			if (this._dmResults && this._dmResults[uri]) {
				delete this._dmResults[uri];
			}
		}

		// Clear inflight Gemini requests for this track
		if (this._inflightGemini) {
			const keysToDelete = [];
			for (const [key] of this._inflightGemini) {
				if (modesToClear) {
					// Selective: only if mode matches
					if (modesToClear.some(mode => key.includes(`:${mode}:`))) {
						keysToDelete.push(key);
					}
				} else if (key.includes(uri)) {
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

		// Only reset full translation states if doing full clear
		if (!modesToClear) {
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
		}

		// Force re-process lyrics with current display modes
		const currentMode = this.getCurrentMode();
		this.lyricsSource(this.state, currentMode);

		const totalCleared = clearedCount + geminiClearedCount;
		// Show status in TranslatingIndicator instead of popup notification
		const statusText = (totalCleared > 0 || modesToClear) ? "Re-translating..." : "Cache cleared";
		this.setState({ translationStatus: { type: 'success', text: statusText } });
		// Auto-clear status after 1.5s
		setTimeout(() => this.setState({ translationStatus: null }), 1500);
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

				// Update Cache
				CacheManager.set(this.currentTrackUri, newState);
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
		let lyricsData = CacheManager.getSync(nextInfo.uri);

		if (!lyricsData) {
			try {
				lyricsData = await this.tryServices(nextInfo);
				if (lyricsData.provider) {
					CacheManager.set(nextInfo.uri, lyricsData);
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
			let rawLyrics = await CacheManager.get(nextUri);

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
			// Clear per-track translation results so display mode changes take effect immediately
			this._dmResults = {};
			
			this.reRenderLyricsPage = !this.reRenderLyricsPage;
			this.updateVisualOnConfigChange();
			this.forceUpdate();
			
			// Re-trigger lyricsSource to recalculate with new display mode settings
			const currentMode = this.getCurrentMode();
			if (currentMode !== -1 && this.state[CONFIG.modes[currentMode]]) {
				this.lyricsSource(this.state, currentMode);
			}
		};

		reloadLyrics = () => {
			// Clear L1 cache synchronously (L2 will be overwritten on next fetch)
			CacheManager.clearL1();
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
				document.documentElement.requestFullscreen().catch((e) => {
					console.warn("[Lyrics+] Failed to enter fullscreen:", e);
					// Revert state if request fails
					this.setState({ isFullscreen: false });
					this.fullscreenContainer.remove();
				});
				this.mousetrap.bind("esc", this.toggleFullscreen);
			} else {
				this.fullscreenContainer.remove();
				// Check if we are actually in fullscreen before trying to exit
				// This prevents the "Document not active" error when ESC key already exited native fullscreen
				if (document.fullscreenElement) {
					document.exitFullscreen().catch((e) => console.warn("[Lyrics+] Failed to exit fullscreen:", e));
				}
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
		"--video-blur": `${CONFIG.visual["video-background-blur"]}px`,
		"--video-dim": `${CONFIG.visual["video-background-dim"]}%`,
	};

	if (CONFIG.visual["video-background"]) {
		// If video is enabled, make background semi-transparent if it was solid
		if (!CONFIG.visual["transparent-background"]) {
			this.styleVariables["--lyrics-color-background"] = "rgba(0, 0, 0, 0.5)";
		}
	}

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
		// CRITICAL: Detect language directly from original raw lyrics to ensure CJK menu persists after Gemini translation.
		// Do NOT use provideLanguageCode here as it may return cached/stale language that was reset.
		const originalLyrics = this.state.synced || this.state.unsynced;
		const originalLanguage = originalLyrics ? Utils.detectLanguage(originalLyrics) : null;
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
			// If video background is active and NOT loading, hide the kaomoji to show the video clearly
			const showKaomoji = !this.state.videoBackground || this.state.isLoading;
			
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
					this.state.isLoading ? LoadingIcon : (showKaomoji ? "(。_。)" : "")
				)
			);
		}

		this.state.mode = mode;

		const out = react.createElement(
			"div",
			{
				className: `lyrics-lyricsContainer-LyricsContainer${CONFIG.visual["fade-blur"] ? " blur-enabled" : ""}${fadLyricsContainer ? " fad-enabled" : ""
					}${this.state.videoBackground && CONFIG.visual["video-background"] ? " video-bg-active" : ""}`,
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
		// Video Background (using YT.Player API)
		this.state.videoBackground && CONFIG.visual["video-background"] && window.VideoBackground && react.createElement(window.VideoBackground, {
			trackUri: this.state.uri,
			brightness: CONFIG.visual["video-background-dim"],
			blurAmount: CONFIG.visual["video-background-blur"],
			scale: CONFIG.visual["video-background-scale"],
			videoInfo: this.state.videoBackground
		}),

		react.createElement("div", {
			className: "lyrics-lyricsContainer-LyricsBackground",
		}),
			// Translation in progress indicator
			react.createElement(TranslatingIndicator, {
				isVisible: this.state.isTranslating,
				status: this.state.translationStatus,
				currentLang: CONFIG.visual["ui-language"]
			}),
			react.createElement(
				"div",
				{
					className: "lyrics-config-button-container",
				},
				// Pre-translation Indicator
				this.state.preTranslated && react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{ label: getText("tooltips.preTransNext") },
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
					currentLang: CONFIG.visual["ui-language"]
				}),
				react.createElement(AdjustmentsMenu, { mode, currentLang: CONFIG.visual["ui-language"] }),
				// Video Background Settings Button
				CONFIG.visual["video-background"] && react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{ label: getText("tooltips.videoSettings") },
					react.createElement("button", {
						className: "lyrics-config-button",
						onClick: () => {
							this.openVideoSettingsModal();
						},
						style: { color: "var(--spice-button)" }
					}, react.createElement("svg", {
						width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor",
						dangerouslySetInnerHTML: { __html: '<path d="M14.5 13.5h-13A.5.5 0 011 13V3a.5.5 0 01.5-.5h13a.5.5 0 01.5.5v10a.5.5 0 01-.5.5zM2 12h12V4H2v8z"/><path d="M6 6l4 2-4 2V6z"/>' }
					}))
				),
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: this.state.isCached ? getText("tooltips.lyricsCached") : getText("tooltips.cacheLyrics"),
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							style: { color: "var(--spice-button)" },
							onClick: () => {
								const { synced, unsynced, karaoke, genius } = this.state;
								if (!synced && !unsynced && !karaoke && !genius) {
									Spicetify.showNotification(getText("notifications.noLyricsCache"), true, 2000);
									return;
								}

								if (this.state.isCached) {
									this.deleteLocalLyrics(this.currentTrackUri);
									Spicetify.showNotification(`✓ ${getText("notifications.cacheDeleted")}`, false, 2000);
								} else {
									this.saveLocalLyrics(this.currentTrackUri, { synced, unsynced, karaoke, genius });
									Spicetify.showNotification(`✓ ${getText("notifications.cacheSuccess")}`, false, 2000);
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
						label: getText("tooltips.loadFile"),
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							style: { color: "var(--spice-button)" },
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
						label: getText("tooltips.resetCache"),
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							style: { color: "var(--spice-button)" },
							onClick: () => {
								// Use saved modeKey from lyricsSource() - this is the correct key for CONFIG lookup
								const modeKey = this.modeKey || "gemini";
								const mode1 = CONFIG.visual[`translation-mode:${modeKey}`];
								const mode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];
								const modesToClear = [mode1, mode2].filter(m => m && m !== "none");
								
								console.log(`[Lyrics+] Clearing cache for modes:`, modesToClear, `(modeKey: ${modeKey})`);
								this.resetTranslationCache(this.currentTrackUri, modesToClear.length > 0 ? modesToClear : null);
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
				),
				react.createElement(
					Spicetify.ReactComponent.TooltipWrapper,
					{
						label: getText("tooltips.openSettings"),
					},
					react.createElement(
						"button",
						{
							className: "lyrics-config-button",
							style: { color: "var(--spice-button)" },
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
								__html: Spicetify.SVGIcons["settings"] || Spicetify.SVGIcons["preferences"] ||
									// Simple gear icon as fallback
									'<path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>',
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
