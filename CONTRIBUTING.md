# Contributing to Lyric Plus Translate

Cảm ơn bạn đã quan tâm đóng góp cho Lyric Plus Translate. Tài liệu này sẽ giúp bạn hiểu nhanh về project, cách setup môi trường dev, coding conventions, và quy trình đóng góp.

---

## Mục lục

- [Tổng quan dự án](#tổng-quan-dự-án)
- [Cấu trúc & Data flow](#cấu-trúc--data-flow)
- [Danh sách file quan trọng](#danh-sách-file-quan-trọng)
- [Môi trường & công cụ](#môi-trường--công-cụ)
- [Quy trình dev hàng ngày](#quy-trình-dev-hàng-ngày)
- [Quy ước code](#quy-ước-code)
- [i18n (Đa ngôn ngữ)](#i18n-đa-ngôn-ngữ)
- [Các pattern thường gặp](#các-pattern-thường-gặp)
- [Quy trình tạo release](#quy-trình-tạo-release)
- [Commit convention](#commit-convention)
- [Git workflow](#git-workflow)
- [Troubleshooting](#troubleshooting)

---

## Tổng quan dự án

**Lyric Plus Translate** là một Spicetify Custom App — plugin chạy bên trong Spotify dùng để hiển thị lời bài hát (lyrics) kèm dịch AI, phiên âm (Romaji/Pinyin), PiP mini lyrics, và video nền YouTube.

- **Nền tảng:** Spotify Desktop (Windows) + Spicetify
- **Ngôn ngữ:** Plain JavaScript (không TypeScript, không bundler, không Node.js)
- **Framework:** Spicetify React (truy cập qua `Spicetify.React`)
- **License:** LGPL-2.1
- **Repo chính:** [github.com/Tuna285/custom-of-lyrics-plus](https://github.com/Tuna285/custom-of-lyrics-plus)

### Nguyên lý cốt lõi

Dự án không dùng `import`/`export` hay bất kỳ module system nào. **Tất cả file được concatenate vào chung một global scope** bởi Spicetify. Thứ tự load được định nghĩa trong mảng `subfiles` của `manifest.json`.

Điều này có nghĩa là mọi biến khai báo ở top-level scope đều trở thành **global variable**. Để tránh xung đột với các Custom App khác, chúng ta dùng namespace `window.LyricsPlus` và helper `window.LyricsPlus.register(name, module)`.

---

## Cấu trúc & Data flow

### Kiến trúc thư mục

```
lyrics-plus/
├── index.js                   ← Entry point: render(), LyricsContainer (React class)
├── manifest.json              ← Spicetify metadata + subfiles load order
├── style.css / variables.css  ← CSS styles
├── version.json               ← { "version": "1.7.0", "releaseDate": "2026-06-05" }
├── types.d.ts                 ← TypeScript type definitions (JSDoc reference only)
│
├── utils/                     ← Core utilities (load đầu tiên)
│   ├── Namespace.js           ← MUST LOAD FIRST: window.LyricsPlus namespace
│   ├── Config.js              ← CONFIG global (đọc từ Spicetify.LocalStorage)
│   ├── Utils.js               ← Color, language detect, ruby text, DBManager
│   ├── Cache.js               ← L1 RAM + L2 IndexedDB cache (Cache-Aside pattern)
│   ├── TranslationUtils.js    ← Translation-specific helpers
│   └── Prompts.js             ← Prompt templates cho Gemini LLM
│
├── i18n/                      ← Đa ngôn ngữ
│   ├── I18n.js                ← getText() helper
│   ├── LangEN.js, LangVI.js   ← Tiếng Anh, Tiếng Việt
│   ├── LangKO.js, LangJA.js   ← Tiếng Hàn, Tiếng Nhật
│   └── LangZH.js              ← Tiếng Trung (Giản thể)
│
├── parsers/
│   └── LRCParser.js           ← Parser cho file lyrics định dạng LRC
│
├── services/                  ← Business logic
│   ├── LyricsFetcher.js       ← Orchestrator: fetch lyrics → tryServices()
│   ├── GeminiClient.js        ← Request queue + dedup + rate limiting + API calls
│   ├── Translator.js          ← Coordinator cho kuroshiro/kuromoji/openCC/pinyin-pro
│   ├── IDBCache.js            ← Low-level IndexedDB wrapper
│   ├── UpdateService.js       ← Check & download updates từ GitHub
│   └── AdBlocker.js           ← Chặn quảng cáo YouTube cho Video Background
│
├── providers/                 ← Lyrics data sources
│   ├── Providers.js           ← Facade: spotify, musixmatch, lrclib, local, netease
│   ├── ProviderLRCLIB.js      ← lrclib.net (open-source)
│   ├── ProviderMusixmatch.js  ← Musixmatch API (cần token)
│   └── ProviderNetease.js     ← NetEase Cloud Music (cookie tùy chọn)
│
├── components/                ← React components
│   ├── Components.js          ← Shared: CreditFooter, IdlingIndicator, hooks
│   ├── SyncedLyrics.js        ← Synced lyrics page + "♪" idling indicator
│   ├── UnsyncedLyrics.js      ← Reuses SyncedExpandedLyricsPage
│   ├── TabBar.js              ← Tab bar UI
│   ├── Settings.js            ← Settings modal
│   ├── OptionsMenu.js         ← Phần mở rộng, tự động phát hiện ngôn ngữ
│   ├── PlaybarButton.js       ← Nút lyrics trên playbar
│   ├── MiniLyrics.js          ← PiP miniplayer overlay
│   ├── VideoBackground.js     ← Video nền YouTube
│   └── VideoManager.js        ← Tìm video phù hợp trên YouTube
│
├── assets/                    ← Hình ảnh README + language READMEs
└── AGENTS.md                  ← Guideline cho AI agents
```

### Data flow (luồng xử lý chính)

```
Track change (Spotify event)
        │
        ▼
LyricsContainer.fetchLyrics()
        │
        ├── LyricsFetcher.infoFromTrack(track) → { title, artist, uri, duration, ... }
        │
        ├── LyricsFetcher.fetchColors(uri) → { background, inactive }
        ├── LyricsFetcher.fetchTempo(uri) → "0.25s"
        │
        └── LyricsFetcher.tryServices(trackInfo, mode)
                │
                ├── Duyệt providers theo CONFIG.providersOrder:
                │   spotify → musixmatch → netease → lrclib → local
                │
                ├── Level Hierarchy:
                │   - Level 3 (Synced/Karaoke): return ngay, không tìm tiếp
                │   - Level 2 (Unsynced): lưu fallback, tiếp tục tìm Level 3
                │   - Level 1 (None): bỏ qua
                │
                └── Trả về: { synced, unsynced, provider, copyright, ... }

Sau khi có lyrics:
        │
        ├── Utils.detectLanguage(lyrics) → "ja" | "ko" | "zh-hans" | "zh-hant"
        │
        └── Translator (nếu enable)
                ├── GeminiClient.callGemini({...}) qua request queue
                │   └── Stream response → parse → update React state
                ├── Romaji (kuroshiro + kuromoji) cho tiếng Nhật
                ├── Romaja (aromanize) cho tiếng Hàn
                └── Pinyin (pinyin-pro) / OpenCC cho tiếng Trung

Kết quả:
        │
        ▼
SyncedLyricsPage / UnsyncedLyricsPage render
        │
        └── VideoBackground (nếu enable) + MiniLyrics (nếu enable PiP)
```

### Các provider lyrics hiện có


| Provider     | Nguồn                     | Đặc điểm                       | Cần auth? |
| ------------ | ------------------------- | ------------------------------ | --------- |
| `spotify`    | Spotify API (CosmosAsync) | Synced lyrics chính thức       | Không     |
| `musixmatch` | Musixmatch API            | Hỗ trợ translation sẵn         | Token     |
| `netease`    | 网易云音乐 API                 | Phủ tốt indie JP/KR/CN         | Cookie (tùy chọn) |
| `lrclib`     | lrclib.net                | Open-source, miễn phí          | Không     |
| `local`      | IndexedDB (DBManager)     | Cache local từ lần fetch trước | Không     |


---

## Danh sách file quan trọng

Đây là những file bạn sẽ làm việc nhiều nhất khi contribute:


| File                           | Vai trò                                                    | Dòng (xấp xỉ) |
| ------------------------------ | ---------------------------------------------------------- | ------------- |
| `index.js`                     | Entry point, LyricsContainer React class, toàn bộ UI logic | ~2800         |
| `utils/Config.js`              | CONFIG global, tất cả settings                             | ~260          |
| `utils/Utils.js`               | Language detect, ruby text, DBManager                      | ~516          |
| `services/LyricsFetcher.js`    | Orchestrator fetch lyrics                                  | ~267          |
| `services/GeminiClient.js`     | Request queue, API calls, streaming                        | ~1080         |
| `services/Translator.js`       | External libs (kuroshiro, openCC, pinyin)                  | ~184+         |
| `providers/Providers.js`       | Provider facade (router)                                   | ~162          |
| `providers/ProviderNetease.js` | NetEase provider (manual search modal)                     | ~416          |
| `components/SyncedLyrics.js`   | Synced lyrics page + idling indicator                      | ~670+         |
| `components/Settings.js`       | Settings modal UI                                          | Lớn           |
| `components/MiniLyrics.js`     | PiP miniplayer overlay                                     | ~900+         |
| `components/Components.js`     | Shared components (CreditFooter, IdlingIndicator, hooks)   | ~928+         |
| `i18n/I18n.js`                 | `getText()` helper                                         | ~680+         |
| `parsers/LRCParser.js`         | LRC parser                                                 | ~118+         |
| `AGENTS.md`                    | Guideline cho AI agents                                    | ~75           |


---

## Môi trường & công cụ

### Yêu cầu

- **Windows 10/11** (Spotify Desktop yêu cầu Windows)
- **Spotify** cài từ web (không phải Microsoft Store)
- **Spicetify** CLI (`iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex`)
- **Git** (để quản lý code và commit)
- **PowerShell 5+**

### Không cần

- Node.js, npm, yarn, pnpm — project không có bundler hay package manager
- Bất kỳ build step nào — Spicetify tự động concatenate file
- IDE cụ thể — bất kỳ text editor nào cũng được, nhưng dùng VSCode/Cursor được khuyên dùng

### Setup lần đầu

```powershell
# 1. Clone repo vào thư mục CustomApps của Spicetify
git clone https://github.com/Tuna285/custom-of-lyrics-plus.git "$env:LOCALAPPDATA\spicetify\CustomApps\lyrics-plus"

# 2. Apply và reload Spotify
spicetify apply
```

---

## Quy trình dev hàng ngày

### Test thay đổi local

Sau khi sửa code, bạn cần copy file vào thư mục CustomApps và apply:

```powershell
# Copy toàn bộ project vào CustomApps (overwrite)
Copy-Item -Recurse -Force "." "$env:LOCALAPPDATA\spicetify\CustomApps\lyrics-plus"

# Apply và reload Spotify
spicetify apply
```

> **Quan trọng:** KHÔNG chạy PowerShell dưới quyền Administrator. Spicetify không thể apply thay đổi khi chạy Admin.

### Debug

Mở **Spotify Developer Tools** bằng `Ctrl+Shift+I` (hoặc `Ctrl+Alt+Shift+I` nếu shortcut bị chặn). Bạn sẽ thấy log của app trong tab Console.

Để bật debug logging chi tiết:

1. Mở Settings → tab "Nâng cao" (Advanced)
2. Bật **Debug Mode**
3. Console sẽ hiển thị log với prefix `[Lyrics+:DEBUG]`

### Hot reload

Spicetify không hỗ trợ hot reload. Mỗi lần thay đổi code, bạn phải chạy lại:

```powershell
Copy-Item -Recurse -Force "." "$env:LOCALAPPDATA\spicetify\CustomApps\lyrics-plus"
spicetify apply
```

Sau khi apply, Spotify sẽ tự động reload.

---

## Quy ước code

### Nguyên tắc chung

1. **Plain JavaScript only** — không TypeScript, không ES6 module, không JSX (dùng `react.createElement` thay vì JSX)
2. **Global scope** — mọi biến top-level là global. Dùng `window.LyricsPlus.register(name, module)` để export module
3. **Không `console.log`** trong production — dùng `console.warn` cho recoverable issues, `DebugLogger.log()` cho debug logs
4. **Immutable state** — dùng spread operator (`...`) thay vì mutate trực tiếp
5. **JSDoc** — ghi chú kiểu cho function quan trọng bằng `/** @param ... @returns ... */`

### Cách khai báo module mới

```javascript
// 1. Tạo module dưới dạng object
const MyNewService = {
    doSomething() {
        // ...
    }
};

// 2. Register vào namespace (đồng thời expose ra global)
if (window.LyricsPlus?.register) {
    window.LyricsPlus.register('MyNewService', MyNewService);
} else {
    window.MyNewService = MyNewService;
}
```

### Cách sử dụng module đã có

```javascript
// Cách 1: Truy cập qua global (backward compatible)
const result = LyricsFetcher.tryServices(info);

// Cách 2: Truy cập qua namespace (khuyên dùng)
const result = window.LyricsPlus.LyricsFetcher.tryServices(info);
```

### Cách truy cập React

```javascript
// Tất cả React APIs được truy cập qua Spicetify.React
const react = Spicetify.React;
const { useState, useEffect, useCallback, useMemo, useRef } = react;

// Tạo element KHÔNG dùng JSX — dùng react.createElement
const MyComponent = react.memo(({ title }) => {
    return react.createElement("div", { className: "my-class" }, title);
});
```

### Cách đọc/ghi config

```javascript
// Đọc config (có default value)
const value = CONFIG.visual["some-setting"];

// Ghi config (persist qua Spicetify.LocalStorage + localStorage)
ConfigUtils.setPersisted("lyrics-plus:visual:some-setting", "true");

// Đọc trực tiếp
const raw = ConfigUtils.getPersisted("lyrics-plus:visual:some-setting");
```

### Cách dùng Cache

```javascript
// Cache 2-level: L1 RAM (nhanh) + L2 IndexedDB (bền vững)
const cached = await CacheManager.get("my-key");
await CacheManager.set("my-key", data);
await CacheManager.delete("my-key");

// Lấy stats
const stats = CacheManager.stats;
```

### File headers & comment

Không cần header phức tạp. Mỗi file chỉ cần một dòng comment mô tả chức năng chính ở đầu file:

```javascript
// MyNewService.js - Brief description of what this module does
```

Tránh comment thừa kiểu `// Import the module`, `// Define the function`. Comment chỉ dành cho logic không hiển nhiên, trade-offs, hoặc constraints.

---

## i18n (Đa ngôn ngữ)

### Thêm chuỗi mới

Tất cả chuỗi hiển thị cho người dùng PHẢI đi qua `getText()`:

```javascript
// Thay vì:
const label = "Save Settings";

// Dùng:
const label = getText("settings.save");
```

**Quy trình thêm key mới:**

1. **Thêm key vào `i18n/LangEN.js`** (bắt buộc):

```javascript
window.LANG_EN = {
    // ... existing keys ...
    "settings.save": "Save Settings",
};
```

1. **Thêm key vào `i18n/LangVI.js`** (bắt buộc):

```javascript
window.LANG_VI = {
    // ... existing keys ...
    "settings.save": "Lưu Cài đặt",
};
```

1. **Thêm vào các file ngôn ngữ khác nếu có thể** (`LangKO.js`, `LangJA.js`, `LangZH.js`). Nếu không biết ngôn ngữ đó, có thể skip — `getText()` sẽ fallback về `LangEN`.

### Cấu trúc key

Dùng dot notation để phân cấp:

- `tabs.`* — tên tab trong settings
- `sections.`* — tên section
- `settings.*` — label và description của setting
- `buttons.*` — nhãn nút
- `notifications.*` — thông báo
- `ui.*` — UI elements (provider names, placeholders, etc.)

### getText với parameters

```javascript
getText("ui.providedBy", { provider: "Spotify" });
// → "Provided by Spotify"
```

Template trong LangEN:

```javascript
"ui.providedBy": "Provided by {provider}",
```

---

## Các pattern thường gặp

### Pattern 1: Thêm provider lyrics mới

1. **Tạo file** `providers/ProviderX.js` với IIFE pattern (xem `[ProviderNetease.js](providers/ProviderNetease.js)` làm mẫu):

```javascript
const ProviderX = (() => {
    async function findLyrics(info) {
        // Fetch lyrics...
        return {
            uri: info.uri,
            provider: "x",
            synced: [...],
            unsynced: [...],
            copyright: "...",
        };
    }
    return { findLyrics };
})();

window.ProviderX = ProviderX;
```

1. **Thêm vào `providers/Providers.js`**:

```javascript
const Providers = {
    // ... existing providers ...
    x: async (info) => {
        try {
            const data = await ProviderX.findLyrics(info);
            if (data.error) return { error: data.error, uri: info.uri };
            return data;
        } catch (e) {
            return { error: `ProviderX: ${e.message}`, uri: info.uri };
        }
    },
};
```

1. **Thêm config vào `utils/Config.js`** (trong `CONFIG.providers`):

```javascript
x: {
    on: ConfigUtils.get("lyrics-plus:provider:x:on"),
    desc: "Description of this provider.",
    modes: [SYNCED, UNSYNCED],
},
```

1. **Cập nhật `manifest.json`** — thêm `"providers/ProviderX.js"` vào mảng `subfiles` (đúng vị trí trước `providers/Providers.js`)
2. **Cập nhật `install.ps1`** — thêm `"providers/ProviderX.js"` vào mảng `$filesToDownload` (đúng vị trí)
3. **Cập nhật `services/UpdateService.js`** — thêm vào mảng `UPDATE_FILES`

### Pattern 2: Thêm component React mới

```javascript
// Trong components/MyComponent.js

// Sử dụng react từ global scope (đã được khai báo trong index.js)
const MyComponent = react.memo(({ title, onClose }) => {
    const [state, setState] = react.useState(null);

    return react.createElement("div",
        { className: "my-component" },
        react.createElement("h2", null, title),
        react.createElement("button", { onClick: onClose }, "Close")
    );
});

// Export ra global
window.MyComponent = MyComponent;
```

### Pattern 3: Gọi API với rate limiting & dedup

```javascript
// GeminiClient xử lý tất cả API calls qua RequestQueue
// Queue tự động:
//   - Dedup request trùng lặp (cùng key)
//   - Rate limiting thích ứng (100ms delay bình thường, 500ms khi bị 429)
//   - Cancel tất cả pending requests khi track thay đổi

const result = await GeminiClient.callGemini({
    model: "gemini-3.1-flash-lite",
    messages: [...],
    // ...
});

// Hủy tất cả pending requests
GeminiClient.cancelAllQueues();
```

### Pattern 4: Race condition handling

Khi làm việc với async operations (fetch lyrics, API calls, video), luôn check xem request có còn valid không:

```javascript
// Trong LyricsFetcher
LyricsFetcher.setCurrentRequest(trackInfo.uri);

// ... async work ...

if (!LyricsFetcher.isRequestValid(trackInfo.uri)) {
    return null; // Stale request, bỏ qua
}
```

### Pattern 5: Đăng ký theme động

```javascript
// Dùng CSS variables từ Spicetify theme (KHÔNG hardcode màu hex)
const buttonStyle = {
    background: "var(--spice-button)",
    color: "var(--spice-text)",
};
```

---

## Quy trình tạo release

### Checklist trước khi release

- Tất cả thay đổi đã được test local (`spicetify apply`)
- `CHANGELOG.md` đã được cập nhật theo định dạng [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- `version.json` đã được bump version number
- `services/UpdateService.js` — `CURRENT_VERSION` đã được cập nhật
- `manifest.json` và `install.ps1` đã được sync (nếu thêm/xóa file)
- `services/UpdateService.js` — `UPDATE_FILES` đã được sync (nếu thêm/xóa file)
- Tất cả key i18n mới đã có ít nhất trong `LangEN.js` và `LangVI.js`
- Commit release với format: `release v<version>: <summary>`

### Cập nhật version.json

```json
{
    "version": "1.7.0",
    "releaseDate": "2026-06-05"
}
```

### Cập nhật UpdateService.js

```javascript
// Sửa CURRENT_VERSION:
CURRENT_VERSION: "1.7.0",

// Nếu có thêm file mới, thêm vào UPDATE_FILES:
UPDATE_FILES: [
    // ... existing files ...
    "providers/ProviderX.js",
],
```

---

## Commit convention

Tuân thủ [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả ngắn>
```

### Types


| Type       | Dùng khi                                                    |
| ---------- | ----------------------------------------------------------- |
| `feat`     | Thêm tính năng mới                                          |
| `fix`      | Sửa bug                                                     |
| `docs`     | Thay đổi documentation                                      |
| `style`    | Formatting, missing semicolons, etc. (không thay đổi logic) |
| `refactor` | Refactor code (không fix bug, không thêm feature)           |
| `perf`     | Cải thiện performance                                       |
| `test`     | Thêm hoặc sửa test                                          |
| `chore`    | Cập nhật build tasks, package manager configs, etc.         |


### Scopes (tùy chọn)


| Scope         | Áp dụng cho                       |
| ------------- | --------------------------------- |
| `installer`   | install.ps1, uninstall.ps1        |
| `reasoning`   | AI reasoning/thinking feature     |
| `settings`    | Settings UI                       |
| `netease`     | NetEase provider                  |
| `cache`       | Cache system                      |
| `i18n`        | Đa ngôn ngữ                       |
| `translator`  | Translator.js, GeminiClient       |
| `video`       | Video background/manager          |
| `mini-lyrics` | PiP mini lyrics                   |
| `parser`      | LRCParser                         |
| *(để trống)*  | Thay đổi không thuộc scope cụ thể |


### Ví dụ

```
feat: integrate NetEase provider with manual search modal
fix(installer): sync file list in install.ps1 with manifest.json
docs: update AGENTS.md with namespace instructions
style(settings): remove hardcoded hex colors, use theme variables
chore: bump version to 1.7.0
```

### Commit message release

```
release v1.7.0: NetEase provider, theme consistency, video blur
```

Commit message release nên tóm tắt 2-4 thay đổi lớn nhất trong version đó.

---

## Git workflow

### Branches

- `main` — branch chính, luôn sẵn sàng release
- `feat/<tên-tính-năng>` — branch cho tính năng mới (ví dụ: `feat/netease-provider`)
- `fix/<mô-tả>` — branch cho bug fix (ví dụ: `fix/idle-indicator-timing`)

### Quy trình làm việc

```
1. Từ main:          git checkout -b feat/my-feature
2. Code + test local
3. Commit:            git add . && git commit -m "feat: my feature description"
4. Push:              git push -u origin feat/my-feature
5. Tạo Pull Request trên GitHub
6. Review + merge vào main
```

### Trước khi push

```powershell
# Kiểm tra manifest.json và install.ps1 đã sync chưa
# (nếu bạn thêm/xóa file)

# Kiểm tra không có console.log production
rg "console\.log" --glob "*.js" --glob "!services/GeminiClient.js"

# Test local lần cuối
Copy-Item -Recurse -Force "." "$env:LOCALAPPDATA\spicetify\CustomApps\lyrics-plus"
spicetify apply
```

---

## Troubleshooting

### "spicetify apply" không hoạt động

1. Đảm bảo bạn KHÔNG chạy PowerShell với quyền Admin
2. Thử đóng Spotify hoàn toàn trước khi apply
3. Kiểm tra Spicetify đã được cài đúng: `spicetify --version`

### Lyrics không hiển thị sau khi sửa code

1. Kiểm tra `manifest.json` — file có trong `subfiles` không?
2. Kiểm tra thứ tự trong `subfiles` — file phụ thuộc phải được load sau dependency
3. Mở DevTools (`Ctrl+Shift+I`) kiểm tra Console tab để xem lỗi
4. Bật Debug Mode trong Settings → Advanced → Debug Mode

### TypeError: Cannot read properties of undefined

Rất có thể là vấn đề thứ tự load. Kiểm tra trong `manifest.json`:

- `utils/Namespace.js` PHẢI load đầu tiên
- Module được dùng phải load trước module dùng nó

### API call bị CORS

Dùng `Spicetify.CosmosAsync` thay vì `fetch()` trực tiếp. Spotify Electron không enforce CORS khi dùng CosmosAsync.

### Dịch không hoạt động

1. Kiểm tra API key đã được cấu hình trong Settings → Translation
2. Kiểm tra model được chọn có hỗ trợ không (mặc định: `gemini-3.1-flash-lite`)
3. Mở DevTools Console xem có lỗi 429 (rate limit) hoặc lỗi API không
4. Nếu dùng endpoint custom, đảm bảo endpoint tương thích OpenAI API format

---

## Liên hệ

- **GitHub Issues:** [github.com/Tuna285/custom-of-lyrics-plus/issues](https://github.com/Tuna285/custom-of-lyrics-plus/issues)
- **Tác giả:** [Tuna285](https://github.com/Tuna285)

---

*Tài liệu được cập nhật lần cuối: 2026-06-05*