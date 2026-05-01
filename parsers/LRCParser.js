
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
            // Remove metadata lines (credits/composer etc.)
            const textOnly = line.replace(/\[[^\]]+\]/g, "").trim();
            const isMetadata = /^(作词|作曲|编曲|演唱|制作|人声|后期|混音|母带|作詞|作曲|編曲|歌詞|Lyricist|Composer|Arranger|Producer|Lyrics|Vocals|Mixer|Mastering|Lời|Nhạc|Phối khí|Trình bày|Sáng tác)\s*[:：]/i.test(textOnly);
            return !isMetadata;
        });

        console.log(`[Lyrics+] Found ${lines.length} non-empty lines`);

        const syncedTimestamp = /\[([0-9:.]+)\]/;
        const karaokeTimestamp = /<([0-9:.]+)> /;
        const unsynced = [];

        const isSynced = lines.some(line => syncedTimestamp.test(line));
        const synced = isSynced ? [] : null;
        const isKaraoke = lines.some(line => karaokeTimestamp.test(line));
        const karaoke = isKaraoke ? [] : null;

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
                const endTime = nextTime || Spicetify.Player.getDuration() ? Utils.formatTime(Spicetify.Player.getDuration()) : "0:00"; 
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
        if (synced) synced.sort((a, b) => a.startTime - b.startTime);

        return { synced, unsynced, karaoke };
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
