// services/IDBCache.js
// Unified IndexedDB manager ('lyrics-plus-db' v2) + backward-compatible IDBCache facade

const UNIFIED_DB_NAME = "lyrics-plus-db";
const UNIFIED_DB_VERSION = 2;
const STORE_LYRICS = "lyrics-cache";
const STORE_USER_TRACKS = "user_tracks";
const STORE_AI_CACHE = "ai_cache";
const STORE_EPHEMERAL = "ephemeral_cache";
const LEGACY_CACHE_DB_NAME = "lyrics-plus-cache";
const MIGRATION_FLAG_KEY = "lyrics-plus:unified-db-v2";

const EPHEMERAL_PREFIXES = ["netease:", "video-auto:", "video-meta:", "video-blacklist:"];
const MANUAL_VIDEO_PREFIX = "video-manual:";
const VIDEO_OFFSET_PREFIX = "video-offset:";
const PHONETIC_MODES = new Set([
    "gemini_romaji",
    "gemini_furigana",
    "romaji",
    "furigana",
    "hiragana",
    "katakana",
    "hangul",
    "romaja",
    "cn",
    "hk",
    "tw",
]);

function isEphemeralKey(key) {
    return typeof key === "string" && EPHEMERAL_PREFIXES.some((p) => key.startsWith(p));
}

function hasMeaningfulOverrides(mapObj) {
    if (!mapObj || typeof mapObj !== "object") return false;
    return Object.values(mapObj).some(
        (slot) => slot && slot.lines && Object.keys(slot.lines).length > 0
    );
}

function isUserTrackEmpty(record) {
    if (!record) return true;
    const hasLyrics = Boolean(
        record.lyrics &&
        (record.lyrics.synced || record.lyrics.unsynced || record.lyrics.karaoke || record.lyrics.genius)
    );
    const hasPronoun = Boolean(record.pronoun && record.pronoun !== "default");
    const hasDelay = typeof record.delayMs === "number" && Number.isFinite(record.delayMs) && record.delayMs !== 0;
    const hasVideoId = Boolean(record.videoId);
    const hasVideoOffset = typeof record.videoOffset === "number" && Number.isFinite(record.videoOffset) && record.videoOffset !== 0;
    return (
        !hasLyrics &&
        !hasPronoun &&
        !hasDelay &&
        !hasVideoId &&
        !hasVideoOffset &&
        !hasMeaningfulOverrides(record.translations) &&
        !hasMeaningfulOverrides(record.phonetics)
    );
}

function mergeUserTrackRecord(existing, patch) {
    const base = existing ? { ...existing } : { uri: patch.uri, schemaVersion: 2 };
    const next = {
        ...base,
        ...patch,
        uri: patch.uri || base.uri,
        schemaVersion: 2,
        updatedAt: Date.now(),
    };
    if (patch.meta || base.meta) {
        next.meta = { ...(base.meta || {}), ...(patch.meta || {}) };
    }
    if (patch.translations !== undefined) {
        next.translations = patch.translations;
    } else if (base.translations) {
        next.translations = { ...base.translations };
    }
    if (patch.phonetics !== undefined) {
        next.phonetics = patch.phonetics;
    } else if (base.phonetics) {
        next.phonetics = { ...base.phonetics };
    }
    return next;
}

const UnifiedDB = {
    STORES: {
        LYRICS: STORE_LYRICS,
        USER_TRACKS: STORE_USER_TRACKS,
        AI_CACHE: STORE_AI_CACHE,
        EPHEMERAL: STORE_EPHEMERAL,
    },
    _db: null,
    _initPromise: null,
    _readyPromise: null,
    _userTracksMap: new Map(),
    _userTracksLoaded: false,
    _indexedDB: null,
    _localStorage: null,

    _getIDB() {
        return this._indexedDB || (typeof indexedDB !== "undefined" ? indexedDB : null);
    },

    _getLS() {
        if (this._localStorage) return this._localStorage;
        try {
            return typeof localStorage !== "undefined" ? localStorage : null;
        } catch {
            return null;
        }
    },

    /**
     * Test hook to inject mock IndexedDB / localStorage without altering global state permanently.
     */
    _setTestEnv(idbFactory, lsStorage) {
        this._indexedDB = idbFactory || null;
        this._localStorage = lsStorage || null;
        this._db = null;
        this._initPromise = null;
        this._readyPromise = null;
        this._userTracksMap.clear();
        this._userTracksLoaded = false;
    },

    /**
     * Open unified IndexedDB ('lyrics-plus-db' v2) cleanly, preserving existing v1 'lyrics-cache'.
     * @returns {Promise<IDBDatabase|null>}
     */
    async openDB() {
        if (this._db) return this._db;
        if (this._initPromise) return this._initPromise;

        const idb = this._getIDB();
        if (!idb) return null;

        this._initPromise = new Promise((resolve) => {
            try {
                const request = idb.open(UNIFIED_DB_NAME, UNIFIED_DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_LYRICS)) {
                        db.createObjectStore(STORE_LYRICS);
                    }
                    if (!db.objectStoreNames.contains(STORE_USER_TRACKS)) {
                        db.createObjectStore(STORE_USER_TRACKS, { keyPath: "uri" });
                    }
                    if (!db.objectStoreNames.contains(STORE_AI_CACHE)) {
                        db.createObjectStore(STORE_AI_CACHE, { keyPath: "key" });
                    }
                    if (!db.objectStoreNames.contains(STORE_EPHEMERAL)) {
                        db.createObjectStore(STORE_EPHEMERAL, { keyPath: "key" });
                    }
                };

                request.onsuccess = (event) => {
                    this._db = event.target.result;
                    this._db.onclose = () => {
                        this._db = null;
                        this._initPromise = null;
                    };
                    resolve(this._db);
                };

                request.onerror = () => {
                    console.error("[UnifiedDB] Failed to open database:", request.error);
                    this._initPromise = null;
                    resolve(null);
                };
            } catch (e) {
                console.warn("[UnifiedDB] IndexedDB unavailable:", e);
                this._initPromise = null;
                resolve(null);
            }
        });

        return this._initPromise;
    },

    /**
     * Initialize DB, preload user_tracks into synchronous L1 Map, and run one-time v1->v2 migration.
     * Safe to await repeatedly; returns once DB + migration are ready.
     * @returns {Promise<boolean>}
     */
    async ready() {
        if (this._readyPromise) return this._readyPromise;
        this._readyPromise = (async () => {
            const db = await this.openDB();
            if (!db) return false;
            await this._preloadUserTracks();
            await this._migrateFromLegacy();
            return true;
        })();
        return this._readyPromise;
    },

    async _preloadUserTracks() {
        const db = await this.openDB();
        if (!db || !db.objectStoreNames.contains(STORE_USER_TRACKS)) return;

        const records = await new Promise((resolve) => {
            try {
                const tx = db.transaction([STORE_USER_TRACKS], "readonly");
                const store = tx.objectStore(STORE_USER_TRACKS);
                const req = store.getAll();
                req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
                req.onerror = () => resolve([]);
            } catch {
                resolve([]);
            }
        });

        this._userTracksMap.clear();
        for (const rec of records) {
            if (rec?.uri) {
                this._userTracksMap.set(rec.uri, rec);
            }
        }
        this._userTracksLoaded = true;
    },

    async _openLegacyCacheDBIfExists() {
        const idb = this._getIDB();
        if (!idb) return null;

        if (typeof idb.databases === "function") {
            try {
                const dbs = await idb.databases();
                if (!Array.isArray(dbs) || !dbs.some((d) => d?.name === LEGACY_CACHE_DB_NAME)) {
                    return null;
                }
            } catch {
                // Fall back to versionless open guard below
            }
        }

        return new Promise((resolve) => {
            let abortedNew = false;
            try {
                const req = idb.open(LEGACY_CACHE_DB_NAME);
                req.onupgradeneeded = (ev) => {
                    // Prevent creating an empty legacy DB on fresh installs
                    abortedNew = true;
                    try {
                        ev.target.transaction.abort();
                    } catch {
                        // ignore
                    }
                    resolve(null);
                };
                req.onsuccess = (ev) => {
                    if (abortedNew) {
                        ev.target.result.close();
                        resolve(null);
                        return;
                    }
                    resolve(ev.target.result);
                };
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    },

    async _migrateFromLegacy() {
        const ls = this._getLS();
        if (ls && ls.getItem(MIGRATION_FLAG_KEY) === "done") return;

        const db = await this.openDB();
        if (!db) return;

        let hadReadError = false;
        const userPatches = new Map();
        const aiItems = [];
        const ephemeralItems = [];
        const legacyLyricsItems = [];

        const stageUserPatch = (uri, fields, meta = null) => {
            if (!uri || typeof uri !== "string") return;
            const prev = userPatches.get(uri) || { uri };
            const next = { ...prev, ...fields };
            if (meta) {
                next.meta = { ...(prev.meta || {}), ...meta };
            }
            userPatches.set(uri, next);
        };

        // 1. Read legacy IndexedDB ('lyrics-plus-cache') -> split into user_tracks / ai_cache / ephemeral_cache
        const legacyDB = await this._openLegacyCacheDBIfExists();
        if (legacyDB) {
            const legacyRows = await new Promise((resolve) => {
                try {
                    if (!legacyDB.objectStoreNames.contains("translations")) {
                        resolve([]);
                        return;
                    }
                    const tx = legacyDB.transaction(["translations"], "readonly");
                    const req = tx.objectStore("translations").getAll();
                    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
                    req.onerror = () => {
                        hadReadError = true;
                        resolve([]);
                    };
                } catch {
                    hadReadError = true;
                    resolve([]);
                }
            });
            try {
                legacyDB.close();
            } catch {
                // ignore
            }

            const now = Date.now();
            for (const row of legacyRows) {
                const key = row?.key;
                if (!key || typeof key !== "string") continue;

                if (key.startsWith(MANUAL_VIDEO_PREFIX)) {
                    const uri = key.slice(MANUAL_VIDEO_PREFIX.length);
                    if (row.data?.videoId) {
                        stageUserPatch(uri, { videoId: row.data.videoId });
                    }
                } else if (key.startsWith(VIDEO_OFFSET_PREFIX)) {
                    const uri = key.slice(VIDEO_OFFSET_PREFIX.length);
                    if (typeof row.data?.offset === "number" && Number.isFinite(row.data.offset)) {
                        stageUserPatch(uri, { videoOffset: row.data.offset });
                    }
                } else if (isEphemeralKey(key)) {
                    if (!row.expiry || now <= row.expiry) {
                        ephemeralItems.push({
                            key,
                            data: row.data,
                            timestamp: row.timestamp || now,
                            expiry: row.expiry || null,
                        });
                    }
                } else {
                    aiItems.push({
                        key,
                        data: row.data,
                        timestamp: row.timestamp || now,
                        expiry: null, // AI translations never auto-expire
                    });
                }
            }
        }

        // 2. Read fragmented localStorage keys
        const delayKeysToRemove = [];
        if (ls) {
            // 2a. Track pronouns
            try {
                const rawPronouns = ls.getItem("lyrics-plus:track-pronouns");
                if (rawPronouns) {
                    const parsed = JSON.parse(rawPronouns);
                    if (parsed && typeof parsed === "object") {
                        for (const [uri, pronoun] of Object.entries(parsed)) {
                            if (pronoun && pronoun !== "default") {
                                stageUserPatch(uri, { pronoun });
                            }
                        }
                    }
                }
            } catch {
                hadReadError = true;
            }

            // 2b. Per-track delays ('lyrics-delay:<uri>')
            try {
                for (let i = 0; i < ls.length; i++) {
                    const k = ls.key(i);
                    if (k && k.startsWith("lyrics-delay:")) {
                        const uri = k.slice("lyrics-delay:".length);
                        const num = Number(ls.getItem(k));
                        if (uri && Number.isFinite(num) && num !== 0) {
                            stageUserPatch(uri, { delayMs: num });
                        }
                        delayKeysToRemove.push(k);
                    }
                }
            } catch {
                hadReadError = true;
            }

            // 2c. User-saved local lyrics ('lyrics-plus:local-lyrics')
            try {
                const rawLocal = ls.getItem("lyrics-plus:local-lyrics");
                if (rawLocal) {
                    const parsed = JSON.parse(rawLocal);
                    if (parsed && typeof parsed === "object") {
                        for (const [uri, lyr] of Object.entries(parsed)) {
                            if (lyr && (lyr.synced || lyr.unsynced || lyr.karaoke || lyr.genius)) {
                                stageUserPatch(uri, {
                                    lyrics: { ...lyr, updatedAt: lyr.timestamp || Date.now() },
                                });
                                legacyLyricsItems.push([uri, lyr]);
                            }
                        }
                    }
                }
            } catch {
                hadReadError = true;
            }

            // 2d. Legacy Gemini / translation caches
            for (const lsKey of ["lyrics-plus:gemini-cache", "lyrics-plus:translation-cache"]) {
                try {
                    const rawCache = ls.getItem(lsKey);
                    if (rawCache) {
                        const parsed = JSON.parse(rawCache);
                        if (parsed && typeof parsed === "object") {
                            for (const [key, entry] of Object.entries(parsed)) {
                                const data = entry?.data !== undefined ? entry.data : entry;
                                if (key && data !== undefined) {
                                    aiItems.push({
                                        key,
                                        data,
                                        timestamp: entry?.timestamp || Date.now(),
                                        expiry: null,
                                    });
                                }
                            }
                        }
                    }
                } catch {
                    // Ignore malformed legacy cache without blocking track migration
                }
            }
        }

        if (hadReadError) {
            console.warn("[UnifiedDB] Migration paused due to legacy read error; keeping existing data intact.");
            return;
        }

        // 3. Commit all migrated records inside a single atomic readwrite transaction
        const writeOk = await new Promise((resolve) => {
            try {
                const tx = db.transaction(
                    [STORE_USER_TRACKS, STORE_AI_CACHE, STORE_EPHEMERAL, STORE_LYRICS],
                    "readwrite"
                );
                const userStore = tx.objectStore(STORE_USER_TRACKS);
                const aiStore = tx.objectStore(STORE_AI_CACHE);
                const ephStore = tx.objectStore(STORE_EPHEMERAL);
                const lyrStore = tx.objectStore(STORE_LYRICS);

                for (const [uri, patch] of userPatches.entries()) {
                    const merged = mergeUserTrackRecord(this._userTracksMap.get(uri), patch);
                    this._userTracksMap.set(uri, merged);
                    userStore.put(merged);
                }
                for (const item of aiItems) {
                    aiStore.put(item);
                }
                for (const item of ephemeralItems) {
                    ephStore.put(item);
                }
                for (const [uri, lyr] of legacyLyricsItems) {
                    lyrStore.put(lyr, uri);
                }

                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
                tx.onabort = () => resolve(false);
            } catch (e) {
                console.warn("[UnifiedDB] Migration transaction error:", e);
                resolve(false);
            }
        });

        if (!writeOk) {
            console.warn("[UnifiedDB] Migration write did not complete cleanly; preserving legacy sources.");
            return;
        }

        // 4. Clean up legacy storage ONLY after confirmed DB transaction commit
        if (ls) {
            ls.setItem(MIGRATION_FLAG_KEY, "done");
            ls.removeItem("lyrics-plus:track-pronouns");
            ls.removeItem("lyrics-plus:local-lyrics");
            ls.removeItem("lyrics-plus:gemini-cache");
            ls.removeItem("lyrics-plus:translation-cache");
            ls.removeItem("lyrics-plus:idb-migrated");
            for (const dk of delayKeysToRemove) {
                ls.removeItem(dk);
            }
        }

        const idb = this._getIDB();
        if (legacyDB && idb && typeof idb.deleteDatabase === "function") {
            try {
                idb.deleteDatabase(LEGACY_CACHE_DB_NAME);
            } catch {
                // Non-fatal if locked
            }
        }

        console.log(
            `[UnifiedDB] Migration complete: ${userPatches.size} user tracks, ${aiItems.length} AI caches, ${ephemeralItems.length} ephemeral entries.`
        );
    },

    // --- Synchronous accessors for hot paths (backed by preloaded Map + pre-boot LS fallback) ---

    getUserTrackSync(uri) {
        if (!uri) return null;
        return this._userTracksMap.get(uri) || null;
    },

    getTrackPronounSync(uri) {
        if (!uri) return "default";
        const rec = this._userTracksMap.get(uri);
        if (rec?.pronoun) return rec.pronoun;
        if (!this._userTracksLoaded) {
            const ls = this._getLS();
            try {
                const raw = ls?.getItem("lyrics-plus:track-pronouns");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.[uri]) return parsed[uri];
                }
            } catch {
                // ignore
            }
        }
        return "default";
    },

    getTrackDelaySync(uri) {
        if (!uri) return 0;
        const rec = this._userTracksMap.get(uri);
        if (typeof rec?.delayMs === "number" && Number.isFinite(rec.delayMs)) {
            return rec.delayMs;
        }
        if (!this._userTracksLoaded) {
            const ls = this._getLS();
            try {
                const raw = ls?.getItem(`lyrics-delay:${uri}`);
                if (raw !== null && raw !== undefined) {
                    const num = Number(raw);
                    if (Number.isFinite(num)) return num;
                }
            } catch {
                // ignore
            }
        }
        return 0;
    },

    // --- User Tracks CRUD (Permanent Store) ---

    async getUserTrack(uri) {
        if (!uri) return null;
        await this.ready();
        if (this._userTracksMap.has(uri)) {
            return this._userTracksMap.get(uri);
        }
        const db = await this.openDB();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction([STORE_USER_TRACKS], "readonly");
                const req = tx.objectStore(STORE_USER_TRACKS).get(uri);
                req.onsuccess = () => {
                    const res = req.result || null;
                    if (res) this._userTracksMap.set(uri, res);
                    resolve(res);
                };
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    },

    async patchUserTrack(uri, patch) {
        if (!uri || typeof uri !== "string") return false;
        const existing = this._userTracksMap.get(uri) || (await this.getUserTrack(uri));
        const next = mergeUserTrackRecord(existing, { ...patch, uri });
        const shouldDelete = isUserTrackEmpty(next);

        if (shouldDelete) {
            this._userTracksMap.delete(uri);
        } else {
            this._userTracksMap.set(uri, next);
        }

        const db = await this.openDB();
        if (!db) return false;

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([STORE_USER_TRACKS], "readwrite");
                const store = tx.objectStore(STORE_USER_TRACKS);
                if (shouldDelete) {
                    store.delete(uri);
                } else {
                    store.put(next);
                }
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    },

    async setTrackPronoun(uri, pronounKey) {
        const value = !pronounKey || pronounKey === "default" ? null : pronounKey;
        return this.patchUserTrack(uri, { pronoun: value });
    },

    async setTrackDelay(uri, delayMs) {
        const num = Number(delayMs);
        const value = Number.isFinite(num) && num !== 0 ? num : null;
        return this.patchUserTrack(uri, { delayMs: value });
    },

    // --- Translation / Phonetic Override Helpers ---

    isPhoneticMode(mode) {
        return PHONETIC_MODES.has(String(mode || ""));
    },

    getOverrideSlotKey(mode, targetLang = null) {
        if (mode === "gemini_vi") {
            const resolvedLang =
                targetLang ||
                (typeof CONFIG !== "undefined" ? CONFIG.visual?.["translate:target-language"] : null) ||
                "vi";
            return `${mode}:${resolvedLang}`;
        }
        return String(mode || "");
    },

    getModeOverrides(uri, mode, targetLang = null) {
        const rec = this.getUserTrackSync(uri);
        if (!rec || !mode) return null;
        const bucketName = this.isPhoneticMode(mode) ? "phonetics" : "translations";
        const slotKey = this.getOverrideSlotKey(mode, targetLang);
        return rec[bucketName]?.[slotKey] || null;
    },

    async setModeLineOverride(uri, mode, targetLang, lineIndex, text, lineCount, meta = null) {
        if (!uri || !mode || lineIndex === undefined || lineIndex === null) return false;
        const bucketName = this.isPhoneticMode(mode) ? "phonetics" : "translations";
        const slotKey = this.getOverrideSlotKey(mode, targetLang);
        const existing = (await this.getUserTrack(uri)) || { uri };
        const bucket = { ...(existing[bucketName] || {}) };
        const prevSlot = bucket[slotKey] || { lineCount: lineCount || 0, lines: {} };
        const lines = { ...(prevSlot.lines || {}) };
        lines[String(lineIndex)] = text;

        bucket[slotKey] = {
            ...prevSlot,
            lineCount: lineCount || prevSlot.lineCount || 0,
            lines,
            updatedAt: Date.now(),
        };

        return this.patchUserTrack(uri, { [bucketName]: bucket, ...(meta ? { meta } : {}) });
    },

    async removeModeLineOverride(uri, mode, targetLang, lineIndex) {
        if (!uri || !mode || lineIndex === undefined || lineIndex === null) return false;
        const bucketName = this.isPhoneticMode(mode) ? "phonetics" : "translations";
        const slotKey = this.getOverrideSlotKey(mode, targetLang);
        const existing = await this.getUserTrack(uri);
        if (!existing?.[bucketName]?.[slotKey]) return true;

        const bucket = { ...existing[bucketName] };
        const prevSlot = bucket[slotKey];
        const lines = { ...(prevSlot.lines || {}) };
        delete lines[String(lineIndex)];

        if (Object.keys(lines).length === 0) {
            delete bucket[slotKey];
        } else {
            bucket[slotKey] = {
                ...prevSlot,
                isComplete: false,
                lines,
                updatedAt: Date.now(),
            };
        }

        return this.patchUserTrack(uri, { [bucketName]: bucket });
    },

    async setModeFullOverrides(uri, mode, targetLang, linesArray, meta = null) {
        if (!uri || !mode || !Array.isArray(linesArray)) return false;
        const bucketName = this.isPhoneticMode(mode) ? "phonetics" : "translations";
        const slotKey = this.getOverrideSlotKey(mode, targetLang);
        const existing = (await this.getUserTrack(uri)) || { uri };
        const bucket = { ...(existing[bucketName] || {}) };

        const lines = {};
        linesArray.forEach((text, i) => {
            lines[String(i)] = typeof text === "string" ? text : String(text || "");
        });

        bucket[slotKey] = {
            lineCount: linesArray.length,
            isComplete: true,
            lines,
            updatedAt: Date.now(),
        };

        return this.patchUserTrack(uri, { [bucketName]: bucket, ...(meta ? { meta } : {}) });
    },

    async clearModeOverrides(uri, mode, targetLang = null) {
        if (!uri || !mode) return false;
        const bucketName = this.isPhoneticMode(mode) ? "phonetics" : "translations";
        const slotKey = this.getOverrideSlotKey(mode, targetLang);
        const existing = await this.getUserTrack(uri);
        if (!existing?.[bucketName]?.[slotKey]) return true;

        const bucket = { ...existing[bucketName] };
        delete bucket[slotKey];
        return this.patchUserTrack(uri, { [bucketName]: bucket });
    },

    /**
     * Overlay user translation/phonetic overrides onto a fetched/cached mode array.
     * If `isComplete` override matches current lyrics length and `baseList` is absent,
     * builds a full array without waiting on AI/provider fetches.
     */
    applyModeOverrides(uri, mode, targetLang, baseList, baseLyrics = null) {
        const slot = this.getModeOverrides(uri, mode, targetLang);
        if (!slot || !slot.lines) return baseList;

        const expectedLen = Array.isArray(baseLyrics) ? baseLyrics.length : (Array.isArray(baseList) ? baseList.length : 0);
        if (expectedLen > 0 && slot.lineCount && slot.lineCount !== expectedLen) {
            return baseList;
        }

        if (Array.isArray(baseList) && baseList.length > 0) {
            let changed = false;
            const out = baseList.map((item, idx) => {
                const key = String(idx);
                if (!Object.prototype.hasOwnProperty.call(slot.lines, key)) return item;
                changed = true;
                return {
                    ...item,
                    originalText: item?.originalText ?? baseLyrics?.[idx]?.text ?? item?.text ?? "",
                    text: slot.lines[key],
                    _userEdited: true,
                };
            });
            return changed ? out : baseList;
        }

        if (slot.isComplete && Array.isArray(baseLyrics) && baseLyrics.length > 0 && slot.lineCount === baseLyrics.length) {
            return baseLyrics.map((line, idx) => {
                const key = String(idx);
                const overrideText = Object.prototype.hasOwnProperty.call(slot.lines, key) ? slot.lines[key] : (line?.text || "");
                return {
                    ...line,
                    originalText: line?.text || "",
                    text: overrideText,
                    _userEdited: Object.prototype.hasOwnProperty.call(slot.lines, key),
                };
            });
        }

        return baseList;
    },

    // --- Backup, Stats & Lifecycle Separation ---

    async getAllUserTracks() {
        await this.ready();
        return Array.from(this._userTracksMap.values());
    },

    async getStoreCount(storeName) {
        const db = await this.openDB();
        if (!db || !db.objectStoreNames.contains(storeName)) return 0;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], "readonly");
                const req = tx.objectStore(storeName).count();
                req.onsuccess = () => resolve(Number(req.result) || 0);
                req.onerror = () => resolve(0);
            } catch {
                resolve(0);
            }
        });
    },

    async getStats() {
        await this.ready();
        const [userTrackCount, lyricsCacheCount, aiCacheCount, ephemeralCacheCount] = await Promise.all([
            this.getStoreCount(STORE_USER_TRACKS),
            this.getStoreCount(STORE_LYRICS),
            this.getStoreCount(STORE_AI_CACHE),
            this.getStoreCount(STORE_EPHEMERAL),
        ]);
        return {
            userTrackCount,
            lyricsCacheCount,
            aiCacheCount,
            ephemeralCacheCount,
            clearableTrackEstimate: lyricsCacheCount + aiCacheCount + ephemeralCacheCount,
        };
    },

    async exportBackup() {
        const tracks = await this.getAllUserTracks();
        return {
            app: "lyrics-plus",
            format: "unified-v2",
            schemaVersion: 2,
            exportedAt: new Date().toISOString(),
            trackCount: tracks.length,
            tracks,
        };
    },

    async importBackup(payload, options = { mode: "merge" }) {
        const tracks = Array.isArray(payload) ? payload : payload?.tracks;
        if (!Array.isArray(tracks)) {
            throw new Error("Invalid backup format: missing tracks array");
        }

        await this.ready();
        const db = await this.openDB();
        if (!db) throw new Error("Database unavailable");

        const validTracks = tracks.filter((t) => t && typeof t.uri === "string" && t.uri.trim() !== "");
        let imported = 0;
        let updated = 0;

        const ok = await new Promise((resolve) => {
            try {
                const tx = db.transaction([STORE_USER_TRACKS], "readwrite");
                const store = tx.objectStore(STORE_USER_TRACKS);

                if (options.mode === "replace") {
                    store.clear();
                    this._userTracksMap.clear();
                }

                for (const incoming of validTracks) {
                    const existing = this._userTracksMap.get(incoming.uri);
                    const incomingTime = Number(incoming.updatedAt) || 0;
                    const existingTime = Number(existing?.updatedAt) || 0;

                    let finalRecord;
                    if (!existing || options.mode === "replace" || incomingTime >= existingTime) {
                        finalRecord = mergeUserTrackRecord(existing, incoming);
                    } else {
                        // Existing local edit is newer -> still fill missing fields from backup
                        finalRecord = mergeUserTrackRecord(incoming, existing);
                    }

                    if (!isUserTrackEmpty(finalRecord)) {
                        this._userTracksMap.set(incoming.uri, finalRecord);
                        store.put(finalRecord);
                        if (existing) updated++;
                        else imported++;
                    }
                }

                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });

        if (!ok) throw new Error("Failed to commit backup import transaction");
        return { imported, updated, total: imported + updated };
    },

    /**
     * Clears ALL disposable caches ('lyrics-cache', 'ai_cache', 'ephemeral_cache')
     * while strictly preserving 'user_tracks'.
     */
    async clearCachesOnly() {
        await this.ready();
        const db = await this.openDB();
        if (db) {
            await new Promise((resolve) => {
                try {
                    const tx = db.transaction([STORE_LYRICS, STORE_AI_CACHE, STORE_EPHEMERAL], "readwrite");
                    tx.objectStore(STORE_LYRICS).clear();
                    tx.objectStore(STORE_AI_CACHE).clear();
                    tx.objectStore(STORE_EPHEMERAL).clear();
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch {
                    resolve(false);
                }
            });
        }
        const ls = this._getLS();
        if (ls) {
            ls.removeItem("lyrics-plus:local-lyrics");
            ls.removeItem("lyrics-plus:cached-uris");
            ls.removeItem("lyrics-plus:gemini-cache");
            ls.removeItem("lyrics-plus:translation-cache");
        }
    },

    async clearAllUserTracks() {
        await this.ready();
        this._userTracksMap.clear();
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction([STORE_USER_TRACKS], "readwrite");
                tx.objectStore(STORE_USER_TRACKS).clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    },

    // --- Key/Value store helpers for ai_cache & ephemeral_cache ---

    async getCacheRecord(storeName, key) {
        if (!key) return null;
        await this.ready();
        const db = await this.openDB();
        if (!db) return null;

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], "readonly");
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => {
                    const result = req.result;
                    if (!result) {
                        resolve(null);
                        return;
                    }
                    if (result.expiry && Date.now() > result.expiry) {
                        this.deleteCacheRecord(storeName, key).catch(() => {});
                        resolve(null);
                        return;
                    }
                    resolve(result.data);
                };
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    },

    async setCacheRecord(storeName, key, data, ttl = null) {
        if (!key || data === undefined) return false;
        await this.ready();
        const db = await this.openDB();
        if (!db) return false;

        const now = Date.now();
        const expiry = typeof ttl === "number" && Number.isFinite(ttl) && ttl > 0 ? now + ttl : null;
        const item = { key, data, timestamp: now, expiry };

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], "readwrite");
                const req = tx.objectStore(storeName).put(item);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    },

    async deleteCacheRecord(storeName, key) {
        if (!key) return false;
        await this.ready();
        const db = await this.openDB();
        if (!db) return false;

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], "readwrite");
                const req = tx.objectStore(storeName).delete(key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    },

    async deleteCacheByPattern(storeName, pattern) {
        if (!pattern) return 0;
        await this.ready();
        const db = await this.openDB();
        if (!db) return 0;

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], "readwrite");
                const store = tx.objectStore(storeName);
                const req = store.openCursor();
                let deletedCount = 0;

                req.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const key = cursor.value?.key ?? cursor.key;
                        const isMatch =
                            typeof pattern === "function"
                                ? pattern(key)
                                : (pattern instanceof RegExp ? pattern.test(key) : String(key).includes(pattern));
                        if (isMatch) {
                            cursor.delete();
                            deletedCount++;
                        }
                        cursor.continue();
                    } else {
                        resolve(deletedCount);
                    }
                };
                req.onerror = () => resolve(0);
            } catch {
                resolve(0);
            }
        });
    },
};

// Backward-compatible IDBCache facade routing transparently into UnifiedDB stores
const IDBCache = {
    init() {
        return UnifiedDB.openDB();
    },

    async get(key) {
        if (!key || typeof key !== "string") return null;

        if (key.startsWith(MANUAL_VIDEO_PREFIX)) {
            await UnifiedDB.ready();
            const uri = key.slice(MANUAL_VIDEO_PREFIX.length);
            const rec = UnifiedDB.getUserTrackSync(uri);
            return rec?.videoId ? { videoId: rec.videoId, savedAt: rec.updatedAt } : null;
        }
        if (key.startsWith(VIDEO_OFFSET_PREFIX)) {
            await UnifiedDB.ready();
            const uri = key.slice(VIDEO_OFFSET_PREFIX.length);
            const rec = UnifiedDB.getUserTrackSync(uri);
            if (typeof rec?.videoOffset === "number" && Number.isFinite(rec.videoOffset)) {
                return { offset: rec.videoOffset, savedAt: rec.updatedAt };
            }
            return null;
        }

        const storeName = isEphemeralKey(key) ? STORE_EPHEMERAL : STORE_AI_CACHE;
        return UnifiedDB.getCacheRecord(storeName, key);
    },

    async set(key, data, ttl = null) {
        if (!key || data === undefined) return false;

        if (key.startsWith(MANUAL_VIDEO_PREFIX)) {
            const uri = key.slice(MANUAL_VIDEO_PREFIX.length);
            return UnifiedDB.patchUserTrack(uri, { videoId: data?.videoId ?? null });
        }
        if (key.startsWith(VIDEO_OFFSET_PREFIX)) {
            const uri = key.slice(VIDEO_OFFSET_PREFIX.length);
            const num = Number(data?.offset);
            return UnifiedDB.patchUserTrack(uri, { videoOffset: Number.isFinite(num) ? num : null });
        }

        if (isEphemeralKey(key)) {
            return UnifiedDB.setCacheRecord(STORE_EPHEMERAL, key, data, ttl);
        }
        // AI translations, phonetics, audio context persist permanently until manually cleared
        return UnifiedDB.setCacheRecord(STORE_AI_CACHE, key, data, null);
    },

    async delete(key) {
        if (!key || typeof key !== "string") return false;

        if (key.startsWith(MANUAL_VIDEO_PREFIX)) {
            const uri = key.slice(MANUAL_VIDEO_PREFIX.length);
            return UnifiedDB.patchUserTrack(uri, { videoId: null });
        }
        if (key.startsWith(VIDEO_OFFSET_PREFIX)) {
            const uri = key.slice(VIDEO_OFFSET_PREFIX.length);
            return UnifiedDB.patchUserTrack(uri, { videoOffset: null });
        }

        const storeName = isEphemeralKey(key) ? STORE_EPHEMERAL : STORE_AI_CACHE;
        return UnifiedDB.deleteCacheRecord(storeName, key);
    },

    async deleteByPattern(pattern) {
        if (!pattern) return 0;
        const [c1, c2] = await Promise.all([
            UnifiedDB.deleteCacheByPattern(STORE_AI_CACHE, pattern),
            UnifiedDB.deleteCacheByPattern(STORE_EPHEMERAL, pattern),
        ]);
        return c1 + c2;
    },

    async clear() {
        // Clears disposable AI/ephemeral caches only — user_tracks is NEVER touched here
        await UnifiedDB.ready();
        const db = await UnifiedDB.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction([STORE_AI_CACHE, STORE_EPHEMERAL], "readwrite");
                tx.objectStore(STORE_AI_CACHE).clear();
                tx.objectStore(STORE_EPHEMERAL).clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    },

    async bulkImport(dataMap, ttl = null) {
        if (!dataMap || typeof dataMap !== "object") return 0;
        let count = 0;
        for (const [key, entry] of Object.entries(dataMap)) {
            const data = entry?.data !== undefined ? entry.data : entry;
            if (key && data !== undefined) {
                const ok = await this.set(key, data, ttl);
                if (ok) count++;
            }
        }
        return count;
    },
};

// Trigger initialization in browser environment; non-blocking if awaited later via UnifiedDB.ready()
if (typeof indexedDB !== "undefined") {
    UnifiedDB.ready().catch(() => {});
}

window.UnifiedDB = UnifiedDB;
window.IDBCache = IDBCache;
if (window.LyricsPlus) {
    window.LyricsPlus.UnifiedDB = UnifiedDB;
    window.LyricsPlus.IDBCache = IDBCache;
}
