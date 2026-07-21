// services/TranslationCoordinator.js
window.LyricsPlus = window.LyricsPlus || {};

window.LyricsPlus.TranslationCoordinator = {
	_formatDuration(ms) {
		if (typeof ms !== "number" || isNaN(ms)) return "0.0s";
		return (ms / 1000).toFixed(1) + "s";
	},

	async lyricsSource(self, lyricsState, mode) {
		if (!lyricsState) return;

		// Timestamp to verify if this request is still the active one
		const requestTimestamp = Date.now();
		self.activeRequestTimestamp = requestTimestamp;

		let lyrics = lyricsState[CONFIG.modes[mode]];
		//Fallback: if the preferred mode has no lyrics, use any available lyrics
		if (!lyrics) {
			lyrics = lyricsState.synced || lyricsState.unsynced || lyricsState.genius || null;
			if (!lyrics) {
				self._setCurrentLyrics([]);
				return;
			}
		}

		//Clean up any existing progress flags from previous songs
		const currentUri = lyricsState.uri;
		if (self.lastCleanedUri !== currentUri) {
			//Remove all progress flags
			Object.keys(self).forEach(key => {
				if (key.includes(':inProgress')) {
					delete self[key];
				}
			});
			//Reset per-track progressive results
			self._dmResults = {};
			self._saveInProgress = null;

			//Clean up inflight requests for OLD tracks only, keep current track
			if (self._inflightGemini) {
				const keysToDelete = [];
				self._inflightGemini.forEach((value, key) => {
					//Key format: "uri:mode:style:pronoun", only delete if URI doesn't match current
					if (!key.startsWith(currentUri + ':')) {
						keysToDelete.push(key);
					}
				});
				keysToDelete.forEach(key => self._inflightGemini.delete(key));
			}

			self.lastCleanedUri = currentUri;
		}

		//Handle translation and display modes efficiently
		const originalLanguage = this.provideLanguageCode(self, lyrics);
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
				stateLanguage: self.state.language
			});
		}

		// For Gemini mode, use generic keys if no specific language detected
		const provider = CONFIG.visual["translate:translated-lyrics-source"];
		const modeKey = provider === "geminiVi" && !friendlyLanguage ? "gemini" : friendlyLanguage;

		const displayMode1 = CONFIG.visual[`translation-mode:${modeKey}`];
		const displayMode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];

		self.language = originalLanguage;
		self.modeKey = modeKey; // Save for reset button to use
		self.displayMode = displayMode1; // Keep for legacy compatibility
		self.displayMode2 = displayMode2;

		const processMode = async (mode, baseLyrics) => {
			if (!mode || mode === "none") return null;
			try {
				if (String(mode).startsWith("gemini")) {
					return await this.getGeminiTranslation(self, lyricsState, baseLyrics, mode);
				} else {
					return await this.getTraditionalConversion(self, lyricsState, baseLyrics, originalLanguage, mode);
				}
			} catch (error) {
				const prog = self.state.translationStatus;
				if (prog?.type === "progress" && prog?.trackUri === self.state.uri) {
					self.setState({ translationStatus: null });
				}
				const modeDisplayName = mode === "gemini_romaji" ? "Romaji, Romaja, Pinyin translation" : "Vietnamese translation";
				Spicetify.showNotification(getText("notifications.translationFailedWithReason", { mode: modeDisplayName, reason: error.message || "Unknown error" }), true, 4000);
				return null; // Return null on failure
			}
		};

		const { uri } = lyricsState; // Capture the URI for this specific request

		// If no display modes are active, just optimize the original lyrics (e.g., to handle note lines)
		if ((!displayMode1 || displayMode1 === "none") && (!displayMode2 || displayMode2 === "none")) {
			const optimizedLyrics = TranslationUtils.optimizeTranslations(lyrics, null, null);
			self._setCurrentLyrics(Array.isArray(optimizedLyrics) ? optimizedLyrics : []);
			return;
		}

		// Progressive loading: keep results per track so Mode 1 does not disappear when Mode 2 finishes
		// CRITICAL: Use ||= instead of || to avoid resetting cached data on subsequent calls
		self._dmResults = self._dmResults || {};
		if (!self._dmResults[currentUri]) {
			self._dmResults[currentUri] = { mode1: null, mode2: null };
		}

		// Settings change detection logic adjusted to ignore initial undefined state
		const currentStyleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
		const currentPronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";

		// If _lastStyleKey is undefined (first run), we initialize it and don't count it as a change
		if (self._lastStyleKey === undefined || self._lastPronounKey === undefined) {
			self._lastStyleKey = currentStyleKey;
			self._lastPronounKey = currentPronounKey;
		}

		const settingsChanged = (self._lastStyleKey !== currentStyleKey || self._lastPronounKey !== currentPronounKey);

		if (settingsChanged && self._dmResults[currentUri]) {
			// Clear cached results for this URI to force re-fetch with new settings
			// Old translation continues to display via currentLyrics until new arrives
			self._dmResults[currentUri] = { mode1: null, mode2: null };
			console.log(`[Lyrics+] Settings changed (${self._lastStyleKey}/${self._lastPronounKey} → ${currentStyleKey}/${currentPronounKey}), re-fetching...`);
		}
		
		// Update tracking for next call
		self._lastStyleKey = currentStyleKey;
		self._lastPronounKey = currentPronounKey;

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
		if (!self._dmResults[currentUri].mode1 && displayMode1) {
			self._dmResults[currentUri].mode1 = await tryLoadCachedTranslation(displayMode1);
		}
		if (!self._dmResults[currentUri].mode2 && displayMode2) {
			self._dmResults[currentUri].mode2 = await tryLoadCachedTranslation(displayMode2);
		}

		// Get current results - always read from _dmResults to avoid stale closure
		const getResults = () => ({
			mode1: self._dmResults?.[currentUri]?.mode1 || null,
			mode2: self._dmResults?.[currentUri]?.mode2 || null
		});

		const updateCombinedLyrics = (force = false) => {
			// Guard clause: only skip if song has changed. Do NOT check activeRequestTimestamp
			// here — slow Gemini responses (40s+) are still valid results for THIS song, even if
			// lyricsSource was re-entered (e.g. by reasoning state changes triggering re-renders).
			if (self.state.uri !== uri) {
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
			const optimizedTranslations = TranslationUtils.optimizeTranslations(lyrics, mode1, mode2);
			self._setCurrentLyrics(Array.isArray(optimizedTranslations) ? optimizedTranslations : []);
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
		const optimizedOriginal = TranslationUtils.optimizeTranslations(lyrics, null, null);
		self._setCurrentLyrics(Array.isArray(optimizedOriginal) ? optimizedOriginal : []);

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
			if (self.state.uri !== uri) return;
			if (self._dmResults?.[currentUri]) self._dmResults[currentUri][firstModeKey] = result;
			updateCombinedLyrics(true);
		}).catch(error => {
			if (self.state.uri !== uri) return;
			console.warn(`Display ${firstModeKey} failed:`, error.message);
			updateCombinedLyrics(true);
		});

		// Delay 500ms then start second request (staggered to avoid API contention)
		const promise2 = new Promise(resolve => setTimeout(resolve, 500)).then(() => {
			return processMode(secondMode, lyrics).then(result => {
				if (self.state.uri !== uri) return;
				if (self._dmResults?.[currentUri]) self._dmResults[currentUri][secondModeKey] = result;
				updateCombinedLyrics(true);
			}).catch(error => {
				if (self.state.uri !== uri) return;
				console.warn(`Display ${secondModeKey} failed:`, error.message);
				updateCombinedLyrics(true);
			});
		});

		// Auto-save cache after all translations complete
		Promise.allSettled([promise1, promise2]).then(() => {
			// Only save if still on the same track
			if (self.state.uri !== uri) {
				console.log(`[Lyrics+] Skip cache - track changed`);
				return;
			}

			// If already cached or save is in-progress, no need to save again
			if (self.state.isCached || self._saveInProgress === uri) {
				return;
			}
			self._saveInProgress = uri;

			const currentLyrics = self.state.currentLyrics;
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
				romaji: self.state.romaji,
				furigana: self.state.furigana,
				hiragana: self.state.hiragana,
				katakana: self.state.katakana,
				hangul: self.state.hangul,
				romaja: self.state.romaja,
				cn: self.state.cn,
				hk: self.state.hk,
				tw: self.state.tw,
				musixmatchTranslation: self.state.musixmatchTranslation,
				neteaseTranslation: self.state.neteaseTranslation,
				currentLyrics: currentLyrics,
				language: self.state.language,
			};
			this.saveLocalLyrics(self, uri, fullData);
			console.log(`[Lyrics+] Auto-cached lyrics (${translatedCount} lines) for: ${uri.split(':').pop()}`);
		});
	},

	async getGeminiTranslation(self, lyricsState, lyrics, mode, silent = false) {
		let apiKeys = [];
		try {
			const rawKeys = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-keys`);
			if (rawKeys) {
				const parsed = JSON.parse(rawKeys);
				if (Array.isArray(parsed)) {
					apiKeys = parsed.filter(k => typeof k === 'string' && k.trim() !== '');
				}
			}
		} catch (e) {
			console.warn("[Lyrics+] Failed to parse gemini-api-keys:", e);
		}

		// Fallback to legacy single keys if dynamic list is empty
		if (apiKeys.length === 0) {
			const viKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-key`);
			const romajiKey = ConfigUtils.getPersisted(`${APP_NAME}:visual:gemini-api-key-romaji`);
			if (mode === "gemini_romaji") {
				apiKeys = [romajiKey, viKey].filter(Boolean);
			} else {
				apiKeys = [viKey, romajiKey].filter(Boolean);
			}
		}

		if (apiKeys.length === 0) {
			throw new Error("API key missing. Please add at least one key in Settings.");
		}

		// --- 1. CONFIG VALIDATION (Sync) ---
		let wantSmartPhonetic = (mode === "gemini_romaji" || mode === "gemini_furigana");
		let wantFurigana = (mode === "gemini_furigana");

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
			if (silent) {
				const u = lyricsState.uri;
				queueMicrotask(() => this._maybeClearPretranslateChip(self, u));
			}
			return cached;
		}

		// --- 3. IN-FLIGHT DEDUPLICATION ---
		self._inflightGemini = self._inflightGemini || new Map();
		if (self._inflightGemini.has(cacheKey2)) {
			const inflight = self._inflightGemini.get(cacheKey2);
			if (!silent) {
				inflight.uiWanted = true;
				if (lyricsState.uri === self.state.uri) {
					self.setState({
						isTranslating: true,
						translationIndicatorUri: lyricsState.uri,
						translationStatus: null,
						reasoningContent: "",
						reasoningStreams: {},
						reasoningActiveTab: null,
					});
				}
			}
			return inflight.promise;
		}

		// --- 4. PREPARE REQUEST ---
		const text = lyrics.map((l) => l?.text || " ").join("\n");
		const inflight = { uiWanted: !silent, promise: null };
		const trackUri = lyricsState.uri;

		if (!silent) {
			self._geminiUiStartTime = self._geminiUiStartTime || {};
			if (self._geminiUiStartTime[trackUri] == null) {
				self._geminiUiStartTime[trackUri] = Date.now();
			}
		}

        // --- 5. EXECUTE (Async) ---
        const executionPromise = (async () => {
			if (silent) {
				self._pretranslatePending = self._pretranslatePending || {};
				self._pretranslatePending[trackUri] = (self._pretranslatePending[trackUri] || 0) + 1;
			}
            try {
				if (inflight.uiWanted && trackUri === self.state.uri) {
					self.setState({
						isTranslating: true,
						translationIndicatorUri: trackUri,
						translationStatus: null,
						reasoningContent: "",
						reasoningStreams: {},
						reasoningActiveTab: null,
					});
				}

                const taskKey = wantSmartPhonetic ? "phonetic" : "translation";
                let lastUiReasoning = "";
                const handleReasoningProgress = (partial) => {
                    if (!inflight.uiWanted || trackUri !== self.state.uri) return;
                    if (!partial || partial === lastUiReasoning) return;
                    lastUiReasoning = partial;
                    self.setState((prev) => {
                        const prevStreams = prev.reasoningStreams || {};
                        const wasEmpty = !prevStreams[taskKey] || !String(prevStreams[taskKey]).trim();
                        const next = {
                            reasoningStreams: { ...prevStreams, [taskKey]: partial },
                        };
                        if (wasEmpty && !prev.reasoningActiveTab) {
                            next.reasoningActiveTab = taskKey;
                        }
                        return next;
                    });
                };

				// Core rotation and retry loop
				let result = null;
				let lastError = null;
				
				// Initialize global API key index if not exists
				window._lyricsPlusApiKeyIndex = window._lyricsPlusApiKeyIndex || 0;
				let startIdx = window._lyricsPlusApiKeyIndex % apiKeys.length;
				// Move index forward for subsequent calls (sequential rotation)
				window._lyricsPlusApiKeyIndex = (startIdx + 1) % apiKeys.length;

				for (let attempt = 0; attempt < apiKeys.length; attempt++) {
					const currentApiKey = apiKeys[(startIdx + attempt) % apiKeys.length];
					try {
						const masked = currentApiKey.length > 8 ? `...${currentApiKey.slice(-5)}` : "••••";
						console.log(`[Lyrics+] Translation attempt ${attempt + 1}/${apiKeys.length} using API key ending in: ${masked}`);
						
						result = await Translator.callGemini({
							apiKey: currentApiKey,
							artist: lyricsState.artist || self.state.artist,
							title: lyricsState.title || self.state.title,
							text,
							styleKey,
							pronounKey,
							wantSmartPhonetic,
							wantFurigana,
							priority: inflight.uiWanted,
							taskId: cacheKey2,
							onReasoningProgress: handleReasoningProgress,
						});
						
						// If successful, break the retry loop
						break;
					} catch (err) {
						lastError = err;
						const errMsg = String(err.message || err).toLowerCase();
						
						if (attempt < apiKeys.length - 1) {
							console.warn(`[Lyrics+] API key attempt ${attempt + 1}/${apiKeys.length} failed, switching to next key... Error:`, errMsg);
							// Clear reasoning progress for the failed attempt to let next key start clean
							if (inflight.uiWanted && trackUri === self.state.uri) {
								self.setState((prev) => {
									const prevStreams = prev.reasoningStreams || {};
									return {
										reasoningStreams: { ...prevStreams, [taskKey]: "" }
									};
								});
							}
							continue;
						}
						// If it's the last key, rethrow to be caught by the outer catch
						throw err;
					}
				}

				if (!result) {
					throw lastError || new Error("Failed to get translation from all API keys.");
				}

				const { vi, phonetic, duration, reasoningContent } = result;

                if (duration != null && inflight.uiWanted && trackUri === self.state.uri) {
					const otherPending = [...self._inflightGemini.keys()].some(
						(k) => k.startsWith(trackUri + ":") && k !== cacheKey2
					);
					if (!otherPending) {
						const startedAt = (self._geminiUiStartTime || {})[trackUri];
						const total = startedAt ? (Date.now() - startedAt) : (Number(duration) || 0);
						if (self._geminiUiStartTime) delete self._geminiUiStartTime[trackUri];
						self.setState({
							translationStatus: {
								type: "success",
								text: getText("notifications.translatedIn", { duration: this._formatDuration(total) }),
								trackUri,
							},
						});
						setTimeout(() => {
							self.setState((s) =>
								s.translationStatus?.trackUri === trackUri ? { translationStatus: null } : {}
							);
						}, 3000);
					}
                }

                if (reasoningContent && inflight.uiWanted && trackUri === self.state.uri) {
                    self.setState((prev) => ({
                        reasoningStreams: { ...(prev.reasoningStreams || {}), [taskKey]: reasoningContent },
                    }));
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
                if (inflight.uiWanted && trackUri === self.state.uri) {
					if (self._geminiUiStartTime && self._geminiUiStartTime[trackUri] != null) {
						delete self._geminiUiStartTime[trackUri];
					}
                    self.setState({
                        translationStatus: {
							type: 'error',
							text: err.message || getText("notifications.translationFailed"),
							trackUri,
						},
                    });
                    setTimeout(() => {
						self.setState((s) =>
							s.translationStatus?.trackUri === trackUri ? { translationStatus: null } : {}
						);
					}, 5000);
                }
                throw err;
            } finally {
                self._inflightGemini.delete(cacheKey2);
				if (silent) {
					const u = trackUri;
					self._pretranslatePending = self._pretranslatePending || {};
					self._pretranslatePending[u] = Math.max(0, (self._pretranslatePending[u] || 1) - 1);
					if (self._pretranslatePending[u] <= 0) {
						delete self._pretranslatePending[u];
					}
					queueMicrotask(() => this._maybeClearPretranslateChip(self, u));
				}
                if (inflight.uiWanted && trackUri === self.state.uri) {
					const hasMoreGemini = [...self._inflightGemini.keys()].some((k) => k.startsWith(trackUri + ':'));
					if (!hasMoreGemini) {
						self.setState({ isTranslating: false, translationIndicatorUri: null });
					}
				}
            }
        })();

		inflight.promise = executionPromise;
		self._inflightGemini.set(cacheKey2, inflight);

		return executionPromise;
	},

	async getTraditionalConversion(self, lyricsState, lyrics, language, displayMode) {
		if (window.lyricsPlusDebug) {
			console.log("[Lyrics+] getTraditionalConversion called:", { language, displayMode, lyricsCount: lyrics?.length, uri: lyricsState?.uri?.split(':').pop() });
		}

		if (!Array.isArray(lyrics)) {
			if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - REJECTED: lyrics is not array");
			throw new Error("Invalid lyrics format for conversion.");
		}

		const cacheKey = `${lyricsState.uri}:trad:${language}:${displayMode}`;

		const mergeTiming = (converted) => {
			if (!Array.isArray(converted)) return converted;
			return converted.map((item, i) => {
				const src = lyrics[i] || {};
				const text = typeof item === "string" ? item : item?.text;
				return {
					...src,
					...(typeof item === "object" && item !== null ? item : {}),
					text: text ?? src.text ?? "",
					startTime: src.startTime,
					endTime: src.endTime,
				};
			});
		};

		// Await Cache
		const cached = await CacheManager.get(cacheKey);
		if (cached) {
			if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - CACHE HIT, returning cached");
			return mergeTiming(cached);
		}

		// De-duplicate concurrent calls
		self._inflightTrad = self._inflightTrad || new Map();
		const inflightKey = cacheKey;
		if (self._inflightTrad.has(inflightKey)) {
			if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - INFLIGHT HIT, waiting for existing request");
			return self._inflightTrad.get(inflightKey);
		}

		if (window.lyricsPlusDebug) console.log("[Lyrics+] getTraditionalConversion - Proceeding to translateLyrics");

		const executionPromise = (async () => {
			let pendingTimer = null;
			try {
				pendingTimer = setTimeout(() => {
					try {
						Spicetify.showNotification(getText("notifications.stillConverting"), false, 2000);
					} catch (e) {
						if (window.lyricsPlusDebug) console.warn("[Lyrics+] Could not show notification:", e);
					}
				}, 3000);

				const translated = await this.translateLyrics(self, language, lyrics, displayMode);

				if (translated !== undefined && translated !== null) {
					let cachePayload = translated;
					if (Array.isArray(translated) && translated.length > 0 && typeof translated[0] !== 'string') {
						cachePayload = translated.map(t => ({ text: t?.text ?? "" }));
					}
					CacheManager.set(cacheKey, cachePayload);
					return mergeTiming(translated);
				}
				throw new Error("Empty result from conversion.");

			} finally {
				if (pendingTimer) clearTimeout(pendingTimer);
				self._inflightTrad.delete(inflightKey);
			}
		})();

		self._inflightTrad.set(inflightKey, executionPromise);
		return executionPromise;
	},

	provideLanguageCode(self, lyrics) {
		if (!lyrics) return null;

		const provider = CONFIG.visual["translate:translated-lyrics-source"];

		// For Gemini API, always detect language from lyrics (no override needed)
		if (provider === "geminiVi") {
			if (self.state.language) {
				if (window.lyricsPlusDebug) {
					console.log("Gemini mode - Using cached language:", self.state.language);
				}
				return self.state.language;
			}

			const detectedLanguage = Utils.detectLanguage(lyrics);

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
			if (window.lyricsPlusDebug) {
				console.log("Traditional mode - Using language override:", overrideLanguage);
			}
			return overrideLanguage;
		}

		if (self.state.language) {
			if (window.lyricsPlusDebug) {
				console.log("Traditional mode - Using cached language:", self.state.language);
			}
			return self.state.language;
		}

		const detectedLanguage = Utils.detectLanguage(lyrics);

		if (window.lyricsPlusDebug) {
			console.log("Kuromoji mode - Language detection result:", {
				detectedLanguage,
				lyricsLength: lyrics?.length,
				firstLineText: lyrics?.[0]?.text?.substring(0, 50)
			});
		}

		return detectedLanguage;
	},

	async translateLyrics(self, language, lyrics, targetConvert) {
		if (window.lyricsPlusDebug) {
			console.log("[Lyrics+] translateLyrics called:", { language, targetConvert, lyricsCount: lyrics?.length });
		}

		if (!language || !Array.isArray(lyrics) || String(targetConvert).startsWith("gemini")) {
			return lyrics;
		}

		if (!self.translator) {
			self.translator = new Translator(language);
		}
		await self.translator.awaitFinished(language);

		let result;
		try {
			if (language === "ja") {
				const map = {
					romaji: { target: "romaji", mode: "spaced" },
					furigana: { target: "hiragana", mode: "furigana" },
					hiragana: { target: "hiragana", mode: "normal" },
					katakana: { target: "katakana", mode: "normal" },
				};

				if (!map[targetConvert]) return lyrics;

				result = await Promise.all(
					lyrics.map(async (lyric) => await self.translator.romajifyText(lyric?.text || "", map[targetConvert].target, map[targetConvert].mode))
				);
			} else if (language === "ko") {
				if (targetConvert !== "romaja") return lyrics;
				result = await Promise.all(lyrics.map(async (lyric) => await self.translator.convertToRomaja(lyric?.text || "", targetConvert)));
			} else if (language === "zh-hans") {
				if (targetConvert === "pinyin") {
					result = await Promise.all(
						lyrics.map(async (lyric) => await self.translator.convertToPinyin(lyric?.text || "", { toneType: "mark", type: "string" }))
					);
					const anyChanged = lyrics.some((lyric, i) => (result?.[i] ?? "") !== (lyric?.text || ""));
					if (!anyChanged) {
						Spicetify.showNotification(getText("notifications.pinyinLibraryUnavailable"), true, 4000);
					}
				} else {
					const map = {
						cn: { from: "cn", target: "cn" },
						tw: { from: "cn", target: "tw" },
						hk: { from: "cn", target: "hk" },
					};

					if (targetConvert === "cn") {
						Spicetify.showNotification(getText("notifications.conversionSkippedAlreadySimplified"), false, 2000);
						return lyrics;
					}

					result = await Promise.all(
						lyrics.map(async (lyric) => await self.translator.convertChinese(lyric?.text || "", map[targetConvert].from, map[targetConvert].target))
					);
				}
			} else if (language === "zh-hant") {
				if (targetConvert === "pinyin") {
					result = await Promise.all(
						lyrics.map(async (lyric) => await self.translator.convertToPinyin(lyric?.text || "", { toneType: "mark", type: "string" }))
					);
					const anyChanged = lyrics.some((lyric, i) => (result?.[i] ?? "") !== (lyric?.text || ""));
					if (!anyChanged) {
						Spicetify.showNotification(getText("notifications.pinyinLibraryUnavailable"), true, 4000);
					}
				} else {
					const map = {
						cn: { from: "t", target: "cn" },
						hk: { from: "t", target: "hk" },
						tw: { from: "t", target: "tw" },
					};

					if (!map[targetConvert]) return lyrics;

					result = await Promise.all(
						lyrics.map(async (lyric) => await self.translator.convertChinese(lyric?.text || "", map[targetConvert].from, map[targetConvert].target))
					);
				}
			}

			const res = Utils.processTranslatedLyrics(result, lyrics);
			return res;
		} catch (error) {
			Spicetify.showNotification(getText("notifications.conversionFailed", { error: error.message || "Unknown error" }), true, 3000);
			console.error("Translation error:", error);
		}
	},

	async saveLocalLyrics(self, uri, lyrics) {
		const lyricsToSave = { ...lyrics };

		if (lyricsToSave.genius) {
			lyricsToSave.unsynced = lyricsToSave.genius.split("<br>").map((lyc) => {
				return {
					text: lyc.replace(/<[^>]*>/g, ""),
				};
			});
			lyricsToSave.genius = null;
		}

		const fullLyricsData = {
			...lyricsToSave,
			romaji: self.state.romaji,
			furigana: self.state.furigana,
			hiragana: self.state.hiragana,
			katakana: self.state.katakana,
			hangul: self.state.hangul,
			romaja: self.state.romaja,
			cn: self.state.cn,
			hk: self.state.hk,
			tw: self.state.tw,
			musixmatchTranslation: self.state.musixmatchTranslation,
			neteaseTranslation: self.state.neteaseTranslation,
			currentLyrics: this._reattachTiming(
				self,
				self.state.currentLyrics,
				lyricsToSave.synced || lyricsToSave.unsynced
			),
			language: self.state.language,
			timestamp: Date.now()
		};

		try {
			await DBManager.set(uri, fullLyricsData);

			const cachedUris = JSON.parse(localStorage.getItem(`${APP_NAME}:cached-uris`) || "[]");
			if (!cachedUris.includes(uri)) {
				cachedUris.push(uri);
				if (cachedUris.length > 500) cachedUris.shift();
				localStorage.setItem(`${APP_NAME}:cached-uris`, JSON.stringify(cachedUris));
			}

			if (!self.state.isCached) {
				self.setState({ isCached: true });
			}
		} catch (e) {
			console.error("[Lyrics+] Failed to save to IndexedDB:", e);
		}
	},

	async deleteLocalLyrics(self, uri) {
		try {
			await DBManager.delete(uri);
			const cachedUris = JSON.parse(localStorage.getItem(`${APP_NAME}:cached-uris`) || "[]");
			const index = cachedUris.indexOf(uri);
			if (index > -1) {
				cachedUris.splice(index, 1);
				localStorage.setItem(`${APP_NAME}:cached-uris`, JSON.stringify(cachedUris));
			}
			self.setState({ isCached: false });
		} catch (e) {
			console.error("[Lyrics+] Failed to delete from IndexedDB:", e);
		}
	},

	async resetTranslationCache(self, uri, modesToClear = null) {
		const styleKey = CONFIG.visual["translate:translation-style"] || "smart_adaptive";
		const pronounKey = CONFIG.visual["translate:pronoun-mode"] || "default";
		
		let clearedCount = 0;
		let geminiClearedCount = 0;
		
		if (modesToClear && modesToClear.length > 0) {
			for (const mode of modesToClear) {
				if (!mode || mode === "none") continue;
				const cacheKey = `${uri}:${mode}:${styleKey}:${pronounKey}`;
				const deleted = await CacheManager.delete(cacheKey);
				if (deleted) clearedCount++;
			}
			
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
			
			if (self._dmResults && self._dmResults[uri]) {
				const mKey = self.modeKey || "gemini";
				const currentMode1 = CONFIG.visual[`translation-mode:${mKey}`];
				const currentMode2 = CONFIG.visual[`translation-mode-2:${mKey}`];
				
				modesToClear.forEach(mode => {
					if (mode === currentMode1) self._dmResults[uri].mode1 = null;
					if (mode === currentMode2) self._dmResults[uri].mode2 = null;
				});
			}
			
			self._setCurrentLyrics(null);
		} else {
			clearedCount = await CacheManager.clearByUri(uri);
			await this.deleteLocalLyrics(self, uri);
			
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
			
			if (self._dmResults && self._dmResults[uri]) {
				delete self._dmResults[uri];
			}
		}

		if (self._inflightGemini) {
			const keysToDelete = [];
			for (const [key] of self._inflightGemini) {
				if (modesToClear) {
					if (modesToClear.some(mode => key.includes(`:${mode}:`))) {
						keysToDelete.push(key);
					}
				} else if (key.includes(uri)) {
					keysToDelete.push(key);
				}
			}
			keysToDelete.forEach(key => self._inflightGemini.delete(key));
		}

		if (!modesToClear) {
			self.setState({
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

		const totalCleared = clearedCount + geminiClearedCount;
		const modeKey = self.modeKey || "gemini";
		const dm1 = CONFIG.visual[`translation-mode:${modeKey}`];
		const dm2 = CONFIG.visual[`translation-mode-2:${modeKey}`];
		const activeGemini = [dm1, dm2].some((m) => m && m !== "none" && String(m).startsWith("gemini"));
		const hasSelectiveModes = modesToClear && modesToClear.length > 0;
		const touchesGemini = !modesToClear || modesToClear.some((m) => String(m).startsWith("gemini"));
		const showProgress =
			activeGemini &&
			touchesGemini &&
			(modesToClear == null || totalCleared > 0 || hasSelectiveModes);

		if (showProgress) {
			self.setState({
				translationStatus: {
					type: "progress",
					text: getText("notifications.reTranslating"),
					trackUri: self.state.uri,
				},
			});
		}

		const currentMode = self.getCurrentMode();
		this.lyricsSource(self, self.state, currentMode);

		if (!showProgress) {
			const clearedForUri = self.state.uri;
			self.setState({
				translationStatus: {
					type: "success",
					text: getText("notifications.cacheClearedShort"),
					trackUri: clearedForUri,
				},
			});
			setTimeout(() => {
				self.setState((s) =>
					s.translationStatus?.trackUri === clearedForUri ? { translationStatus: null } : {}
				);
			}, 1500);
		}
	},

	_reattachTiming(self, target, source) {
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
	},

	_maybeClearPretranslateChip(self, uri) {
		if (!uri) return;
		const hasInflight = self._inflightGemini && [...self._inflightGemini.keys()].some((k) => k.startsWith(uri + ":"));
		const pend = self._pretranslatePending?.[uri] || 0;
		if (!hasInflight && pend === 0 && self.state.preTranslateChip?.uri === uri) {
			self.setState({ preTranslateChip: null });
		}
	},

	async tryPretranslateNext(self) {
		const queue = Spicetify.Queue;
		if (!queue) return;

		let nextTrack = null;
		if (queue.track?.queued?.[0]) {
			nextTrack = queue.track.queued[0];
		} else if (queue.track?.nextUp?.[0]) {
			nextTrack = queue.track.nextUp[0];
		} else if (queue.nextTracks && queue.nextTracks.length > 0) {
			nextTrack = queue.nextTracks[0].contextTrack;
		}

		if (!nextTrack) return;

		const nextInfo = self.infoFromTrack(nextTrack);
		if (!nextInfo) return;

		if (self.pretranslatedUri === nextInfo.uri) return;

		const duration = Spicetify.Player.getDuration();
		const progress = Spicetify.Player.getProgress();

		if (duration < 45000 || progress < 5000) return;

		console.log(`[Lyrics+] Pre-translate: starting for ${nextInfo.artist} - ${nextInfo.title}`);
		self.pretranslatedUri = nextInfo.uri;

		let lyricsData = null;
		const hasLyricsContent = (data) => {
			if (!data) return false;
			const hasSynced = Array.isArray(data.synced) && data.synced.length > 0;
			const hasUnsynced = Array.isArray(data.unsynced) && data.unsynced.length > 0;
			const hasGenius = data.genius && typeof data.genius === 'string' && data.genius.length > 0;
			return hasSynced || hasUnsynced || hasGenius;
		};

		try {
			const cached = await CacheManager.get(nextInfo.uri);
			if (cached && hasLyricsContent(cached)) {
				lyricsData = cached;
				console.log(`[Lyrics+] Pre-translate: cache HIT with valid lyrics`);
			} else if (cached) {
				console.log(`[Lyrics+] Pre-translate: cache HIT but stale (no lyrics content), treating as MISS`);
			}
		} catch (e) {
			console.warn(`[Lyrics+] Pre-translate: cache lookup failed:`, e);
		}

		if (!lyricsData) {
			console.log(`[Lyrics+] Pre-translate: fetching lyrics from network...`);
			try {
				lyricsData = await self.tryServices(nextInfo, -1, { skipStaleCheck: true });
				if (lyricsData?.provider) {
					CacheManager.set(nextInfo.uri, lyricsData);
					console.log(`[Lyrics+] Pre-translate: lyrics fetched from ${lyricsData.provider}`);
				}
			} catch (e) {
				console.warn("[Lyrics+] Pre-translate: lyrics fetch failed:", e);
				self.pretranslatedUri = null;
				return;
			}
		}

		if (!lyricsData) {
			console.log(`[Lyrics+] Pre-translate: no lyrics data available, aborting`);
			self.pretranslatedUri = null;
			return;
		}

		// 1. Luồng tải trước video background (chạy song song)
		if (CONFIG.visual["video-background"]) {
			console.log(`[Lyrics+] Smart Pre-load: starting background video pre-fetch for: ${nextInfo.title}`);
			if (window.VideoManager && typeof window.VideoManager.fetchVideoForTrack === "function") {
				window.VideoManager.fetchVideoForTrack(nextInfo, null, true).catch((e) => {
					console.warn("[Lyrics+] Smart Pre-load: silent video pre-fetch failed:", e);
				});
			}
		}

		// 2. Luồng dịch thuật/phiên âm Gemini ở nền
		const provider = CONFIG.visual["translate:translated-lyrics-source"];
		if (provider === "geminiVi") {
			const lyricsToTranslate = lyricsData.synced || lyricsData.unsynced || lyricsData.genius;
			if (lyricsToTranslate && (Array.isArray(lyricsToTranslate) ? lyricsToTranslate.length > 0 : typeof lyricsToTranslate === 'string')) {
				const lyricsStateForTranslation = {
					...lyricsData,
					uri: nextInfo.uri,
					artist: nextInfo.artist,
					title: nextInfo.title
				};

				const originalLanguage = this.provideLanguageCode(self, lyricsToTranslate);
				let friendlyLanguage = null;
				if (originalLanguage) {
					try {
						friendlyLanguage = new Intl.DisplayNames(["en"], { type: "language" }).of(originalLanguage.split("-")[0])?.toLowerCase();
					} catch (e) { /* ignore */ }
				}

				const modeKey = !friendlyLanguage ? "gemini" : friendlyLanguage;
				const displayMode1 = CONFIG.visual[`translation-mode:${modeKey}`];
				const displayMode2 = CONFIG.visual[`translation-mode-2:${modeKey}`];

				const triggerTranslation = async (mode) => {
					if (!mode || mode === "none") return;
					if (String(mode).startsWith("gemini")) {
						console.log(`[Lyrics+] Smart Pre-load: triggering ${mode} translation (${Array.isArray(lyricsToTranslate) ? lyricsToTranslate.length : 1} lines)`);
						await this.getGeminiTranslation(self, lyricsStateForTranslation, lyricsToTranslate, mode, true).catch((e) => {
							console.warn(`[Lyrics+] Smart Pre-load: ${mode} translation failed:`, e);
							self.pretranslatedUri = null;
							queueMicrotask(() => this._maybeClearPretranslateChip(self, nextInfo.uri));
						});
					}
				};

				const startedGemini = [displayMode1, displayMode2].some(
					(m) => m && m !== "none" && String(m).startsWith("gemini")
				);
				triggerTranslation(displayMode1);
				triggerTranslation(displayMode2);
				if (startedGemini) {
					self.setState({
						preTranslateChip: { uri: nextInfo.uri, title: nextInfo.title || "" },
					});
				}
			}
		}
	},

	processLyricsFromFile(self, event) {
		const file = event.target.files;
		if (!file.length) return;
		const reader = new FileReader();

		if (file[0].size > 1024 * 1024) {
			Spicetify.showNotification(getText("notifications.fileTooLarge"), true, 3000);
			return;
		}

		reader.onload = (e) => {
			try {
				const localLyrics = Utils.parseLocalLyrics(e.target.result);
				const parsedKeys = Object.keys(localLyrics)
					.filter((key) => localLyrics[key] && localLyrics[key].length > 0)
					.map((key) => key[0].toUpperCase() + key.slice(1));

				if (parsedKeys.length === 0) {
					Spicetify.showNotification(getText("notifications.failedLoadLyricsInvalidFormat"), true, 3000);
					return;
				}

				// Force re-processing by invalidating cache
				self.lastProcessedUri = null;
				self.lastProcessedMode = null;

				const nextState = {
					provider: "local",
					copyright: "",
					synced: localLyrics.synced,
					unsynced: localLyrics.unsynced,
					karaoke: localLyrics.karaoke,
					genius: localLyrics.genius,
					isLoading: false,
					error: null,
				};

				self.setState(nextState, () => {
					this.saveLocalLyrics(self, self.currentTrackUri, nextState);
				});
				Spicetify.showNotification("✓ " + getText("notifications.loadedLyricsFromFile", { types: parsedKeys.join(", ") }), false, 3000);
			} catch (e) {
				console.error(e);
				Spicetify.showNotification(getText("notifications.failedLoadLyricsInvalidFormat"), true, 3000);
			}
		};

		reader.onerror = (e) => {
			console.error(e);
			Spicetify.showNotification(getText("notifications.failedReadFileCorrupted"), true, 3000);
		};

		reader.readAsText(file[0]);
		event.target.value = "";
	}
};
