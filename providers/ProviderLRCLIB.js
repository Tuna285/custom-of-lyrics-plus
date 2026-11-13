const ProviderLRCLIB = (() => {
	const CJK_REGEX = /[\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7af]/;
	const INSTRUMENTAL_REGEX = /instrumental|off vocal|karaoke|カラオケ|伴奏/i;

	function normalizeText(value) {
		return (value || "")
			.normalize("NFKC")
			.toLowerCase()
			.replace(/\s*[\[(](?:feat(?:uring)?|ft|with|prod)\.?\s+[^)\]]*[\])]/gi, "")
			.replace(/\s+(?:[-–—]\s*)?(?:feat(?:uring)?|ft|with|prod)\.?\s+.+$/i, "")
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.trim();
	}

	function stripTrackSuffix(value) {
		const cleaned = typeof Utils !== "undefined" && Utils.removeSongFeat
			? Utils.removeSongFeat(Utils.removeExtraInfo(value || ""))
			: (value || "");
		return normalizeText(cleaned);
	}

	function textSimilarity(a, b) {
		if (!a || !b) return 0;
		if (a === b) return 1;
		const maxLen = Math.max(a.length, b.length);
		const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
		for (let j = 0; j <= b.length; j++) dp[0][j] = j;
		for (let i = 1; i <= a.length; i++) {
			for (let j = 1; j <= b.length; j++) {
				dp[i][j] = a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
			}
		}
		return 1 - dp[a.length][b.length] / maxLen;
	}

	function artistMatches(candArtistRaw, info) {
		const candNorm = normalizeText(candArtistRaw);
		if (!candNorm) return false;
		const infoArtists = [
			...(Array.isArray(info.artists) ? info.artists : []),
			...(info.artist ? info.artist.split(/[,&/]|\s+feat\.?\s+/i) : []),
		]
			.map(normalizeText)
			.filter(Boolean);

		return infoArtists.some((a) =>
			candNorm === a ||
			` ${candNorm} `.includes(` ${a} `) ||
			` ${a} `.includes(` ${candNorm} `) ||
			textSimilarity(candNorm, a) >= 0.72
		);
	}

	function pickBestMatch(list, info, cleanTitle, durr, { strictTrackOnly = false } = {}) {
		if (!Array.isArray(list) || list.length === 0) return null;

		const normInfoTitle = normalizeText(cleanTitle) || normalizeText(info.title);
		const isInstSearch = INSTRUMENTAL_REGEX.test(info.title || "");
		const maxDelta = strictTrackOnly ? 4 : 15;
		const infoArtistHasCJK = CJK_REGEX.test(info.artist || "");

		const scored = [];
		for (const item of list) {
			if (!item || (!item.syncedLyrics && !item.plainLyrics)) continue;
			if (!isInstSearch && INSTRUMENTAL_REGEX.test(item.trackName || "")) continue;

			const delta = durr > 0 && item.duration > 0 ? Math.abs(item.duration - durr) : 0;
			if (durr > 0 && delta >= maxDelta) continue;

			const candTitle = stripTrackSuffix(item.trackName || "");
			const titleSim = Math.max(
				textSimilarity(candTitle, normInfoTitle),
				textSimilarity(normalizeText(item.trackName), normalizeText(info.title))
			);
			const artistOk = artistMatches(item.artistName, info);
			const scriptMismatch = infoArtistHasCJK !== CJK_REGEX.test(item.artistName || "");

			if (strictTrackOnly) {
				// Track-only search exists for Romanized/CJK artist mismatch: reject unrelated same-script artists
				if (titleSim < 0.85) continue;
				if (!artistOk && !(scriptMismatch && delta < 3 && titleSim >= 0.9)) continue;
			} else {
				if (titleSim < 0.68) continue;
				if (!artistOk && !(scriptMismatch && titleSim >= 0.85 && delta < 5)) continue;
			}

			const syncBonus = item.syncedLyrics && delta < 5 ? 1 : 0;
			scored.push({
				item,
				syncBonus,
				artistOk: artistOk ? 1 : 0,
				titleSim,
				delta,
			});
		}

		if (scored.length === 0) return null;
		scored.sort((a, b) =>
			b.syncBonus - a.syncBonus ||
			b.artistOk - a.artistOk ||
			b.titleSim - a.titleSim ||
			a.delta - b.delta
		);
		return scored[0].item;
	}

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
				const exact = await body.json();
				if (exact && (exact.syncedLyrics || exact.plainLyrics || exact.instrumental)) {
					return exact;
				}
			}
		} catch (_) { }

		// Fallback 1: search endpoint with title + primary artist (verified title, artist & duration)
		try {
			const searchURL = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${primaryArtist}`)}`;
			const searchRes = await fetch(searchURL);
			if (searchRes.status === 200) {
				const best = pickBestMatch(await searchRes.json(), info, cleanTitle, durr);
				if (best) return best;
			}
		} catch (_) { }

		// Fallback 2: search by track_name alone for Romanized vs CJK script mismatch (strict title + artist/script check)
		try {
			const trackSearchURL = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}`;
			const trackSearchRes = await fetch(trackSearchURL);
			if (trackSearchRes.status === 200) {
				const best = pickBestMatch(await trackSearchRes.json(), info, cleanTitle, durr, { strictTrackOnly: true });
				if (best) return best;
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
