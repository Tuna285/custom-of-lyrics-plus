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
                            CacheManager.set(cacheKey, res);
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
    async tryServices(trackInfo, mode = -1) {
        const currentMode = CONFIG.modes[mode] || "";
        let finalData = { ...emptyState, uri: trackInfo.uri };
        
        for (const id of CONFIG.providersOrder) {
            const service = CONFIG.providers[id];
            const spotifyVersion = Spicetify.Platform.version;
            
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
};

// Expose to global scope for other modules
window.LyricsFetcher = LyricsFetcher;
