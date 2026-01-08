// components/VideoManager.js
// Extracted Video Background Logic (Phase 2a - Strangler Fig Pattern)
// This module handles YouTube video background fetching and syncing.

const VideoManager = {
    _lastFetchUri: null,
    _currentVideo: null,
    _serverUrl: null,

    /**
     * Initialize the Video Manager
     * @param {string} serverUrl - The video sync server URL
     */
    init(serverUrl) {
        this._serverUrl = serverUrl || CONFIG.visual["video-background-server"] || "http://localhost:8000";
        console.log("[VideoManager] Initialized with server:", this._serverUrl);
    },

    /**
     * Get the current server URL
     * @returns {string}
     */
    getServerUrl() {
        return this._serverUrl || CONFIG.visual["video-background-server"] || "http://localhost:8000";
    },

    /**
     * Fetch video background for a track
     * @param {Object} trackInfo - { title, artist, duration, uri, image }
     * @param {Array} lyrics - Array of lyric lines with startTime
     * @returns {Promise<Object|null>} - Video data or null
     */
    async fetchVideoForTrack(trackInfo, lyrics = []) {
        // Input validation (Operational Rule #1)
        if (!trackInfo || typeof trackInfo !== 'object') {
            console.warn("[VideoManager] fetchVideoForTrack: Invalid trackInfo");
            return null;
        }
        if (!trackInfo.title || !trackInfo.artist) {
            console.warn("[VideoManager] fetchVideoForTrack: Missing required fields (title, artist)");
            return null;
        }

        // Prevent duplicate API calls for same track
        if (this._lastFetchUri === trackInfo.uri) {
            console.log("[VideoManager] Skipping duplicate fetch for:", trackInfo.uri);
            return this._currentVideo;
        }
        this._lastFetchUri = trackInfo.uri;

        const serverUrl = this.getServerUrl();
        console.log("[VideoManager] Fetching from:", serverUrl);

        // Prepare payload
        const firstLyricTime = lyrics?.[0]?.startTime || 0;
        const lyricsSnippet = lyrics.slice(0, 5).map(l => ({
            text: l.text,
            time: l.startTime
        }));

        const payload = {
            track: trackInfo.title,
            artist: trackInfo.artist,
            duration: Math.round(trackInfo.duration),
            firstLyricTime: Math.round(firstLyricTime),
            lyrics: lyricsSnippet
        };

        console.log("[VideoManager] Sending sync request with", lyricsSnippet.length, "lyric lines");

        try {
            const res = await fetch(`${serverUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.video_id) {
                    this._currentVideo = {
                        video_id: data.video_id,
                        sync_offset: data.sync_offset || 0,
                        title: data.title,
                        has_subtitles: data.has_subtitles
                    };
                    console.log("[VideoManager] Video Set:", data.title, "| Offset:", data.sync_offset);
                    return this._currentVideo;
                }
            }
        } catch (e) {
            console.warn("[VideoManager] Failed to fetch video:", e);
        }

        this._currentVideo = null;
        return null;
    },

    /**
     * Sync a manually selected video with the server
     * @param {Object} trackInfo - Track information
     * @param {string} videoId - YouTube video ID
     * @param {number} offset - Sync offset in seconds
     * @param {boolean} forceOffset - Whether to force the manual offset
     * @returns {Promise<Object|null>} - Synced video data or null
     */
    async syncManualVideo(trackInfo, videoId, offset, forceOffset = false) {
        // Input validation (Operational Rule #1)
        if (!trackInfo?.title || !trackInfo?.artist) {
            console.warn("[VideoManager] syncManualVideo: Invalid trackInfo");
            return null;
        }
        if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
            console.warn("[VideoManager] syncManualVideo: Invalid videoId (must be 11 chars)");
            return null;
        }
        if (typeof offset !== 'number' || isNaN(offset)) {
            offset = 0; // Default to 0 if invalid
        }

        const serverUrl = this.getServerUrl();

        try {
            console.log("[VideoManager] Syncing manual video:", videoId, "Offset:", offset, "Force:", forceOffset);

            const res = await fetch(`${serverUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    artist: trackInfo.artist,
                    track: trackInfo.title,
                    duration: trackInfo.duration || 0,
                    firstLyricTime: 0,
                    lyrics: null,
                    manual_video_id: videoId,
                    manual_offset: offset,
                    force_manual_offset: forceOffset
                })
            });

            const data = await res.json();
            if (data.status === "success") {
                console.log("[VideoManager] Manual video synced:", data);
                this._currentVideo = {
                    video_id: data.video_id,
                    sync_offset: data.sync_offset,
                    title: data.title,
                    has_subtitles: data.has_subtitles || false
                };
                this._lastFetchUri = null; // Reset to allow re-fetch
                return this._currentVideo;
            } else {
                console.warn("[VideoManager] Sync failed:", data);
                return null;
            }
        } catch (err) {
            console.error("[VideoManager] Sync error:", err);
            return null;
        }
    },

    /**
     * Search for top videos matching a track
     * @param {Object} trackInfo - { title, artist }
     * @param {number} limit - Number of results
     * @returns {Promise<Array>} - Array of video results
     */
    async searchVideos(trackInfo, limit = 3) {
        // Input validation (Operational Rule #1)
        if (!trackInfo?.title || !trackInfo?.artist) {
            console.warn("[VideoManager] searchVideos: Invalid trackInfo");
            return [];
        }
        if (typeof limit !== 'number' || limit < 1) limit = 3;

        const serverUrl = this.getServerUrl();

        try {
            const res = await fetch(
                `${serverUrl}/search?track=${encodeURIComponent(trackInfo.title)}&artist=${encodeURIComponent(trackInfo.artist)}&limit=${limit}`
            );

            if (res.ok) {
                const data = await res.json();
                return data.results || [];
            }
        } catch (e) {
            console.warn("[VideoManager] Failed to search videos:", e);
        }

        return [];
    },

    /**
     * Reset the video state
     */
    reset() {
        this._lastFetchUri = null;
        this._currentVideo = null;
        console.log("[VideoManager] State reset");
    },

    /**
     * Get current video data
     * @returns {Object|null}
     */
    getCurrentVideo() {
        return this._currentVideo;
    },

    /**
     * Set video directly (for manual selection)
     * @param {Object} videoData - { video_id, sync_offset, title, has_subtitles }
     */
    setVideo(videoData) {
        this._currentVideo = videoData;
        this._lastFetchUri = null; // Reset URI so next track can fetch
    }
};
