# Lyrics Plus - Developer & Agent Documentation

## Project Architecture & Core Logic

Lyrics Plus is a Spicetify Custom App that provides advanced synced lyrics with AI translation.

```
lyrics-plus/
├── index.js              # Main entry, contains LyricsContainer (Class Component)
├── manifest.json         # Loading order for subfiles (CRITICAL: maintains global scope)
├── types.d.ts            # Project-wide TypeScript definitions (JSDoc support)
├── components/           # UI Components (Mix of Class and Functional)
├── providers/            # Lyric source implementations (LRCLib, Musixmatch, etc.)
├── services/             # Core logic: GeminiClient, Translator, IDBCache
└── utils/                # Shared utilities, Config, and RAM/IDB Cache managers
```

### Loading & Scope
- **No Bundler:** This project does not use Webpack or Rollup.
- **Global Scope:** All modules are exposed to `window` for cross-file access.
- **Subfiles:** `manifest.json` defines the load order. New files MUST be added there to be accessible.

## Development Workflow

### Build & Deploy
Since there is no compilation step, "building" involves applying the changes to Spicetify.
- **Apply Changes:** `spicetify apply`
- **Fast Refresh:** In Spotify, use `Ctrl+Shift+R` (with DevTools open) or `spicetify watch` for automatic updates.

### Testing & Linting
- **Tests:** No automated test suite exists. Verify changes manually by triggering lyric fetches in Spotify.
- **Linting:** No formal linter. Follow existing patterns.
- **Type Checking:** VSCode uses `types.d.ts`. Use JSDoc `@type` or `@param` to leverage these definitions.

## Code Style Guidelines

### 1. Imports & Exports
- **NEVER use `import` or `export` statements** in `.js` files (except in `types.d.ts` for modules).
- Access shared modules via global variables: `Utils`, `CONFIG`, `CACHE`, `Spicetify`.
- React hooks: Use `const { useState, useEffect } = Spicetify.React;`.

### 2. Formatting
- **Indentation:** Use **Tabs** (1 tab = 4 spaces).
- **Quotes:** Prefer **double quotes** `"` for strings and JSX attributes, unless single quotes `'` are required for nesting.
- **Semicolons:** Always use semicolons.

### 3. Naming Conventions
- **Components:** `PascalCase` (e.g., `SyncedLyrics`, `Settings`).
- **Functions/Variables:** `camelCase` (e.g., `fetchLyrics`, `isLoaded`).
- **Constants:** `SCREAMING_SNAKE_CASE` for global config/cache (e.g., `CONFIG`, `CACHE`).
- **Files:** `PascalCase` for components/providers, `camelCase` for others.

### 4. React Patterns
- **Mixed Components:** `index.js` uses a monolithic Class Component (`LyricsContainer`). New features should be extracted into Functional Components in `components/`.
- **UI:** Use `Spicetify.React.createElement` for dynamic UI or standard JSX if using a pre-processor (though raw JS is preferred for compatibility).

### 5. Error Handling
- Use `try...catch` for all network requests (Providers, GeminiClient).
- Always provide a fallback (e.g., return `emptyState` or log to `console.error`).
- **Silent Failures:** Avoid empty `catch` blocks; at least log the error for debugging.

## Caching System

**Dual-Layer Cache (L1/L2):**
1. **L1 (RAM):** `CACHE` object in `window`. Lost on app restart.
2. **L2 (IndexedDB):** Managed by `CacheManager` in `Cache.js`. Persistent.
3. **Flow:** Check L1 → if miss, check L2 → if miss, fetch network → update both L1 and L2.

## CSS & Theming
- **Variables:** Use tokens from `variables.css` and `style.css` `:root`.
- **Z-Index Hierarchy:**
    - `--z-background`: 0
    - `--z-content`: 10
    - `--z-controls`: 100
    - `--z-overlay`: 999
    - `--z-modal`: 9999

## Instructions for AI Agents
- **Manifest:** When adding a new file, update `manifest.json`.
- **Global Awareness:** Check `types.d.ts` before implementing new logic to ensure type compatibility.
- **Performance:** Use `Utils.fetchTempo` and `Utils.debounce` for rate-limited operations.
- **Language:** Main UI strings should be added to `i18n/LangEN.js` and `i18n/LangVI.js`, then accessed via `I18n.getText()`.
