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
            const songs = await ProviderNetease.searchSongs(query, 8);
            if (!Array.isArray(songs) || songs.length === 0) return [];

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
                        const token = CONFIG.providers?.musixmatch?.token || localStorage.getItem("lyrics-plus:provider:musixmatch:token");
                        const url = `https://apic-appmobile.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynched&subtitle_format=mxm&app_id=mac-ios-v2.0&track_id=${item.raw.track_id}&usertoken=${token}`;
                        const res = await Spicetify.CosmosAsync.get(url, null, MXM_HEADERS);
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

            return react.createElement("div", { style: { padding: "8px", minWidth: "400px", maxWidth: "520px" } },

                // Current track chip
                info && react.createElement("div", {
                    style: {
                        display: "flex", alignItems: "center", gap: "10px",
                        marginBottom: "14px", padding: "8px 12px",
                        background: "rgba(255,255,255,0.05)", borderRadius: "8px",
                    }
                },
                    info.image && react.createElement("img", {
                        src: info.image,
                        style: { width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover" }
                    }),
                    react.createElement("div", null,
                        react.createElement("div", { style: { fontWeight: "bold", fontSize: "13px" } }, info.title),
                        react.createElement("div", { style: { fontSize: "11px", color: "#aaa" } }, info.artist)
                    )
                ),

                // Search input row
                react.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "12px" } },
                    react.createElement("input", {
                        type: "text",
                        value: query,
                        placeholder: getText("manualSearchModal.placeholder") || "Search by song title, artist, or romaji...",
                        onChange: e => setQuery(e.target.value),
                        onKeyDown: e => e.key === "Enter" && doSearch(),
                        autoFocus: true,
                        style: {
                            flex: 1, padding: "8px 12px", borderRadius: "6px",
                            border: "1px solid #555", background: "rgba(255,255,255,0.06)",
                            color: "var(--spice-text)", fontSize: "13px", outline: "none",
                        },
                    }),
                    react.createElement("button", {
                        onClick: (e) => {
                            e.stopPropagation();
                            doSearch();
                        },
                        disabled: status === "loading",
                        style: {
                            padding: "7px 16px", borderRadius: "6px", border: "none",
                            cursor: "pointer",
                            fontWeight: "bold", fontSize: "13px",
                            background: "var(--spice-button)", color: "#fff",
                        },
                    }, status === "loading" ? "…" : (getText("manualSearchModal.search") || "Search"))
                ),

                // CJK Phonetic Suggestions
                localSuggestions && react.createElement("div", {
                    style: {
                        marginBottom: "12px",
                        padding: "6px 8px",
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.05)"
                    }
                },
                    react.createElement("div", {
                        style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px"
                        }
                    },
                        react.createElement("span", { style: { fontSize: "11px", fontWeight: "bold", color: "#aaa" } },
                            getText("manualSearchModal.cjkSuggestions") || "CJK Phonetic Suggestions:"
                        )
                    ),
                    react.createElement("div", {
                        style: {
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px"
                        }
                    },
                        Object.entries(localSuggestions).map(([langKey, val]) => {
                            if (!val || val.trim() === "" || val === `${info.title} ${info.artist}`) return null;
                            const labels = { romaji: "Romaji", romaja: "Romaja", pinyin: "Pinyin" };
                            const label = labels[langKey] || langKey;
                            return react.createElement("button", {
                                key: langKey,
                                onClick: (e) => {
                                    e.stopPropagation();
                                    setQuery(val);
                                    doSearch(val);
                                },
                                style: {
                                    padding: "3px 8px",
                                    borderRadius: "10px",
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#ccc",
                                    fontSize: "10px",
                                    cursor: "pointer"
                                }
                            }, `${label}: ${val.split(" ").slice(0, -1).join(" ")}`);
                        })
                    )
                ),

                // Provider Filter Chips (Option 1)
                results.length > 0 && react.createElement("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "12px",
                        overflowX: "auto",
                        paddingBottom: "4px"
                    }
                },
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
                            onClick: () => setSelectedFilter(chip.key),
                            style: {
                                padding: "4px 10px",
                                borderRadius: "14px",
                                fontSize: "11px",
                                fontWeight: isSelected ? "bold" : "normal",
                                cursor: "pointer",
                                border: isSelected
                                    ? `1px solid ${meta ? meta.color : "var(--spice-button)"}`
                                    : "1px solid rgba(255,255,255,0.12)",
                                background: isSelected
                                    ? (meta ? meta.bg : "rgba(29, 185, 84, 0.2)")
                                    : "rgba(255,255,255,0.04)",
                                color: isSelected
                                    ? (meta ? meta.textColor : "#fff")
                                    : "var(--spice-subtext, #aaa)",
                                transition: "all 0.15s ease",
                            }
                        }, `${chip.label} (${count})`);
                    })
                ),

                // Status messages
                status === "loading" && react.createElement("div", {
                    style: { color: "var(--spice-button, #1db954)", fontSize: "12px", textAlign: "center", padding: "20px 0" }
                }, getText("manualSearchModal.searching") || "Searching across providers…"),

                status === "error" && react.createElement("div", {
                    style: { color: "#ff6b6b", fontSize: "12px", marginBottom: "10px" }
                }, errorMsg || (getText("manualSearchModal.failed") || "Search failed")),

                status === "empty" && react.createElement("div", {
                    style: { color: "#aaa", fontSize: "12px", textAlign: "center", padding: "20px 0" }
                }, getText("manualSearchModal.noResults") || "No lyrics found across any provider. Try searching by original name or romaji."),

                // Results list
                filteredResults.length > 0 && react.createElement("div", {
                    style: {
                        maxHeight: "300px", overflowY: "auto",
                        display: "flex", flexDirection: "column", gap: "6px",
                    }
                },
                    filteredResults.map((item) => {
                        const dur = fmt(item.durationMs);
                        const meta = PROVIDER_META[item.provider] || PROVIDER_META.netease;
                        const isPicked = item.id === selectedId;

                        return react.createElement("button", {
                            key: item.id,
                            onClick: () => pick(item),
                            style: {
                                display: "flex", alignItems: "center", gap: "10px",
                                width: "100%", padding: "8px 12px",
                                background: isPicked ? "rgba(29,185,84,0.12)" : "rgba(255,255,255,0.04)",
                                border: isPicked ? "1px solid rgba(29,185,84,0.35)" : "1px solid transparent",
                                borderRadius: "8px", cursor: "pointer",
                                textAlign: "left", color: "var(--spice-text)",
                            }
                        },
                            react.createElement("div", { style: { flex: 1, minWidth: 0 } },
                                react.createElement("div", {
                                    style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        marginBottom: "2px"
                                    }
                                },
                                    // Provider badge
                                    react.createElement("span", {
                                        style: {
                                            fontSize: "9px",
                                            fontWeight: "bold",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            backgroundColor: meta.bg,
                                            color: meta.textColor,
                                            border: `1px solid ${meta.border}`,
                                            textTransform: "uppercase"
                                        }
                                    }, item.providerName),

                                    // Song title
                                    react.createElement("span", {
                                        style: {
                                            fontWeight: "bold", fontSize: "13px",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                        }
                                    }, item.title),

                                    // Synced/Unsynced badge
                                    item.hasLyrics !== undefined && react.createElement("span", {
                                        style: {
                                            fontSize: "9px",
                                            fontWeight: "bold",
                                            padding: "1px 5px",
                                            borderRadius: "4px",
                                            textTransform: "uppercase",
                                            backgroundColor: !item.hasLyrics ? "rgba(235, 87, 87, 0.15)" : (item.isSynced ? "rgba(29, 185, 84, 0.15)" : "rgba(255, 165, 0, 0.15)"),
                                            color: !item.hasLyrics ? "#eb5757" : (item.isSynced ? "#1db954" : "#ffa500"),
                                            border: !item.hasLyrics ? "1px solid rgba(235, 87, 87, 0.25)" : (item.isSynced ? "1px solid rgba(29, 185, 84, 0.25)" : "1px solid rgba(255, 165, 0, 0.25)"),
                                        }
                                    }, !item.hasLyrics ? "No Lyrics" : (item.isSynced ? "Synced" : "Unsynced"))
                                ),
                                react.createElement("div", {
                                    style: {
                                        fontSize: "11px", color: "#aaa",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                    }
                                }, item.artist)
                            ),
                            dur && react.createElement("div", {
                                style: { fontSize: "11px", color: "#888", whiteSpace: "nowrap" }
                            }, dur)
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
