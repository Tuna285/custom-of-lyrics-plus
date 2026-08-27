# Graph Report - lyrics-plus  (2026-08-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 517 nodes · 876 edges · 53 communities (36 shown, 17 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f4ec01e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kuroshiro-analyzer-kuromoji.min.js
- Settings.js
- subfiles
- LyricsContainer
- kuroshiro.min.js
- MiniLyrics.js
- Components.js
- e
- types.d.ts
- r
- t
- Translator
- TranslationCoordinator.js
- RequestQueue
- Prompts.js
- pinyin-pro.min.js
- TabBar.js
- at
- q
- t
- SyncedLyrics.js
- index.js
- manifest.json
- AdBlocker.js
- tags
- Config.js
- Utils.js
- VideoBackground.js
- VideoManager.js
- LRCParser.js
- ProviderLRCLIB.js
- ProviderMusixmatch.js
- ProviderNetease.js
- Providers.js
- IDBCache.js
- LyricsFetcher.js
- UpdateService.js
- Cache.js
- TranslationUtils.js

## God Nodes (most connected - your core abstractions)
1. `subfiles` - 39 edges
2. `t()` - 35 edges
3. `e()` - 35 edges
4. `LyricsContainer` - 33 edges
5. `y()` - 33 edges
6. `r()` - 24 edges
7. `Translator` - 16 edges
8. `ConfigHelper()` - 15 edges
9. `u()` - 15 edges
10. `Sn()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `t()` --indirect_call--> `O()`  [INFERRED]
  assets/libs/kuroshiro-analyzer-kuromoji.min.js → assets/libs/kuroshiro.min.js
- `p()` --indirect_call--> `e()`  [INFERRED]
  assets/libs/pinyin-pro.min.js → assets/libs/kuroshiro-analyzer-kuromoji.min.js
- `f()` --indirect_call--> `e()`  [INFERRED]
  assets/libs/kuroshiro.min.js → assets/libs/kuroshiro-analyzer-kuromoji.min.js
- `o()` --indirect_call--> `e()`  [INFERRED]
  assets/libs/kuroshiro.min.js → assets/libs/kuroshiro-analyzer-kuromoji.min.js
- `openOptionsModal()` --indirect_call--> `OptionList()`  [INFERRED]
  components/OptionsMenu.js → components/Settings.js

## Import Cycles
- None detected.

## Communities (53 total, 17 thin omitted)

### Community 0 - "kuroshiro-analyzer-kuromoji.min.js"
Cohesion: 0.05
Nodes (6): cleanUpNextTick(), drainQueue(), runClearTimeout(), runTimeout(), wr(), xr()

### Community 1 - "Settings.js"
Cohesion: 0.09
Nodes (36): AdjustmentsMenu, getGeminiPronounOptions(), getGeminiStyleOptions(), getStaticOptions(), ICONS, openOptionsModal(), OptionsMenu, OptionsMenuItem (+28 more)

### Community 2 - "subfiles"
Cohesion: 0.05
Nodes (39): subfiles, assets/libs/aromanize.min.js, assets/libs/kuroshiro-analyzer-kuromoji.min.js, assets/libs/kuroshiro.min.js, assets/libs/opencc.min.js, assets/libs/pinyin-pro.min.js, components/Components.js, components/MiniLyrics.js (+31 more)

### Community 4 - "kuroshiro.min.js"
Cohesion: 0.12
Nodes (23): a(), _arrayLikeToArray(), _arrayWithoutHoles(), asyncGeneratorStep(), _asyncToGenerator(), o(), u(), _classCallCheck() (+15 more)

### Community 5 - "MiniLyrics.js"
Cohesion: 0.19
Nodes (26): checkForPiPWindow(), cleanupPiP(), createLyricsPanel(), escapeHTML(), findActiveLineIndex(), findQueueInDocument(), getLineDisplayTexts(), initPiPDetection() (+18 more)

### Community 6 - "Components.js"
Cohesion: 0.08
Nodes (14): componentDidMount(), CreditFooter, emptyLine, IdlingIndicator, LoadingIcon, PreTranslateChip, REASONING_ICON_PATHS, REASONING_TAB_LABELS (+6 more)

### Community 7 - "e"
Cohesion: 0.15
Nodes (26): Ar(), br(), bt(), _classCallCheck(), Cn(), d(), e(), En() (+18 more)

### Community 8 - "types.d.ts"
Cohesion: 0.10
Nodes (16): AppConfig, CacheEntry, ColorState, DisplayTexts, ICacheManager, KaraokeWord, LyricLine, LyricsData (+8 more)

### Community 9 - "r"
Cohesion: 0.21
Nodes (20): An(), Cr(), Dr(), i(), u(), jn(), On(), o() (+12 more)

### Community 10 - "t"
Cohesion: 0.18
Nodes (15): a(), b(), dt(), c(), f(), filter(), fr(), gr() (+7 more)

### Community 12 - "TranslationCoordinator.js"
Cohesion: 0.27
Nodes (14): deleteLocalLyrics(), _formatDuration(), getGeminiTranslation(), getTraditionalConversion(), lyricsSource(), _maybeClearPretranslateChip(), processLyricsFromFile(), provideLanguageCode() (+6 more)

### Community 13 - "RequestQueue"
Cohesion: 0.17
Nodes (5): GeminiClient, geminiQueuePhonetic, geminiQueueTranslation, TODO: Monitor Google API updates for Gemma thinking control support., RequestQueue

### Community 14 - "Prompts.js"
Cohesion: 0.23
Nodes (11): buildPronounSection(), buildTaskThinkingRules(), buildTranslationFlowPunctuation(), buildTranslationGuardrails(), buildTranslationOutputJsonBlock(), buildTranslationOutputTagsBlock(), buildTranslationSystemPrompt(), Prompts (+3 more)

### Community 15 - "pinyin-pro.min.js"
Cohesion: 0.22
Nodes (4): m, p(), search(), W()

### Community 16 - "TabBar.js"
Cohesion: 0.27
Nodes (6): getReactDOM(), TabBar, TabBarContext(), TabBarItem, TabBarMore, TopBarContent()

### Community 17 - "at"
Cohesion: 0.28
Nodes (9): at(), Dn(), a(), h(), Hn(), ot(), Pn(), f() (+1 more)

### Community 18 - "q"
Cohesion: 0.29
Nodes (8): bn(), gn(), mn(), q(), rn(), Sr(), vn(), Xt()

### Community 20 - "SyncedLyrics.js"
Cohesion: 0.61
Nodes (7): KaraokeLine(), computeTimingStats(), estimateLineDuration(), isNoteLineObject(), isReallyNote(), SyncedExpandedLyricsPage, SyncedLyricsPage

### Community 21 - "index.js"
Cohesion: 0.29
Nodes (4): fontSizeLimit, render(), syncConfigWithLocalStorage(), thresholdSizeLimit

### Community 22 - "manifest.json"
Cohesion: 0.25
Nodes (7): active-icon, authors, description, icon, name, preview, readme

### Community 24 - "tags"
Cohesion: 0.29
Nodes (7): tags, ai, lyrics, phonetics, spicetify, translation, vietnamese

### Community 25 - "Config.js"
Cohesion: 0.33
Nodes (5): CACHE, CONFIG, ConfigUtils, DebugLogger, emptyState

## Knowledge Gaps
- **112 isolated node(s):** `AppConfig`, `ColorState`, `DisplayTexts`, `KaraokeWord`, `LyricLine` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `e()` connect `e` to `kuroshiro-analyzer-kuromoji.min.js`, `kuroshiro.min.js`, `r`, `t`, `pinyin-pro.min.js`, `at`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `kuroshiro-analyzer-kuromoji.min.js`, `kuroshiro.min.js`, `e`, `r`, `at`, `q`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `LyricsContainer` connect `LyricsContainer` to `index.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `t()` (e.g. with `r()` and `o()`) actually correct?**
  _`t()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `e()` (e.g. with `at()` and `o()`) actually correct?**
  _`e()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AppConfig`, `ColorState`, `DisplayTexts` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kuroshiro-analyzer-kuromoji.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.048484848484848485 - nodes in this community are weakly interconnected._