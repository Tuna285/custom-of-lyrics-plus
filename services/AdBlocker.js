(function lyricsPlusAdBlocker() {
    // Advanced YouTube ad-blocking utility for Spicetify.
    // Ported and adapted from ivLyrics (VideoBackgroundDepend.js).

    const logPrefix = "[Lyrics+ Ad-Blocker]";

    const blockedPatterns = [
        /doubleclick\.net/i,
        /googlesyndication\.com/i,
        /googleads\.g\.doubleclick\.net/i,
        /pagead(?!.*youtube\.com\/iframe)/i,
        /pagead2\.googlesyndication\.com/i,
        /tpc\.googlesyndication\.com/i,
        /pubads\.g\.doubleclick\.net/i,
        /securepubads\.g\.doubleclick\.net/i,
        /gvt\d+\.com\/ads/i,
        /manifest\.googlevideo\.com\/api\/manifest\/ads/i,
        /googlevideo\.com\/videoplayback.*[&?](ctier|oad|adformat)=/i,
        /googlevideo\.com\/initplayback.*[&?](ctier|oad|adformat)=/i,
        /youtube\.com\/pagead/i,
        /youtube\.com\/ptracking/i,
        /youtube\.com\/api\/stats\/(ads|qoe|watchtime|playback)/i,
        /youtubei\/v1\/log_event/i,
        /youtubei\/v1\/player.*adformat/i,
        /youtube\.com\/get_video_info.*adformat/i,
        /youtube\.com\/yva_/i,
        /yt\d?\.ggpht\.com\/ad/i,
        /ytimg\.com\/.*ad/i,
        /yt3\.ggpht\.com\/ytc\/.*ad/i,
        /s0\.2mdn\.net/i,
        /gstaticadssl\.googleapis\.com/i
    ];

    const normalizeUrlString = (candidate) => {
        if (!candidate) return "";
        if (typeof candidate === "string") return candidate;
        if (candidate?.url) return candidate.url;
        if (candidate?.href) return candidate.href;
        return String(candidate);
    };

    const matchesAdUrl = (candidate) => {
        if (!candidate) return false;
        try {
            const ref = normalizeUrlString(candidate);
            if (!ref) return false;
            return blockedPatterns.some((pattern) => pattern.test(ref));
        } catch (err) {
            return false;
        }
    };

    const blockRequest = (label, url) => {
        // console.info(`${logPrefix} blocked ${label}: ${url}`);
    };

    const mergeFeatureFlags = (existing = "", forcedFlags = []) => {
        const map = new Map();
        const pushFlag = (flag) => {
            if (!flag) return;
            const [key, value = "true"] = flag.split("=");
            if (!key) return;
            map.set(key.trim(), value.trim());
        };
        existing.split("&").forEach(pushFlag);
        forcedFlags.forEach(pushFlag);
        return [...map.entries()].map(([key, value]) => `${key}=${value}`).join("&");
    };

    // --- Core Network Patches ---

    const patchFetch = () => {
        if (window.fetch.__lyricsPlusAdBlockWrapped) return;
        const originalFetch = window.fetch;
        window.fetch = function patchedFetch(resource, init) {
            const target = typeof resource === "string" ? resource : resource?.url;
            if (matchesAdUrl(target)) {
                blockRequest("fetch", target);
                return Promise.resolve(new Response("", { status: 204, statusText: "No Content" }));
            }
            return originalFetch.call(this, resource, init);
        };
        window.fetch.__lyricsPlusAdBlockWrapped = true;
    };

    const patchXHR = () => {
        if (XMLHttpRequest.prototype.__lyricsPlusAdBlockWrapped) return;
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
            this.__lyricsPlusAdBlockUrl = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function patchedSend(body) {
            if (matchesAdUrl(this.__lyricsPlusAdBlockUrl)) {
                blockRequest("xhr", this.__lyricsPlusAdBlockUrl);
                setTimeout(() => {
                    const errorEvent = new Event("error");
                    this.dispatchEvent(errorEvent);
                    if (typeof this.onerror === "function") {
                        this.onerror(errorEvent);
                    }
                }, 0);
                return undefined;
            }
            return originalSend.apply(this, arguments);
        };

        XMLHttpRequest.prototype.__lyricsPlusAdBlockWrapped = true;
    };

    const patchSendBeacon = () => {
        if (!navigator.sendBeacon || navigator.sendBeacon.__lyricsPlusAdBlockWrapped) return;
        const originalSendBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = (url, data) => {
            if (matchesAdUrl(url)) {
                blockRequest("beacon", url);
                return true;
            }
            return originalSendBeacon(url, data);
        };
        navigator.sendBeacon.__lyricsPlusAdBlockWrapped = true;
    };

    // --- DOM Prototypes Patches ---

    const patchScriptElements = () => {
        if (!window.HTMLScriptElement || HTMLScriptElement.prototype.__lyricsPlusAdBlockWrapped) return;
        const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
        if (descriptor?.set) {
            Object.defineProperty(HTMLScriptElement.prototype, "src", {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: descriptor.get,
                set(value) {
                    if (matchesAdUrl(value)) {
                        blockRequest("script", value);
                        descriptor.set.call(this, "");
                        return;
                    }
                    descriptor.set.call(this, value);
                }
            });
        }
        HTMLScriptElement.prototype.__lyricsPlusAdBlockWrapped = true;
    };

    const patchLinkElements = () => {
        if (!window.HTMLLinkElement || HTMLLinkElement.prototype.__lyricsPlusAdBlockWrapped) return;
        const descriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, "href");
        if (descriptor?.set) {
            Object.defineProperty(HTMLLinkElement.prototype, "href", {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: descriptor.get,
                set(value) {
                    if (matchesAdUrl(value)) {
                        blockRequest("link", value);
                        descriptor.set.call(this, "about:blank");
                        return;
                    }
                    descriptor.set.call(this, value);
                }
            });
        }
        HTMLLinkElement.prototype.__lyricsPlusAdBlockWrapped = true;
    };

    const patchImageElements = () => {
        if (!window.HTMLImageElement || HTMLImageElement.prototype.__lyricsPlusAdBlockWrapped) return;
        const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
        if (descriptor && descriptor.set) {
            Object.defineProperty(HTMLImageElement.prototype, "src", {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: descriptor.get,
                set(value) {
                    if (matchesAdUrl(value)) {
                        blockRequest("image", value);
                        descriptor.set.call(this, "");
                        return;
                    }
                    descriptor.set.call(this, value);
                }
            });
        }
        HTMLImageElement.prototype.__lyricsPlusAdBlockWrapped = true;
    };

    const patchIframeSetter = () => {
        if (!window.HTMLIFrameElement || HTMLIFrameElement.prototype.__lyricsPlusAdBlockWrapped) return;
        const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
        if (descriptor && descriptor.set) {
            Object.defineProperty(HTMLIFrameElement.prototype, "src", {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: descriptor.get,
                set(value) {
                    const sanitized = sanitizeYoutubeSrc(value);
                    if (sanitized && sanitized !== value) {
                        descriptor.set.call(this, sanitized);
                        return;
                    }
                    if (matchesAdUrl(value)) {
                        blockRequest("iframe", value);
                        descriptor.set.call(this, "about:blank");
                        return;
                    }
                    descriptor.set.call(this, value);
                }
            });
        }
        HTMLIFrameElement.prototype.__lyricsPlusAdBlockWrapped = true;
    };

    // --- Complex API Patches ---

    const patchWebSocket = () => {
        if (!window.WebSocket || window.WebSocket.__lyricsPlusAdBlockWrapped) return;
        const OriginalWebSocket = window.WebSocket;
        const createBlockedSocket = (url) => {
            blockRequest("websocket", url);
            const listeners = new Map();
            const socket = {
                readyState: OriginalWebSocket.CLOSED,
                bufferedAmount: 0,
                extensions: "",
                protocol: "",
                url: normalizeUrlString(url),
                binaryType: "blob",
                addEventListener(type, handler) {
                    if (!listeners.has(type)) listeners.set(type, new Set());
                    if (handler) listeners.get(type).add(handler);
                },
                removeEventListener(type, handler) {
                    listeners.get(type)?.delete(handler);
                },
                dispatchEvent(event) {
                    listeners.get(event.type)?.forEach((fn) => { try { fn.call(this, event); } catch (err) {} });
                    if (typeof this[`on${event.type}`] === "function") this[`on${event.type}`](event);
                    return true;
                },
                close() { },
                send() { }
            };
            setTimeout(() => socket.dispatchEvent(new Event("error")), 0);
            return socket;
        };
        const PatchedWebSocket = function(url, protocols) {
            if (matchesAdUrl(url)) return createBlockedSocket(url);
            return new OriginalWebSocket(url, protocols);
        };
        PatchedWebSocket.prototype = OriginalWebSocket.prototype;
        Object.setPrototypeOf(PatchedWebSocket, OriginalWebSocket);
        window.WebSocket = PatchedWebSocket;
        window.WebSocket.__lyricsPlusAdBlockWrapped = true;
    };

    const patchWorkers = () => {
        if (!window.Worker || window.Worker.__lyricsPlusAdBlockWrapped) return;
        const OriginalWorker = window.Worker;
        window.Worker = function(url, options) {
            if (matchesAdUrl(url)) {
                blockRequest("worker", url);
                throw new DOMException("Blocked ad worker", "SecurityError");
            }
            return new OriginalWorker(url, options);
        };
        window.Worker.__lyricsPlusAdBlockWrapped = true;
    };

    const patchServiceWorkers = () => {
        if (!navigator.serviceWorker || navigator.serviceWorker.__lyricsPlusAdBlockWrapped) return;
        const originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
        navigator.serviceWorker.register = function(url, options) {
            if (matchesAdUrl(url)) {
                blockRequest("serviceworker", url);
                return Promise.reject(new DOMException("Blocked ad service worker", "SecurityError"));
            }
            return originalRegister(url, options);
        };
        navigator.serviceWorker.__lyricsPlusAdBlockWrapped = true;
    };

    const patchWindowOpen = () => {
        if (!window.open || window.open.__lyricsPlusAdBlockWrapped) return;
        const originalOpen = window.open;
        window.open = function(url, target, features) {
            if (matchesAdUrl(url)) {
                blockRequest("window.open", url);
                return null;
            }
            return originalOpen.call(this, url, target, features);
        };
        window.open.__lyricsPlusAdBlockWrapped = true;
    };

    // --- YouTube Specific Sanitization ---

    const sanitizeYoutubeSrc = (src) => {
        if (!src || !/youtu(be\.com|\.be|be-nocookie\.com)/i.test(src)) return src;
        try {
            const url = new URL(src, window.location.origin);
            url.hostname = "www.youtube-nocookie.com";
            url.searchParams.set("rel", "0");
            url.searchParams.set("iv_load_policy", "3");
            url.searchParams.set("modestbranding", "1");
            url.searchParams.set("playsinline", "1");
            url.searchParams.set("fs", "0");
            url.searchParams.set("disablekb", "1");
            url.searchParams.set("origin", window.location.origin);
            url.searchParams.set("suppress_ads", "1");
            url.searchParams.set("adformat", "0_0");
            return url.toString();
        } catch (err) {
            return src;
        }
    };

    const sanitizeIframe = (iframe) => {
        if (!iframe || iframe.__lyricsPlusAdBlockSanitized) return;
        const src = iframe.getAttribute("src");
        if (src && /youtube\.|youtu\.be/i.test(src)) {
            const sanitized = sanitizeYoutubeSrc(src);
            if (sanitized !== src) iframe.setAttribute("src", sanitized);
            iframe.setAttribute("referrerpolicy", "origin");
            iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
        }
        iframe.__lyricsPlusAdBlockSanitized = true;
    };

    const observeDOM = () => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes?.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    if (node.tagName === "IFRAME") sanitizeIframe(node);
                    node.querySelectorAll?.("iframe").forEach(sanitizeIframe);
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll("iframe").forEach(sanitizeIframe);
    };

    // --- YouTube Player Injection ---

    const patchYouTubePlayer = () => {
        if (!window.YT || !window.YT.Player || window.YT.Player.__lyricsPlusAdBlockWrapped) {
            setTimeout(patchYouTubePlayer, 500);
            return;
        }

        const OriginalPlayer = window.YT.Player;
        window.YT.Player = function patchedPlayer(element, config = {}) {
            const mergedConfig = { ...config };
            mergedConfig.host = "https://www.youtube-nocookie.com";
            
            const forcedPlayerVars = {
                rel: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                playsinline: 1,
                disablekb: 1,
                fs: 0,
                origin: window.location.origin,
                adformat: "0_0",
                suppress_ads: 1,
                html5_disable_ads: true,
                disable_persistent_ads: true,
                kevlar_allow_multistep_video_ads: false,
                enable_desktop_ad_controls: false,
                disable_new_pause_state3_player_ads: true,
                player_ads_enable_gcf: false,
                web_player_disable_afa: true,
                preskip_button_style_ads_backend: false,
                html5_player_enable_ads_client: false,
                disable_polymer: 1,
                cc_load_policy: 0,
                hl: navigator.language || "en",
                host_language: navigator.language || "en",
                enablecastapi: 0
            };

            mergedConfig.playerVars = {
                ...(config.playerVars || {}),
                ...forcedPlayerVars
            };

            // Injected fflags
            const forcedFeatureFlags = [
                "disable_persistent_ads=true",
                "kevlar_allow_multistep_video_ads=false",
                "enable_desktop_ad_controls=false",
                "html5_disable_ads=true",
                "disable_new_pause_state3_player_ads=true",
                "player_ads_enable_gcf=false",
                "web_player_disable_afa=true",
                "kevlar_miniplayer_play_pause_on_scrim=true",
                "preskip_button_style_ads_backend=false",
                "html5_player_enable_ads_client=false"
            ];
            mergedConfig.playerVars.fflags = mergeFeatureFlags(mergedConfig.playerVars.fflags, forcedFeatureFlags);

            // Active Ad Skipping Logic
            const originalEvents = mergedConfig.events || {};
            mergedConfig.events = {
                ...originalEvents,
                onStateChange: (event) => {
                    if (originalEvents.onStateChange) originalEvents.onStateChange(event);
                    const player = event.target;
                    const state = event.data;
                    
                    const isAd = [105, 106, 107, 108, 109, 110, 111].includes(state) || 
                                 (typeof player.getAdState === 'function' && player.getAdState() === 1);

                    if (isAd) {
                        try {
                            player.setPlaybackRate(16);
                            player.mute();
                            const duration = player.getDuration();
                            if (duration > 0) player.seekTo(duration - 0.1, true);
                            if (typeof player.skipAd === 'function') player.skipAd();
                        } catch (e) {}
                    }
                }
            };

            return new OriginalPlayer(element, mergedConfig);
        };
        window.YT.Player.__lyricsPlusAdBlockWrapped = true;
        console.log(`${logPrefix} YouTube Player API Patched`);
    };

    const initialize = () => {
        patchFetch();
        patchXHR();
        patchSendBeacon();
        patchScriptElements();
        patchLinkElements();
        patchImageElements();
        patchIframeSetter();
        patchWebSocket();
        patchWorkers();
        patchServiceWorkers();
        patchWindowOpen();
        patchYouTubePlayer();
        observeDOM();
        console.log(`${logPrefix} Initialized`);
    };

    if (document.body) {
        initialize();
    } else {
        window.addEventListener('DOMContentLoaded', initialize);
    }
})();
