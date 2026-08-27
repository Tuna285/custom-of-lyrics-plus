// components/VideoManager.js
// Simplified Video Background using ivLyrics API (Client-Only, No Server Required)

const VideoManager = {
    _lastFetchUri: null,
    _currentVideo: null,
    _userHash: null,
    _retryAbortController: null,
    _lastSearchUri: null,
    _lastSearchQuery: null,
    _lastSearchResults: [],
    
    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 5000, // 5 seconds between retries
    TOTAL_TIMEOUT_MS: 31000, // 31 seconds total limit for video search
    
    /**
     * Generate consistent user hash for ivLyrics API
     */
    _generateUserHash() {
        if (this._userHash) return this._userHash;
        
        // Use a stable identifier based on localStorage or generate new one
        let stored = localStorage.getItem('ivlyrics-user-hash');
        if (!stored) {
            stored = Math.random().toString(36).substring(2, 18);
            localStorage.setItem('ivlyrics-user-hash', stored);
        }
        this._userHash = stored;
        return this._userHash;
    },

    /**
     * Initialize the Video Manager
     */
    init() {
        this._generateUserHash();
        console.log("[VideoManager] Initialized (ivLyrics Client-Only Mode with Retry)");
    },



    /**
     * Clean track titles and primary artist to improve search match accuracy
     * @private
     */
    _cleanQuery(artist, title) {
        let cleanTitle = title
            .replace(/\s*-\s*Remaster(ed)?\s*\d*/gi, "")
            .replace(/\s*-\s*Radio\s*Edit/gi, "")
            .replace(/\s*-\s*Single\s*Version/gi, "")
            .replace(/\s*\(Remastered\)/gi, "")
            .replace(/\s*\(feat\.?\s+.*?\)/gi, "")
            .replace(/\s*feat\.?\s+.*$/gi, "")
            .replace(/\s*\(with\s+.*?\)/gi, "")
            .replace(/\s*\(bonus\s+track\)/gi, "")
            .replace(/\s*-\s*live/gi, "")
            .replace(/\s*\(live\)/gi, "")
            .replace(/\s*-\s*deluxe\s*edition/gi, "");
        
        // Take primary artist to simplify query (works better on YouTube search engines)
        const cleanArtist = artist.split(/,|\s+feat\.?\s+|&/gi)[0].trim();
        return `${cleanTitle.trim()} - ${cleanArtist}`;
    },

    /**
     * Parse duration string like "3:45" or "1:02:13" into seconds.
     * @private
     * @param {string} str - Duration string
     * @returns {number} - Duration in seconds
     */
    _parseDurationStringToSeconds(str) {
        if (!str) return 0;
        const parts = str.split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    },

    /**
     * Score search result video by comparing duration and title metadata.
     * @private
     * @param {Object} video - Video metadata candidate
     * @param {string} artist - Track artist name
     * @param {string} title - Track title
     * @param {number} targetDurationSec - Target track duration in seconds
     * @returns {number} - Relevance score
     */
    _scoreVideo(video, artist, title, targetDurationSec) {
        let score = 0;
        const videoTitle = (video.title || "").toLowerCase();
        const videoAuthor = (video.author || "").toLowerCase();
        const cleanArtist = (artist || "").toLowerCase();
        const cleanTitle = (title || "").toLowerCase();

        // 1. Duration Matching (Sliding Scale Penalty/Boost)
        if (targetDurationSec > 0 && video.lengthSeconds > 0) {
            const diff = Math.abs(video.lengthSeconds - targetDurationSec);
            if (diff <= 6) {
                score += 150; // Perfect match
            } else if (diff <= 12) {
                score += 100; // Close match
            } else if (diff <= 25) {
                score += 40;  // Marginal match
            } else if (diff > 25 && diff <= 45) {
                score -= 15;  // Slight mismatch
            } else if (diff > 45 && diff <= 90) {
                score -= 50;  // Moderate mismatch (live extensions, different cuts)
            } else if (diff > 90) {
                score -= 100; // Major mismatch (anime cuts, 1-hour loops)
            }
        }

        // 2. Keyword Matching (Title & Author)
        if (cleanArtist) {
            // Split multiple artists
            const artistParts = cleanArtist.split(/,|\s+feat\.?\s+|&/gi).map(a => a.trim()).filter(Boolean);
            let artistMatched = false;
            for (const part of artistParts) {
                if (part.length >= 2 && (videoTitle.includes(part) || videoAuthor.includes(part))) {
                    score += 50;
                    artistMatched = true;
                    break;
                }
            }
            
            // Handle Japanese/Romaji artist names mappings
            if (!artistMatched) {
                const mappings = {
                    "yorushika": ["ヨルシカ"],
                    "radwimps": ["ラッドウィンプS", "ラッドウィンプス"],
                    "lisa": ["リサ"],
                    "yoasobi": ["ヨアソビ"],
                    "kanda": ["神田"],
                    "utada hikaru": ["宇多田ヒカル"],
                    "kenshi yonezu": ["米津玄師"],
                    "aimyon": ["あいみょん"]
                };
                for (const [eng, japs] of Object.entries(mappings)) {
                    if (cleanArtist.includes(eng)) {
                        for (const jap of japs) {
                            if (videoTitle.includes(jap) || videoAuthor.includes(jap)) {
                                score += 50;
                                artistMatched = true;
                                break;
                            }
                        }
                    }
                    if (artistMatched) break;
                }
            }

            // 3. Official Channel / VEVO Boost (Extremely strong indicators)
            const cleanPrimaryArtist = artistParts[0] || "";
            const isVevo = videoAuthor.endsWith("vevo") || videoAuthor.includes("vevo");
            const normalizedAuthor = videoAuthor.replace(/\s+/g, "");
            const normalizedArtist = cleanPrimaryArtist.replace(/\s+/g, "");
            const isOfficialChannel = normalizedAuthor === normalizedArtist || 
                                      normalizedAuthor === `${normalizedArtist}official` ||
                                      (isVevo && normalizedAuthor.startsWith(normalizedArtist));
            
            if (isOfficialChannel) {
                score += 80; // Huge boost for VEVO or Official artist channels
            }

            // Boost Official auto-generated topic channels (always matches Spotify duration and high audio quality)
            if (videoAuthor.includes("topic")) {
                score += 120;
            }
        }

        // Title match
        if (cleanTitle && videoTitle.includes(cleanTitle)) {
            score += 60;
        }

        // Official Video Indicators
        const officialKeywords = ["official", "mv", "music video", "official video", "pv", "official audio"];
        if (officialKeywords.some(kw => videoTitle.includes(kw))) {
            score += 40;
        }

        // Grouped negative keywords to aggressively penalize fan covers/remixes while protecting target tracks
        const severeNegatives = ["cover", "fanmade", "fan-made", "fan edit", "fan-edit", "tự làm"];
        for (const kw of severeNegatives) {
            if (videoTitle.includes(kw) && !cleanTitle.includes(kw)) {
                score -= 300; // Critical penalty: completely sink cover/fanmade matches
            }
        }

        const strongNegatives = [
            "karaoke", "instrumental", "remix", "guitar", "piano", "violin", 
            "drum", "bass", "synthesia", "1 hour", "loop", "reaction", "react", "tutorial"
        ];
        for (const kw of strongNegatives) {
            if (videoTitle.includes(kw) && !cleanTitle.includes(kw)) {
                score -= 200; // Strong penalty: sink musical covers & non-official variants
            }
        }

        const mildNegatives = ["parody", "live", "concert", "performance", "vietsub", "sub"];
        for (const kw of mildNegatives) {
            if (videoTitle.includes(kw) && !cleanTitle.includes(kw)) {
                score -= 80; // Standard penalty for live versions or fansubs
            }
        }

        return score;
    },

    /**
     * Search YouTube via InnerTube TVHTML5 Client API (SmartTube / TVHTML5 Client)
     * @private
     * @param {string} query - Cleaned search query
     * @returns {Promise<Array<{videoId: string, title: string, author: string, lengthSeconds: number}>>}
     */
    async _searchYoutubeTVHTML5(query) {
        try {
            const apiKey = "AIzaSyAO_FJ2SlvU8Q4UYNuLic2MeElzYsS180";
            const targetUrl = `https://www.youtube.com/youtubei/v1/search?key=${apiKey}`;
            
            // Allow user-configured CORS proxy or fallback to public proxies to bypass cors-proxy.spicetify.app 403 blocks
            const configuredProxy = localStorage.getItem("spicetify:corsProxyTemplate");
            const proxyTemplates = configuredProxy 
                ? [configuredProxy]
                : [
                    "https://corsproxy.io/?{url}",
                    "https://api.allorigins.win/raw?url={url}",
                    "{url}"
                ];

            const body = {
                context: {
                    client: {
                        clientName: "TVHTML5",
                        clientVersion: "7.20241118.00.00",
                        hl: "en",
                        gl: "US"
                    }
                },
                query: query
            };
            const headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            };

            for (const template of proxyTemplates) {
                const requestUrl = template.replace("{url}", encodeURIComponent(targetUrl)).replace("{url_raw}", targetUrl);
                try {
                    let rawData = null;
                    if (window.Spicetify?.CosmosAsync?.post) {
                        const res = await window.Spicetify.CosmosAsync.post(requestUrl, body, headers);
                        rawData = typeof res === "string" ? res : JSON.stringify(res);
                    }

                    if (rawData && !rawData.includes("403 Forbidden") && !rawData.includes("<!DOCTYPE")) {
                        const watchMatches = [...rawData.matchAll(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g)];
                        if (watchMatches.length > 0) {
                            const videoIds = [...new Set(watchMatches.map(m => m[1]))];
                            console.log(`[VideoManager] TVHTML5 InnerTube search via proxy (${requestUrl}) returned ${videoIds.length} YouTube videos.`);
                            return videoIds.map(id => ({
                                videoId: id,
                                title: query,
                                author: "",
                                lengthSeconds: 0
                            }));
                        }
                    }
                } catch (proxyErr) {
                    console.warn(`[VideoManager] TVHTML5 search failed on proxy (${requestUrl}):`, proxyErr.message);
                }
            }
        } catch (e) {
            console.warn("[VideoManager] TVHTML5 YouTube search failed:", e.message);
        }
        return [];
    },

    /**
     * Search YouTube videos, returning multiple candidates (used by settings panel)
     * @param {string} query - Cleaned search query
     * @param {string} [trackUri] - Spotify track URI
     * @param {Object} [trackInfo] - Track metadata
     * @returns {Promise<Array<{videoId: string, title: string, author: string, lengthSeconds: number}>>}
     */
    async searchMultipleVideos(query, trackUri = null, trackInfo = null) {
        if (typeof query !== "string") {
            console.warn("[VideoManager] searchMultipleVideos: Invalid query format", query);
            return [];
        }
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return [];
        }

        if (trackUri && this._lastSearchUri === trackUri && this._lastSearchQuery === cleanQuery && this._lastSearchResults.length > 0) {
            console.log(`[VideoManager] Returning cached multi-search results for: ${trackUri} with query: "${cleanQuery}"`);
            return this._lastSearchResults;
        }

        // Try YouTube TVHTML5 InnerTube search
        const candidates = await this._searchYoutubeTVHTML5(cleanQuery);
        if (candidates && candidates.length > 0) {
            const blacklist = await this.getBlacklist(trackUri);
            const filtered = candidates.filter(video => !blacklist.includes(video.videoId));
            const top7 = filtered.slice(0, 7);
            if (trackUri) {
                this._lastSearchUri = trackUri;
                this._lastSearchQuery = cleanQuery;
                this._lastSearchResults = top7;
            }
            return top7;
        }
        return [];
    },

    /**
     * Fetch video background for a track using YouTube TVHTML5 Client
     * @param {Object} trackInfo - { title, artist, duration, uri, image }
     * @param {Function} onRetry - Deprecated/Not used in client-only search
     * @returns {Promise<Object|null>} - Video data or null
     */
    async fetchVideoForTrack(trackInfo, onRetry = null, isSilent = false) {
        // Input validation
        if (!trackInfo?.uri) {
            console.warn("[VideoManager] fetchVideoForTrack: Missing track URI");
            return null;
        }

        // Cache hit: Return cached video ONLY if it's for the same track
        if (!isSilent && this._lastFetchUri === trackInfo.uri && this._currentVideo?.uri === trackInfo.uri) {
            console.log("[VideoManager] Cache hit for:", trackInfo.title);
            return this._currentVideo;
        }
        
        let abortSignal;
        if (!isSilent) {
            if (this._retryAbortController) {
                this._retryAbortController.abort();
            }
            this._retryAbortController = new AbortController();
            abortSignal = this._retryAbortController.signal;
            
            if (this._lastFetchUri !== trackInfo.uri) {
                this._currentVideo = null;
            }
            this._lastFetchUri = trackInfo.uri;
        } else {
            const localAbort = new AbortController();
            abortSignal = localAbort.signal;
        }

        const blacklist = await this.getBlacklist(trackInfo.uri);

        // Check for manual video override FIRST
        const manualVideoId = await this.getManualVideo(trackInfo.uri);
        if (manualVideoId && !blacklist.includes(manualVideoId)) {
            const savedOffset = (await this.getOffset(trackInfo.uri)) || 0;
            const videoData = {
                video_id: manualVideoId,
                sync_offset: savedOffset,
                title: `${trackInfo.artist} - ${trackInfo.title}`,
                uri: trackInfo.uri,
                source: "manual+saved"
            };
            if (!isSilent) {
                this._currentVideo = videoData;
                console.log(`[VideoManager] Using saved manual video: ${manualVideoId} (offset: ${savedOffset}s)`);
            }
            return videoData;
        }

        // Check for cached automatic search result SECOND
        const cachedAuto = await this.getAutoVideo(trackInfo.uri);
        if (cachedAuto && !blacklist.includes(cachedAuto.videoId)) {
            const savedOffset = (await this.getOffset(trackInfo.uri)) || 0;
            const videoData = {
                video_id: cachedAuto.videoId,
                sync_offset: savedOffset,
                title: cachedAuto.title,
                uri: trackInfo.uri,
                source: "auto_cache"
            };
            if (!isSilent) {
                this._currentVideo = videoData;
                console.log(`[VideoManager] Using cached automatic video: ${cachedAuto.videoId} (offset: ${savedOffset}s)`);
            }
            return videoData;
        }

        const query = this._cleanQuery(trackInfo.artist || "", trackInfo.title || "");
        console.log(`[VideoManager] Searching YouTube video background (${isSilent ? "silent" : "active"}) for: ${query}`);
        
        try {
            // Try YouTube TVHTML5 InnerTube Search
            let candidates = await this._searchYoutubeTVHTML5(query);
            let source = "youtube_tvhtml5";
            
            if (abortSignal.aborted || (!isSilent && this._lastFetchUri !== trackInfo.uri)) {
                console.log(`[VideoManager] Ignored stale response for: ${trackInfo.title}`);
                return null;
            }

            let bestVideo = null;
            if (candidates && candidates.length > 0) {
                const filtered = candidates.filter(c => !blacklist.includes(c.videoId));
                if (filtered.length > 0) {
                    bestVideo = filtered[0];
                }
            }



            if (bestVideo && bestVideo.videoId) {
                const videoId = bestVideo.videoId;
                const videoTitle = bestVideo.title || `${trackInfo.artist} - ${trackInfo.title}`;
                let syncOffset = 0; // Default offset
                
                // Cache this successful automatic search in IndexedDB
                await this.saveAutoVideo(trackInfo.uri, videoId, videoTitle);

                // Check for user-saved offset override
                const savedOffset = await this.getOffset(trackInfo.uri);
                if (savedOffset !== null) {
                    syncOffset = savedOffset;
                    source += "+saved";
                    console.log(`[VideoManager] Using saved offset: ${savedOffset}s`);
                }
                
                const videoData = {
                    video_id: videoId,
                    sync_offset: syncOffset,
                    title: videoTitle,
                    uri: trackInfo.uri,
                    source: source
                };
                
                if (!isSilent) {
                    this._currentVideo = videoData;
                    console.log(`[VideoManager] Found video: ${videoId} (score: ${bestVideo.score || 0}, offset: ${syncOffset}s, source: ${source})`);
                } else {
                    console.log(`[VideoManager] Pre-cached video silently: ${videoId} for: ${trackInfo.title}`);
                }
                return videoData;
            } else {
                console.log("[VideoManager] No video found on any channels");
            }
        } catch (e) {
            console.error(`[VideoManager] Video search failed:`, e.message);
        }

        if (!isSilent) {
            this._currentVideo = null;
        }
        return null;
    },

    /**
     * Manual video selection (Client-Only, no server save)
     * @param {Object} trackInfo 
     * @param {string} videoId 
     * @param {number} offset 
     * @returns {Object|null}
     */
    setManualVideo(trackInfo, videoId, offset = 0) {
        if (!videoId || videoId.length !== 11) {
            console.warn("[VideoManager] Invalid videoId");
            return null;
        }
        
        this._currentVideo = {
            video_id: videoId,
            sync_offset: offset,
            title: "Manual Selection",
            uri: trackInfo?.uri,
            source: "manual"
        };
        this._lastFetchUri = trackInfo?.uri;
        
        console.log(`[VideoManager] Manual video set: ${videoId} (offset: ${offset}s)`);
        return this._currentVideo;
    },

    /**
     * Reset video state and optionally clear IndexedDB keys for a specific track
     * @param {string} [trackUri] - Spotify track URI to completely reset
     */
    async reset(trackUri = null) {
        // Abort any pending retries
        if (this._retryAbortController) {
            this._retryAbortController.abort();
            this._retryAbortController = null;
        }
        
        if (trackUri) {
            const manualKey = `video-manual:${trackUri}`;
            const offsetKey = `video-offset:${trackUri}`;
            const autoKey = `video-auto:${trackUri}`;
            const blacklistKey = `video-blacklist:${trackUri}`;
            try {
                await IDBCache.delete(manualKey);
                await IDBCache.delete(offsetKey);
                await IDBCache.delete(autoKey);
                await IDBCache.delete(blacklistKey);
                console.log(`[VideoManager] Cleared DB cache, manual configs, and blacklist for: ${trackUri.split(':').pop()}`);
            } catch (e) {
                console.warn("[VideoManager] Failed to clear DB for track:", e);
            }
            if (this._lastFetchUri === trackUri) {
                this._currentVideo = null;
                this._lastFetchUri = null;
            }
        } else {
            this._lastFetchUri = null;
            this._currentVideo = null;
            console.log("[VideoManager] Memory cache cleared");
        }
    },

    /**
     * Save auto-discovered video details to IndexedDB
     * @param {string} trackUri - Spotify track URI
     * @param {string} videoId - YouTube Video ID
     * @param {string} title - YouTube Video Title
     * @returns {Promise<boolean>}
     */
    async saveAutoVideo(trackUri, videoId, title) {
        if (!trackUri || !videoId) return false;
        
        const key = `video-auto:${trackUri}`;
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        
        try {
            await IDBCache.set(key, { videoId, title, savedAt: Date.now() }, oneYear);
            console.log(`[VideoManager] Cached auto video ${videoId} for: ${trackUri.split(':').pop()}`);
            return true;
        } catch (e) {
            console.warn('[VideoManager] Failed to cache auto video:', e);
            return false;
        }
    },

    /**
     * Get auto-discovered video details from IndexedDB
     * @param {string} trackUri - Spotify track URI
     * @returns {Promise<Object|null>} - Video details { videoId, title } or null
     */
    async getAutoVideo(trackUri) {
        if (!trackUri) return null;
        
        const key = `video-auto:${trackUri}`;
        
        try {
            const data = await IDBCache.get(key);
            if (data?.videoId) {
                return data;
            }
        } catch (e) {
            console.warn('[VideoManager] Failed to get auto video from cache:', e);
        }
        return null;
    },

    /**
     * Save custom video ID for a track to IndexedDB (persistent, no expiry)
     * @param {string} trackUri - Spotify track URI
     * @param {string} videoId - YouTube Video ID
     * @returns {Promise<boolean>}
     */
    async saveManualVideo(trackUri, videoId) {
        if (!trackUri || !videoId) return false;
        
        const key = `video-manual:${trackUri}`;
        const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;
        
        try {
            await IDBCache.set(key, { videoId, savedAt: Date.now() }, tenYears);
            console.log(`[VideoManager] Saved manual video ${videoId} for: ${trackUri.split(':').pop()}`);
            return true;
        } catch (e) {
            console.warn('[VideoManager] Failed to save manual video:', e);
            return false;
        }
    },

    /**
     * Get saved manual video ID for a track from IndexedDB
     * @param {string} trackUri - Spotify track URI
     * @returns {Promise<string|null>} - Video ID or null if not saved
     */
    async getManualVideo(trackUri) {
        if (!trackUri) return null;
        
        const key = `video-manual:${trackUri}`;
        
        try {
            const data = await IDBCache.get(key);
            if (data?.videoId) {
                console.log(`[VideoManager] Loaded manual video ${data.videoId} for: ${trackUri.split(':').pop()}`);
                return data.videoId;
            }
        } catch (e) {
            console.warn('[VideoManager] Failed to get manual video:', e);
        }
        return null;
    },

    /**
     * Save custom offset for a track to IndexedDB (persistent, no expiry)
     * @param {string} trackUri - Spotify track URI
     * @param {number} offset - Offset in seconds
     * @returns {Promise<boolean>}
     */
    async saveOffset(trackUri, offset) {
        if (!trackUri) return false;
        
        const key = `video-offset:${trackUri}`;
        const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;
        
        try {
            await IDBCache.set(key, { offset, savedAt: Date.now() }, tenYears);
            console.log(`[VideoManager] Saved offset ${offset}s for: ${trackUri.split(':').pop()}`);
            return true;
        } catch (e) {
            console.warn('[VideoManager] Failed to save offset:', e);
            return false;
        }
    },

    /**
     * Get saved offset for a track from IndexedDB
     * @param {string} trackUri - Spotify track URI
     * @returns {Promise<number|null>} - Offset in seconds or null if not saved
     */
    async getOffset(trackUri) {
        if (!trackUri) return null;
        
        const key = `video-offset:${trackUri}`;
        
        try {
            const data = await IDBCache.get(key);
            if (data?.offset !== undefined) {
                console.log(`[VideoManager] Loaded saved offset ${data.offset}s for: ${trackUri.split(':').pop()}`);
                return data.offset;
            }
        } catch (e) {
            console.warn('[VideoManager] Failed to get offset:', e);
        }
        return null;
    },

    /**
     * Blacklist a broken video ID for a specific track to prevent loading it again.
     * @param {string} trackUri - Spotify track URI
     * @param {string} videoId - YouTube Video ID
     * @returns {Promise<void>}
     */
    async blacklistVideo(trackUri, videoId) {
        if (!trackUri || !videoId) return;
        const key = `video-blacklist:${trackUri}`;
        try {
            const current = (await IDBCache.get(key)) || [];
            if (!current.includes(videoId)) {
                current.push(videoId);
                await IDBCache.set(key, current, 30 * 24 * 60 * 60 * 1000); // 30-day TTL
                console.log(`[VideoManager] Blacklisted video ${videoId} for: ${trackUri.split(':').pop()}`);
            }
        } catch (e) {
            console.warn("[VideoManager] Failed to blacklist video:", e);
        }
    },

    /**
     * Get the list of blacklisted video IDs for a track.
     * @param {string} trackUri - Spotify track URI
     * @returns {Promise<string[]>} - List of blacklisted video IDs
     */
    async getBlacklist(trackUri) {
        if (!trackUri) return [];
        const key = `video-blacklist:${trackUri}`;
        try {
            return (await IDBCache.get(key)) || [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Get current video
     */
    getCurrentVideo() {
        return this._currentVideo;
    }
};

// Initialize on load
VideoManager.init();

// Expose globally
if (window.LyricsPlus?.register) {
    window.LyricsPlus.register('VideoManager', VideoManager);
} else {
    window.VideoManager = VideoManager;
}
