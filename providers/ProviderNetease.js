/**
 * ProviderNetease.js — NetEase Cloud Music (网易云音乐) Lyrics Provider
 *
 * Calls music.163.com DIRECTLY from the Spotify Electron renderer process.
 * Electron does NOT enforce browser CORS policy, so no proxy is needed.
 *
 * Requires a session Cookie from music.163.com (paste in Settings).
 * The cookie is long-lived (months) and only needs occasional refresh.
 *
 * Strategy (Option C):
 *   1. Auto-fetch with fuzzy matching (title+artist+duration scoring).
 *   2. Silent fallback on low-confidence matches.
 *   3. Manual search modal for native-script queries.
 */

const ProviderNetease = (() => {

    // ─── NetEase HTTP Helpers ────────────────────────────────────────────────

    const BASE_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer":    "https://music.163.com",
        "Origin":     "https://music.163.com",
    };

    /**
     * Search NetEase for songs.
     * Uses Spicetify.CosmosAsync to bypass browser CORS rules.
     */
    async function searchSongs(query, limit = 5) {
        const url = `http://music.163.com/api/search/get?s=${encodeURIComponent(query)}&type=1&offset=0&limit=${limit}`;
        const headers = { ...BASE_HEADERS };

        try {
            const json = await Spicetify.CosmosAsync.get(url, null, headers);
            if (json.code !== 200) throw new Error(`NetEase search code ${json.code}`);
            return json?.result?.songs || [];
        } catch (e) {
            throw new Error(`NetEase search failed: ${e.message}`);
        }
    }

    /**
     * Fetch LRC lyrics for a song ID.
     */
    async function fetchLyricsById(id) {
        const url = `http://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`;
        const headers = { ...BASE_HEADERS };

        try {
            const json = await Spicetify.CosmosAsync.get(url, null, headers);
            if (json.code !== 200) throw new Error(`NetEase lyric code ${json.code}`);
            return json;
        } catch (e) {
            throw new Error(`NetEase lyric failed: ${e.message}`);
        }
    }

    // ─── Fuzzy Match ─────────────────────────────────────────────────────────

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
        const artistStr = (candidate.ar || candidate.artists || []).map(a => a.name).join(" ");
        const titleSim  = levenshtein(candidate.name, info.title);
        const artistSim = levenshtein(artistStr, info.artist);
        const deltaMs   = Math.abs((candidate.dt || candidate.duration || 0) - (info.duration || 0));
        const durScore  = Math.max(0, 1 - deltaMs / 10000);
        return titleSim * 0.4 + artistSim * 0.3 + durScore * 0.3;
    }

    const SCORE_THRESHOLD = 0.28;

    // ─── LRC Parser ──────────────────────────────────────────────────────────

    function parseLRC(lrcText) {
        if (!lrcText?.trim()) return null;
        if (typeof Utils !== "undefined" && Utils.parseLocalLyrics) {
            const p = Utils.parseLocalLyrics(lrcText);
            return p.synced || p.unsynced || null;
        }
        // Minimal fallback - modernized to handle [mm:ss:xx] and filter metadata
        const lines = lrcText.split("\n");
        const result = [];
        const metadataRegex = /^(作词|作曲|编曲|演唱|制作|人声|后期|混音|母带|作詞|作曲|編曲|歌詞|Lyricist|Composer|Arranger|Producer|Lyrics|Vocals|Mixer|Mastering|Lời|Nhạc|Phối khí|Trình bày|Sáng tác)\s*[:：]/i;

        for (const raw of lines) {
            const m = raw.match(/^\[(\d{1,2}):(\d{2})[:\.](\d{2,3})\](.*)/);
            if (!m) continue;

            const text = m[4].trim();
            if (metadataRegex.test(text)) continue; // Filter credits

            const ms = (parseInt(m[1]) * 60 + parseInt(m[2])) * 1000
                + parseInt(m[3].padEnd(3, "0").slice(0, 3));
            result.push({ startTime: ms, text: text || "♪" });
        }
        return result.length ? result : null;
    }

    // ─── Main Provider ────────────────────────────────────────────────────────

    /**
     * Auto-find and return lyrics for a track.
     * @param {TrackInfo} info
     */
    async function findLyrics(info) {
        const err = (msg) => ({ error: msg, uri: info.uri });

        try {
            let songs = await searchSongs(`${info.title} ${info.artist}`, 6);

            // Fallback: search by artist alone + match by duration
            if (!songs.length) {
                songs = await searchSongs(info.artist, 8);
            }
            if (!songs.length) return err("NetEase: no results");

            const scored = songs
                .map(c => ({ c, score: scoreCandidate(c, info) }))
                .sort((a, b) => b.score - a.score);

            DebugLogger.log(
                `[NetEase] Top matches for "${info.title}":`,
                scored.slice(0, 3).map(s => `${s.c.name} — ${s.score.toFixed(2)}`)
            );

            if (scored[0].score < SCORE_THRESHOLD) {
                return err(`NetEase: best match score ${scored[0].score.toFixed(2)} below threshold`);
            }

            const best    = scored[0].c;
            const songId  = best.id;
            const lyricData = await fetchLyricsById(songId);
            const synced  = parseLRC(lyricData?.lrc?.lyric);
            if (!synced) return err("NetEase: no synced lyrics for this track");

            return {
                uri:               info.uri,
                provider:          "netease",
                copyright:         "网易云音乐 (NetEase Cloud Music)",
                synced,
                unsynced:          null,
                genius:            null,
                neteaseTranslation: parseLRC(lyricData?.tlyric?.lyric) || null,
                _neteaseId:        songId,
                _neteaseScore:     scored[0].score,
            };

        } catch (e) {
            console.warn("[Lyrics+] ProviderNetease:", e.message);
            return err(`NetEase: ${e.message}`);
        }
    }

    // ─── Manual Search Modal ─────────────────────────────────────────────────

    /**
     * Opens a popup for manual NetEase search.
     * @param {function(object)} onFound — called with the lyrics result
     */
    function openManualSearchModal(onFound) {
        const react  = Spicetify.React;
        const track  = Spicetify.Player.data?.item;
        const info   = typeof LyricsFetcher !== "undefined"
            ? LyricsFetcher.infoFromTrack(track) : null;

        const Modal = () => {
            const [query,   setQuery]   = react.useState(info ? `${info.title} ${info.artist}` : "");
            const [results, setResults] = react.useState([]);
            const [status,  setStatus]  = react.useState("idle");

            const doSearch = async () => {
                if (!query.trim()) return;
                setStatus("loading");
                setResults([]);
                try {
                    const songs = await searchSongs(query.trim(), 8);
                    setResults(songs);
                    setStatus(songs.length ? "done" : "empty");
                } catch (e) {
                    setStatus("error");
                }
            };

            const pick = async (song) => {
                setStatus("loading");
                try {
                    const d      = await fetchLyricsById(song.id);
                    const synced = parseLRC(d?.lrc?.lyric);
                    if (!synced) {
                        Spicetify.showNotification("❌ Không có synced lyrics cho bài này.", true);
                        setStatus("done");
                        return;
                    }
                    onFound?.({
                        uri:               info?.uri || "",
                        provider:          "netease",
                        copyright:         "网易云音乐 (NetEase Cloud Music)",
                        synced,
                        unsynced:          null,
                        genius:            null,
                        neteaseTranslation: parseLRC(d?.tlyric?.lyric) || null,
                        _neteaseId:        song.id,
                        _neteaseScore:     1.0,
                    });
                    Spicetify.PopupModal.hide();
                    Spicetify.showNotification(`✓ Đã tải lyrics: ${song.name}`);
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
                        placeholder: "Tìm theo tên gốc (kanji, hangul, romaji...)",
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
                        onClick: doSearch,
                        disabled: status === "loading",
                        style: {
                            padding: "7px 16px", borderRadius: "6px", border: "none",
                            cursor: "pointer",
                            fontWeight: "bold", fontSize: "13px",
                            background: "var(--spice-button)", color: "#fff",
                        },
                    }, status === "loading" ? "…" : "Tìm")
                ),

                // Status messages
                status === "error" && react.createElement("div", {
                    style: { color: "#ff6b6b", fontSize: "12px", marginBottom: "10px" }
                }, "Tìm kiếm thất bại. Vui lòng kiểm tra kết nối mạng."),

                status === "empty" && react.createElement("div", {
                    style: { color: "#aaa", fontSize: "12px", textAlign: "center", padding: "20px 0" }
                }, "Không tìm thấy kết quả. Thử tìm bằng tên gốc hoặc romaji."),

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
                                background: i === 0 ? "rgba(29,185,84,0.12)" : "rgba(255,255,255,0.04)",
                                border: i === 0 ? "1px solid rgba(29,185,84,0.35)" : "1px solid transparent",
                                borderRadius: "8px", cursor: "pointer",
                                textAlign: "left", color: "var(--spice-text)",
                            }
                        },
                            react.createElement("div", { style: { flex: 1, minWidth: 0 } },
                                react.createElement("div", {
                                    style: {
                                        fontWeight: "bold", fontSize: "13px",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                    }
                                }, song.name),
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
            title: "Tìm Lyrics trên NetEase",
            content: react.createElement(Modal),
        });
    }

    return { findLyrics, openManualSearchModal, searchSongs, fetchLyricsById };
})();

window.ProviderNetease = ProviderNetease;
