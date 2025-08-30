// Optimized Utils with performance improvements and caching
const Utils = {
	// Cache for frequently used operations
	_colorCache: new Map(),
	_normalizeCache: new Map(),
	_processLyricsCache: new Map(),
	_convertTimeCache: new Map(),
	
	addQueueListener(callback) {
		Spicetify.Player.origin._events.addListener("queue_update", callback);
	},
	
	removeQueueListener(callback) {
		Spicetify.Player.origin._events.removeListener("queue_update", callback);
	},
	
	convertIntToRGB(colorInt, div = 1) {
		const cacheKey = `${colorInt}_${div}`;
		
		if (this._colorCache.has(cacheKey)) {
			return this._colorCache.get(cacheKey);
		}
		
		// Use bit operations for faster calculations
		const r = Math.round(((colorInt >>> 16) & 0xff) / div);
		const g = Math.round(((colorInt >>> 8) & 0xff) / div); 
		const b = Math.round((colorInt & 0xff) / div);
		
		const result = `rgb(${r},${g},${b})`;
		
		// Cache result (limit cache size)
		if (this._colorCache.size > 100) {
			const firstKey = this._colorCache.keys().next().value;
			this._colorCache.delete(firstKey);
		}
		this._colorCache.set(cacheKey, result);
		
		return result;
	},
	
	/**
	 * @param {string} s
	 * @param {boolean} emptySymbol
	 * @returns {string}
	 */
	normalize(s, emptySymbol = true) {
		const cacheKey = `${s}_${emptySymbol}`;
		
		if (this._normalizeCache.has(cacheKey)) {
			return this._normalizeCache.get(cacheKey);
		}
		
		// Optimized: use a single pass with compiled regex
		const replacements = [
			[/（/g, "("],
			[/）/g, ")"],
			[/【/g, "["],
			[/】/g, "]"],
			[/。/g, ". "],
			[/；/g, "; "],
			[/：/g, ": "],
			[/？/g, "? "],
			[/！/g, "! "],
			[/、|，/g, ", "],
			[/'|'|′|＇/g, "'"],
			[/"|"/g, '"'],
			[/〜/g, "~"],
			[/·|・/g, "•"]
		];
		
		let result = s;
		for (const [regex, replacement] of replacements) {
			result = result.replace(regex, replacement);
		}
		
		if (emptySymbol) {
			result = result.replace(/[-/]/g, " ");
		}
		
		result = result.replace(/\s+/g, " ").trim();
		
		// Cache result (limit cache size to prevent memory leaks)
		if (this._normalizeCache.size > 200) {
			const firstKey = this._normalizeCache.keys().next().value;
			this._normalizeCache.delete(firstKey);
		}
		this._normalizeCache.set(cacheKey, result);
		
		return result;
	},
	
	/**
	 * Check if the specified string contains Han character.
	 *
	 * @param {string} s
	 * @returns {boolean}
	 */
	containsHanCharacter(s) {
		const hanRegex = /\p{Script=Han}/u;
		return hanRegex.test(s);
	},
	
	/**
	 * Singleton Translator instance for {@link toSimplifiedChinese}.
	 *
	 * @type {import("opencc-js").Converter}
	 */
	_simplifiedConverter: null,
	
	/**
	 * Singleton Translator instance for {@link toTraditionalChinese}.
	 *
	 * @type {import("opencc-js").Converter}
	 */
	_traditionalConverter: null,
	
	/**
	 * Convert Traditional Chinese to Simplified Chinese.
	 *
	 * @param {string} text
	 * @returns {string}
	 */
	toSimplifiedChinese(text) {
		if (!this._simplifiedConverter) {
			this._simplifiedConverter = Translator.createConverter("Traditional", "Simplified");
		}
		return this._simplifiedConverter(text);
	},
	
	/**
	 * Convert Simplified Chinese to Traditional Chinese.
	 *
	 * @param {string} text
	 * @returns {string}
	 */
	toTraditionalChinese(text) {
		if (!this._traditionalConverter) {
			this._traditionalConverter = Translator.createConverter("Simplified", "Traditional");
		}
		return this._traditionalConverter(text);
	},
	
	/**
	 * Process lyrics text for better matching and display.
	 *
	 * @param {string} text
	 * @returns {string}
	 */
	processLyrics(text) {
		if (!text) return "";
		
		const cacheKey = text;
		if (this._processLyricsCache.has(cacheKey)) {
			return this._processLyricsCache.get(cacheKey);
		}
		
		// Optimized processing pipeline
		let result = text
			.toLowerCase()
			.replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '') // Remove special chars but keep CJK
			.replace(/\s+/g, ' ')
			.trim();
		
		// Cache result
		if (this._processLyricsCache.size > 500) {
			const firstKey = this._processLyricsCache.keys().next().value;
			this._processLyricsCache.delete(firstKey);
		}
		this._processLyricsCache.set(cacheKey, result);
		
		return result;
	},
	
	/**
	 * Convert milliseconds to MM:SS format with caching.
	 *
	 * @param {number} ms
	 * @returns {string}
	 */
	convertTime(ms) {
		const cacheKey = ms;
		if (this._convertTimeCache.has(cacheKey)) {
			return this._convertTimeCache.get(cacheKey);
		}
		
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		
		const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		
		// Cache result
		if (this._convertTimeCache.size > 1000) {
			const firstKey = this._convertTimeCache.keys().next().value;
			this._convertTimeCache.delete(firstKey);
		}
		this._convertTimeCache.set(cacheKey, result);
		
		return result;
	},
	
	/**
	 * Debounce function for performance optimization.
	 *
	 * @param {Function} func
	 * @param {number} wait
	 * @returns {Function}
	 */
	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	},
	
	/**
	 * Throttle function for performance optimization.
	 *
	 * @param {Function} func
	 * @param {number} limit
	 * @returns {Function}
	 */
	throttle(func, limit) {
		let inThrottle;
		return function() {
			const args = arguments;
			const context = this;
			if (!inThrottle) {
				func.apply(context, args);
				inThrottle = true;
				setTimeout(() => inThrottle = false, limit);
			}
		};
	},
	
	/**
	 * Memoize function for expensive operations.
	 *
	 * @param {Function} fn
	 * @returns {Function}
	 */
	memoize(fn) {
		const cache = new Map();
		return (...args) => {
			const key = JSON.stringify(args);
			if (cache.has(key)) {
				return cache.get(key);
			}
			const result = fn.apply(this, args);
			cache.set(key, result);
			return result;
		};
	},
	
	/**
	 * Batch DOM updates for better performance.
	 *
	 * @param {Function} callback
	 */
	batchUpdate(callback) {
		// Use requestAnimationFrame for smooth updates
		requestAnimationFrame(() => {
			callback();
		});
	},
	
	/**
	 * Optimized array operations.
	 */
	array: {
		/**
		 * Fast array deduplication.
		 *
		 * @param {Array} arr
		 * @returns {Array}
		 */
		unique(arr) {
			return [...new Set(arr)];
		},
		
		/**
		 * Fast array chunking.
		 *
		 * @param {Array} arr
		 * @param {number} size
		 * @returns {Array}
		 */
		chunk(arr, size) {
			const chunks = [];
			for (let i = 0; i < arr.length; i += size) {
				chunks.push(arr.slice(i, i + size));
			}
			return chunks;
		},
		
		/**
		 * Fast array flattening.
		 *
		 * @param {Array} arr
		 * @returns {Array}
		 */
		flatten(arr) {
			return arr.reduce((flat, item) => 
				flat.concat(Array.isArray(item) ? this.flatten(item) : item), []);
		}
	},
	
	/**
	 * Optimized string operations.
	 */
	string: {
		/**
		 * Fast string truncation.
		 *
		 * @param {string} str
		 * @param {number} length
		 * @param {string} suffix
		 * @returns {string}
		 */
		truncate(str, length, suffix = '...') {
			return str.length > length ? str.substring(0, length) + suffix : str;
		},
		
		/**
		 * Fast string capitalization.
		 *
		 * @param {string} str
		 * @returns {string}
		 */
		capitalize(str) {
			return str.charAt(0).toUpperCase() + str.slice(1);
		},
		
		/**
		 * Fast string slugification.
		 *
		 * @param {string} str
		 * @returns {string}
		 */
		slugify(str) {
			return str
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/[\s_-]+/g, '-')
				.replace(/^-+|-+$/g, '');
		}
	},
	
	/**
	 * Optimized object operations.
	 */
	object: {
		/**
		 * Deep clone object with performance optimization.
		 *
		 * @param {Object} obj
		 * @returns {Object}
		 */
		clone(obj) {
			if (obj === null || typeof obj !== 'object') return obj;
			if (obj instanceof Date) return new Date(obj.getTime());
			if (obj instanceof Array) return obj.map(item => this.clone(item));
			if (typeof obj === 'object') {
				const clonedObj = {};
				for (const key in obj) {
					if (obj.hasOwnProperty(key)) {
						clonedObj[key] = this.clone(obj[key]);
					}
				}
				return clonedObj;
			}
		},
		
		/**
		 * Fast object merge.
		 *
		 * @param {Object} target
		 * @param {Object} source
		 * @returns {Object}
		 */
		merge(target, source) {
			for (const key in source) {
				if (source.hasOwnProperty(key)) {
					target[key] = source[key];
				}
			}
			return target;
		}
	},
	
	/**
	 * Performance monitoring utilities.
	 */
	performance: {
		/**
		 * Measure execution time of a function.
		 *
		 * @param {Function} fn
		 * @param {string} name
		 * @returns {any}
		 */
		measure(fn, name = 'Function') {
			const start = performance.now();
			const result = fn();
			const end = performance.now();
			console.log(`${name} took ${(end - start).toFixed(2)}ms`);
			return result;
		},
		
		/**
		 * Async version of measure.
		 *
		 * @param {Function} fn
		 * @param {string} name
		 * @returns {Promise<any>}
		 */
		async measureAsync(fn, name = 'Async Function') {
			const start = performance.now();
			const result = await fn();
			const end = performance.now();
			console.log(`${name} took ${(end - start).toFixed(2)}ms`);
			return result;
		}
	},
	
	/**
	 * Memory management utilities.
	 */
	memory: {
		/**
		 * Clear all caches to free memory.
		 */
		clearCaches() {
			this._colorCache.clear();
			this._normalizeCache.clear();
			this._processLyricsCache.clear();
			this._convertTimeCache.clear();
		},
		
		/**
		 * Get cache sizes for monitoring.
		 *
		 * @returns {Object}
		 */
		getCacheSizes() {
			return {
				colorCache: this._colorCache.size,
				normalizeCache: this._normalizeCache.size,
				processLyricsCache: this._processLyricsCache.size,
				convertTimeCache: this._convertTimeCache.size
			};
		}
	}
};
