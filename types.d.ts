/**
 * Lyrics Plus - Type Definitions
 * VSCode automatically loads this file for the entire project.
 * No imports needed in individual .js files.
 */

// =============================================================================
// LYRICS TYPES
// =============================================================================

/**
 * A single line of synced or unsynced lyrics
 */
interface LyricLine {
    /** The lyric text (may be translation if translated) */
    text: string;
    /** Original lyric text (before translation) */
    originalText?: string;
    /** Secondary translation text */
    text2?: string;
    /** Start time in milliseconds (synced only) */
    startTime?: number;
    /** End time in milliseconds (karaoke only) */
    endTime?: number;
    /** Line number in the original file */
    lineNumber?: number;
}

/**
 * Karaoke word timing
 */
interface KaraokeWord {
    word: string;
    startTime: number;
    endTime: number;
}

/**
 * Full lyrics state from a provider
 */
interface LyricsData {
    uri: string;
    provider?: string;
    copyright?: string;
    synced?: LyricLine[];
    unsynced?: LyricLine[];
    karaoke?: LyricLine[];
    genius?: string;
    language?: string;
    /** Musixmatch translation data */
    musixmatchTranslation?: LyricLine[];
    /** Netease translation data */
    neteaseTranslation?: LyricLine[];
    /** Romaji conversion */
    romaji?: LyricLine[];
    /** Furigana conversion */
    furigana?: LyricLine[];
    /** Hiragana conversion */
    hiragana?: LyricLine[];
    /** Katakana conversion */
    katakana?: LyricLine[];
    /** Hangul (Korean) */
    hangul?: LyricLine[];
    /** Romaja (Korean romanization) */
    romaja?: LyricLine[];
    /** Simplified Chinese */
    cn?: LyricLine[];
    /** Traditional Chinese (Hong Kong) */
    hk?: LyricLine[];
    /** Traditional Chinese (Taiwan) */
    tw?: LyricLine[];
    /** Current processed lyrics for display */
    currentLyrics?: LyricLine[];
}

// =============================================================================
// TRACK INFO
// =============================================================================

/**
 * Track information extracted from Spicetify
 */
interface TrackInfo {
    uri: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    imageUrl?: string;
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

/**
 * Visual configuration options
 */
interface VisualConfig {
    "font-size": number;
    alignment: "left" | "center" | "right";
    "active-color": string;
    "inactive-color": string;
    "highlight-color": string;
    "background-color": string;
    "background-brightness": number;
    "transparent-background": boolean;
    "synced-compact": boolean;
    "fade-blur": boolean;
    noise: boolean;
    "fullscreen-key": string;
    "lines-before": number;
    "lines-after": number;
    "translate:display-mode": "replace" | "below" | "none";
    "translate:translated-lyrics-source": string;
    "translate:translation-style": string;
    "translate:pronoun-mode": string;
    "video-background": boolean;
    "video-background-blur": number;
    "video-background-dim": number;
    "video-background-scale": number;
    "gemini:api-mode": "official" | "proxy";
    "gemini:proxy-endpoint": string;
    "gemini:proxy-model": string;
    "gemini:proxy-api-key": string;
    "gemini:disable-queue": boolean;
    "ui-language": string;
    [key: string]: any; // Allow dynamic keys like "translation-mode:japanese"
}

/**
 * Provider configuration
 */
interface ProviderConfig {
    name: string;
    on: boolean;
    modes: number[];
}

/**
 * Main CONFIG object
 */
interface AppConfig {
    visual: VisualConfig;
    providers: Record<string, ProviderConfig>;
    providersOrder: string[];
    modes: string[];
}

// =============================================================================
// CACHE TYPES
// =============================================================================

/**
 * Cache entry (RAM or IndexedDB)
 */
interface CacheEntry extends LyricsData {
    timestamp?: number;
    ttl?: number;
}

/**
 * CacheManager interface
 */
interface ICacheManager {
    get(key: string): Promise<CacheEntry | null>;
    set(key: string, value: CacheEntry): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Provider function signature
 */
type ProviderFunction = (info: TrackInfo) => Promise<LyricsData>;

/**
 * Providers collection
 */
interface ProvidersMap {
    spotify: ProviderFunction;
    musixmatch: ProviderFunction;
    netease: ProviderFunction;
    lrclib: ProviderFunction;
    genius: ProviderFunction;
    local: ProviderFunction;
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

/**
 * Display texts returned by Utils.getDisplayTexts
 */
interface DisplayTexts {
    mainText: string | null;
    subText: string | null;
    subText2: string | null;
}

/**
 * Color state
 */
interface ColorState {
    background?: string;
    inactive?: string;
}

/**
 * Translation status
 */
interface TranslationStatus {
    type: "success" | "error" | "loading";
    text: string;
}

/**
 * Video background info
 */
interface VideoInfo {
    videoId: string;
    title?: string;
    segments?: Array<{ start: number; end: number }>;
}

// =============================================================================
// GLOBAL DECLARATIONS
// =============================================================================

declare global {
    interface Window {
        // Core modules
        CONFIG: AppConfig;
        CACHE: Record<string, CacheEntry>;
        CacheManager: ICacheManager;
        Utils: typeof Utils;
        DBManager: any;
        
        // Providers
        Providers: ProvidersMap;
        ProviderLRCLIB: any;
        ProviderMusixmatch: any;
        ProviderNetease: any;
        ProviderGenius: any;
        
        // Services
        GeminiClient: any;
        Translator: any;
        VideoBackground: any;
        
        // Parsers
        LRCParser: any;
        
        // Components
        SyncedLyricsPage: any;
        SyncedExpandedLyricsPage: any;
        
        // Utilities
        emptyState: LyricsData;
        lyricsPlusDebug?: boolean;
    }
}

// Make this a module
export {};
