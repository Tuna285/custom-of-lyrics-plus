const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath = "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath = "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

// Translator Class - Coordinator for External Utils and API Delegation
class Translator {
	constructor(lang, isUsingNetease = false) {
		this.finished = { ja: false, ko: false, zh: false };
		this.isUsingNetease = isUsingNetease;
		this.initializationPromise = null;
		this.applyKuromojiFix();
		this.initializationPromise = this.initializeAsync(lang);
	}

	async initializeAsync(lang) {
		try {
			await this.injectExternals(lang);
			await this.createTranslator(lang);
		} catch (error) {
			console.error(`Failed to initialize translator for language ${lang}:`, error);
			throw error;
		}
	}

	// Delegate prompt building to Prompts module (for legacy direct access if any)
	static extractGeminiJson(text) {
		return GeminiClient.extractGeminiJson(text);
	}

	// Delegate API calls to GeminiClient
	static promote(key) {
		GeminiClient.promote(key);
	}

	static async callGemini(params) {
		return GeminiClient.callGemini(params);
	}

	// External Scripts
	includeExternal(url) {
		return new Promise((resolve, reject) => {
			const existingScript = document.querySelector(`script[src="${url}"]`);
			if (existingScript) {
				if (existingScript.dataset) existingScript.dataset.loaded = existingScript.dataset.loaded || 'true';
				return resolve();
			}
			const script = document.createElement("script");
			script.setAttribute("type", "text/javascript");
			script.setAttribute("src", url);
			script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); });
			script.addEventListener('error', () => { reject(new Error(`Failed to load script: ${url}`)); });
			document.head.appendChild(script);
		});
	}

	async injectExternals(lang) {
		const langCode = lang?.slice(0, 2);
		try {
			switch (langCode) {
				case "ja": await Promise.all([this.includeExternal(kuromojiPath), this.includeExternal(kuroshiroPath)]); break;
				case "ko": await this.includeExternal(aromanize); break;
				case "zh":
					await this.includeExternal(openCCPath);
					this.includeExternal(pinyinProPath).catch(() => { });
					this.includeExternal(tinyPinyinPath).catch(() => { });
					break;
			}
		} catch (error) { console.error(`Failed to load externals for ${langCode}`, error); throw error; }
	}

	async awaitFinished(language) {
		const langCode = language?.slice(0, 2);
		if (this.initializationPromise) await this.initializationPromise;
		if (langCode && !this.finished[langCode]) {
			await this.injectExternals(language);
			await this.createTranslator(language);
		}
	}

	applyKuromojiFix() {
		if (typeof XMLHttpRequest.prototype.realOpen !== "undefined") return;
		XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;
		XMLHttpRequest.prototype.open = function (method, url, bool) {
			if (url.indexOf(dictPath.replace("https://", "https:/")) === 0) {
				this.realOpen(method, url.replace("https:/", "https://"), bool);
			} else {
				this.realOpen(method, url, bool);
			}
		};
	}

	async createTranslator(lang) {
		const langCode = lang.slice(0, 2);
		switch (langCode) {
			case "ja":
				if (this.kuroshiro) return;
				await this.waitForGlobals(['Kuroshiro', 'KuromojiAnalyzer'], 10000);
				this.kuroshiro = new Kuroshiro.default();
				await this.kuroshiro.init(new KuromojiAnalyzer({ dictPath }));
				this.finished.ja = true;
				break;
			case "ko":
				if (this.Aromanize) return;
				await this.waitForGlobals(['Aromanize'], 5000);
				this.Aromanize = Aromanize;
				this.finished.ko = true;
				break;
			case "zh":
				if (this.OpenCC) return;
				await this.waitForGlobals(['OpenCC'], 5000);
				this.OpenCC = OpenCC;
				this.finished.zh = true;
				break;
		}
	}

	async waitForGlobals(globalNames, timeoutMs = 5000) {
		const startTime = Date.now();
		return new Promise((resolve, reject) => {
			const checkGlobals = () => {
				if (globalNames.every(name => typeof window[name] !== 'undefined')) { resolve(); return; }
				if (Date.now() - startTime > timeoutMs) { reject(new Error(`Timeout waiting for globals: ${globalNames.join(', ')}`)); return; }
				setTimeout(checkGlobals, 50);
			};
			checkGlobals();
		});
	}

	static normalizeRomajiString(s) {
		if (typeof s !== "string") return "";
		return s.replace(/\s{2,}/g, " ").trim();
	}

	async romajifyText(text, target = "romaji", mode = "spaced") {
		await this.awaitFinished("ja");
		const out = await this.kuroshiro.convert(text, { to: target, mode: mode, romajiSystem: "hepburn" });
		return Translator.normalizeRomajiString(out);
	}

	async convertToRomaja(text, target) {
		await this.awaitFinished("ko");
		if (target === "hangul") return text;
		if (!this.Aromanize || typeof this.Aromanize.hangulToLatin !== "function") throw new Error("Korean converter not initialized");
		return this.Aromanize.hangulToLatin(text, "rr-translit");
	}

	async convertChinese(text, from, target) {
		await this.awaitFinished("zh");
		const converter = this.OpenCC.Converter({ from: from, to: target });
		return converter(text);
	}

	async loadPinyinPro() {
		// Compatibility fallback if anyone calls this
	}
}
