const ProviderNetease = (() => {
    let searchCache = {};
    const BASE_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer":    "https://music.163.com",
        "Origin":     "https://music.163.com",
        "Cookie":     "os=pc; appver=8.9.70; channel=netease; __remember_me=true;",
    };

    const DEDICATED_WORKER_TEMPLATE = "https://spicetify-yt-proxy.spicetifylyricplus.workers.dev/?url={url}";

    async function fetchNetEase(targetUrl) {
        if (!targetUrl) return null;
        
        // Priority 1: Always use our dedicated hardened Cloudflare Worker
        try {
            const proxiedUrl = DEDICATED_WORKER_TEMPLATE.replace("{url}", encodeURIComponent(targetUrl));
            const res = await fetch(proxiedUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && (data.code === 200 || data.result)) return data;
            }
        } catch (_) {}

        // Priority 2: Configured proxy in localStorage (if different)
        try {
            const configuredProxy = localStorage.getItem("spicetify:corsProxyTemplate");
            if (configuredProxy && configuredProxy !== DEDICATED_WORKER_TEMPLATE && !configuredProxy.includes("corsproxy.io")) {
                const proxiedUrl2 = configuredProxy.replace("{url}", encodeURIComponent(targetUrl));
                const res2 = await fetch(proxiedUrl2);
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (data2 && (data2.code === 200 || data2.result)) return data2;
                }
            }
        } catch (_) {}

        // Priority 3: Spicetify.CosmosAsync
        try {
            const data3 = await Spicetify.CosmosAsync.get(targetUrl, null, BASE_HEADERS);
            if (data3 && (data3.code === 200 || data3.result)) return data3;
        } catch (_) {}

        return null;
    }

    async function searchSongs(query, limit = 5) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();

        // 1. Primary: interface.music.163.com cloudsearch/pc
        try {
            const urlPrimary = `https://interface.music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(cleanQ)}&type=1&offset=0&limit=${limit}`;
            const json = await fetchNetEase(urlPrimary);
            if (json && json.code === 200 && Array.isArray(json?.result?.songs)) {
                return json.result.songs;
            }
        } catch (_) {}

        // 2. Secondary: interface.music.163.com search/get/web
        try {
            const urlSecondary = `https://interface.music.163.com/api/search/get/web?s=${encodeURIComponent(cleanQ)}&type=1&offset=0&limit=${limit}`;
            const json2 = await fetchNetEase(urlSecondary);
            if (json2 && json2.code === 200 && Array.isArray(json2?.result?.songs)) {
                return json2.result.songs;
            }
        } catch (_) {}

        // 3. Tertiary: music.163.com cloudsearch/pc
        try {
            const urlTertiary = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(cleanQ)}&type=1&offset=0&limit=${limit}`;
            const json3 = await fetchNetEase(urlTertiary);
            if (json3 && json3.code === 200 && Array.isArray(json3?.result?.songs)) {
                return json3.result.songs;
            }
        } catch (_) {}

        return [];
    }

    async function fetchLyricsById(id) {
        if (!id) return null;
        try {
            const url = `https://interface.music.163.com/api/song/lyric?id=${id}&lv=-1&kv=-1&tv=-1`;
            const json = await fetchNetEase(url);
            if (json && json.code === 200) return json;
        } catch (_) {}

        try {
            const fallbackUrl = `https://music.163.com/api/song/lyric?id=${id}&lv=-1&kv=-1&tv=-1`;
            const json2 = await fetchNetEase(fallbackUrl);
            if (json2 && json2.code === 200) return json2;
        } catch (_) {}

        return null;
    }

    function levenshtein(a, b) {
        const s1 = (a || "").toLowerCase().trim();
        const s2 = (b || "").toLowerCase().trim();
        if (s1 === s2) return 1;
        const maxLen = Math.max(s1.length, s2.length);
        if (!maxLen) return 1;
        const dp = Array.from({ length: s1.length + 1 }, (_, i) => [i]);
        for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                dp[i][j] = s1[i - 1] === s2[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return 1 - dp[s1.length][s2.length] / maxLen;
    }

    function scoreCandidate(candidate, info) {
        const isInstSearch = /instrumental|off vocal|karaoke|カラオケ|伴奏/i.test(info.title || "");
        const isInstCand = /instrumental|off vocal|karaoke|カラオケ|伴奏/i.test(candidate.name || "");
        const penalty = (!isInstSearch && isInstCand) ? 0.35 : 0;

        const artistStr = (candidate.ar || candidate.artists || []).map(a => a.name).join(" ");
        const titleSim  = levenshtein(candidate.name, info.title);
        const artistSim = levenshtein(artistStr, info.artist);
        const deltaMs   = Math.abs((candidate.dt || candidate.duration || 0) - (info.duration || 0));
        const durScore  = Math.max(0, 1 - deltaMs / 10000);
        return Math.max(0, titleSim * 0.4 + artistSim * 0.3 + durScore * 0.3 - penalty);
    }

    const SCORE_THRESHOLD = 0.28;

    function parseLyrics(lrcText) {
        if (!lrcText?.trim()) return { synced: null, unsynced: null };
        const U = typeof Utils !== "undefined" ? Utils : (window.LyricsPlus?.Utils || {});
        if (U.parseLocalLyrics) {
            const p = U.parseLocalLyrics(lrcText);
            return { synced: p.synced || null, unsynced: p.unsynced || null };
        }
        // Minimal fallback - modernized to handle [mm:ss:xx] and filter metadata
        const lines = lrcText.split("\n");
        const synced = [];
        const unsynced = [];
        const metadataRegex = /^(作词|作曲|编曲|演唱|制作|人声|后期|混音|母带|作詞|作曲|編曲|歌詞|Lyricist|Composer|Arranger|Producer|Lyrics|Vocals|Mixer|Mastering|Lời|Nhạc|Phối khí|Trình bày|Sáng tác)\s*[:：]/i;

        for (const raw of lines) {
            const m = raw.match(/^\[(\d{1,2}):(\d{2})[:\.](\d{2,3})\](.*)/);
            if (m) {
                const text = m[4].trim();
                if (metadataRegex.test(text)) continue; // Filter credits
                const ms = (parseInt(m[1]) * 60 + parseInt(m[2])) * 1000
                    + parseInt(m[3].padEnd(3, "0").slice(0, 3));
                synced.push({ startTime: ms, text: text || "♪" });
            } else {
                const text = raw.trim();
                if (text && !metadataRegex.test(text)) {
                    unsynced.push({ text });
                }
            }
        }
        return {
            synced: synced.length ? synced : null,
            unsynced: unsynced.length ? unsynced : null
        };
    }

    async function findLyrics(info) {
        const err = (msg) => ({ error: msg, uri: info.uri });

        try {
            const U = typeof Utils !== "undefined" ? Utils : (window.LyricsPlus?.Utils || {});
            // Clean title and extract primary artist to optimize NetEase's search engine
            const cleanTitle = U.removeSongFeat ? U.removeSongFeat(U.removeExtraInfo(info.title)) : info.title;
            const primaryArtist = (info.artist || "").split(",")[0].split("&")[0].trim(); // Extract first artist

            DebugLogger.log(`[NetEase] Searching for "${cleanTitle}" by primary artist "${primaryArtist}"`);
            let songs = await searchSongs(`${cleanTitle} ${primaryArtist}`, 8);
            let scored = songs
                .map(c => ({ c, score: scoreCandidate(c, info) }))
                .sort((a, b) => b.score - a.score);

            // Layered Fallback 1: If no results or best match score is poor, search by title alone
            if (!scored.length || scored[0].score < SCORE_THRESHOLD) {
                DebugLogger.log(`[NetEase] Combined search score too low (${scored[0]?.score?.toFixed(2) || 0}), falling back to title alone: "${cleanTitle}"`);
                const titleOnlySongs = await searchSongs(cleanTitle, 10);
                const titleScored = titleOnlySongs
                    .map(c => ({ c, score: scoreCandidate(c, info) }))
                    .sort((a, b) => b.score - a.score);

                if (titleScored.length && (!scored.length || titleScored[0].score > scored[0].score)) {
                    scored = titleScored;
                }
            }

            // Layered Fallback 2: If still poor, search by primary artist alone
            if (!scored.length || scored[0].score < SCORE_THRESHOLD) {
                DebugLogger.log(`[NetEase] Title search score too low, falling back to artist: "${primaryArtist}"`);
                const artistOnlySongs = await searchSongs(primaryArtist, 10);
                const artistScored = artistOnlySongs
                    .map(c => ({ c, score: scoreCandidate(c, info) }))
                    .sort((a, b) => b.score - a.score);

                if (artistScored.length && (!scored.length || artistScored[0].score > scored[0].score)) {
                    scored = artistScored;
                }
            }
            if (!scored.length) return err("NetEase: no results");

            DebugLogger.log(
                `[NetEase] Top matches for "${info.title}":`,
                scored.slice(0, 3).map(s => `${s.c.name} — ${s.score.toFixed(2)}`)
            );

            // Iterate through top candidates to find one with actual lyrics
            for (const item of scored.slice(0, 5)) {
                let threshold = SCORE_THRESHOLD;
                const cand = item.c;
                const deltaMs = Math.abs((cand.dt || cand.duration || 0) - (info.duration || 0));
                if (deltaMs < 8000) {
                    threshold = 0.12; // High confidence when duration is closely aligned
                } else if (deltaMs < 15000) {
                    threshold = 0.18;
                }

                if (item.score < threshold) continue;

                const songId  = cand.id;
                const lyricData = await fetchLyricsById(songId);
                
                const rawLrc = lyricData?.lrc?.lyric || "";
                let { synced, unsynced } = parseLyrics(rawLrc);
                if (!synced && !unsynced) continue;

                let neteaseTranslation = null;
                // Only load translation if it's not already used as primary lyrics
                if (lyricData?.tlyric?.lyric && lyricData.tlyric.lyric !== rawLrc) {
                    const transResult = parseLyrics(lyricData.tlyric.lyric);
                    neteaseTranslation = transResult.synced || transResult.unsynced || null;
                }

                if (!synced && unsynced && neteaseTranslation && neteaseTranslation.some(l => l.startTime !== undefined)) {
                    // If original is unsynced but translation is synced, copy timestamps
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

                return {
                    uri:               info.uri,
                    provider:          "netease",
                    copyright:         "网易云音乐 (NetEase Cloud Music)",
                    synced,
                    unsynced,
                    genius:            null,
                    neteaseTranslation,
                    _neteaseId:        songId,
                    _neteaseScore:     item.score,
                };
            }

            return err("NetEase: no valid lyrics found across top candidates");

        } catch (e) {
            console.warn("[Lyrics+] ProviderNetease:", e.message);
            return err(`NetEase: ${e.message}`);
        }
    }

    function openManualSearchModal(onFound) {
        const react  = Spicetify.React;
        const track  = Spicetify.Player.data?.item;
        const info   = typeof LyricsFetcher !== "undefined"
            ? LyricsFetcher.infoFromTrack(track) : null;
        let translatorInstance = null;

        const Modal = () => {
            const [query,   setQuery]   = react.useState(info ? `${info.title} ${info.artist}` : "");
            const [results, setResults] = react.useState([]);
            const [status,  setStatus]  = react.useState("idle");
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
                    console.error("[Lyrics+] NetEase CJK suggestions error:", err);
                }
            };

            const doSearch = async (searchQuery = query) => {
                const cleanQuery = searchQuery.trim();
                if (!cleanQuery) return;

                // Check RAM cache
                if (info?.uri && searchCache[info.uri] && searchCache[info.uri].query === cleanQuery) {
                    if (window.lyricsPlusDebug) console.log("[Lyrics+] NetEase search cache HIT:", info.uri);
                    const cachedData = searchCache[info.uri].results;
                    setResults(cachedData);
                    setStatus(cachedData.length ? "done" : "empty");
                    return;
                }

                setStatus("loading");
                setResults([]);
                setErrorMsg("");
                try {
                    let songs = await searchSongs(cleanQuery, 6);

                    // Smart Fallback for manual modal initial query
                    if (info && cleanQuery === `${info.title} ${info.artist}`.trim()) {
                        const scored = songs.map(c => ({ c, score: scoreCandidate(c, info) }));
                        if (!scored.length || Math.max(...scored.map(s => s.score)) < 0.28) {
                            const titleSongs = await searchSongs(info.title, 6);
                            if (titleSongs.length) {
                                const existingIds = new Set(songs.map(s => s.id));
                                for (const ts of titleSongs) {
                                    if (!existingIds.has(ts.id)) songs.push(ts);
                                }
                            }
                        }
                    }

                    // Rank results by relevance to current playing track
                    if (info) {
                        songs.sort((a, b) => scoreCandidate(b, info) - scoreCandidate(a, info));
                    }
                    
                    // Fetch lyric status for top results to display badges
                    const songsWithLyrics = await Promise.all(songs.slice(0, 6).map(async (song, idx) => {
                        if (idx > 2) {
                            return { ...song, hasLyrics: undefined, isSynced: undefined };
                        }
                        try {
                            const lyricData = await fetchLyricsById(song.id);
                            const rawLrc = lyricData?.lrc?.lyric || "";
                            
                             let isSynced = false;
                             let hasLyrics = false;
                             if (rawLrc.trim()) {
                                 hasLyrics = true;
                                 const parsed = parseLyrics(rawLrc);
                                 let neteaseTrans = null;
                                 if (lyricData?.tlyric?.lyric && lyricData.tlyric.lyric !== rawLrc) {
                                     const transResult = parseLyrics(lyricData.tlyric.lyric);
                                     neteaseTrans = transResult.synced || transResult.unsynced || null;
                                 }
                                 let finalSynced = parsed.synced;
                                 if (!finalSynced && parsed.unsynced && neteaseTrans && neteaseTrans.some(l => l.startTime !== undefined)) {
                                     const newSynced = parsed.unsynced.map((line, idx) => {
                                         const transLine = neteaseTrans[idx];
                                         return {
                                             ...line,
                                             startTime: transLine ? transLine.startTime : undefined
                                         };
                                     });
                                     if (newSynced.some(l => l.startTime !== undefined)) {
                                         finalSynced = newSynced;
                                     }
                                 }
                                 isSynced = !!finalSynced;
                             }
                            
                            return {
                                ...song,
                                hasLyrics,
                                isSynced,
                                lyricText: rawLrc,
                                tlyricText: lyricData?.tlyric?.lyric || null
                            };
                        } catch (_) {
                            return { ...song, hasLyrics: false, isSynced: false };
                        }
                    }));

                    // Save to RAM cache
                    if (info?.uri) {
                        searchCache[info.uri] = { query: cleanQuery, results: songsWithLyrics };
                    }

                    if (isMountedRef.current) {
                        setResults(songsWithLyrics);
                        setStatus(songsWithLyrics.length ? "done" : "empty");
                    }
                } catch (e) {
                    console.error("[Lyrics+] NetEase manual search failed:", e);
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

            const pick = async (song) => {
                setStatus("loading");
                try {
                    let lyricData = song;
                    if (song.hasLyrics === undefined) {
                        const d = await fetchLyricsById(song.id);
                        const rawLrc = d?.lrc?.lyric || "";
                        lyricData = {
                            hasLyrics: !!(rawLrc.trim()),
                            isSynced: /\[\d{1,2}:\d{2}/.test(rawLrc),
                            lyricText: rawLrc,
                            tlyricText: d?.tlyric?.lyric || null
                        };
                    }

                    let { synced, unsynced } = parseLyrics(lyricData.lyricText);
                    if (!synced && !unsynced) {
                        Spicetify.showNotification("❌ No lyrics found for this track", true);
                        setStatus("done");
                        return;
                    }

                    let neteaseTranslation = null;
                    if (lyricData.tlyricText) {
                        const transResult = parseLyrics(lyricData.tlyricText);
                        neteaseTranslation = transResult.synced || transResult.unsynced || null;
                    }

                    if (!synced && unsynced && neteaseTranslation && neteaseTranslation.some(l => l.startTime !== undefined)) {
                        // If original is unsynced but translation is synced, copy timestamps
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

                    onFound?.({
                        uri:               info?.uri || "",
                        provider:          "netease",
                        copyright:         "网易云音乐 (NetEase Cloud Music)",
                        synced,
                        unsynced,
                        genius:            null,
                        neteaseTranslation,
                        _neteaseId:        song.id,
                        _neteaseScore:     1.0,
                    });
                    setSelectedId(song.id);
                    Spicetify.PopupModal.hide();
                    Spicetify.showNotification("✓ " + getText("notifications.neteaseLyricsLoaded", { songName: song.name }));
                } catch (e) {
                    Spicetify.showNotification("❌ " + e.message, true);
                    setStatus("done");
                }
            };

            const fmt = (ms) => {
                if (!ms) return "";
                return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
            };

            return react.createElement("div", { style: { padding: "8px", minWidth: "380px", maxWidth: "480px" } },

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

                // Search row
                react.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "14px" } },
                    react.createElement("input", {
                        type: "text",
                        value: query,
                        placeholder: getText("neteaseModal.placeholder") || "Search by original name (kanji, hangul, romaji...)",
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
                    }, status === "loading" ? "…" : (getText("neteaseModal.search") || "Search"))
                ),

                // CJK Phonetic Suggestions (offline, zero-latency)
                localSuggestions && react.createElement("div", {
                    style: {
                        marginBottom: "14px",
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
                        react.createElement("span", { style: { fontSize: "11px", fontWeight: "bold", color: "#aaa" } }, getText("videoModal.aiSuggestions") || "CJK Phonetic Suggestions:")
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
                            const labels = {
                                romaji: "Romaji",
                                romaja: "Romaja",
                                pinyin: "Pinyin"
                            };
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

                // Status messages
                status === "loading" && react.createElement("div", {
                    style: { color: "var(--spice-button, #1db954)", fontSize: "12px", textAlign: "center", padding: "20px 0" }
                }, "Searching NetEase…"),

                status === "error" && react.createElement("div", {
                    style: { color: "#ff6b6b", fontSize: "12px", marginBottom: "10px" }
                }, errorMsg || (getText("neteaseModal.failed") || "Search failed")),

                status === "empty" && react.createElement("div", {
                    style: { color: "#aaa", fontSize: "12px", textAlign: "center", padding: "20px 0" }
                }, getText("neteaseModal.noResults") || "No results found. Try searching by original name or romaji."),

                // Results
                results.length > 0 && react.createElement("div", {
                    style: {
                        maxHeight: "280px", overflowY: "auto",
                        display: "flex", flexDirection: "column", gap: "6px",
                    }
                },
                    results.map((song, i) => {
                        const artists = (song.ar || song.artists || []).map(a => a.name).join(", ");
                        const dur     = fmt(song.dt || song.duration);
                        return react.createElement("button", {
                            key: song.id,
                            onClick: () => pick(song),
                            style: {
                                display: "flex", alignItems: "center", gap: "12px",
                                width: "100%", padding: "8px 12px",
                                background: song.id === selectedId ? "rgba(29,185,84,0.12)" : "rgba(255,255,255,0.04)",
                                border: song.id === selectedId ? "1px solid rgba(29,185,84,0.35)" : "1px solid transparent",
                                borderRadius: "8px", cursor: "pointer",
                                textAlign: "left", color: "var(--spice-text)",
                            }
                        },
                            react.createElement("div", { style: { flex: 1, minWidth: 0 } },
                                react.createElement("div", {
                                    style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }
                                },
                                    react.createElement("span", {
                                        style: {
                                            fontWeight: "bold", fontSize: "13px",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                        }
                                    }, song.name),
                                    song.hasLyrics !== undefined && react.createElement("span", {
                                        style: {
                                            fontSize: "9px",
                                            fontWeight: "bold",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            textTransform: "uppercase",
                                            backgroundColor: !song.hasLyrics ? "rgba(235, 87, 87, 0.15)" : (song.isSynced ? "rgba(29, 185, 84, 0.15)" : "rgba(255, 165, 0, 0.15)"),
                                            color: !song.hasLyrics ? "#eb5757" : (song.isSynced ? "#1db954" : "#ffa500"),
                                            border: !song.hasLyrics ? "1px solid rgba(235, 87, 87, 0.25)" : (song.isSynced ? "1px solid rgba(29, 185, 84, 0.25)" : "1px solid rgba(255, 165, 0, 0.25)"),
                                        }
                                    }, !song.hasLyrics ? "No Lyrics" : (song.isSynced ? "Synced" : "Unsynced"))
                                ),
                                react.createElement("div", {
                                    style: {
                                        fontSize: "11px", color: "#aaa",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                    }
                                }, artists)
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
            title: getText("neteaseModal.title") || "Search Lyrics on NetEase",
            content: react.createElement(Modal),
        });
    }

    return { findLyrics, fetchLyrics: findLyrics, openManualSearchModal, searchSongs, fetchLyricsById };
})();

window.ProviderNetease = ProviderNetease;
if (window.LyricsPlus) {
    window.LyricsPlus.ProviderNetease = ProviderNetease;
}
