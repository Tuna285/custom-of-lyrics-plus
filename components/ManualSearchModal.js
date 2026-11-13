const ManualSearchModal = (() => {
    let searchCache = {};
    const react = Spicetify.React;

    const MXM_HEADERS = {
        Host: "apic-appmobile.musixmatch.com",
        authority: "apic-appmobile.musixmatch.com",
        "X-Cookie": "x-mxm-token-guid=",
        "x-mxm-app-version": "10.1.1",
        "X-User-Agent": "Musixmatch/2025120901 CFNetwork/3860.300.31 Darwin/25.2.0",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
        Accept: "application/json",
    };

    const PROVIDER_META = {
        netease: { name: "NetEase", color: "#e60026", bg: "rgba(230, 0, 38, 0.15)", border: "rgba(230, 0, 38, 0.35)", textColor: "#ff4d67" },
        lrclib: { name: "LRCLIB", color: "#2f80ed", bg: "rgba(47, 128, 237, 0.15)", border: "rgba(47, 128, 237, 0.35)", textColor: "#509bff" },
        musixmatch: { name: "Musixmatch", color: "#ff6000", bg: "rgba(255, 96, 0, 0.15)", border: "rgba(255, 96, 0, 0.35)", textColor: "#ff8533" },
        spotify: { name: "Spotify", color: "#1db954", bg: "rgba(29, 185, 84, 0.15)", border: "rgba(29, 185, 84, 0.35)", textColor: "#1ed760" },
    };

    function isProviderEnabled(key) {
        if (!CONFIG.providers || !CONFIG.providers[key]) return true;
        return CONFIG.providers[key].on !== false;
    }

    // --- Provider-specific search routines ---

    async function searchNetEase(query, info) {
        if (!isProviderEnabled("netease")) return [];
        if (typeof ProviderNetease === "undefined" || !ProviderNetease.searchSongs) return [];

        try {
            let songs = await ProviderNetease.searchSongs(query, 8);
            if (!Array.isArray(songs)) songs = [];

            const isInitialQuery = info && query.trim() === `${info.title} ${info.artist}`.trim();
            if (isInitialQuery && typeof ProviderNetease.scoreCandidate === "function") {
                const bestScore = songs.length ? Math.max(...songs.map(c => ProviderNetease.scoreCandidate(c, info))) : 0;
                if (bestScore < 0.28 && info.title) {
                    const titleSongs = await ProviderNetease.searchSongs(info.title, 8);
                    if (Array.isArray(titleSongs) && titleSongs.length) {
                        const existingIds = new Set(songs.map(s => s.id));
                        for (const ts of titleSongs) {
                            if (!existingIds.has(ts.id)) songs.push(ts);
                        }
                    }
                }
                songs = [...songs].sort((a, b) => ProviderNetease.scoreCandidate(b, info) - ProviderNetease.scoreCandidate(a, info));
            }

            if (songs.length === 0) return [];

            return songs.map(song => {
                const artists = (song.ar || song.artists || []).map(a => a.name).join(", ");
                return {
                    id: `netease_${song.id}`,
                    title: song.name,
                    artist: artists,
                    durationMs: song.dt || song.duration || 0,
                    provider: "netease",
                    providerName: PROVIDER_META.netease.name,
                    providerColor: PROVIDER_META.netease.textColor,
                    hasLyrics: undefined,
                    isSynced: undefined,
                    raw: song,
                };
            });
        } catch (err) {
            console.warn("[Lyrics+] NetEase search error:", err);
            return [];
        }
    }

    async function searchLRCLIB(query, info) {
        if (!isProviderEnabled("lrclib")) return [];
        try {
            const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const list = await res.json();
            if (!Array.isArray(list) || list.length === 0) return [];

            return list.slice(0, 8).map(item => {
                const hasSynced = !!item.syncedLyrics;
                const hasPlain = !!item.plainLyrics;
                return {
                    id: `lrclib_${item.id}`,
                    title: item.trackName || item.name,
                    artist: item.artistName || "",
                    durationMs: (item.duration || 0) * 1000,
                    provider: "lrclib",
                    providerName: PROVIDER_META.lrclib.name,
                    providerColor: PROVIDER_META.lrclib.textColor,
                    hasLyrics: hasSynced || hasPlain,
                    isSynced: hasSynced,
                    raw: item,
                };
            });
        } catch (err) {
            console.warn("[Lyrics+] LRCLIB search error:", err);
            return [];
        }
    }

    async function searchMusixmatch(query, info) {
        if (!isProviderEnabled("musixmatch")) return [];
        let token = CONFIG.providers?.musixmatch?.token || localStorage.getItem("lyrics-plus:provider:musixmatch:token");
        if (!token) return [];

        const executeSearch = async (tVal) => {
            const url = `https://apic-appmobile.musixmatch.com/ws/1.1/track.search?format=json&q=${encodeURIComponent(query)}&page_size=8&app_id=mac-ios-v2.0&usertoken=${tVal}`;
            if (typeof ProviderMusixmatch?.fetchMxm === "function") {
                return await ProviderMusixmatch.fetchMxm(url);
            }
            return await Spicetify.CosmosAsync.get(url, null, MXM_HEADERS);
        };

        try {
            let res = await executeSearch(token);
            let statusCode = res?.message?.header?.status_code;
            if (statusCode === 401 || statusCode === 402) {
                if (typeof ProviderMusixmatch?.refreshMusixmatchToken === "function") {
                    const freshToken = await ProviderMusixmatch.refreshMusixmatchToken();
                    if (freshToken) {
                        token = freshToken;
                        res = await executeSearch(token);
                    }
                }
            }

            const trackList = res?.message?.body?.track_list;
            if (!Array.isArray(trackList) || trackList.length === 0) return [];

            return trackList.map(t => {
                const trk = t.track;
                const hasSub = !!trk.has_subtitles;
                const hasLyr = !!(trk.has_lyrics || trk.has_lyrics_crowd);
                return {
                    id: `musixmatch_${trk.track_id}`,
                    title: trk.track_name,
                    artist: trk.artist_name,
                    durationMs: (trk.track_length || 0) * 1000,
                    provider: "musixmatch",
                    providerName: PROVIDER_META.musixmatch.name,
                    providerColor: PROVIDER_META.musixmatch.textColor,
                    hasLyrics: hasSub || hasLyr,
                    isSynced: hasSub,
                    raw: trk,
                };
            });
        } catch (err) {
            console.warn("[Lyrics+] Musixmatch search error:", err);
            return [];
        }
    }

    async function searchSpotify(query, info) {
        if (!isProviderEnabled("spotify")) return [];
        try {
            const url = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=6`;
            const res = await Spicetify.CosmosAsync.get(url);
            const items = res?.tracks?.items;
            if (!Array.isArray(items) || items.length === 0) return [];

            return items.map(item => {
                const artists = (item.artists || []).map(a => a.name).join(", ");
                return {
                    id: `spotify_${item.id}`,
                    title: item.name,
                    artist: artists,
                    durationMs: item.duration_ms || 0,
                    provider: "spotify",
                    providerName: PROVIDER_META.spotify.name,
                    providerColor: PROVIDER_META.spotify.textColor,
                    hasLyrics: true,
                    isSynced: true,
                    raw: item,
                };
            });
        } catch (err) {
            console.warn("[Lyrics+] Spotify search error:", err);
            return [];
        }
    }

    // --- Main Modal Implementation ---

    function open(onFound) {
        const track = Spicetify.Player.data?.item;
        const info = typeof LyricsFetcher !== "undefined"
            ? LyricsFetcher.infoFromTrack(track)
            : null;

        let translatorInstance = null;

        const Modal = () => {
            const [query, setQuery] = react.useState(info ? `${info.title} ${info.artist}` : "");
            const [results, setResults] = react.useState([]);
            const [status, setStatus] = react.useState("idle");
            const [selectedFilter, setSelectedFilter] = react.useState("all");
            const [errorMsg, setErrorMsg] = react.useState("");
            const [localSuggestions, setLocalSuggestions] = react.useState(null);
            const [selectedId, setSelectedId] = react.useState(null);

            const isMountedRef = react.useRef(true);
            react.useEffect(() => {
                isMountedRef.current = true;
                return () => { isMountedRef.current = false; };
            }, []);

            const getLocalSuggestions = async () => {
                if (!info) return;
                if (!translatorInstance && typeof Translator !== "undefined") {
                    translatorInstance = new Translator("en");
                }
                if (!translatorInstance) return;

                const suggestions = {};
                const title = info.title;
                const artist = info.artist;

                const hasJapanese = (str) => /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(str);
                const hasKorean = (str) => /[\uac00-\ud7af]/.test(str);
                const hasChinese = (str) => /[\u4e00-\u9fa5]/.test(str);

                try {
                    if (hasJapanese(title) || hasJapanese(artist)) {
                        await translatorInstance.createTranslator("ja");
                        const titleRomaji = await translatorInstance.romajifyText(title);
                        const artistRomaji = await translatorInstance.romajifyText(artist);
                        if (titleRomaji && artistRomaji) {
                            suggestions.romaji = `${titleRomaji} ${artistRomaji}`;
                        }
                    }

                    if (hasKorean(title) || hasKorean(artist)) {
                        await translatorInstance.createTranslator("ko");
                        const titleRomaja = await translatorInstance.convertToRomaja(title);
                        const artistRomaja = await translatorInstance.convertToRomaja(artist);
                        if (titleRomaja && artistRomaja) {
                            suggestions.romaja = `${titleRomaja} ${artistRomaja}`;
                        }
                    }

                    if (hasChinese(title) || hasChinese(artist)) {
                        await translatorInstance.createTranslator("zh");
                        const titlePinyin = await translatorInstance.convertToPinyin(title);
                        const artistPinyin = await translatorInstance.convertToPinyin(artist);
                        if (titlePinyin && artistPinyin) {
                            suggestions.pinyin = `${titlePinyin} ${artistPinyin}`;
                        }
                    }

                    if (isMountedRef.current && Object.keys(suggestions).length > 0) {
                        setLocalSuggestions(suggestions);
                    }
                } catch (err) {
                    console.warn("[Lyrics+] CJK suggestions error:", err);
                }
            };

            const doSearch = async (searchQuery = query) => {
                const cleanQuery = searchQuery.trim();
                if (!cleanQuery) return;

                // Check RAM cache
                if (info?.uri && searchCache[info.uri] && searchCache[info.uri].query === cleanQuery) {
                    const cached = searchCache[info.uri].results;
                    setResults(cached);
                    setStatus(cached.length ? "done" : "empty");
                    return;
                }

                setStatus("loading");
                setResults([]);
                setErrorMsg("");

                try {
                    // Fire parallel searches across all available providers
                    const searchPromises = [
                        searchNetEase(cleanQuery, info),
                        searchLRCLIB(cleanQuery, info),
                        searchMusixmatch(cleanQuery, info),
                        searchSpotify(cleanQuery, info),
                    ];

                    const settled = await Promise.allSettled(searchPromises);
                    let combined = [];

                    settled.forEach(result => {
                        if (result.status === "fulfilled" && Array.isArray(result.value)) {
                            combined.push(...result.value);
                        }
                    });

                    // Pre-fetch lyric status for top NetEase results (first 2-3 items)
                    const neteaseIndices = [];
                    combined.forEach((item, idx) => {
                        if (item.provider === "netease" && neteaseIndices.length < 3) {
                            neteaseIndices.push(idx);
                        }
                    });

                    if (neteaseIndices.length > 0 && typeof ProviderNetease !== "undefined" && ProviderNetease.fetchLyricsById) {
                        await Promise.all(neteaseIndices.map(async (idx) => {
                            const item = combined[idx];
                            try {
                                const lyricData = await ProviderNetease.fetchLyricsById(item.raw.id);
                                const rawLrc = lyricData?.lrc?.lyric || "";
                                item.hasLyrics = !!(rawLrc.trim());
                                item.isSynced = /\[\d{1,2}:\d{2}/.test(rawLrc);
                                item.rawLyricData = lyricData;
                            } catch (_) {
                                item.hasLyrics = false;
                                item.isSynced = false;
                            }
                        }));
                    }

                    if (info?.uri) {
                        searchCache[info.uri] = { query: cleanQuery, results: combined };
                    }

                    if (isMountedRef.current) {
                        setResults(combined);
                        setStatus(combined.length ? "done" : "empty");
                    }
                } catch (e) {
                    console.error("[Lyrics+] Manual multi-provider search failed:", e);
                    if (isMountedRef.current) {
                        setErrorMsg(e.message || String(e));
                        setStatus("error");
                    }
                }
            };

            react.useEffect(() => {
                getLocalSuggestions();
                const initialQuery = info ? `${info.title} ${info.artist}` : "";
                doSearch(initialQuery);
            }, []);

            const pick = async (item) => {
                setStatus("loading");
                try {
                    let synced = null;
                    let unsynced = null;
                    let neteaseTranslation = null;
                    let copyright = null;

                    if (item.provider === "netease") {
                        let lyricData = item.rawLyricData;
                        if (!lyricData) {
                            lyricData = await ProviderNetease.fetchLyricsById(item.raw.id);
                        }
                        const rawLrc = lyricData?.lrc?.lyric || "";
                        if (!rawLrc.trim()) {
                            throw new Error("No lyrics found on NetEase for this track");
                        }
                        const parsed = ProviderNetease.parseLyrics
                            ? ProviderNetease.parseLyrics(rawLrc)
                            : Utils.parseLocalLyrics(rawLrc);
                        synced = parsed.synced;
                        unsynced = parsed.unsynced || parsed.synced;

                        if (lyricData?.tlyric?.lyric && lyricData.tlyric.lyric !== rawLrc) {
                            const transResult = ProviderNetease.parseLyrics
                                ? ProviderNetease.parseLyrics(lyricData.tlyric.lyric)
                                : Utils.parseLocalLyrics(lyricData.tlyric.lyric);
                            neteaseTranslation = transResult.synced || transResult.unsynced || null;
                        }

                        if (!synced && unsynced && neteaseTranslation && neteaseTranslation.some(l => l.startTime !== undefined)) {
                            const newSynced = unsynced.map((line, idx) => {
                                const transLine = neteaseTranslation[idx];
                                return {
                                    ...line,
                                    startTime: transLine ? transLine.startTime : undefined
                                };
                            });
                            if (newSynced.some(l => l.startTime !== undefined)) {
                                synced = newSynced;
                            }
                        }
                        copyright = "网易云音乐 (NetEase Cloud Music)";
                    } else if (item.provider === "lrclib") {
                        const rawItem = item.raw;
                        const lrcContent = rawItem.syncedLyrics || rawItem.plainLyrics;
                        if (!lrcContent?.trim()) {
                            throw new Error("No lyrics found on LRCLIB for this track");
                        }
                        const parsed = Utils.parseLocalLyrics(lrcContent);
                        synced = rawItem.syncedLyrics ? parsed.synced : null;
                        unsynced = parsed.unsynced || parsed.synced;
                        copyright = "lrclib.net";
                    } else if (item.provider === "musixmatch") {
                        let token = CONFIG.providers?.musixmatch?.token || localStorage.getItem("lyrics-plus:provider:musixmatch:token");
                        const querySubtitles = async (tVal) => {
                            const url = `https://apic-appmobile.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynched&subtitle_format=mxm&app_id=mac-ios-v2.0&track_id=${item.raw.track_id}&usertoken=${tVal}`;
                            if (typeof ProviderMusixmatch?.fetchMxm === "function") {
                                return await ProviderMusixmatch.fetchMxm(url);
                            }
                            return await Spicetify.CosmosAsync.get(url, null, MXM_HEADERS);
                        };
                        let res = await querySubtitles(token);
                        const statusCode = res?.message?.header?.status_code;
                        if ((statusCode === 401 || statusCode === 402 || statusCode === 403) && typeof ProviderMusixmatch?.refreshMusixmatchToken === "function") {
                            const freshToken = await ProviderMusixmatch.refreshMusixmatchToken();
                            if (freshToken) {
                                res = await querySubtitles(freshToken);
                            }
                        }
                        const body = res?.message?.body?.macro_calls;
                        if (!body) throw new Error("Failed to load subtitles from Musixmatch");

                        synced = ProviderMusixmatch.getSynced(body);
                        unsynced = synced || ProviderMusixmatch.getUnsynced(body);
                        copyright = "Musixmatch";
                    } else if (item.provider === "spotify") {
                        const spotifyRes = await Providers.spotify({ uri: item.raw.uri });
                        if (spotifyRes.error || (!spotifyRes.synced && !spotifyRes.unsynced)) {
                            throw new Error("No lyrics found on Spotify for this track");
                        }
                        synced = spotifyRes.synced;
                        unsynced = spotifyRes.unsynced;
                        copyright = "Spotify";
                    }

                    if (!synced && !unsynced) {
                        throw new Error("Could not parse lyrics from this candidate");
                    }

                    if (item.provider === "netease" && typeof IDBCache !== "undefined" && info?.uri) {
                        IDBCache.set(`netease:lyrics:${info.uri}`, {
                            uri: info.uri,
                            provider: "netease",
                            copyright,
                            synced,
                            unsynced,
                            genius: null,
                            neteaseTranslation,
                            _neteaseId: item.id,
                        }, 30 * 24 * 60 * 60 * 1000).catch(() => {});
                    }

                    onFound?.({
                        uri: info?.uri || "",
                        provider: item.provider,
                        copyright: copyright,
                        synced,
                        unsynced,
                        genius: null,
                        neteaseTranslation,
                        _manualSelected: true,
                        _selectedProvider: item.provider
                    });

                    setSelectedId(item.id);
                    Spicetify.PopupModal.hide();

                    const loadedMsg = getText("manualSearchModal.lyricsLoaded", {
                        provider: item.providerName,
                        songName: item.title
                    }, `✓ Loaded lyrics from ${item.providerName}: ${item.title}`);
                    Spicetify.showNotification(loadedMsg);
                } catch (e) {
                    Spicetify.showNotification("❌ " + e.message, true);
                    setStatus("done");
                }
            };

            const fmt = (ms) => {
                if (!ms) return "";
                return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
            };

            // Calculate item counts per provider
            const counts = react.useMemo(() => {
                const c = { all: results.length, netease: 0, lrclib: 0, musixmatch: 0, spotify: 0 };
                results.forEach(r => {
                    if (c[r.provider] !== undefined) c[r.provider]++;
                });
                return c;
            }, [results]);

            // Filtered results
            const filteredResults = react.useMemo(() => {
                if (selectedFilter === "all") return results;
                return results.filter(r => r.provider === selectedFilter);
            }, [results, selectedFilter]);

            return react.createElement("div", { className: "lp-modal-body lp-modal-body--md" },

                // Current track chip
                info && react.createElement("div", { className: "lp-card lp-track-card" },
                    info.image && react.createElement("img", {
                        src: info.image,
                        alt: "",
                        className: "lp-track-thumb",
                    }),
                    react.createElement("div", { className: "lp-track-meta" },
                        react.createElement("div", { className: "lp-track-title" }, info.title),
                        react.createElement("div", { className: "lp-track-sub" }, info.artist)
                    )
                ),

                // Search input row
                react.createElement("div", { className: "lp-search-row" },
                    react.createElement("input", {
                        type: "text",
                        className: "lp-input",
                        value: query,
                        placeholder: getText("manualSearchModal.placeholder") || "Search by song title, artist, or romaji...",
                        onChange: e => setQuery(e.target.value),
                        onKeyDown: e => e.key === "Enter" && doSearch(),
                        autoFocus: true,
                    }),
                    react.createElement("button", {
                        type: "button",
                        className: "lp-btn lp-btn-primary",
                        onClick: (e) => {
                            e.stopPropagation();
                            doSearch();
                        },
                        disabled: status === "loading",
                    }, status === "loading" ? "…" : (getText("manualSearchModal.search") || "Search"))
                ),

                // CJK Phonetic Suggestions
                localSuggestions && react.createElement("div", { className: "lp-card" },
                    react.createElement("span", { className: "lp-section-label" },
                        getText("manualSearchModal.cjkSuggestions") || "CJK Phonetic Suggestions:"
                    ),
                    react.createElement("div", { className: "lp-chip-row" },
                        Object.entries(localSuggestions).map(([langKey, val]) => {
                            if (!val || val.trim() === "" || val === `${info.title} ${info.artist}`) return null;
                            const labels = { romaji: "Romaji", romaja: "Romaja", pinyin: "Pinyin" };
                            const label = labels[langKey] || langKey;
                            return react.createElement("button", {
                                key: langKey,
                                type: "button",
                                className: "lp-chip",
                                onClick: (e) => {
                                    e.stopPropagation();
                                    setQuery(val);
                                    doSearch(val);
                                },
                            }, `${label}: ${val.split(" ").slice(0, -1).join(" ")}`);
                        })
                    )
                ),

                // Provider Filter Chips
                results.length > 0 && react.createElement("div", { className: "lp-chip-row" },
                    [
                        { key: "all", label: getText("manualSearchModal.all") || "All" },
                        { key: "netease", label: "NetEase" },
                        { key: "lrclib", label: "LRCLIB" },
                        { key: "musixmatch", label: "Musixmatch" },
                        { key: "spotify", label: "Spotify" },
                    ].map(chip => {
                        const count = counts[chip.key] || 0;
                        if (chip.key !== "all" && count === 0) return null;
                        const isSelected = selectedFilter === chip.key;
                        const meta = PROVIDER_META[chip.key];
                        return react.createElement("button", {
                            key: chip.key,
                            type: "button",
                            className: `lp-chip${isSelected ? " is-active" : ""}`,
                            style: isSelected && meta ? {
                                "--lp-chip-bg": meta.bg,
                                "--lp-chip-border": meta.color,
                                "--lp-chip-color": meta.textColor,
                            } : undefined,
                            onClick: () => setSelectedFilter(chip.key),
                        }, `${chip.label} (${count})`);
                    })
                ),

                // Status messages
                status === "loading" && react.createElement("div", {
                    className: "lp-status-msg",
                    style: { color: "var(--lp-accent)" },
                }, getText("manualSearchModal.searching") || "Searching across providers…"),

                status === "error" && react.createElement("div", {
                    className: "lp-status-msg is-error",
                }, errorMsg || (getText("manualSearchModal.failed") || "Search failed")),

                status === "empty" && react.createElement("div", {
                    className: "lp-status-msg",
                }, getText("manualSearchModal.noResults") || "No lyrics found across any provider. Try searching by original name or romaji."),

                // Results list
                filteredResults.length > 0 && react.createElement("div", { className: "lp-result-list" },
                    filteredResults.map((item) => {
                        const dur = fmt(item.durationMs);
                        const meta = PROVIDER_META[item.provider] || PROVIDER_META.netease;
                        const isPicked = item.id === selectedId;
                        const syncBadgeClass = !item.hasLyrics
                            ? "lp-badge lp-badge--danger"
                            : (item.isSynced ? "lp-badge lp-badge--success" : "lp-badge lp-badge--warning");

                        return react.createElement("button", {
                            key: item.id,
                            type: "button",
                            className: `lp-result-item${isPicked ? " is-selected" : ""}`,
                            onClick: () => pick(item),
                        },
                            react.createElement("div", { className: "lp-track-meta" },
                                react.createElement("div", { className: "lp-result-head", style: { justifyContent: "flex-start" } },
                                    react.createElement("span", {
                                        className: "lp-badge lp-badge--provider",
                                        style: {
                                            "--lp-provider-bg": meta.bg,
                                            "--lp-provider-color": meta.textColor,
                                            textTransform: "uppercase",
                                        }
                                    }, item.providerName),

                                    react.createElement("span", { className: "lp-result-title" }, item.title),

                                    item.hasLyrics !== undefined && react.createElement("span", {
                                        className: syncBadgeClass,
                                        style: { textTransform: "uppercase" },
                                    }, !item.hasLyrics ? "No Lyrics" : (item.isSynced ? "Synced" : "Unsynced"))
                                ),
                                react.createElement("div", { className: "lp-result-sub" }, item.artist)
                            ),
                            dur && react.createElement("div", { className: "lp-result-dur" }, dur)
                        );
                    })
                )
            );
        };

        Spicetify.PopupModal.display({
            title: getText("manualSearchModal.title") || "Manual Lyrics Search",
            content: react.createElement(Modal),
        });
    }

    return { open };
})();

window.ManualSearchModal = ManualSearchModal;
if (window.LyricsPlus) {
    window.LyricsPlus.ManualSearchModal = ManualSearchModal;
}
if (typeof ProviderNetease !== "undefined") {
    ProviderNetease.openManualSearchModal = ManualSearchModal.open;
}
