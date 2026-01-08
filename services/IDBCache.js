// services/IDBCache.js
// Low-level IndexedDB wrapper for persistent cache storage

const IDBCache = {
    _db: null,
    _dbName: 'lyrics-plus-cache',
    _storeName: 'translations',
    _version: 1,

    /**
     * Open IndexedDB connection
     * @returns {Promise<IDBDatabase>}
     */
    async _getDB() {
        if (this._db) return this._db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._dbName, this._version);

            request.onerror = () => {
                console.error('[IDBCache] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this._db = request.result;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this._storeName)) {
                    db.createObjectStore(this._storeName, { keyPath: 'key' });
                    console.log('[IDBCache] Created object store:', this._storeName);
                }
            };
        });
    },

    /**
     * Get item from IndexedDB
     * @param {string} key
     * @returns {Promise<any|null>}
     */
    async get(key) {
        if (!key || typeof key !== 'string') return null;

        try {
            const db = await this._getDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this._storeName, 'readonly');
                const store = tx.objectStore(this._storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.expiry > Date.now()) {
                        resolve(result.data);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.warn('[IDBCache] Get error:', request.error);
                    resolve(null);
                };
            });
        } catch (e) {
            console.warn('[IDBCache] Get failed:', e);
            return null;
        }
    },

    /**
     * Set item in IndexedDB
     * @param {string} key
     * @param {any} data
     * @param {number} ttl - Time to live in ms (default 7 days)
     * @returns {Promise<boolean>}
     */
    async set(key, data, ttl = 7 * 24 * 60 * 60 * 1000) {
        if (!key || typeof key !== 'string') return false;

        try {
            const db = await this._getDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this._storeName, 'readwrite');
                const store = tx.objectStore(this._storeName);

                const item = {
                    key,
                    data,
                    expiry: Date.now() + ttl,
                    lastAccessed: Date.now()
                };

                const request = store.put(item);

                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    console.warn('[IDBCache] Set error:', request.error);
                    resolve(false);
                };
            });
        } catch (e) {
            console.warn('[IDBCache] Set failed:', e);
            return false;
        }
    },

    /**
     * Delete item from IndexedDB
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async delete(key) {
        if (!key) return false;

        try {
            const db = await this._getDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this._storeName, 'readwrite');
                const store = tx.objectStore(this._storeName);
                const request = store.delete(key);

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    },

    /**
     * Clear all items from IndexedDB
     * @returns {Promise<boolean>}
     */
    async clear() {
        try {
            const db = await this._getDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this._storeName, 'readwrite');
                const store = tx.objectStore(this._storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('[IDBCache] Cleared');
                    resolve(true);
                };
                request.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    },

    /**
     * Bulk import from localStorage (migration)
     * @param {Object} data - { key: { data, expiry, lastAccessed } }
     * @returns {Promise<number>} - Number of imported items
     */
    async bulkImport(data) {
        if (!data || typeof data !== 'object') return 0;

        try {
            const db = await this._getDB();
            const tx = db.transaction(this._storeName, 'readwrite');
            const store = tx.objectStore(this._storeName);
            const now = Date.now();
            let count = 0;

            for (const [key, item] of Object.entries(data)) {
                if (item.expiry > now) {
                    store.put({ key, ...item });
                    count++;
                }
            }

            return new Promise((resolve) => {
                tx.oncomplete = () => {
                    console.log(`[IDBCache] Imported ${count} items from localStorage`);
                    resolve(count);
                };
                tx.onerror = () => resolve(0);
            });
        } catch (e) {
            console.warn('[IDBCache] Bulk import failed:', e);
            return 0;
        }
    }
};
