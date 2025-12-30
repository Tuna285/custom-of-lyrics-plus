// Cache.js - Caching System

const CacheManager = {
    _cache: new Map(),
    _maxSize: 200, // Limit cache to 200 songs
    _ttl: 60 * 60 * 1000, // 60 minutes TTL

    get(key) {
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

    set(key, data) {
        // Clean up if cache is getting too large
        if (this._cache.size >= this._maxSize) {
            this._cleanupOldEntries();
        }

        this._cache.set(key, {
            data,
            expiry: Date.now() + this._ttl,
            lastAccessed: Date.now()
        });
    },

    _cleanupOldEntries() {
        // Remove oldest 20% of entries
        const entries = Array.from(this._cache.entries())
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        const toRemove = Math.floor(entries.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
            this._cache.delete(entries[i][0]);
        }
    },

    clear() {
        this._cache.clear();
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
        return keysToDelete.length;
    }
};
