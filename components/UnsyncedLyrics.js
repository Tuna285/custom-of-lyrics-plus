// UnsyncedLyrics.js — plain (non-synced) lyrics view
// Reuses expanded synced UI (per-line timing + scroll) which also works for LRC-style unsynced data.

const UnsyncedLyricsPage = window.SyncedExpandedLyricsPage;

if (!UnsyncedLyricsPage) {
	console.error("[Lyrics+] UnsyncedLyrics: SyncedExpandedLyricsPage not loaded — check manifest order (SyncedLyrics.js before UnsyncedLyrics.js).");
}

window.UnsyncedLyricsPage = UnsyncedLyricsPage;
