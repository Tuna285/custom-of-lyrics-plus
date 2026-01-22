// VideoBackground.js - YouTube Video Background with Sync

const VideoBackground = ({ trackUri, brightness, blurAmount, scale, videoInfo }) => {
    const { useState, useEffect, useRef, useCallback } = Spicetify.React;
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(Spicetify.Player.isPlaying());
    const [isAdPlaying, setIsAdPlaying] = useState(false); // Hide video during ads
    const containerRef = useRef(null);
    const playerRef = useRef(null);
    const lastSeekAttemptRef = useRef({ time: 0, attempts: 0 });
    
    const brightnessValue = Math.min(Math.max(Number(brightness) || 50, 0), 100);
    const brightnessRatio = brightnessValue / 100;
    const blurValue = Math.min(Math.max(Number(blurAmount) || 0, 0), 80);

    // Load YouTube IFrame API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, []);

    // Monitor Spotify Playback State
    useEffect(() => {
        const updateState = () => {
            setIsPlaying(Spicetify.Player.isPlaying());
            // Immediate sync attempt on play/pause
            if (playerRef.current && isPlayerReady) {
                 // Small delay for Spotify state to propagate
                 setTimeout(() => {
                    const syncEvent = new CustomEvent('lyricsPlusSyncRequest');
                    window.dispatchEvent(syncEvent);
                 }, 50);
            }
        };
        Spicetify.Player.addEventListener("onplaypause", updateState);
        return () => Spicetify.Player.removeEventListener("onplaypause", updateState);
    }, [isPlayerReady]);

    // Handle track changes
    useEffect(() => {
        if (!trackUri) return;

        // Note: Player destruction is handled by videoInfo change effect.
        // We only reset auxiliary state here to prevent black screen on lyrics load.
        setIsAdPlaying(false);
    }, [trackUri]);

    // Initialize Player when videoInfo is available
    useEffect(() => {
        if (!videoInfo || !videoInfo.video_id) {
             // CLEANUP: If no video info (or cleared by pre-emptive logic), destroy player
             if (containerRef.current) containerRef.current.innerHTML = '';
             if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) {}
                playerRef.current = null;
            }
            setIsPlayerReady(false);
            return;
        }

        if (!containerRef.current) return;

        // Cleanup previous
        if (playerRef.current) {
            try { playerRef.current.destroy(); } catch (e) {}
            playerRef.current = null;
        }

        const initPlayer = () => {
            if (!window.YT || !window.YT.Player) {
                setTimeout(initPlayer, 100);
                return;
            }

            // Create fresh container
            const playerDiv = document.createElement('div');
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(playerDiv);

            const newPlayer = new window.YT.Player(playerDiv, {
                height: "100%",
                width: "100%",
                videoId: videoInfo.video_id,
                host: "https://www.youtube-nocookie.com", // Proactive ad-blocking
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    mute: 1,
                    playlist: videoInfo.video_id,
                    loop: 1,
                    origin: window.location.origin,
                    adformat: "0_0",
                    suppress_ads: 1,
                },
                events: {
                    onReady: (event) => {
                        playerRef.current = event.target;
                        setIsPlayerReady(true);
                        event.target.mute();
                        event.target.playVideo();
                        console.log("[Lyrics+] YouTube Player Ready:", videoInfo.video_id);
                    },
                    onError: (event) => {
                        console.error("[Lyrics+] YouTube Player Error:", event.data);
                    },
                    onStateChange: (event) => {
                        const state = event.data;
                        const player = event.target;
                        
                        // Detect ads via states or getAdState
                        const isAd = [105, 106, 107, 108, 109, 110, 111].includes(state) || 
                                     (typeof player.getAdState === 'function' && player.getAdState() === 1);
                        
                        if (isAd) {
                            if (!isAdPlaying) {
                                console.log("[Lyrics+] Ad detected (state) - hiding video");
                                setIsAdPlaying(true);
                            }
                            player.mute();
                        } else if (state === 1 && isAdPlaying) {
                            // Only restore if we are sure it's playing and not an ad
                            console.log("[Lyrics+] Video playing - showing video");
                            setIsAdPlaying(false);
                        }
                    }
                },
            });
            playerRef.current = newPlayer;
        };



        initPlayer();

        return () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) {}
                playerRef.current = null;
            }
        };
    }, [videoInfo?.video_id]); // Only reload if Video ID changes (not offset)

    // Sync Logic - Match video time to Spotify + lyrics offset
    // Also detect ads by checking if seekTo works
    useEffect(() => {
        const syncTime = () => {
            const player = playerRef.current;
            if (!player || !isPlayerReady || !videoInfo) return;
            if (typeof player.getPlayerState !== 'function') return;

            const spotifyIsPlaying = Spicetify.Player.isPlaying();

            // Pause/Play sync
            if (!spotifyIsPlaying) {
                if (player.getPlayerState() === 1) {
                    player.pauseVideo();
                }
                return;
            } else {
                if (player.getPlayerState() !== 1) {
                    player.playVideo();
                }
            }

            // Time sync - use pre-calculated offset
            const spotifyTime = Spicetify.Player.getProgress() / 1000;
            const syncOffset = videoInfo.sync_offset || 0;
            let targetVideoTime = spotifyTime + syncOffset;

            // Handle video looping
            if (targetVideoTime >= 0 && typeof player.getDuration === 'function') {
                const videoDuration = player.getDuration();
                if (videoDuration > 0 && targetVideoTime >= videoDuration) {
                    targetVideoTime = targetVideoTime % videoDuration;
                }
            }

            // Seek and detect ads
            if (targetVideoTime >= 0) {
                const currentVideoTime = player.getCurrentTime();
                const timeDiff = Math.abs(currentVideoTime - targetVideoTime);
                
                if (timeDiff > 0.5) {
                    player.seekTo(targetVideoTime, true);
                    
                    const now = Date.now();
                    if (now - lastSeekAttemptRef.current.time < 2000) {
                        lastSeekAttemptRef.current.attempts++;
                    } else {
                        lastSeekAttemptRef.current = { time: now, attempts: 1 };
                    }
                    
                    if (lastSeekAttemptRef.current.attempts > 20) {
                        if (!isAdPlaying) {
                            console.log("[Lyrics+] Ad detected (seek stuck) - Diff:", timeDiff);
                            setIsAdPlaying(true);
                        }
                    }
                } else {
                    if (isAdPlaying) {
                        console.log("[Lyrics+] Ad finished - showing video");
                        setIsAdPlaying(false);
                    }
                    lastSeekAttemptRef.current.attempts = 0;
                }
            }
        };

        const syncInterval = setInterval(syncTime, 200);
        
        // Listen for internal sync requests
        const handleInternalSync = () => syncTime();
        window.addEventListener('lyricsPlusSyncRequest', handleInternalSync);
        
        // Immediate sync on manual seek
        const onSeek = () => {
             // Delay slightly to let Spotify state settle
             setTimeout(syncTime, 50);
        };
        Spicetify.Player.addEventListener("onseek", onSeek);

        return () => {
            clearInterval(syncInterval);
            window.removeEventListener('lyricsPlusSyncRequest', handleInternalSync);
            Spicetify.Player.removeEventListener("onseek", onSeek);
        };
    }, [isPlayerReady, videoInfo, isPlaying, isAdPlaying]);

    // Loading indicator component (dots animation)
    const LoadingIndicator = () => {
        const [dotIndex, setDotIndex] = Spicetify.React.useState(0);
        
        Spicetify.React.useEffect(() => {
            const interval = setInterval(() => {
                setDotIndex(prev => (prev + 1) % 3);
            }, 400);
            return () => clearInterval(interval);
        }, []);
        
        return Spicetify.React.createElement("div", {
            style: {
                position: "absolute",
                top: "20px",
                left: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: "8px",
                zIndex: 100,
                opacity: 0.9,
            }
        },
            // Animated dots
            Spicetify.React.createElement("div", {
                style: { display: "flex", gap: "4px" }
            },
                [0, 1, 2].map(i => Spicetify.React.createElement("div", {
                    key: i,
                    style: {
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "var(--spice-button, #1db954)",
                        opacity: dotIndex === i ? 1 : 0.3,
                        transform: dotIndex === i ? "scale(1.2)" : "scale(1)",
                        transition: "all 0.3s ease",
                    }
                }))
            ),
            // Text
            Spicetify.React.createElement("span", {
                style: {
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: "13px",
                    fontWeight: 500,
                    letterSpacing: "0.5px",
                }
            }, "Loading video...")
        );
    };

    // Render
    return Spicetify.React.createElement("div", {
        className: "lyrics-video-background-container",
        style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            zIndex: -1,
        }
    },
        // Loading overlay - show dark background while video loads
        !isPlayerReady && Spicetify.React.createElement("div", {
            style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)",
                zIndex: 1,
            }
        }),
        // Loading indicator
        !isPlayerReady && videoInfo && Spicetify.React.createElement(LoadingIndicator),
        // Video container - hide during ads
        Spicetify.React.createElement("div", {
            ref: containerRef,
            style: {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "177.78vh", // 16:9
                height: "56.25vw",
                minWidth: "100%",
                minHeight: "100%",
                transform: `translate(-50%, -50%) scale(${scale || (blurValue ? 1.05 : 1)})`,
                opacity: isPlayerReady && !isAdPlaying ? 1 : 0, // Keep visible when paused, hide during ads
                transition: "opacity 0.5s ease",
                pointerEvents: "none",
                filter: blurValue ? `blur(${blurValue}px)` : "none",
            }
        }),
        // Brightness overlay
        Spicetify.React.createElement("div", {
            style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "black",
                opacity: 1 - brightnessRatio,
                zIndex: 2,
                pointerEvents: "none"
            }
        })
    );
};

window.VideoBackground = VideoBackground;
