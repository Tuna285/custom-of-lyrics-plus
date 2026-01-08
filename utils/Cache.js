// Cache.js - Cache-Aside Pattern (L1 RAM + L2 IndexedDB)
// L1: Small LRU in RAM (~20 items) - instant access
// L2: IndexedDB via IDBCache - unlimited persistence

const CacheManager = {
    _l1Cache: new Map(),      // L1: RAM cache (small LRU)
    _l1MaxSize: 20,           // Only keep ~20 recent items in RAM
    _ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
    _persistKey: 'lyrics-plus:translation-cache',
    _migrated: false,

    /**
     * Migrate localStorage to IndexedDB (one-time)
     * Called internally on first get/set
     */
    async _migrate() {
        if (this._migrated) return;
        this._migrated = true;

        try {
            const migratedFlag = localStorage.getItem('lyrics-plus:idb-migrated');
            if (migratedFlag === 'true') return;

            const persisted = localStorage.getItem(this._persistKey);
            if (persisted) {
                const data = JSON.parse(persisted);
                const count = await IDBCache.bulkImport(data);
                if (count > 0) {
                    console.log(`[Cache] Migrated ${count} entries from localStorage to IndexedDB`);
                    localStorage.removeItem(this._persistKey);
                    localStorage.setItem('lyrics-plus:idb-migrated', 'true');
                }
            } else {
                localStorage.setItem('lyrics-plus:idb-migrated', 'true');
            }
        } catch (e) {
            console.warn('[Cache] Migration failed:', e);
        }
    },

    /**
     * Get item from cache (async - checks L1 then L2)
     * @param {string} key
     * @returns {Promise<any|null>}
     */
    async get(key) {
        // Input validation
        if (!key || typeof key !== 'string') return null;

        // Check L1 first (instant)
        const l1Item = this._l1Cache.get(key);
        if (l1Item) {
            if (Date.now() < l1Item.expiry) {
                l1Item.lastAccessed = Date.now();
                return l1Item.data;
            }
            this._l1Cache.delete(key);
        }

        // L1 miss - check L2 (IndexedDB)
        await this._migrate();
        const data = await IDBCache.get(key);

        if (data !== null) {
            // Promote to L1 for fast subsequent access
            this._l1Set(key, data);
        }

        return data;
    },

    /**
     * Get item from L1 cache ONLY (synchronous)
     * Use this for hot paths where async is not acceptable
     * @param {string} key
     * @returns {any|null}
     */
    getSync(key) {
        if (!key || typeof key !== 'string') return null;
        
        const l1Item = this._l1Cache.get(key);
        if (l1Item && Date.now() < l1Item.expiry) {
            l1Item.lastAccessed = Date.now();
            return l1Item.data;
        }
        
        if (l1Item) this._l1Cache.delete(key); // Expired
        return null;
    },

    /**
     * Internal L1 set with LRU eviction
     */
    _l1Set(key, data) {
        // Evict oldest if at capacity
        if (this._l1Cache.size >= this._l1MaxSize) {
            const entries = Array.from(this._l1Cache.entries())
                .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
            // Remove oldest 20%
            const toRemove = Math.max(1, Math.floor(entries.length * 0.2));
            for (let i = 0; i < toRemove; i++) {
                this._l1Cache.delete(entries[i][0]);
            }
        }

        this._l1Cache.set(key, {
            data,
            expiry: Date.now() + this._ttl,
            lastAccessed: Date.now()
        });
    },

    /**
     * Set item in cache
     * L1: Sync (immediate)
     * L2: Async (fire-and-forget, debounced)
     * @param {string} key
     * @param {any} data
     * @param {boolean} persist - Whether to persist to L2
     */
    set(key, data, persist = true) {
        // Input validation
        if (!key || typeof key !== 'string') return;

        // L1: Immediate
        this._l1Set(key, data);

        // L2: Fire-and-forget (async, debounced)
        if (persist) {
            this._scheduleL2Write(key, data);
        }
    },

    _pendingWrites: new Map(),
    _writeTimeout: null,

    _scheduleL2Write(key, data) {
        this._pendingWrites.set(key, data);

        // Debounce writes to batch them
        if (this._writeTimeout) clearTimeout(this._writeTimeout);
        this._writeTimeout = setTimeout(() => this._flushL2Writes(), 2000);
    },

    async _flushL2Writes() {
        await this._migrate();

        for (const [key, data] of this._pendingWrites) {
            IDBCache.set(key, data, this._ttl).catch(() => {});
        }
        this._pendingWrites.clear();
    },

    /**
     * Delete item from both L1 and L2
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async delete(key) {
        const l1Existed = this._l1Cache.delete(key);
        await this._migrate();
        const l2Deleted = await IDBCache.delete(key);
        return l1Existed || l2Deleted;
    },

    /**
     * Clear all cache (L1 and L2)
     * @returns {Promise<void>}
     */
    async clear() {
        this._l1Cache.clear();
        await this._migrate();
        await IDBCache.clear();
        console.log('[Cache] All cache cleared');
    },

    /**
     * Clear L1 cache only (synchronous)
     * Use for immediate cache invalidation without async
     */
    clearL1() {
        this._l1Cache.clear();
    },

    /**
     * Clear cache entries for a specific URI
     * @param {string} uri
     * @returns {Promise<number>}
     */
    async clearByUri(uri) {
        let count = 0;

        // Clear from L1
        for (const [key] of this._l1Cache) {
            if (key.includes(uri)) {
                this._l1Cache.delete(key);
                count++;
            }
        }

        // L2 would require iteration - skip for now
        // Can add IDBCache.deleteByPattern() if needed

        return count;
    },

    /**
     * Get cache statistics
     */
    get stats() {
        return {
            l1Size: this._l1Cache.size,
            l1MaxSize: this._l1MaxSize,
            ttlDays: this._ttl / (24 * 60 * 60 * 1000)
        };
    }
};
