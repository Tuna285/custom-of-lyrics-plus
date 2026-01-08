// I18n.js - Localization Helper

// Get current language object
window.getCurrentLang = () => {
	// CONFIG might not be loaded yet, so check localStorage manually first or fall back safely
	const langCode = CONFIG?.visual?.["ui-language"] || localStorage.getItem("lyrics-plus:visual:ui-language") || "en";
	return langCode === "vi" ? window.LANG_VI : window.LANG_EN;
};

// Get localized text
window.getText = (path, replacements = {}) => {
	const lang = window.getCurrentLang();
	const keys = path.split(".");
	let value = lang;
	for (const key of keys) {
		value = value?.[key];
		if (value === undefined) return path; // Fallback to key if not found
	}
	// Handle replacements like {duration}, {lines}
	if (typeof value === "string" && Object.keys(replacements).length > 0) {
		for (const [k, v] of Object.entries(replacements)) {
			value = value.replace(`{${k}}`, v);
		}
	}
	return value;
};
