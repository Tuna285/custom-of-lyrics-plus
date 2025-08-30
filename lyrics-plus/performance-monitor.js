// Performance monitoring for Lyrics Plus
const PerformanceMonitor = {
	metrics: {
		startTime: performance.now(),
		loadTimes: {},
		cacheHits: 0,
		cacheMisses: 0,
		apiCalls: 0,
		renderCount: 0,
		memoryUsage: 0
	},

	/**
	 * Start timing a specific operation
	 * @param {string} operation - Name of the operation
	 */
	startTimer(operation) {
		this.metrics.loadTimes[operation] = {
			start: performance.now()
		};
	},

	/**
	 * End timing a specific operation
	 * @param {string} operation - Name of the operation
	 * @returns {number} Duration in milliseconds
	 */
	endTimer(operation) {
		if (this.metrics.loadTimes[operation]) {
			const duration = performance.now() - this.metrics.loadTimes[operation].start;
			this.metrics.loadTimes[operation].duration = duration;
			this.metrics.loadTimes[operation].end = performance.now();
			
			// Log slow operations
			if (duration > 100) {
				console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
			}
			
			return duration;
		}
		return 0;
	},

	/**
	 * Record cache hit/miss
	 * @param {boolean} isHit - Whether it was a cache hit
	 */
	recordCache(isHit) {
		if (isHit) {
			this.metrics.cacheHits++;
		} else {
			this.metrics.cacheMisses++;
		}
	},

	/**
	 * Record API call
	 */
	recordApiCall() {
		this.metrics.apiCalls++;
	},

	/**
	 * Record render operation
	 */
	recordRender() {
		this.metrics.renderCount++;
	},

	/**
	 * Get memory usage
	 */
	updateMemoryUsage() {
		if (performance.memory) {
			this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
		}
	},

	/**
	 * Get performance report
	 * @returns {Object} Performance metrics
	 */
	getReport() {
		this.updateMemoryUsage();
		
		const totalTime = performance.now() - this.metrics.startTime;
		const cacheHitRate = this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100;
		
		return {
			totalTime: totalTime.toFixed(2),
			cacheHitRate: cacheHitRate.toFixed(2) + '%',
			apiCalls: this.metrics.apiCalls,
			renderCount: this.metrics.renderCount,
			memoryUsage: this.metrics.memoryUsage,
			loadTimes: this.metrics.loadTimes,
			cacheStats: {
				hits: this.metrics.cacheHits,
				misses: this.metrics.cacheMisses
			}
		};
	},

	/**
	 * Log performance report
	 */
	logReport() {
		const report = this.getReport();
		console.group('🎵 Lyrics Plus Performance Report');
		console.log('Total runtime:', report.totalTime + 'ms');
		console.log('Cache hit rate:', report.cacheHitRate);
		console.log('API calls:', report.apiCalls);
		console.log('Render count:', report.renderCount);
		console.log('Memory usage:', (report.memoryUsage / 1024 / 1024).toFixed(2) + 'MB');
		
		console.group('Load times:');
		Object.entries(report.loadTimes).forEach(([operation, data]) => {
			if (data.duration) {
				console.log(`${operation}: ${data.duration.toFixed(2)}ms`);
			}
		});
		console.groupEnd();
		
		console.group('Cache stats:');
		console.log('Hits:', report.cacheStats.hits);
		console.log('Misses:', report.cacheStats.misses);
		console.groupEnd();
		
		console.groupEnd();
	},

	/**
	 * Monitor bundle size
	 */
	getBundleSize() {
		const scripts = document.querySelectorAll('script[src*="lyrics-plus"]');
		let totalSize = 0;
		
		scripts.forEach(script => {
			// This is a rough estimate since we can't directly measure script size
			// In a real implementation, you'd want to measure actual file sizes
			totalSize += 1; // Placeholder
		});
		
		return totalSize;
	},

	/**
	 * Monitor DOM performance
	 */
	monitorDOM() {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === 'measure') {
					console.log(`DOM operation: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
				}
			}
		});
		
		observer.observe({ entryTypes: ['measure'] });
	},

	/**
	 * Monitor network performance
	 */
	monitorNetwork() {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === 'resource') {
					if (entry.name.includes('lyrics') || entry.name.includes('api')) {
						console.log(`Network request: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
					}
				}
			}
		});
		
		observer.observe({ entryTypes: ['resource'] });
	},

	/**
	 * Start monitoring
	 */
	start() {
		this.startTimer('app-init');
		this.monitorDOM();
		this.monitorNetwork();
		
		// Log report every 30 seconds
		setInterval(() => {
			this.logReport();
		}, 30000);
		
		console.log('🎵 Lyrics Plus Performance Monitor started');
	},

	/**
	 * Stop monitoring and get final report
	 */
	stop() {
		this.endTimer('app-init');
		this.logReport();
		console.log('🎵 Lyrics Plus Performance Monitor stopped');
	}
};

// Auto-start monitoring
if (typeof window !== 'undefined') {
	window.LyricsPlusPerformance = PerformanceMonitor;
	PerformanceMonitor.start();
}

export default PerformanceMonitor;