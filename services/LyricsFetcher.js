/**
 * LyricsFetcher - Handles fetching lyrics, colors, and tempo
 * Extracted from index.js for better modularity
 * 
 * All functions return data instead of calling setState.
 * The caller (index.js) is responsible for updating React state.
 */

const LyricsFetcher = {
    /**
     * Rate limiting state for tempo API
     * @private
     */
    _lastTempoRequest: 0,
    _inflightTempo: new Map(),
    
    /**
     * Request tracking to prevent stale responses
     * @private
     */
    _currentRequestUri: null,
    
    /**
     * Set current request URI - call before starting requests
     * @param {string} uri
     */
    setCurrentRequest(uri) {
        this._currentRequestUri = uri;
    },
    
    /**
     * Check if request is still valid (not stale)
     * @param {string} uri
     * @returns {boolean}
     */
    isRequestValid(uri) {
        return this._currentRequestUri === uri;
    },

    /**
     * Extract track info from Spicetify track object
     * @param {Object} track - Spicetify track object
     * @returns {TrackInfo|null}
     */
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
    },

    /**
     * Fetch album colors for a track
     * @param {string} uri - Spotify URI
     * @returns {Promise<{background: string, inactive: string}>}
     */
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
            vibrant = 8747370; // Default fallback color
        }

        // Check if request is still valid before returning
        if (!this.isRequestValid(uri)) {
            return null; // Let caller handle stale result
        }

        return {
            background: Utils.convertIntToRGB(vibrant),
            inactive: Utils.convertIntToRGB(vibrant, 3),
        };
    },

    /**
     * Fetch tempo for a track with rate limiting
     * @param {string} uri - Spotify URI
     * @returns {Promise<string>} - Tempo period string (e.g., "0.25s")
     */
    async fetchTempo(uri) {
        const cacheKey = `${uri}:tempo`;
        let audio = await CacheManager.get(cacheKey);

        if (!audio) {
            // Global rate limiter: prevent spam during rapid track skipping
            const now = Date.now();
            const RATE_LIMIT_MS = 2000; // 2 seconds between requests
            
            if (now - this._lastTempoRequest < RATE_LIMIT_MS) {
                // Too soon - use default tempo, don't spam API
                audio = { tempo: 105 };
            } else {
                // Deduplicate in-flight requests
                if (this._inflightTempo.has(uri)) {
                    audio = await this._inflightTempo.get(uri);
                } else {
                    this._lastTempoRequest = now;
                    const promise = (async () => {
                        try {
                            const res = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/audio-features/${uri.split(":")[2]}`);
                            // Only cache if request is still valid (track hasn't changed)
                            if (this.isRequestValid(uri)) {
                                CacheManager.set(cacheKey, res);
                            }
                            return res;
                        } catch (e) {
                            // Cache default to prevent spamming
                            const fallback = { tempo: 105 };
                            CacheManager.set(cacheKey, fallback);
                            return fallback;
                        } finally {
                            this._inflightTempo.delete(uri);
                        }
                    })();
                    
                    this._inflightTempo.set(uri, promise);
                    audio = await promise;
                }
            }
        }

        let tempo = audio?.tempo;

        const MIN_TEMPO = 60;
        const MAX_TEMPO = 150;
        const MAX_PERIOD = 0.4;
        if (!tempo) tempo = 105;
        if (tempo < MIN_TEMPO) tempo = MIN_TEMPO;
        if (tempo > MAX_TEMPO) tempo = MAX_TEMPO;

        let period = MAX_PERIOD - ((tempo - MIN_TEMPO) / (MAX_TEMPO - MIN_TEMPO)) * MAX_PERIOD;
        period = Math.round(period * 100) / 100;

        return `${String(period)}s`;
    },

    /**
     * Try all enabled providers to fetch lyrics
     * @param {TrackInfo} trackInfo - Track information
     * @param {number} mode - Lyric mode (-1 for auto)
     * @returns {Promise<LyricsData>}
     */
    /**
     * Try all enabled providers to fetch lyrics using Level Hierarchy
     * Level 3: Synced/Karaoke (Stop immediately)
     * Level 2: Unsynced (Store as fallback, continue)
     * Level 1: None (Ignore)
     * 
     * @param {TrackInfo} trackInfo 
     * @param {number} mode 
     * @returns {Promise<LyricsData>}
     */
    async tryServices(trackInfo, mode = -1) {
        const currentMode = CONFIG.modes[mode] || "";
        let bestResult = null; // Stores Level 2 (Unsynced) result

        // Early exit if request already stale
        if (!this.isRequestValid(trackInfo.uri)) {
            return { ...emptyState, uri: trackInfo.uri, stale: true };
        }

        for (const id of CONFIG.providersOrder) {
            const service = CONFIG.providers[id];
            const spotifyVersion = Spicetify.Platform.version;
            
            if (spotifyVersion >= "1.2.31" && id === "genius") continue;
            if (!service.on) continue;
            if (mode !== -1 && !service.modes.includes(mode)) continue;

            let data;
            try {
                // Timeout per provider (5s) to prevent slow providers from blocking
                const PROVIDER_TIMEOUT = 5000;
                data = await Promise.race([
                    Providers[id](trackInfo),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Provider ${id} timeout`)), PROVIDER_TIMEOUT)
                    )
                ]);
            } catch (e) {
                console.warn(`[Lyrics+] Provider ${id} failed:`, e.message);
                continue;
            }
            
            // Check if request is still valid after each provider call
            if (!this.isRequestValid(trackInfo.uri)) {
                return { ...emptyState, uri: trackInfo.uri, stale: true };
            }

            // Level 1: Skip invalid result (None)
            if (data.error || (!data.karaoke && !data.synced && !data.unsynced && !data.genius)) continue;

            // Prepare result function to avoid repetition
            const prepareResult = (resultData) => {
                 // Clone to avoid mutating original source if cached/shared
                const finalData = { ...resultData, uri: trackInfo.uri };

                // Add copyright/provider info
                // Note: CreditFooter in UI already adds "Provided by [Provider]", so we don't need to add it here.
                // We only pass through the actual copyright string from the provider.
                if (resultData.provider !== "local" && resultData.provider) {
                    finalData.copyright = resultData.copyright || "";
                }

                // Musixmatch translation fix
                if (finalData.musixmatchTranslation && typeof finalData.musixmatchTranslation[0].startTime === "undefined" && finalData.synced) {
                    finalData.musixmatchTranslation = finalData.synced.map((line) => ({
                        ...line,
                        text: finalData.musixmatchTranslation.find((l) => Utils.processLyrics(l?.originalText || "") === Utils.processLyrics(line?.text || ""))?.text ?? (line?.text || ""),
                    }));
                }
                
                return finalData;
            };

            // Level 3: Synced or Karaoke
            if (data.synced || data.karaoke) {
                // If we are looking for specific mode 'unsynced', this might technically be a mismatch, 
                // but usually we prefer better data. 
                // However, if mode != -1, we rely on the service.modes check above.
                
                return prepareResult(data); // Found Max Level -> Return immediately (Winner Takes All)
            }

            // Level 2: Unsynced or Genius
            // If we don't have a bestResult yet, store this as our candidate.
            // We trust CONFIG.providersOrder, so the first Unsynced provider is preferred 
            // over later Unsynced ones (unless we find a Synced one later).
            if ((data.unsynced || data.genius) && !bestResult) {
                bestResult = prepareResult(data);
                // Continue loop to search for Level 3...
            }
        }

        // End of Loop: Return best result found, or empty state if nothing found (Level 1)
        if (bestResult) {
            return bestResult;
        }

        return { ...emptyState, uri: trackInfo.uri };
    }
};

// Register in namespace (also exposes to global scope for backward compatibility)
if (window.LyricsPlus?.register) {
    window.LyricsPlus.register('LyricsFetcher', LyricsFetcher);
} else {
    window.LyricsFetcher = LyricsFetcher;
}
