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

    const sendLiveLog = () => {};

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
        const currentVideoIdRef = useRef(null);
        const uiFlashTimeoutRef = useRef(null);
        const lastSeekAttemptRef = useRef({ time: 0, attempts: 0 });
        const lastSeekTimeRef = useRef(0);
        const needsInitialSyncRef = useRef(true);
        const isMountedRef = useRef(true);
        const isPlayerReadyRef = useRef(false);
        const hasStartedPlayingRef = useRef(false);
        const tryCreateRef = useRef(null);
        const isAdPlayingRef = useRef(false);
        const bypassAdAttemptsRef = useRef(0);
        const isRecreatingRef = useRef(false);
        const adProgressCheckRef = useRef({ startMediaTime: -1, startWallTime: 0, lastCurrent: -1 });
        const adHideTimeoutRef = useRef(null);
        const fallbackInProgressRef = useRef(false);
        const watchdogTimerRef = useRef(null);
        const videoInfoRef = useRef(videoInfo);
        videoInfoRef.current = videoInfo;
        const trackUriRef = useRef(trackUri);
        trackUriRef.current = trackUri;
        const lastSpotifyProgressRef = useRef(0);

        const setPlayerReadyState = (val) => {
            isPlayerReadyRef.current = val;
            setIsPlayerReady(val);
        };

        const setStartedPlayingState = (val) => {
            hasStartedPlayingRef.current = val;
            setHasStartedPlaying(val);
        };

        const setAdPlayingState = (val) => {
            isAdPlayingRef.current = val;
            setIsAdPlaying(val);
            if (adHideTimeoutRef.current) {
                clearTimeout(adHideTimeoutRef.current);
                adHideTimeoutRef.current = null;
            }
            if (val) {
                // Safety valve: never allow Loading video... to get stuck indefinitely
                adHideTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current && isAdPlayingRef.current) {
                        isAdPlayingRef.current = false;
                        setIsAdPlaying(false);
                        setPlayerReadyState(true);
                        setStartedPlayingState(true);
                        setIsYTReadyToRender(true);
                    }
                }, 6000);
            }
        };

        const brightnessValue = Math.min(Math.max(Number(brightness) || 50, 0), 100);
        const brightnessRatio = brightnessValue / 100;
        const blurValue = Math.min(Math.max(Number(blurAmount) || 0, 0), 80);

        useEffect(() => {
            isMountedRef.current = true;
            ensureYTApi();
            return () => {
                isMountedRef.current = false;
                if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
                if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
                if (adHideTimeoutRef.current) clearTimeout(adHideTimeoutRef.current);
                if (playerRef.current) {
                    try { playerRef.current.destroy(); } catch (_) {}
                    playerRef.current = null;
                }
            };
        }, []);

        const checkPlayerIsAd = (player, state) => {
            if (!player || !isPlayerReadyRef.current) return false;
            try {
                if (state !== undefined && [105, 106, 107, 108, 109, 110, 111].includes(state)) return true;
                if (typeof player.getAdState === "function" && player.getAdState() === 1) return true;

                const videoData = typeof player.getVideoData === "function" ? player.getVideoData() : null;
                if (videoData?.isAd) return true;

                const progressState = player.playerInfo?.progressState;
                if (progressState) {
                    if (progressState.allowSeeking === true) {
                        adProgressCheckRef.current = { startMediaTime: -1, startWallTime: 0, lastCurrent: -1 };
                        return false;
                    }
                    // In YouTube's IFrame API, pre-roll ads play while playerState is -1 (unstarted) with allowSeeking: false and current > 0.3
                    const pState = state !== undefined ? state : (typeof player.getPlayerState === "function" ? player.getPlayerState() : -1);
                    if (progressState.allowSeeking === false && (progressState.current || 0) > 0.3 && pState === -1) {
                        return true;
                    }
                }
            } catch (_) {}
            return false;
        };

        const triggerCandidateFallback = async (badVideoId) => {
            if (fallbackInProgressRef.current || !isMountedRef.current) return;
            fallbackInProgressRef.current = true;
            console.warn(`[Lyrics+] Video ${badVideoId} cannot be embedded. Switching to next candidate...`);

            try {
                const currentTrack = Spicetify.Player.data?.item;
                const trackInfo = window.lyricContainer?.infoFromTrack
                    ? window.lyricContainer.infoFromTrack(currentTrack)
                    : null;
                const vm = window.VideoManager || window.LyricsPlus?.VideoManager;
                const activeUri = trackUriRef.current || videoInfoRef.current?.uri;
                if (trackInfo && (!activeUri || trackInfo.uri === activeUri) && vm?.nextCandidate) {
                    const nextVideo = await vm.nextCandidate(trackInfo);
                    if (nextVideo && window.lyricContainer) {
                        window.lyricContainer.setState({ videoBackground: nextVideo });
                    }
                }
            } catch (err) {
                console.error("[Lyrics+] Candidate fallback error:", err);
            } finally {
                setTimeout(() => {
                    fallbackInProgressRef.current = false;
                }, 2000);
            }
        };

        const abortAdInPlace = () => {
            if (!isMountedRef.current || isRecreatingRef.current) return;
            const player = playerRef.current;
            const activeVideoId = currentVideoIdRef.current || videoInfoRef.current?.video_id;
            if (!player || !activeVideoId || typeof player.cueVideoById !== "function") return;
            if (bypassAdAttemptsRef.current >= 3) return;

            isRecreatingRef.current = true;
            bypassAdAttemptsRef.current += 1;
            adProgressCheckRef.current = { startMediaTime: -1, startWallTime: 0, lastCurrent: -1 };
            setAdPlayingState(true);
            console.log(`[Lyrics+] Ad detected (${bypassAdAttemptsRef.current}/3). Aborting ad in-place via cueVideoById...`);

            try {
                const spotifyTime = (Spicetify.Player.getProgress() || 0) / 1000;
                const syncOffset = videoInfoRef.current?.sync_offset || 0;
                const resumeTime = Math.max(1, Math.floor(spotifyTime + syncOffset));
                player.cueVideoById({
                    videoId: activeVideoId,
                    startSeconds: resumeTime
                });
            } catch (_) {}

            setTimeout(() => {
                isRecreatingRef.current = false;
                if (!isMountedRef.current || !playerRef.current) return;
                try {
                    playerRef.current.mute?.();
                    if (Spicetify.Player.isPlaying()) {
                        playerRef.current.playVideo?.();
                    }
                } catch (_) {}
            }, 500);
        };

        const handleAdDetected = () => {
            if (!isMountedRef.current || isRecreatingRef.current) return;
            try {
                playerRef.current?.mute?.();
                if (typeof playerRef.current?.skipAd === "function") {
                    playerRef.current.skipAd();
                }
            } catch (_) {}

            if (!isAdPlayingRef.current) {
                setAdPlayingState(true);
            }
            if (bypassAdAttemptsRef.current < 3) {
                abortAdInPlace();
            }
        };

        const handleAdEnded = () => {
            if (!isMountedRef.current) return;
            adProgressCheckRef.current = { startMediaTime: -1, startWallTime: 0, lastCurrent: -1 };
            if (isAdPlayingRef.current) {
                setAdPlayingState(false);
                setPlayerReadyState(true);
                setStartedPlayingState(true);
                setIsYTReadyToRender(true);
                lastSeekTimeRef.current = 0;
                setTimeout(() => {
                    if (isMountedRef.current) syncTime(true);
                }, 50);
            }
            try {
                if (playerRef.current && typeof playerRef.current.getPlaybackRate === "function") {
                    if (playerRef.current.getPlaybackRate() !== 1) {
                        playerRef.current.setPlaybackRate(1);
                    }
                }
            } catch (_) {}
        };

        // Monitor Spotify playback state
        useEffect(() => {
            const update = () => {
                const spotifyPlaying = Spicetify.Player.isPlaying();
                setIsPlaying(spotifyPlaying);
                if (playerRef.current && isPlayerReadyRef.current) {
                    if (spotifyPlaying) {
                        try { playerRef.current.playVideo(); } catch (_) {}
                    }
                    setTimeout(() => window.dispatchEvent(new CustomEvent("lyricsPlusSyncRequest")), 50);
                }
            };
            Spicetify.Player.addEventListener("onplaypause", update);
            return () => Spicetify.Player.removeEventListener("onplaypause", update);
        }, [isPlayerReady]);

        // Load or switch video when videoInfo changes
        useEffect(() => {
            if (!videoInfo || !videoInfo.video_id) {
                setPlayerReadyState(false);
                setIsYTReadyToRender(false);
                setStartedPlayingState(false);
                currentVideoIdRef.current = null;
                return;
            }

            const targetVideoId = videoInfo.video_id;

            // Fast Path: Reuse existing player iframe with loadVideoById (10x faster, no black flash)
            if (playerRef.current && typeof playerRef.current.loadVideoById === "function" && isPlayerReadyRef.current && !isRecreatingRef.current) {
                if (currentVideoIdRef.current !== targetVideoId) {
                    currentVideoIdRef.current = targetVideoId;
                    setStartedPlayingState(false);
                    setIsYTReadyToRender(false);
                    setAdPlayingState(false);
                    bypassAdAttemptsRef.current = 0;
                    adProgressCheckRef.current = { startMediaTime: -1, startWallTime: 0, lastCurrent: -1 };
                    try {
                        if (typeof playerRef.current.setPlaybackRate === "function") {
                            playerRef.current.setPlaybackRate(1);
                        }
                    } catch (_) {}
                    try {
                        needsInitialSyncRef.current = true;
                        const spotifyTime = (Spicetify.Player.getProgress() || 0) / 1000;
                        const syncOffset = videoInfo.sync_offset || 0;
                        const startSecs = Math.max(0, spotifyTime + syncOffset);
                        playerRef.current.loadVideoById({
                            videoId: targetVideoId,
                            startSeconds: startSecs
                        });
                        playerRef.current.mute();
                        if (Spicetify.Player.isPlaying()) {
                            playerRef.current.playVideo();
                        }
                    } catch (_) {}

                    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
                    watchdogTimerRef.current = setTimeout(() => {
                        if (!isMountedRef.current || isRecreatingRef.current) return;
                        const p = playerRef.current;
                        const state = p && typeof p.getPlayerState === "function" ? p.getPlayerState() : -1;
                        if (state === 1 || state === 3 || (p && typeof p.getCurrentTime === "function" && p.getCurrentTime() > 0.1)) {
                            setPlayerReadyState(true);
                            setStartedPlayingState(true);
                            setIsYTReadyToRender(true);
                            setIsUIFlashing(false);
                        } else if (typeof tryCreateRef.current === "function") {
                            tryCreateRef.current();
                        }
                    }, 3000);
                }
                return;
            }

            currentVideoIdRef.current = targetVideoId;
            setPlayerReadyState(false);
            setStartedPlayingState(false);
            setIsYTReadyToRender(false);
            setAdPlayingState(false);
            bypassAdAttemptsRef.current = 0;
            adProgressCheckRef.current = { startMediaTime: -1, startWallTime: 0, lastCurrent: -1 };

            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (_) {}
                playerRef.current = null;
            }

            const tryCreate = (startOverride) => {
                if (!window.YT || !window.YT.Player) {
                    setTimeout(() => tryCreate(startOverride), 100);
                    return;
                }
                if (!isMountedRef.current) return;

                const playerDiv = playerDivRef.current;
                if (!playerDiv) return;

                const activeVideoId = currentVideoIdRef.current || targetVideoId;
                if (!activeVideoId) return;

                playerDiv.innerHTML = "";
                const ytTarget = document.createElement("div");
                playerDiv.appendChild(ytTarget);

                needsInitialSyncRef.current = true;
                const spotifyTime = (Spicetify.Player.getProgress() || 0) / 1000;
                const syncOffset = videoInfoRef.current?.sync_offset || 0;
                const initialStart = typeof startOverride === "number"
                    ? startOverride
                    : Math.max(0, spotifyTime + syncOffset);

                if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
                watchdogTimerRef.current = setTimeout(() => {
                    if (!isMountedRef.current || isRecreatingRef.current) return;
                    const p = playerRef.current;
                    if (p && checkPlayerIsAd(p)) {
                        handleAdDetected();
                        return;
                    }
                    if (p && typeof p.playVideo === "function" && Spicetify.Player.isPlaying()) {
                        try {
                            p.mute?.();
                            p.playVideo();
                        } catch (_) {}
                    }
                    setPlayerReadyState(true);
                    setStartedPlayingState(true);
                    setIsYTReadyToRender(true);
                    setIsUIFlashing(false);
                }, 3500);

                playerRef.current = new window.YT.Player(ytTarget, {
                    height: "100%",
                    width: "100%",
                    videoId: activeVideoId,
                    host: CONFIG?.visual?.["video-host"] ? `https://${CONFIG.visual["video-host"]}` : "https://www.youtube.com",
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        disablekb: 1,
                        enablejsapi: 1,
                        fs: 0,
                        rel: 0,
                        iv_load_policy: 3,
                        modestbranding: 1,
                        mute: 1,
                        playsinline: 1,
                        cc_load_policy: 0,
                        cc_lang_pref: "none",
                        hl: "en",
                        origin: window.location.origin || "https://xpui.app.spotify.com",
                        start: Math.max(0, Math.floor(initialStart)),
                    },
                    events: {
                        onReady: (event) => {
                            if (!isMountedRef.current) return;
                            setPlayerReadyState(true);
                            event.target.mute();

                            try {
                                if (typeof event.target.getIframe === "function") {
                                    const iframe = event.target.getIframe();
                                    if (iframe) {
                                        iframe.style.pointerEvents = "none";
                                        iframe.tabIndex = -1;
                                        iframe.setAttribute("aria-hidden", "true");
                                    }
                                }
                            } catch (_) {}

                            try {
                                if (typeof event.target.setOption === "function") {
                                    event.target.setOption("captions", "track", {});
                                    event.target.setOption("cc", "track", {});
                                }
                                if (typeof event.target.unloadModule === "function") {
                                    event.target.unloadModule("captions");
                                    event.target.unloadModule("cc");
                                }
                            } catch (_) {}

                            if (Spicetify.Player.isPlaying()) {
                                event.target.playVideo();
                            }
                        },
                        onStateChange: (event) => {
                            if (!isMountedRef.current || isRecreatingRef.current) return;
                            const state = event.data;
                            const player = event.target;

                            setPlayerReadyState(true);

                            const isAd = checkPlayerIsAd(player, state);

                            if (isAd) {
                                handleAdDetected();
                                return;
                            } else {
                                handleAdEnded();
                            }

                            if (state === 2 && Spicetify.Player.isPlaying()) {
                                setIsUIFlashing(true);
                                if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
                            }

                            if (state === 1) {
                                if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
                                if (uiFlashTimeoutRef.current) clearTimeout(uiFlashTimeoutRef.current);
                                uiFlashTimeoutRef.current = setTimeout(() => setIsUIFlashing(false), 300);
                                setPlayerReadyState(true);
                                if (player.playerInfo?.progressState?.allowSeeking !== false && !isAdPlayingRef.current) {
                                    setStartedPlayingState(true);
                                    setIsYTReadyToRender(true);
                                    if (needsInitialSyncRef.current) {
                                        needsInitialSyncRef.current = false;
                                        lastSeekTimeRef.current = 0;
                                        setTimeout(() => {
                                            if (isMountedRef.current) syncTime(true);
                                        }, 60);
                                    }
                                }

                                try {
                                    if (typeof player.setOption === "function") {
                                        player.setOption("captions", "track", {});
                                        player.setOption("cc", "track", {});
                                    }
                                    if (typeof player.unloadModule === "function") {
                                        player.unloadModule("captions");
                                        player.unloadModule("cc");
                                        player.unloadModule("endscreen");
                                        player.unloadModule("annotations_module");
                                        player.unloadModule("iv");
                                    }
                                } catch (_) {}
                            }

                            if (state === 0) {
                                player.seekTo(0);
                                player.playVideo();
                            }
                        },
                        onError: async (event) => {
                            if (!isMountedRef.current) return;
                            const errorCode = event.data;
                            const brokenId = currentVideoIdRef.current || videoInfoRef.current?.video_id;
                            console.error("[Lyrics+] YouTube Player Error:", errorCode, "for video:", brokenId);
                            if ([5, 100, 101, 150].includes(errorCode) && brokenId) {
                                if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
                                console.warn(`[Lyrics+] Video ${brokenId} failed with code ${errorCode}. Switching to next candidate...`);
                                triggerCandidateFallback(brokenId);
                            }
                        }
                    }
                });
            };
            tryCreateRef.current = tryCreate;
            tryCreate();

            return () => {
                if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            };
        }, [videoInfo?.video_id]);

        // Immediate response when user adjusts sync offset in VideoSettingsModal
        const lastOffsetRef = useRef(videoInfo?.sync_offset);
        useEffect(() => {
            if (lastOffsetRef.current !== videoInfo?.sync_offset) {
                lastOffsetRef.current = videoInfo?.sync_offset;
                lastSeekTimeRef.current = 0;
                syncTime(true);
            }
        }, [videoInfo?.sync_offset]);

        // Sync & Watchdog Logic
        const syncTime = (force = false) => {
            const player = playerRef.current;
            const currentVideoInfo = videoInfoRef.current || videoInfo;
            if (!player || !isPlayerReadyRef.current || !currentVideoInfo || isRecreatingRef.current) return;
            if (typeof player.getPlayerState !== "function") return;

            const spotifyIsPlaying = Spicetify.Player.isPlaying();
            const playerState = player.getPlayerState();

            if (checkPlayerIsAd(player, playerState)) {
                handleAdDetected();
                if (playerState !== 1 && playerState !== 3) {
                    try { player.playVideo(); } catch (_) {}
                }
                return;
            } else if (isAdPlayingRef.current && player.playerInfo?.progressState?.allowSeeking === true) {
                handleAdEnded();
            }

            // 🛡️ Watchdog: If main video is playing (state === 1 and allowSeeking !== false), clear loading indicator
            if (typeof player.getCurrentTime === "function") {
                const allowSeeking = player.playerInfo?.progressState?.allowSeeking;
                if (playerState === 1 && allowSeeking !== false && !isAdPlayingRef.current && (!hasStartedPlayingRef.current || !isYTReadyToRender)) {
                    setPlayerReadyState(true);
                    setStartedPlayingState(true);
                    setIsYTReadyToRender(true);
                    setIsUIFlashing(false);
                }
                if ((playerState === 5 || playerState === -1) && spotifyIsPlaying) {
                    player.playVideo();
                }
            }

            if (!spotifyIsPlaying) {
                if (playerState === 1) {
                    player.pauseVideo();
                }
            } else {
                if (playerState !== 1 && playerState !== 3) {
                    player.playVideo();
                }
            }

            // Enforce strictly 1x playback rate
            if (typeof player.getPlaybackRate === "function") {
                if (player.getPlaybackRate() !== 1) {
                    try { player.setPlaybackRate(1); } catch (_) {}
                }
            }

            const currentSpotifySec = (Spicetify.Player.getProgress() || 0) / 1000;
            const lastSpotifySec = lastSpotifyProgressRef.current;
            lastSpotifyProgressRef.current = currentSpotifySec;

            // Detect user tua nhạc / scrubbing: normal 400ms tick moves by ~0.4s. If it jumps by > 1.2s, user sought!
            const isUserSeek = lastSpotifySec > 0 && Math.abs(currentSpotifySec - lastSpotifySec) > 1.2;
            const isForceSeek = Boolean(force || isUserSeek);

            const syncOffset = currentVideoInfo.sync_offset || 0;
            let targetVideoTime = Math.max(0, currentSpotifySec + syncOffset);

            if (typeof player.getDuration === "function") {
                const videoDuration = player.getDuration();
                const safeDuration = Math.max(1, videoDuration - 1.5);
                if (videoDuration > 0 && targetVideoTime >= safeDuration) {
                    targetVideoTime = targetVideoTime % safeDuration;
                }
            }

            if (typeof player.getCurrentTime === "function") {
                const currentVideoTime = player.getCurrentTime();
                const timeDiff = Math.abs(currentVideoTime - targetVideoTime);
                const shouldSeek = isForceSeek ? (timeDiff > 0.15) : (timeDiff > 0.65);

                if (shouldSeek) {
                    const now = Date.now();
                    const isBuffering = playerState === 3 || isAdPlayingRef.current;
                    const isRecentlySeeked = !isForceSeek && ((now - lastSeekTimeRef.current) < 2500);

                    if ((isForceSeek || !isBuffering) && !isRecentlySeeked) {
                        player.seekTo(targetVideoTime, true);
                        lastSeekTimeRef.current = now;

                        if (now - lastSeekAttemptRef.current.time < 2500) {
                            lastSeekAttemptRef.current.attempts++;
                        } else {
                            lastSeekAttemptRef.current = { time: now, attempts: 1 };
                        }
                    }
                } else {
                    lastSeekAttemptRef.current.attempts = 0;
                }
            }
        };

        useEffect(() => {
            const syncInterval = setInterval(() => syncTime(false), 400);
            const handleInternalSync = (e) => {
                lastSeekTimeRef.current = 0;
                if (typeof e?.detail?.offset === "number" && videoInfoRef.current) {
                    videoInfoRef.current.sync_offset = e.detail.offset;
                }
                syncTime(true);
            };
            window.addEventListener("lyricsPlusSyncRequest", handleInternalSync);

            const handleProgress = (event) => {
                const prog = typeof event?.data === "number" ? event.data : Spicetify.Player.getProgress();
                const progSec = (prog || 0) / 1000;
                if (lastSpotifyProgressRef.current > 0 && Math.abs(progSec - lastSpotifyProgressRef.current) > 1.2) {
                    lastSeekTimeRef.current = 0;
                    syncTime(true);
                }
            };
            Spicetify.Player.addEventListener("onprogress", handleProgress);

            const onMessage = (e) => {
                if (!isPlayerReadyRef.current || isRecreatingRef.current) return;
                try {
                    if (!e.data || typeof e.data !== "string" || !e.data.includes("infoDelivery")) return;
                    const parsed = JSON.parse(e.data);
                    if (parsed?.event === "infoDelivery" && parsed?.info) {
                        const info = parsed.info;
                        const progressState = info.progressState;
                        let isUnseekableAd = false;
                        if (progressState) {
                            if (progressState.allowSeeking === true) {
                                adProgressCheckRef.current = { startMediaTime: -1, startWallTime: 0, lastCurrent: progressState.current || 0 };
                            } else if (progressState.allowSeeking === false && progressState.duration > 0) {
                                const curr = progressState.current || 0;
                                const pState = playerRef.current?.getPlayerState?.();
                                // Pre-roll ads in YouTube embed run with playerState === -1 and allowSeeking === false while current advances
                                if (pState === -1 && curr > 0.3) {
                                    isUnseekableAd = true;
                                } else if (pState === 1 && curr > 0.1) {
                                    if (adProgressCheckRef.current.startMediaTime < 0 || curr < adProgressCheckRef.current.lastCurrent - 0.5) {
                                        adProgressCheckRef.current.startMediaTime = curr;
                                        adProgressCheckRef.current.startWallTime = Date.now();
                                    }
                                    adProgressCheckRef.current.lastCurrent = curr;
                                    if (
                                        adProgressCheckRef.current.startMediaTime < 1.5 &&
                                        curr - adProgressCheckRef.current.startMediaTime >= 1.2 &&
                                        Date.now() - adProgressCheckRef.current.startWallTime >= 1100
                                    ) {
                                        isUnseekableAd = true;
                                    }
                                }
                            }
                        }
                        const isAd = Boolean(
                            info.isAd ||
                            (info.adState !== undefined && info.adState > 0) ||
                            info.adVideoId ||
                            isUnseekableAd
                        );
                        if (isAd) {
                            handleAdDetected();
                        } else if (info.isAd === false || info.adState === 0 || (progressState && progressState.allowSeeking === true)) {
                            handleAdEnded();
                        }
                    }
                } catch (_) {}
            };
            window.addEventListener("message", onMessage);

            let resumeFollowupTimer = null;
            let lastResumeSyncAt = 0;
            const handleWindowResume = () => {
                if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
                const now = Date.now();
                if (now - lastResumeSyncAt < 150) return;
                lastResumeSyncAt = now;
                lastSeekTimeRef.current = 0;
                syncTime(true);
                if (resumeFollowupTimer) clearTimeout(resumeFollowupTimer);
                // Re-check once Chromium finishes un-throttling the iframe decoder
                resumeFollowupTimer = setTimeout(() => {
                    resumeFollowupTimer = null;
                    if (!isMountedRef.current) return;
                    const p = playerRef.current;
                    if (p && typeof p.getPlayerState === "function" && p.getPlayerState() === 3) return;
                    syncTime(true);
                }, 450);
            };
            document.addEventListener("visibilitychange", handleWindowResume);
            window.addEventListener("focus", handleWindowResume);
            window.addEventListener("pageshow", handleWindowResume);

            return () => {
                clearInterval(syncInterval);
                if (resumeFollowupTimer) clearTimeout(resumeFollowupTimer);
                window.removeEventListener("lyricsPlusSyncRequest", handleInternalSync);
                Spicetify.Player.removeEventListener("onprogress", handleProgress);
                window.removeEventListener("message", onMessage);
                document.removeEventListener("visibilitychange", handleWindowResume);
                window.removeEventListener("focus", handleWindowResume);
                window.removeEventListener("pageshow", handleWindowResume);
            };
        }, [isPlayerReady, videoInfo?.video_id, isPlaying]);

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

        const isFullscreenMode = Boolean(fullscreen);

        return react.createElement("div", {
            className: `lyrics-video-background-container${isFullscreenMode ? " video-bg-fullscreen" : ""}`,
            style: {
                position: isFullscreenMode ? "fixed" : "absolute",
                top: 0,
                left: 0,
                width: isFullscreenMode ? "100vw" : "100%",
                height: isFullscreenMode ? "100vh" : "100%",
                overflow: "hidden",
                zIndex: -1,
            }
        },
            // Dark background while player is initializing
            !isPlayerReady && react.createElement("div", {
                style: {
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)",
                    zIndex: 1,
                }
            }),
            // Loading indicator — automatically hidden as soon as video starts playing or watchdog triggers
            (!isPlayerReady || !hasStartedPlaying || isAdPlaying) && videoInfo && react.createElement(LoadingIndicator),
            // Video mount point — player div gets rendered here
            react.createElement("div", {
                ref: playerDivRef,
                style: {
                    position: "absolute", top: "50%", left: "50%",
                    width: "177.78vh", height: "56.25vw",
                    minWidth: "100%", minHeight: "100%",
                    transform: `translate(-50%, -50%) scale(${(scale || 1.0) * (blurValue ? 1.25 : 1.22)})`,
                    opacity: isPlayerReady && hasStartedPlaying && !isAdPlaying ? 1 : 0,
                    transition: "opacity 0.4s ease",
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
