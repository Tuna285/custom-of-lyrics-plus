/**
 * LyricsPlus Namespace - MUST LOAD FIRST
 * Creates the base namespace object that other modules will register into.
 * Risk #2 mitigation: Prevents conflicts with other Custom Apps
 */

// Create namespace immediately
window.LyricsPlus = window.LyricsPlus || {};

// Helper function for modules to register themselves
window.LyricsPlus.register = function(name, module) {
    if (window.LyricsPlus[name]) {
        console.warn(`[LyricsPlus] Module "${name}" already registered, overwriting.`);
    }
    window.LyricsPlus[name] = module;
    // Also expose to global for backward compatibility
    window[name] = module;
};

console.log('[LyricsPlus] Namespace created');
