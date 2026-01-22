// components/VideoManager.js
// Simplified Video Background using ivLyrics API (Client-Only, No Server Required)

const VideoManager = {
    _lastFetchUri: null,
    _currentVideo: null,
    _userHash: null,
    _retryAbortController: null,
    
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
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Single API call to ivLyrics
     */
    async _fetchFromIvLyrics(spotifyId, userHash) {
        const url = `https://lyrics.api.ivl.is/lyrics/youtube?trackId=${spotifyId}&userHash=${userHash}&useCommunity=true`;
        
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            return { success: false, status: response.status };
        }

        const data = await response.json();
        return data;
    },

    /**
     * Fetch video background for a track using ivLyrics API with retry logic
     * @param {Object} trackInfo - { title, artist, duration, uri, image }
     * @param {Function} onRetry - Optional callback when retrying (for UI feedback)
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
        
        // Abort any pending retry from previous track
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

        // Extract Spotify ID from URI (spotify:track:ID)
        const spotifyId = trackInfo.uri.split(':')[2];
        if (!spotifyId) {
            console.warn("[VideoManager] Invalid Spotify URI");
            return null;
        }

        const userHash = this._generateUserHash();
        const startTime = Date.now();

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
        
        // Retry loop
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            // Check if total timeout exceeded
            if (Date.now() - startTime >= this.TOTAL_TIMEOUT_MS) {
                console.log(`[VideoManager] Total timeout (${this.TOTAL_TIMEOUT_MS/1000}s) exceeded for: ${trackInfo.title}`);
                break;
            }
            
            // Check if aborted (track changed)
            if (abortSignal.aborted) {
                console.log(`[VideoManager] Retry aborted for: ${trackInfo.title}`);
                return null;
            }
            
            console.log(`[VideoManager] Fetching from ivLyrics (attempt ${attempt}/${this.MAX_RETRIES}):`, trackInfo.artist, "-", trackInfo.title);

            try {
                const data = await this._fetchFromIvLyrics(spotifyId, userHash);
                
                // Check if aborted after fetch
                if (abortSignal.aborted || this._lastFetchUri !== trackInfo.uri) {
                    console.log(`[VideoManager] Ignored stale response for: ${trackInfo.title}`);
                    return null;
                }

                // Success with video data
                if (data?.success && data?.data?.youtubeVideoId) {
                    const videoId = data.data.youtubeVideoId;
                    let syncOffset = (data.data.captionStartTime || 0) / 1000; // Convert ms to seconds
                    
                    // Check for user-saved offset override
                    const savedOffset = await this.getOffset(trackInfo.uri);
                    if (savedOffset !== null) {
                        syncOffset = savedOffset;
                        console.log(`[VideoManager] Using saved offset: ${savedOffset}s`);
                    }
                    
                    this._currentVideo = {
                        video_id: videoId,
                        sync_offset: syncOffset,
                        title: `${trackInfo.artist} - ${trackInfo.title}`,
                        uri: trackInfo.uri,
                        source: savedOffset !== null ? "ivLyrics+saved" : "ivLyrics"
                    };
                    
                    console.log(`[VideoManager] ivLyrics found: ${videoId} (offset: ${syncOffset}s)`);
                    return this._currentVideo;
                }
                
                // No video found or error - retry if not last attempt
                if (attempt < this.MAX_RETRIES) {
                    const status = data?.status || (data?.success === false ? "not found" : "error");
                    console.log(`[VideoManager] ivLyrics returned ${status}, retrying in ${this.RETRY_DELAY_MS/1000}s...`);
                    
                    // Notify caller about retry (for loading indicator)
                    if (onRetry) {
                        onRetry(attempt, this.MAX_RETRIES, this.RETRY_DELAY_MS);
                    }
                    
                    // Wait before retry
                    await this._sleep(this.RETRY_DELAY_MS);
                } else {
                    console.log("[VideoManager] ivLyrics: No video found after all retries");
                }

            } catch (e) {
                console.error(`[VideoManager] ivLyrics request failed (attempt ${attempt}):`, e.message);
                
                if (attempt < this.MAX_RETRIES) {
                    console.log(`[VideoManager] Retrying in ${this.RETRY_DELAY_MS/1000}s...`);
                    if (onRetry) {
                        onRetry(attempt, this.MAX_RETRIES, this.RETRY_DELAY_MS);
                    }
                    await this._sleep(this.RETRY_DELAY_MS);
                }
            }
        }

        // All retries exhausted
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
     * Reset video state (client cache only, no server)
     */
    reset() {
        // Abort any pending retries
        if (this._retryAbortController) {
            this._retryAbortController.abort();
            this._retryAbortController = null;
        }
        this._lastFetchUri = null;
        this._currentVideo = null;
        console.log("[VideoManager] Cache cleared");
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
