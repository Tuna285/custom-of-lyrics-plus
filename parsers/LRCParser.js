
const LRCParser = {
    /**
     * Parses local lyrics string into structured data (synced, unsynced, karaoke)
     * @param {string} lyrics Raw lyrics text
     * @returns {{synced: array|null, unsynced: array, karaoke: array|null}}
     */
    parseLocalLyrics(lyrics) {
        // Input validation (Operational Rule #1)
        if (!lyrics || typeof lyrics !== 'string') {
            console.warn("[LRCParser] Invalid input: lyrics must be a non-empty string");
            return { synced: null, unsynced: [], karaoke: null };
        }

        console.log("[Lyrics+] Parsing local lyrics file...");
        // Remove metadata tags [ti:...] [ar:...]
        const rawLines = lyrics.replaceAll(/\[[a-zA-Z]+:.+\]/g, "").trim();
        // Handle newlines for both Windows (\r\n) and Unix (\n), remove empty lines
        const lines = rawLines.replace(/\r\n/g, "\n").split("\n").map(line => line.trim()).filter(line => {
            if (!line) return false;
            // Remove metadata lines (credits/composer/theme song/anime OP/ED etc.)
            const textOnly = line.replace(/\[[^\]]+\]/g, "").trim();
            const isMetadata = /^(作词人?|作曲人?|编曲人?|演唱(?:者)?|制作(?:人|助理|室|公司)?|製作(?:人|助理|室|公司)?|监制|監製|出品人?|发行人?|發行人?|企划|企劃|统筹|統籌|人声(?:编辑|修音|录音)?|配唱(?:制作人|制作)?|后期(?:制作|工程)?|录音(?:师|室|棚|助理|工程师)?|混音(?:师|室|棚|助理|工程师)?|母带(?:师|室|棚|工程|工程师|后期)?|音频(?:工程|工程师|编辑)?|声音(?:工程|工程师)?|作詞人?|作曲人?|編曲人?|歌詞|演奏|歌|唄|唱|アーティスト|歌手|プロデューサー|ディレクター|レコーディング(?:エンジニア)?|ミキシング(?:エンジニア)?|マスタリング(?:エンジニア)?|エンジニア|吉他(?:录音|演奏)?|贝斯(?:录音|演奏)?|鼓(?:录音|演奏)?|弦乐(?:录音|编写|演奏|监制)?|和音(?:编写|录音)?|和声(?:编写|录音)?|(?:Recording|Mixing|Mastering|Audio|Sound)\s+(?:Engineer|Studio|Producer)|(?:Vocal|Track|Sound)\s+(?:Producer|Editor|Director)|Lyricist|Composer|Arranger|Producer|Lyrics|Vocals|Mixer|Mastering|Guitar|Bass|Drums|Strings|Recording|Artist|Singer|Lời|Nhạc|Phối khí|Trình bày|Sáng tác|Hòa âm)\s*[:：]|^(Written by|Composed by|Arranged by|Produced by|Mixed by|Mastered by|Recorded by|Sound Produced by|Directed by|Performed by|Vocals by|Music by|Lyrics by)\b|(テーマソング|主題歌|オープニングテーマ|エンディングテーマ|挿入歌|イメージソング|テーマ曲|\bTheme Song\b|\bOpening Theme\b|\bEnding Theme\b|\bInsert Song\b)|^(LRC|Lrc|lrc|Offset|offset|by|By|提供|字幕|翻译|翻譯|校对|潤色)\s*[:：]/i.test(textOnly);
            return !isMetadata;
        });

        console.log(`[Lyrics+] Found ${lines.length} non-empty lines`);

        const syncedTimestamp = /\[([0-9:.]+)\]/;
        const karaokeTimestamp = /<([0-9:.]+)> /;
        const unsynced = [];

        const isSynced = lines.some(line => syncedTimestamp.test(line));
        let synced = isSynced ? [] : null;
        const isKaraoke = lines.some(line => karaokeTimestamp.test(line));
        let karaoke = isKaraoke ? [] : null;

        // Shared regex for cleaning timestamps from text
        const TIMESTAMP_CLEAN_RE = /\[\d{1,3}:\d{1,3}[:.]\d+\]/g;

        function timestampToMs(timestamp) {
            // Normalize timestamp by removing [], <>
            const parts = timestamp.replace(/[\[\]<>]/g, "").split(/[:\.]/);
            if (parts.length >= 3) {
                // LRC standard is usually mm:ss.xx (3 parts after split: [mm, ss, xx])
                // Some providers use [mm:ss:xx] (also 3 parts)
                return (Number(parts[0]) * 60 + Number(parts[1])) * 1000 + Number(parts[2].padEnd(3, "0").slice(0, 3));
            }
            if (parts.length === 2) {
                return Number(parts[0]) * 60 * 1000 + Number(parts[1]) * 1000;
            }
            return 0;
        }

        function parseKaraokeLine(line, startTime) {
            let wordTime = timestampToMs(startTime);
            const karaokeLine = [];
            const matches = line.matchAll(/(\S+ ?)<([0-9:.]+)>/g);
            for (const match of matches) {
                const msTime = timestampToMs(match[2]);
                if (!isNaN(msTime)) {
                    karaokeLine.push({ word: match[1], time: msTime - wordTime });
                    wordTime = msTime;
                }
            }
            return karaokeLine;
        }

        for (const [i, line] of lines.entries()) {
            const timeMatch = line.match(syncedTimestamp);
            const time = timeMatch?.[1];
            // Use shared regex to remove ALL timestamps from the text content
            let lyricContent = line.replace(TIMESTAMP_CLEAN_RE, "").trim();
            const lyric = lyricContent.replaceAll(/<([0-9:.]+)>/g, "").trim();

            if (isSynced && time) {
                const ms = timestampToMs(time);
                if (!isNaN(ms)) synced.push({ text: lyric || "♪", startTime: ms, originalText: lyric || "♪" });
            }
            if (isKaraoke && time) {
                const nextTime = lines[i + 1]?.match(syncedTimestamp)?.[1];
                const endTime = nextTime || (Spicetify.Player.getDuration() ? Utils.formatTime(Spicetify.Player.getDuration()) : "0:00");
                // Note: Utils.formatTime dependency needs attention. 
                // Either pass it in or duplicate a simple helper here to keep this pure.
                // Decdision: Duplicate simple helper to keep module pure.
            
                if (!lyricContent.endsWith(">")) lyricContent += `<${endTime}>`;
                const ms = timestampToMs(time);
                if (!isNaN(ms)) karaoke.push({ text: parseKaraokeLine(lyricContent, time), startTime: ms, originalText: lyric || "♪" });
            }
            unsynced.push({ text: lyric || "♪", originalText: lyric || "♪" });
        }

        // Sort lyrics by time to prevent order issues
        if (synced) {
            synced.sort((a, b) => a.startTime - b.startTime);
            // Safe clean: only clean dummy provider lines if track is not instrumental (has > 2 lines)
            if (synced.length > 2) {
                const cleanedSynced = synced.filter((line, i) => {
                    if (!line || typeof line.text !== 'string') return false;
                    const trimmed = line.text.trim();
                    if (trimmed === "" || trimmed === "♪") {
                        const next = synced[i + 1];
                        if (next && (next.startTime - line.startTime) < 9000) {
                            return false;
                        }
                    }
                    return true;
                });
                if (cleanedSynced.length > 0) {
                    synced = cleanedSynced;
                }
            }
        }

        return {
            synced: (synced && synced.length > 0) ? synced : null,
            unsynced,
            karaoke: (karaoke && karaoke.length > 0) ? karaoke : null
        };
    },

    /**
     * Cleans up lyric text (removes punctuation etc) for comparison
     * @param {string} lyrics 
     * @returns {string}
     */
    processLyrics(lyrics) {
        // Input validation (Operational Rule #1)
        if (!lyrics || typeof lyrics !== 'string') return '';
        
        return lyrics
            .replace(/　| /g, "") // Remove space
            .replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~？！，。、《》【】「」]/g, ""); // Remove punctuation
    }
};

// Expose to global scope
window.LRCParser = LRCParser;
