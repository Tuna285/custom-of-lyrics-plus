// components/VideoManager.js
// Simplified Video Background using ivLyrics API (Client-Only, No Server Required)

const VideoManager = {
    _lastFetchUri: null,
    _currentVideo: null,
    _userHash: null,
    _retryAbortController: null,
    _lastSearchUri: null,
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
     * Clean track titles to improve search matches (removes Remastered, Radio Edit, etc.)
     */
    _cleanQuery(artist, title) {
        let cleanTitle = title
            .replace(/\s*-\s*Remaster(ed)?\s*\d*/gi, "")
            .replace(/\s*-\s*Radio\s*Edit/gi, "")
            .replace(/\s*-\s*Single\s*Version/gi, "")
            .replace(/\s*\(Remastered\)/gi, "");
        return `${artist} - ${cleanTitle}`;
    },

    /**
     * Score search result video by comparing duration and title metadata.
     * @private
     */
    _scoreVideo(video, artist, title, targetDurationSec) {
        let score = 0;
        const videoTitle = (video.title || "").toLowerCase();
        const videoAuthor = (video.author || "").toLowerCase();
        const cleanArtist = (artist || "").toLowerCase();
        const cleanTitle = (title || "").toLowerCase();

        // 1. Duration Matching (Huge Boost)
        if (targetDurationSec > 0 && video.lengthSeconds > 0) {
            const diff = Math.abs(video.lengthSeconds - targetDurationSec);
            if (diff <= 6) {
                score += 150; // Perfect match
            } else if (diff <= 12) {
                score += 100; // Close match
            } else if (diff <= 25) {
                score += 40;  // Marginal match
            } else if (diff > 90) {
                score -= 80;  // Too short (anime cut) or too long (1 hour loop)
            }
        }

        // 2. Keyword Matching (Title & Author)
        if (cleanArtist) {
            // Split multiple artists
            const artistParts = cleanArtist.split(/,|\s+feat\.?\s+|&/gi).map(a => a.trim()).filter(Boolean);
            let artistMatched = false;
            for (const part of artistParts) {
                if (part.length > 2 && (videoTitle.includes(part) || videoAuthor.includes(part))) {
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
        }

        // Title match
        if (cleanTitle && videoTitle.includes(cleanTitle)) {
            score += 60;
        }

        // Official Video Indicators
        const officialKeywords = ["official", "mv", "music video", "official video", "pv"];
        if (officialKeywords.some(kw => videoTitle.includes(kw))) {
            score += 30;
        }

        // Negative Keywords
        const negativeKeywords = [
            "cover", "guitar", "piano", "drum", "8bit", "karaoke", "instrumental", 
            "reaction", "dance", "1 hour", "loop", "react", "tutorial", "synthesia",
            "bass", "violin", "vietsub", "sub", "lyrics", "parody", "remix"
        ];
        for (const kw of negativeKeywords) {
            if (videoTitle.includes(kw) && !cleanTitle.includes(kw)) {
                score -= 80;
            }
        }

        return score;
    },

    /**
     * Search YouTube directly by scraping the search results page.
     * 100% serverless, CORS-bypassed in Spotify client, bypasses broken public API instances.
     */
    async _searchDirectYoutube(query) {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        console.log(`[VideoManager] Searching YouTube directly: ${url}`);
        
        try {
            let html = null;
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            };

            // Try CosmosAsync first to bypass CORS
            if (window.Spicetify?.CosmosAsync?.get) {
                try {
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("CosmosAsync timeout")), 8000)
                    );
                    const fetchPromise = window.Spicetify.CosmosAsync.get(url, null, headers);
                    const data = await Promise.race([fetchPromise, timeoutPromise]);
                    html = typeof data === "string" ? data : JSON.stringify(data);
                } catch (cosmosErr) {
                    console.warn("[VideoManager] CosmosAsync direct search failed, trying fetch fallback...", cosmosErr.message);
                }
            }

            // Fallback to fetch (which will likely fail due to CORS in Spotify UI, but kept as absolute fallback)
            if (!html) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
                
                const response = await fetch(url, {
                    headers,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    console.warn(`[VideoManager] Direct YouTube search returned status: ${response.status}`);
                    return null;
                }
                
                html = await response.text();
            }
            
            // Extract ytInitialData JSON object containing search result metadata
            const jsonRegex = /var\s+ytInitialData\s*=\s*({[\s\S]*?});/;
            const match = html.match(jsonRegex);
            
            if (match) {
                try {
                    const jsonStr = match[1];
                    const data = JSON.parse(jsonStr);
                    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
                    
                    if (contents) {
                        const itemSection = contents.find(c => c.itemSectionRenderer);
                        const results = itemSection?.itemSectionRenderer?.contents || [];
                        
                        // Extract the first video result
                        for (const result of results) {
                            if (result.videoRenderer) {
                                const video = result.videoRenderer;
                                const videoId = video.videoId;
                                const title = video.title?.runs?.[0]?.text;
                                if (videoId) {
                                    console.log(`[VideoManager] Direct search matched: ${videoId} ("${title}")`);
                                    return { videoId, title };
                                }
                            }
                        }
                    }
                } catch (jsonErr) {
                    console.warn("[VideoManager] Direct search JSON parse failed, trying HTML regex fallback...", jsonErr);
                }
            }
            
            // Fallback: search for video URLs directly in the raw HTML string
            const watchRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
            const matches = [...html.matchAll(watchRegex)];
            if (matches.length > 0) {
                const videoIds = [...new Set(matches.map(m => m[1]))];
                if (videoIds.length > 0) {
                    console.log(`[VideoManager] Regex fallback matched: ${videoIds[0]}`);
                    return { videoId: videoIds[0], title: query };
                }
            }
        } catch (e) {
            console.warn("[VideoManager] Direct YouTube search failed:", e.message);
        }
        return null;
    },

    /**
     * Get active Invidious instances dynamically from api.invidious.io
     * @returns {Promise<string[]>}
     */
    async _getDynamicInvidiousInstances() {
        try {
            console.log("[VideoManager] Fetching dynamic Invidious instances...");
            const response = await fetch("https://api.invidious.io/instances.json");
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const entries = Array.isArray(data) ? data : Object.entries(data);
            const candidates = [];
            
            for (const item of entries) {
                let domain, details;
                if (Array.isArray(item)) {
                    domain = item[0];
                    details = item[1];
                } else {
                    domain = item.domain || item.uri;
                    details = item;
                }
                
                if (details.uri && details.type === "https" && details.monitor?.down === false) {
                    candidates.push(details.uri);
                }
            }
            
            console.log(`[VideoManager] Resolved ${candidates.length} healthy Invidious instances.`);
            return candidates;
        } catch (e) {
            console.warn("[VideoManager] Failed to fetch dynamic Invidious instances:", e.message);
            return [
                "https://inv.thepixora.com",
                "https://yt.chocolatemoo53.com",
                "https://invidious.flokinet.to",
                "https://yewtu.be"
            ];
        }
    },

    /**
     * Search YouTube via public Invidious instances (CORS-enabled proxies)
     */
    async _searchInvidious(query, trackUri = null) {
        const instances = await this._getDynamicInvidiousInstances();
        const toTest = instances.slice(0, 6);
        
        for (const instance of toTest) {
            const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
            console.log(`[VideoManager] Fallback search via Invidious instance: ${instance}`);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per instance
                
                const response = await fetch(url, {
                    headers: { "Accept": "application/json" },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    console.warn(`[VideoManager] Instance ${instance} returned status: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                if (Array.isArray(data)) {
                    const videos = data
                        .filter(item => item.type === "video" && item.videoId)
                        .slice(0, 5)
                        .map(item => ({
                            videoId: item.videoId,
                            title: item.title,
                            author: item.author || "",
                            lengthSeconds: item.lengthSeconds || 0
                        }));

                    if (videos.length > 0) {
                        // Populate cache for settings
                        if (trackUri) {
                            this._lastSearchUri = trackUri;
                            this._lastSearchResults = videos;
                        }
                        return { videoId: videos[0].videoId, title: videos[0].title };
                    }
                }
            } catch (e) {
                console.warn(`[VideoManager] Failed to fetch from Invidious ${instance}:`, e.message);
            }
        }
        return null;
    },

    /**
     * Search YouTube via public Invidious instances, returning multiple candidates
     */
    async searchMultipleVideos(query, trackUri = null, trackInfo = null) {
        if (trackUri && this._lastSearchUri === trackUri && this._lastSearchResults.length > 0) {
            console.log(`[VideoManager] Returning cached multi-search results for: ${trackUri}`);
            return this._lastSearchResults;
        }

        const instances = await this._getDynamicInvidiousInstances();
        const toTest = instances.slice(0, 6);
        
        const artist = trackInfo?.artist || "";
        const title = trackInfo?.title || "";
        const targetDurationSec = trackInfo?.duration ? trackInfo.duration / 1000 : 0;

        for (const instance of toTest) {
            const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
            console.log(`[VideoManager] Multi-search via Invidious instance: ${instance}`);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(url, {
                    headers: { "Accept": "application/json" },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                if (Array.isArray(data)) {
                    let videos = data
                        .filter(item => item.type === "video" && item.videoId)
                        .map(item => ({
                            videoId: item.videoId,
                            title: item.title,
                            author: item.author || "",
                            lengthSeconds: item.lengthSeconds || 0
                        }));

                    if (videos.length > 0) {
                        // Apply scoring algorithm to rank results
                        videos = videos.map(video => ({
                            ...video,
                            score: this._scoreVideo(video, artist, title, targetDurationSec)
                        }));

                        // Sort descending by relevance score
                        videos.sort((a, b) => b.score - a.score);

                        // Take the top 5 candidates
                        const top5 = videos.slice(0, 5).map(({ videoId, title, author, lengthSeconds }) => ({
                            videoId,
                            title,
                            author,
                            lengthSeconds
                        }));

                        if (trackUri) {
                            this._lastSearchUri = trackUri;
                            this._lastSearchResults = top5;
                        }
                        return top5;
                    }
                }
            } catch (e) {
                console.warn(`[VideoManager] Multi-search failed from ${instance}:`, e.message);
            }
        }
        return [];
    },

    /**
     * Fetch video background for a track using a dual-layer client-only search workflow
     * @param {Object} trackInfo - { title, artist, duration, uri, image }
     * @param {Function} onRetry - Deprecated/Not used in client-only search
     * @returns {Promise<Object|null>} - Video data or null
     */
    async fetchVideoForTrack(trackInfo, onRetry = null) {
        // Input validation
        if (!trackInfo?.uri) {
            console.warn("[VideoManager] fetchVideoForTrack: Missing track URI");
            return null;
        }

        // Cache hit: Return cached video ONLY if it's for the same track
        if (this._lastFetchUri === trackInfo.uri && this._currentVideo?.uri === trackInfo.uri) {
            console.log("[VideoManager] Cache hit for:", trackInfo.title);
            return this._currentVideo;
        }
        
        // Abort any pending requests from previous track
        if (this._retryAbortController) {
            this._retryAbortController.abort();
        }
        this._retryAbortController = new AbortController();
        const abortSignal = this._retryAbortController.signal;
        
        // Clear stale cache when switching tracks
        if (this._lastFetchUri !== trackInfo.uri) {
            this._currentVideo = null;
        }
        this._lastFetchUri = trackInfo.uri;

        // Check for manual video override FIRST
        const manualVideoId = await this.getManualVideo(trackInfo.uri);
        if (manualVideoId) {
            const savedOffset = (await this.getOffset(trackInfo.uri)) || 0;
            this._currentVideo = {
                video_id: manualVideoId,
                sync_offset: savedOffset,
                title: `${trackInfo.artist} - ${trackInfo.title}`,
                uri: trackInfo.uri,
                source: "manual+saved"
            };
            console.log(`[VideoManager] Using saved manual video: ${manualVideoId} (offset: ${savedOffset}s)`);
            return this._currentVideo;
        }

        // Check for cached automatic search result SECOND
        const cachedAuto = await this.getAutoVideo(trackInfo.uri);
        if (cachedAuto) {
            const savedOffset = (await this.getOffset(trackInfo.uri)) || 0;
            this._currentVideo = {
                video_id: cachedAuto.videoId,
                sync_offset: savedOffset,
                title: cachedAuto.title,
                uri: trackInfo.uri,
                source: "auto_cache"
            };
            console.log(`[VideoManager] Using cached automatic video: ${cachedAuto.videoId} (offset: ${savedOffset}s)`);
            return this._currentVideo;
        }

        const query = this._cleanQuery(trackInfo.artist || "", trackInfo.title || "");
        console.log(`[VideoManager] Searching video background for: ${query}`);
        
        try {
            // Try Direct YouTube Scrape (highly accurate, fast, domestic IP bypasses bot bans)
            let result = await this._searchDirectYoutube(query);
            let source = "youtube_direct";
            
            // Check if aborted after fetch
            if (abortSignal.aborted || this._lastFetchUri !== trackInfo.uri) {
                console.log(`[VideoManager] Ignored stale response for: ${trackInfo.title}`);
                return null;
            }

            // Fallback to Invidious if direct search failed (direct search fails due to CORS in Spotify UI)
            if (!result || !result.videoId) {
                console.log("[VideoManager] Direct search failed (CORS or network), attempting Invidious fallback...");
                result = await this._searchInvidious(query, trackInfo.uri);
                source = "invidious";
            }

            if (result && result.videoId) {
                const videoId = result.videoId;
                const title = result.title || `${trackInfo.artist} - ${trackInfo.title}`;
                let syncOffset = 0; // Default offset
                
                // Cache this successful automatic search in IndexedDB
                await this.saveAutoVideo(trackInfo.uri, videoId, title);

                // Check for user-saved offset override
                const savedOffset = await this.getOffset(trackInfo.uri);
                if (savedOffset !== null) {
                    syncOffset = savedOffset;
                    source += "+saved";
                    console.log(`[VideoManager] Using saved offset: ${savedOffset}s`);
                }
                
                this._currentVideo = {
                    video_id: videoId,
                    sync_offset: syncOffset,
                    title: title,
                    uri: trackInfo.uri,
                    source: source
                };
                
                console.log(`[VideoManager] Found video: ${videoId} (offset: ${syncOffset}s, source: ${source})`);
                return this._currentVideo;
            } else {
                console.log("[VideoManager] No video found on any channels");
            }
        } catch (e) {
            console.error(`[VideoManager] Video search failed:`, e.message);
        }

        this._currentVideo = null;
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
            try {
                await IDBCache.delete(manualKey);
                await IDBCache.delete(offsetKey);
                await IDBCache.delete(autoKey);
                console.log(`[VideoManager] Cleared DB cache and manual configs for: ${trackUri.split(':').pop()}`);
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
