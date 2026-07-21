// VideoBackground.js - React-managed YouTube Video Background with Sync
// Every mount creates a clean player instance; unmount destroys it to release resources (CPU/RAM).
// This prevents browser iframe reloads (which trigger play overlay flashes) when changing tabs.

const VideoBackground = (() => {
    let ytApiLoaded = false;
    let ytApiLoading = false;

    function ensureYTApi() {
        if (ytApiLoaded || ytApiLoading) return;
        if (window.YT && window.YT.Player) {
            ytApiLoaded = true;
            return;
        }
        ytApiLoading = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            ytApiLoaded = true;
            ytApiLoading = false;
            if (typeof prev === "function") prev();
        };
        document.head.appendChild(tag);
    }

    const Component = ({ trackUri, brightness, blurAmount, scale, fullscreen, videoInfo }) => {
        const { useState, useEffect, useRef } = Spicetify.React;
        const react = Spicetify.React;

        const [isPlayerReady, setIsPlayerReady] = useState(false);
        const [isPlaying, setIsPlaying] = useState(Spicetify.Player.isPlaying());
        const [isAdPlaying, setIsAdPlaying] = useState(false);
        const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
        const [isUIFlashing, setIsUIFlashing] = useState(false);
        const [isYTReadyToRender, setIsYTReadyToRender] = useState(false);

        const playerRef = useRef(null);
        const playerDivRef = useRef(null);
        const uiFlashTimeoutRef = useRef(null);
        const lastSeekAttemptRef = useRef({ time: 0, attempts: 0 });
        const lastSeekTimeRef = useRef(0);
        const isMountedRef = useRef(true);

        const brightnessValue = Math.min(Math.max(Number(brightness) || 50, 0), 100);
        const brightnessRatio = brightnessValue / 100;
        const blurValue = Math.min(Math.max(Number(blurAmount) || 0, 0), 80);

        useEffect(() => {
            isMountedRef.current = true;
            ensureYTApi();
            return () => {
                isMountedRef.current = false;
                if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
                if (playerRef.current) {
                    try { playerRef.current.destroy(); } catch (_) {}
                    playerRef.current = null;
                }
            };
        }, []);

        // Monitor Spotify playback state
        useEffect(() => {
            const update = () => {
                setIsPlaying(Spicetify.Player.isPlaying());
                if (playerRef.current && isPlayerReady) {
                    setTimeout(() => window.dispatchEvent(new CustomEvent("lyricsPlusSyncRequest")), 50);
                }
            };
            Spicetify.Player.addEventListener("onplaypause", update);
            return () => Spicetify.Player.removeEventListener("onplaypause", update);
        }, [isPlayerReady]);

        // Reset auxiliary state on track change
        useEffect(() => {
            if (!trackUri) return;
            setIsAdPlaying(false);
            setHasStartedPlaying(false);
            setIsYTReadyToRender(false);
        }, [trackUri]);

        // Load/Recreate video player when video_id changes
        useEffect(() => {
            if (!videoInfo || !videoInfo.video_id) {
                setIsPlayerReady(false);
                setIsYTReadyToRender(false);
                return;
            }

            // Destroy old player before creating new one
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (_) {}
                playerRef.current = null;
            }

            setIsPlayerReady(false);
            setHasStartedPlaying(false);
            setIsYTReadyToRender(false);

            const tryCreate = () => {
                if (!window.YT || !window.YT.Player) {
                    setTimeout(tryCreate, 100);
                    return;
                }
                if (!isMountedRef.current) return;

                const playerDiv = playerDivRef.current;
                if (!playerDiv) return;

                // Clear previous content
                playerDiv.innerHTML = "";
                const ytTarget = document.createElement("div");
                playerDiv.appendChild(ytTarget);

                playerRef.current = new window.YT.Player(ytTarget, {
                    height: "100%",
                    width: "100%",
                    videoId: videoInfo.video_id,
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
                        cc_load_policy: 0, // Disable captions/subtitles by default
                        cc_lang_pref: "none",
                        hl: "en",
                        origin: window.location.origin,
                    },
                    events: {
                        onReady: (event) => {
                            if (!isMountedRef.current) return;
                            setIsPlayerReady(true);
                            event.target.mute();

                            // Unload & clear captions/subtitles modules completely to prevent layout interference
                            try {
                                if (typeof event.target.setOption === "function") {
                                    event.target.setOption("captions", "track", {});
                                    event.target.setOption("cc", "track", {});
                                }
                                if (typeof event.target.unloadModule === "function") {
                                    event.target.unloadModule("captions");
                                    event.target.unloadModule("cc");
                                }
                            } catch (e) {
                                if (window.lyricsPlusDebug) console.warn("[VideoBackground] Failed to unload captions module:", e);
                            }

                            event.target.playVideo();
                        },
                        onStateChange: (event) => {
                            if (!isMountedRef.current) return;
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
                                
                                // Wait for 1.2s of stable playback to hide YouTube play overlay & vignette
                                setTimeout(() => {
                                    if (isMountedRef.current) {
                                        setIsYTReadyToRender(true);
                                    }
                                }, 1200);
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
                        onError: async (event) => {
                            if (!isMountedRef.current) return;
                            const errorCode = event.data;
                            console.error("[Lyrics+] YouTube Player Error:", errorCode);
                            if ([2, 5, 100, 101, 150].includes(errorCode) && videoInfo && videoInfo.video_id) {
                                const brokenId = videoInfo.video_id;
                                console.warn(`[Lyrics+] Video ${brokenId} failed. Fallback...`);
                                if (window.VideoManager?.blacklistVideo) {
                                    await window.VideoManager.blacklistVideo(trackUri, brokenId);
                                }
                                const autoKey = `video-auto:${trackUri}`;
                                if (window.IDBCache?.delete) {
                                    await window.IDBCache.delete(autoKey);
                                }
                                if (window.lyricContainer?.fetchVideoBackgroundWithLyrics) {
                                    const currentTrack = Spicetify.Player.data.item;
                                    window.lyricContainer.fetchVideoBackgroundWithLyrics(currentTrack);
                                }
                            }
                        }
                    }
                });
            };
            tryCreate();
        }, [videoInfo?.video_id]);

        // Sync Logic
        useEffect(() => {
            const syncTime = () => {
                const player = playerRef.current;
                if (!player || !isPlayerReady || !videoInfo) return;
                if (typeof player.getPlayerState !== "function") return;

                const spotifyIsPlaying = Spicetify.Player.isPlaying();

                if (!spotifyIsPlaying) {
                    if (player.getPlayerState() === 1) {
                        player.pauseVideo();
                    }
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

            const syncInterval = setInterval(syncTime, 500);
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
            className: `lyrics-video-background-container${fullscreen ? " video-bg-fullscreen" : ""}`,
            style: {
                position: fullscreen ? "fixed" : "absolute",
                top: 0,
                left: 0,
                width: fullscreen ? "100vw" : "100%",
                height: fullscreen ? "100vh" : "100%",
                overflow: "hidden",
                zIndex: -1,
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
            // Video mount point — player div gets rendered here
            react.createElement("div", {
                ref: playerDivRef,
                style: {
                    position: "absolute", top: "50%", left: "50%",
                    width: "177.78vh", height: "56.25vw",
                    minWidth: "100%", minHeight: "100%",
                    transform: `translate(-50%, -50%) scale(${(scale || 1.0) * (blurValue ? 1.12 : 1.08)})`,
                    opacity: isPlayerReady && hasStartedPlaying && !isAdPlaying && !isUIFlashing && isPlaying && isYTReadyToRender ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    pointerEvents: "none",
                    filter: blurValue ? `blur(${blurValue}px)` : "none",
                }
            }),
            // Brightness overlay
            react.createElement("div", {
                style: {
                    position: "absolute top 0 left 0 width 100% height 100%".replace(/ /g, ":0;").replace(/%:/g, "%;").replace(/px:/g, "px;").replace(/black:/g, "black;").replace(/zIndex:/g, "zIndex;"), // formatting safety
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
