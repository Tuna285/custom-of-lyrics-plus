// Cache.js - Enhanced Caching System with Persistence

const CacheManager = {
    _cache: new Map(),
    _maxSize: 500, // Increased to 500 songs
    _ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL (translations don't change)
    _persistKey: 'lyrics-plus:translation-cache',
    _initialized: false,

    // Initialize cache from localStorage
    init() {
        if (this._initialized) return;
        try {
            const persisted = localStorage.getItem(this._persistKey);
            if (persisted) {
                const data = JSON.parse(persisted);
                const now = Date.now();
                let loaded = 0;

                // Load valid entries only
                Object.entries(data).forEach(([key, item]) => {
                    if (item.expiry > now) {
                        this._cache.set(key, item);
                        loaded++;
                    }
                });

                if (loaded > 0) console.log(`[Cache] Loaded ${loaded} cached translations`);
            }
        } catch (e) {
            console.warn('[Cache] Failed to load persisted cache:', e);
        }
        this._initialized = true;
    },

    get(key) {
        this.init();
        const item = this._cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expiry) {
            this._cache.delete(key);
            return null;
        }

        // Update access time for LRU
        item.lastAccessed = Date.now();
        return item.data;
    },

    set(key, data, persist = true) {
        this.init();

        // Clean up if cache is getting too large
        if (this._cache.size >= this._maxSize) {
            this._cleanupOldEntries();
        }

        const item = {
            data,
            expiry: Date.now() + this._ttl,
            lastAccessed: Date.now()
        };

        this._cache.set(key, item);

        // Persist to localStorage (debounced)
        if (persist) this._schedulePersist();
    },

    _persistTimeout: null,
    _schedulePersist() {
        // Debounce persistence to avoid excessive writes
        if (this._persistTimeout) clearTimeout(this._persistTimeout);
        this._persistTimeout = setTimeout(() => this._persist(), 2000);
    },

    _persist() {
        try {
            const data = {};
            const now = Date.now();

            // Only persist non-expired entries
            this._cache.forEach((item, key) => {
                if (item.expiry > now) {
                    data[key] = item;
                }
            });

            // Limit localStorage size (~5MB max)
            const json = JSON.stringify(data);
            if (json.length < 4 * 1024 * 1024) { // 4MB limit
                localStorage.setItem(this._persistKey, json);
            } else {
                console.warn('[Cache] Cache too large for localStorage, skipping persist');
                this._cleanupOldEntries(0.5); // Remove 50% of entries
            }
        } catch (e) {
            console.warn('[Cache] Failed to persist cache:', e);
        }
    },

    _cleanupOldEntries(ratio = 0.2) {
        // Remove oldest entries by ratio
        const entries = Array.from(this._cache.entries())
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        const toRemove = Math.floor(entries.length * ratio);
        for (let i = 0; i < toRemove; i++) {
            this._cache.delete(entries[i][0]);
        }
        console.log(`[Cache] Cleaned up ${toRemove} old entries`);
    },

    clear() {
        this._cache.clear();
        try {
            localStorage.removeItem(this._persistKey);
        } catch (e) { }
        console.log('[Cache] Cache cleared');
    },

    // Clear cache entries for a specific URI
    clearByUri(uri) {
        const keysToDelete = [];
        for (const [key] of this._cache) {
            if (key.includes(uri)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this._cache.delete(key));
        if (keysToDelete.length > 0) this._schedulePersist();
        return keysToDelete.length;
    },

    // Get cache statistics
    get stats() {
        return {
            size: this._cache.size,
            maxSize: this._maxSize,
            ttlDays: this._ttl / (24 * 60 * 60 * 1000)
        };
    }
};

