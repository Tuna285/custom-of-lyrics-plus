const ProviderLRCLIB = (() => {
	async function findLyrics(info) {
		const baseURL = "https://lrclib.net/api/get";
		const durr = info.duration / 1000;
		const cleanTitle = typeof Utils !== "undefined" ? Utils.removeSongFeat(Utils.removeExtraInfo(info.title)) : info.title;
		const primaryArtist = (info.artist || "").split(",")[0].split("&")[0].trim();

		const params = {
			track_name: info.title,
			artist_name: info.artist,
			album_name: info.album,
			duration: durr,
		};

		const finalURL = `${baseURL}?${Object.keys(params)
			.map((key) => `${key}=${encodeURIComponent(params[key])}`)
			.join("&")}`;

		try {
			const body = await fetch(finalURL);
			if (body.status === 200) {
				return await body.json();
			}
		} catch (_) { }

		// Fallback 1: search endpoint with title + primary artist
		try {
			const searchURL = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${primaryArtist}`)}`;
			const searchRes = await fetch(searchURL);
			if (searchRes.status === 200) {
				const list = await searchRes.json();
				if (Array.isArray(list) && list.length > 0) {
					const valid = list.filter(item => (item.syncedLyrics || item.plainLyrics) && Math.abs((item.duration || 0) - durr) < 15);
					if (valid.length > 0) {
						// Prioritize synced lyrics within 5s duration delta
						const syncedBest = valid
							.filter(item => item.syncedLyrics && Math.abs((item.duration || 0) - durr) < 5)
							.sort((a, b) => Math.abs((a.duration || 0) - durr) - Math.abs((b.duration || 0) - durr))[0];
						if (syncedBest) {
							return syncedBest;
						}
						valid.sort((a, b) => Math.abs((a.duration || 0) - durr) - Math.abs((b.duration || 0) - durr));
						return valid[0];
					}
				}
			}
		} catch (_) { }

		// Fallback 2: search by track_name alone if artist query failed (e.g. Romanized vs CJK script mismatch)
		try {
			const trackSearchURL = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}`;
			const trackSearchRes = await fetch(trackSearchURL);
			if (trackSearchRes.status === 200) {
				const list = await trackSearchRes.json();
				if (Array.isArray(list) && list.length > 0) {
					// Require tight duration match (< 4s) when searching by track_name alone
					const valid = list.filter(item => (item.syncedLyrics || item.plainLyrics) && Math.abs((item.duration || 0) - durr) < 4);
					if (valid.length > 0) {
						const syncedBest = valid
							.filter(item => item.syncedLyrics)
							.sort((a, b) => Math.abs((a.duration || 0) - durr) - Math.abs((b.duration || 0) - durr))[0];
						if (syncedBest) {
							return syncedBest;
						}
						valid.sort((a, b) => Math.abs((a.duration || 0) - durr) - Math.abs((b.duration || 0) - durr));
						return valid[0];
					}
				}
			}
		} catch (_) { }

		return {
			error: "Request error: Track wasn't found",
			uri: info.uri,
		};
	}

	function getUnsynced(body) {
		const unsyncedLyrics = body?.plainLyrics;
		const isInstrumental = body.instrumental;
		if (isInstrumental) return [{ text: "♪ Instrumental ♪" }];

		if (!unsyncedLyrics) return null;

		return Utils.parseLocalLyrics(unsyncedLyrics).unsynced;
	}

	function getSynced(body) {
		const syncedLyrics = body?.syncedLyrics;
		const isInstrumental = body.instrumental;
		if (isInstrumental) return [{ text: "♪ Instrumental ♪" }];

		if (!syncedLyrics) return null;

		return Utils.parseLocalLyrics(syncedLyrics).synced;
	}

	    return { findLyrics, fetchLyrics: findLyrics, getSynced, getUnsynced };
})();

window.ProviderLRCLIB = ProviderLRCLIB;
if (window.LyricsPlus) {
    window.LyricsPlus.ProviderLRCLIB = ProviderLRCLIB;
}
