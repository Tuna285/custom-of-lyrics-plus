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

		// Fallback: search endpoint for fuzzy/non-exact duration & album match
		try {
			const searchURL = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${primaryArtist}`)}`;
			const searchRes = await fetch(searchURL);
			if (searchRes.status === 200) {
				const list = await searchRes.json();
				if (Array.isArray(list) && list.length > 0) {
					// Pick the candidate closest in duration
					const best = list
						.filter(item => item.syncedLyrics || item.plainLyrics)
						.sort((a, b) => Math.abs((a.duration || 0) - durr) - Math.abs((b.duration || 0) - durr))[0];

					if (best && Math.abs((best.duration || 0) - durr) < 15) {
						return best;
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
