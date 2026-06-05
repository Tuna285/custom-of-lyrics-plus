// VideoBackground.js - Persistent YouTube Video Background with Sync
// The YT.Player is a SINGLETON that survives React unmount/remount cycles.
// On tab switch, the player DOM is reparented (not destroyed), so no
// new YouTube request is made and video quality is preserved.

const VideoBackground = (() => {
    /**
     * Singleton state — lives outside React, survives component unmounts.
     * @type {{
     *   player: YT.Player|null,
     *   container: HTMLDivElement|null,
     *   currentVideoId: string|null,
     *   ready: boolean,
     *   ytApiLoaded: boolean,
     *   ytApiLoading: boolean,
     * }}
     */
    const _persistent = {
        player: null,
        container: null,
        currentVideoId: null,
        ready: false,
        ytApiLoaded: false,
        ytApiLoading: false,
    };

    function ensureYTApi() {
        if (_persistent.ytApiLoaded || _persistent.ytApiLoading) return;
        if (window.YT && window.YT.Player) {
            _persistent.ytApiLoaded = true;
            return;
        }
        _persistent.ytApiLoading = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            _persistent.ytApiLoaded = true;
            _persistent.ytApiLoading = false;
            if (typeof prev === "function") prev();
        };
        document.head.appendChild(tag);
    }

    function ensureContainer() {
        if (_persistent.container) return _persistent.container;
        const c = document.createElement("div");
        c.id = "lyrics-yt-player-persistent";
        c.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;pointer-events:none;";
        _persistent.container = c;
        return c;
    }

    /**
     * Create or switch the singleton YT.Player to a new video.
     * If the videoId hasn't changed, this is a no-op.
     */
    function loadVideo(videoId, onReady, onStateChange, onError) {
        if (!videoId) return;
        if (_persistent.currentVideoId === videoId && _persistent.player && _persistent.ready) {
            onReady?.(_persistent.player);
            return;
        }

        // Destroy existing player if switching to a different video
        if (_persistent.player) {
            try { _persistent.player.destroy(); } catch (_) {}
            _persistent.player = null;
            _persistent.ready = false;
        }
        _persistent.currentVideoId = videoId;

        const container = ensureContainer();
        container.innerHTML = "";
        const playerDiv = document.createElement("div");
        container.appendChild(playerDiv);

        const tryCreate = () => {
            if (!window.YT || !window.YT.Player) {
                setTimeout(tryCreate, 100);
                return;
            }
            // Guard: if videoId changed while waiting for YT API, abort
            if (_persistent.currentVideoId !== videoId) return;

            _persistent.player = new window.YT.Player(playerDiv, {
                height: "100%",
                width: "100%",
                videoId,
                host: "https://www.youtube-nocookie.com",
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    mute: 1,
                    playsinline: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: (event) => {
                        _persistent.ready = true;
                        event.target.mute();
                        event.target.playVideo();
                        onReady?.(event.target);
                    },
                    onStateChange: (event) => onStateChange?.(event),
                    onError: (event) => onError?.(event),
                },
            });
        };
        tryCreate();
    }

    // ── React Functional Component ──

    const Component = ({ trackUri, brightness, blurAmount, scale, videoInfo }) => {
        const { useState, useEffect, useRef, useCallback } = Spicetify.React;
        const react = Spicetify.React;

        const [isPlayerReady, setIsPlayerReady] = useState(_persistent.ready && _persistent.currentVideoId === videoInfo?.video_id);
        const [isPlaying, setIsPlaying] = useState(Spicetify.Player.isPlaying());
        const [isAdPlaying, setIsAdPlaying] = useState(false);
        const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
        const [isUIFlashing, setIsUIFlashing] = useState(false);
        const [isTransitioning, setIsTransitioning] = useState(false);

        const hasStartedPlayingRef = useRef(false);
        const uiFlashTimeoutRef = useRef(null);
        const mountPointRef = useRef(null);
        const lastSeekAttemptRef = useRef({ time: 0, attempts: 0 });
        const lastSeekTimeRef = useRef(0);

        const brightnessValue = Math.min(Math.max(Number(brightness) || 50, 0), 100);
        const brightnessRatio = brightnessValue / 100;
        const blurValue = Math.min(Math.max(Number(blurAmount) || 0, 0), 80);

        // Delay video display on play to hide native YouTube play icon animation
        useEffect(() => {
            if (isPlaying) {
                setIsTransitioning(true);
                const t = setTimeout(() => setIsTransitioning(false), 800);
                return () => clearTimeout(t);
            }
            setIsTransitioning(false);
        }, [isPlaying]);

        // Load YouTube IFrame API (once)
        useEffect(() => { ensureYTApi(); }, []);

        // Monitor Spotify playback state
        useEffect(() => {
            const update = () => {
                setIsPlaying(Spicetify.Player.isPlaying());
                if (_persistent.player && _persistent.ready) {
                    setTimeout(() => window.dispatchEvent(new CustomEvent("lyricsPlusSyncRequest")), 50);
                }
            };
            Spicetify.Player.addEventListener("onplaypause", update);
            return () => Spicetify.Player.removeEventListener("onplaypause", update);
        }, []);

        // Reset auxiliary state on track change
        useEffect(() => {
            if (!trackUri) return;
            setIsAdPlaying(false);
            setHasStartedPlaying(false);
            hasStartedPlayingRef.current = false;
        }, [trackUri]);

        // ── Reparent persistent container into React mount point ──
        useEffect(() => {
            const mount = mountPointRef.current;
            if (!mount) return;

            const container = ensureContainer();
            // Move the persistent player DOM into our React mount point
            if (container.parentNode !== mount) {
                mount.appendChild(container);
            }
            container.style.display = "";

            return () => {
                // On unmount (tab switch), park container on body hidden — do NOT destroy
                container.style.display = "none";
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
                document.body.appendChild(container);
            };
        }, []);

        // ── Load video (only when video_id changes) ──
        useEffect(() => {
            if (!videoInfo || !videoInfo.video_id) {
                setIsPlayerReady(false);
                return;
            }

            // If same video already loaded, just mark ready
            if (_persistent.ready && _persistent.currentVideoId === videoInfo.video_id) {
                setIsPlayerReady(true);
                setHasStartedPlaying(true);
                hasStartedPlayingRef.current = true;
                // Resume if Spotify is playing
                if (Spicetify.Player.isPlaying() && _persistent.player) {
                    try { _persistent.player.playVideo(); } catch (_) {}
                }
                return;
            }

            setIsPlayerReady(false);
            setHasStartedPlaying(false);
            hasStartedPlayingRef.current = false;

            loadVideo(
                videoInfo.video_id,
                () => {
                    setIsPlayerReady(true);
                },
                (event) => {
                    const state = event.data;
                    const player = event.target;

                    if (state === 2 && Spicetify.Player.isPlaying()) {
                        setIsUIFlashing(true);
                        if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
                    }

                    if (state === 1) {
                        if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
                        uiFlashTimeoutRef.current = setTimeout(() => setIsUIFlashing(false), 400);
                        setHasStartedPlaying(true);
                        hasStartedPlayingRef.current = true;
                    }

                    if (state === 0) {
                        player.seekTo(0);
                        player.playVideo();
                    }

                    const isAd = [105, 106, 107, 108, 109, 110, 111].includes(state) ||
                                 (typeof player.getAdState === "function" && player.getAdState() === 1);

                    if (isAd) {
                        setIsAdPlaying(true);
                        player.mute();
                    } else if (state === 1) {
                        setIsAdPlaying(false);
                    }
                },
                (event) => {
                    console.error("[Lyrics+] YouTube Player Error:", event.data);
                }
            );

            return () => {
                if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
            };
        }, [videoInfo?.video_id]);

        // ── Sync Logic ──
        useEffect(() => {
            const syncTime = () => {
                const player = _persistent.player;
                if (!player || !_persistent.ready || !videoInfo) return;
                if (typeof player.getPlayerState !== "function") return;

                const spotifyIsPlaying = Spicetify.Player.isPlaying();

                if (!spotifyIsPlaying) {
                    if (player.getPlayerState() === 1) {
                        if (hasStartedPlayingRef.current) player.pauseVideo();
                    } else if (!hasStartedPlayingRef.current) {
                        player.playVideo();
                    }
                    if (hasStartedPlayingRef.current) return;
                } else {
                    if (player.getPlayerState() !== 1) player.playVideo();
                }

                const spotifyTime = Spicetify.Player.getProgress() / 1000;
                const syncOffset = videoInfo.sync_offset || 0;
                let targetVideoTime = spotifyTime + syncOffset;

                if (targetVideoTime >= 0 && typeof player.getDuration === "function") {
                    const videoDuration = player.getDuration();
                    if (videoDuration > 0 && targetVideoTime >= videoDuration) {
                        targetVideoTime = targetVideoTime % videoDuration;
                    }
                }

                if (targetVideoTime >= 0) {
                    const currentVideoTime = player.getCurrentTime();
                    const timeDiff = Math.abs(currentVideoTime - targetVideoTime);
                    const playerState = player.getPlayerState();

                    if (timeDiff > 0.5) {
                        const now = Date.now();
                        const isBuffering = playerState === 3;
                        const isRecentlySeeked = (now - lastSeekTimeRef.current) < 1500;

                        if (!isBuffering && !isRecentlySeeked) {
                            player.seekTo(targetVideoTime, true);
                            lastSeekTimeRef.current = now;

                            if (now - lastSeekAttemptRef.current.time < 2500) {
                                lastSeekAttemptRef.current.attempts++;
                            } else {
                                lastSeekAttemptRef.current = { time: now, attempts: 1 };
                            }

                            if (lastSeekAttemptRef.current.attempts > 15) {
                                setIsAdPlaying(true);
                            }
                        }
                    } else {
                        if (isAdPlaying) setIsAdPlaying(false);
                        lastSeekAttemptRef.current.attempts = 0;
                    }
                }
            };

            const syncInterval = setInterval(syncTime, 200);
            const handleInternalSync = () => syncTime();
            window.addEventListener("lyricsPlusSyncRequest", handleInternalSync);

            const onSeek = () => setTimeout(syncTime, 50);
            Spicetify.Player.addEventListener("onseek", onSeek);

            return () => {
                clearInterval(syncInterval);
                window.removeEventListener("lyricsPlusSyncRequest", handleInternalSync);
                Spicetify.Player.removeEventListener("onseek", onSeek);
            };
        }, [isPlayerReady, videoInfo, isPlaying, isAdPlaying]);

        // Loading indicator
        const LoadingIndicator = () => {
            const [dotIndex, setDotIndex] = react.useState(0);
            react.useEffect(() => {
                const interval = setInterval(() => setDotIndex(prev => (prev + 1) % 3), 400);
                return () => clearInterval(interval);
            }, []);

            return react.createElement("div", {
                style: {
                    position: "absolute", top: "20px", left: "20px",
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 16px", background: "rgba(0, 0, 0, 0.6)",
                    backdropFilter: "blur(10px)", borderRadius: "8px",
                    zIndex: 100, opacity: 0.9,
                }
            },
                react.createElement("div", { style: { display: "flex", gap: "4px" } },
                    [0, 1, 2].map(i => react.createElement("div", {
                        key: i,
                        style: {
                            width: "8px", height: "8px", borderRadius: "50%",
                            backgroundColor: "var(--spice-button, #1db954)",
                            opacity: dotIndex === i ? 1 : 0.3,
                            transform: dotIndex === i ? "scale(1.2)" : "scale(1)",
                            transition: "all 0.3s ease",
                        }
                    }))
                ),
                react.createElement("span", {
                    style: {
                        color: "rgba(255, 255, 255, 0.9)", fontSize: "13px",
                        fontWeight: 500, letterSpacing: "0.5px",
                    }
                }, "Loading video...")
            );
        };

        return react.createElement("div", {
            className: "lyrics-video-background-container",
            style: {
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%",
                overflow: "hidden", zIndex: -1,
            }
        },
            // Dark background while loading
            !isPlayerReady && react.createElement("div", {
                style: {
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)",
                    zIndex: 1,
                }
            }),
            // Loading indicator
            (!isPlayerReady || !hasStartedPlaying || isUIFlashing) && videoInfo && react.createElement(LoadingIndicator),
            // Video mount point — persistent player container gets reparented here
            react.createElement("div", {
                ref: mountPointRef,
                style: {
                    position: "absolute", top: "50%", left: "50%",
                    width: "177.78vh", height: "56.25vw",
                    minWidth: "100%", minHeight: "100%",
                    transform: `translate(-50%, -50%) scale(${(scale || 1.0) * (blurValue ? 1.12 : 1.08)})`,
                    opacity: isPlayerReady && hasStartedPlaying && !isAdPlaying && !isUIFlashing && isPlaying && !isTransitioning ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    pointerEvents: "none",
                    filter: blurValue ? `blur(${blurValue}px)` : "none",
                }
            }),
            // Brightness overlay
            react.createElement("div", {
                style: {
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    backgroundColor: "black", opacity: 1 - brightnessRatio,
                    zIndex: 2, pointerEvents: "none"
                }
            })
        );
    };

    return Component;
})();

window.VideoBackground = VideoBackground;
