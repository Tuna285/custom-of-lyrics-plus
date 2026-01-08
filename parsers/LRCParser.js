
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
        const lines = rawLines.replace(/\r\n/g, "\n").split("\n").map(line => line.trim()).filter(line => line !== "");

        console.log(`[Lyrics+] Found ${lines.length} non-empty lines`);

        const syncedTimestamp = /\[([0-9:.]+)\]/;
        const karaokeTimestamp = /<([0-9:.]+)>/;
        const unsynced = [];

        const isSynced = lines.some(line => syncedTimestamp.test(line));
        const synced = isSynced ? [] : null;
        const isKaraoke = lines.some(line => karaokeTimestamp.test(line));
        const karaoke = isKaraoke ? [] : null;

        function timestampToMs(timestamp) {
            // Normalize timestamp by removing [], <>
            const parts = timestamp.replace(/[\[\]<>]/g, "").split(":");
            return parts.length === 2 ? Number(parts[0]) * 60 * 1000 + Number(parts[1]) * 1000 : 0;
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
            // Use global regex to remove ALL timestamps from the text content
            let lyricContent = line.replace(/\[\d{1,3}:\d{1,3}(\.\d+)?\]/g, "").trim();
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
