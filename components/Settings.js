

const ButtonSVG = ({ icon, active = true, onClick }) => {
	return react.createElement(
		"button",
		{ className: `switch${active ? "" : " disabled"}`, onClick },
		react.createElement("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor", dangerouslySetInnerHTML: { __html: icon } })
	);
};

const SwapButton = ({ icon, disabled, onClick }) => {
	return react.createElement(
		"button",
		{ className: "switch small", onClick, disabled },
		react.createElement("svg", { width: 10, height: 10, viewBox: "0 0 16 16", fill: "currentColor", dangerouslySetInnerHTML: { __html: icon } })
	);
};

const CacheButton = () => {
	const [count, setCount] = useState(0);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		try {
			// Use cached-uris as a proxy for count since IDB count is async and expensive
			const cachedUris = JSON.parse(localStorage.getItem("lyrics-plus:cached-uris") || "[]");
			setCount(cachedUris.length);
		} catch {
			setCount(0);
		}
	}, []);

	const clearCache = async () => {
		setIsLoading(true);
		try {
			await CacheManager.clear();
			localStorage.removeItem("lyrics-plus:local-lyrics");
			localStorage.removeItem("lyrics-plus:cached-uris"); // Clear count proxy
			setCount(0);
			Spicetify.showNotification("All lyrics cache cleared!", false, 2000);
		} catch (e) {
			console.error("Failed to clear cache:", e);
			Spicetify.showNotification("Failed to clear cache", true, 2000);
		} finally {
			setIsLoading(false);
		}
	};

	const text = isLoading ? "Clearing..." : (count > 0 ? `Clear (${count}) cached lyrics` : "No cached lyrics");

	return react.createElement(
		"button",
		{ className: "btn", onClick: clearCache, disabled: isLoading || count === 0 },
		text
	);
};

const RefreshTokenButton = ({ setTokenCallback }) => {
	const [buttonText, setButtonText] = useState("Refresh token");
	useEffect(() => {
		if (buttonText === "Refreshing token...") {
			Spicetify.CosmosAsync.get("https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0", null, { authority: "apic-desktop.musixmatch.com" })
				.then(({ message: response }) => {
					if (response.header.status_code === 200 && response.body.user_token) { setTokenCallback(response.body.user_token); setButtonText("Token refreshed"); }
					else if (response.header.status_code === 401) { setButtonText("Too many attempts"); }
					else { setButtonText("Failed to refresh token"); console.error("Failed to refresh token", response); }
				})
				.catch((error) => { setButtonText("Failed to refresh token"); console.error("Failed to refresh token", error); });
		}
	}, [buttonText]);

	return react.createElement("button", { className: "btn", onClick: () => setButtonText("Refreshing token..."), disabled: buttonText !== "Refresh token" }, buttonText);
};

const ConfigButton = ({ name, text, onChange = () => { } }) => {
	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement("button", { className: "btn", onClick: onChange }, text)
		)
	);
};

const ConfigSlider = ({ name, defaultValue, onChange = () => { } }) => {
	const [active, setActive] = useState(defaultValue);
	useEffect(() => { setActive(defaultValue); }, [defaultValue]);
	const toggleState = useCallback(() => { const state = !active; setActive(state); onChange(state); }, [active]);

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement(ButtonSVG, { icon: Spicetify.SVGIcons.check, active, onClick: toggleState })
		)
	);
};

const ConfigSelection = ({ name, defaultValue, options, onChange = () => { } }) => {
	const [value, setValue] = useState(defaultValue);
	const setValueCallback = useCallback((event) => {
		let value = event.target.value;
		if (!Number.isNaN(Number(value))) value = Number.parseInt(value);
		setValue(value); onChange(value);
	}, [value, options]);
	useEffect(() => { setValue(defaultValue); }, [defaultValue]);

	if (!Object.keys(options).length) return null;

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement("select", { className: "main-dropDown-dropDown", value, onChange: setValueCallback },
				Object.keys(options).map((item) => react.createElement("option", { value: item }, options[item]))
			)
		)
	);
};

const ConfigInput = ({ name, defaultValue, onChange = () => { } }) => {
	const [value, setValue] = useState(defaultValue);
	const setValueCallback = useCallback((event) => { const value = event.target.value; setValue(value); onChange(value); }, [value]);

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement("input", { value, onChange: setValueCallback })
		)
	);
};

const ConfigAdjust = ({ name, defaultValue, step, min, max, onChange = () => { } }) => {
	const [value, setValue] = useState(defaultValue);
	function adjust(dir) {
		let temp = value + dir * step;
		// Fix floating point errors
		temp = Math.round(temp * 100) / 100;
		if (temp < min) temp = min; else if (temp > max) temp = max;
		setValue(temp); onChange(temp);
	}
	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement(SwapButton, { icon: `<path d="M2 7h12v2H0z"/>`, onClick: () => adjust(-1), disabled: value === min }),
			react.createElement("p", { className: "adjust-value" }, value),
			react.createElement(SwapButton, { icon: Spicetify.SVGIcons.plus2px, onClick: () => adjust(1), disabled: value === max })
		)
	);
};

// ConfigRange: Draggable range slider input with number display
const ConfigRange = ({ name, defaultValue, min = 0, max = 100, step = 5, onChange = () => { } }) => {
	// Ensure we always have a valid number, default to middle of range
	const initialValue = (defaultValue !== undefined && !isNaN(Number(defaultValue))) 
		? Number(defaultValue) 
		: Math.round((min + max) / 2);
	const [value, setValue] = useState(initialValue);
	
	const handleSliderChange = (e) => {
		const newVal = Number(e.target.value);
		setValue(newVal);
		onChange(newVal);
	};
	
	const handleInputChange = (e) => {
		let newVal = Number(e.target.value);
		if (isNaN(newVal)) newVal = initialValue;
		if (newVal < min) newVal = min;
		if (newVal > max) newVal = max;
		setValue(newVal);
		onChange(newVal);
	};
	
	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action", style: { display: "flex", alignItems: "center", gap: "8px" } },
			react.createElement("input", {
				type: "range",
				className: "lyrics-range-slider",
				min,
				max,
				step,
				value,
				onChange: handleSliderChange,
			}),
			react.createElement("input", {
				type: "number",
				className: "lyrics-range-number",
				min,
				max,
				step,
				value,
				onChange: handleInputChange,
				style: { 
					width: "55px", 
					textAlign: "center",
					padding: "4px",
					background: "rgba(255,255,255,0.1)",
					border: "1px solid rgba(255,255,255,0.2)",
					borderRadius: "4px",
					color: "inherit"
				}
			}),
			react.createElement("span", { style: { opacity: 0.7 } }, "%")
		)
	);
};



const ConfigHotkey = ({ name, defaultValue, onChange = () => { } }) => {
	const [value, setValue] = useState(defaultValue);
	const [trap] = useState(new Spicetify.Mousetrap());

	function record() {
		trap.handleKey = (character, modifiers, e) => {
			if (e.type === "keydown") {
				const sequence = [...new Set([...modifiers, character])];
				if (sequence.length === 1 && sequence[0] === "esc") { onChange(""); setValue(""); return; }
				setValue(sequence.join("+"));
			}
		};
	}
	function finishRecord() { trap.handleKey = () => { }; onChange(value); }

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement("input", { value, onFocus: record, onBlur: finishRecord })
		)
	);
};

const ServiceAction = ({ item, setTokenCallback }) => {
	switch (item.name) {
		case "local": return react.createElement(CacheButton);
		case "musixmatch": return react.createElement(RefreshTokenButton, { setTokenCallback });
		default: return null;
	}
};

const ServiceOption = ({ item, onToggle, onSwap, isFirst = false, isLast = false, onTokenChange = null }) => {
	const [token, setToken] = useState(item.token);
	const [active, setActive] = useState(item.on);

	const setTokenCallback = useCallback((token) => { setToken(token); onTokenChange(item.name, token); }, [item.token]);
	const toggleActive = useCallback(() => {
		if (item.name === "genius" && spotifyVersion >= "1.2.31") return;
		const state = !active; setActive(state); onToggle(item.name, state);
	}, [active]);

	return react.createElement("div", null,
		react.createElement("div", { className: "setting-row" },
			react.createElement("h3", { className: "col description" }, item.name),
			react.createElement("div", { className: "col action" },
				react.createElement(ServiceAction, { item, setTokenCallback }),
				react.createElement(SwapButton, { icon: Spicetify.SVGIcons["chart-up"], onClick: () => onSwap(item.name, -1), disabled: isFirst }),
				react.createElement(SwapButton, { icon: Spicetify.SVGIcons["chart-down"], onClick: () => onSwap(item.name, 1), disabled: isLast }),
				react.createElement(ButtonSVG, { icon: Spicetify.SVGIcons.check, active, onClick: toggleActive })
			)
		),
		react.createElement("span", { dangerouslySetInnerHTML: { __html: item.desc } }),
		item.token !== undefined && react.createElement("input", { placeholder: `Place your ${item.name} token here`, value: token, onChange: (event) => setTokenCallback(event.target.value) }),
		item.name === "netease" && react.createElement("input", { 
			placeholder: "Cloudflare Worker URL (e.g., https://...)", 
			value: CONFIG.visual["netease-worker-url"], 
			onChange: (e) => {
				const val = e.target.value;
				CONFIG.visual["netease-worker-url"] = val;
				ConfigUtils.setPersisted("lyrics-plus:visual:netease-worker-url", val);
				// Update provider instance if it exists
				if (window.ProviderNetease) window.ProviderNetease.setWorkerUrl(val);
			},
			style: { marginTop: "5px", width: "100%" }
		})
	);
};

const ServiceList = ({ itemsList, onListChange = () => { }, onToggle = () => { }, onTokenChange = () => { } }) => {
	const [items, setItems] = useState(itemsList);
	const maxIndex = items.length - 1;
	const onSwap = useCallback((name, direction) => {
		const curPos = items.findIndex((val) => val === name);
		const newPos = curPos + direction;
		[items[curPos], items[newPos]] = [items[newPos], items[curPos]];
		onListChange(items); setItems([...items]);
	}, [items]);

	return items.map((key, index) => {
		const item = CONFIG.providers[key];
		if (!item) return null; // Skip invalid/removed providers
		item.name = key;
		return react.createElement(ServiceOption, { item, key, isFirst: index === 0, isLast: index === maxIndex, onSwap, onTokenChange, onToggle });
	}).filter(Boolean);
};

const corsProxyTemplate = () => {
	const [proxyValue, setProxyValue] = react.useState(localStorage.getItem("spicetify:corsProxyTemplate") || "https://cors-proxy.spicetify.app/{url}");
	return react.createElement("input", {
		placeholder: "CORS Proxy Template", value: proxyValue,
		onChange: (event) => {
			const value = event.target.value; setProxyValue(value);
			if (value === "" || !value) return localStorage.removeItem("spicetify:corsProxyTemplate");
			localStorage.setItem("spicetify:corsProxyTemplate", value);
		},
	});
};

const OptionList = ({ type, items, onChange }) => {
	const [itemList, setItemList] = useState(items);
	const [, forceUpdate] = useState();

	useEffect(() => {
		setItemList(items);
	}, [items]);

	useEffect(() => {
		if (!type) return;
		const eventListener = (event) => { if (event.detail?.type !== type) return; setItemList(event.detail.items); };
		document.addEventListener("lyrics-plus", eventListener);
		return () => document.removeEventListener("lyrics-plus", eventListener);
	}, []);

	return itemList.map((item) => {
		if (!item || (item.when && !item.when())) return;
		const onChangeItem = item.onChange || onChange;
		return react.createElement("div", null,
			react.createElement(item.type, { ...item, name: item.desc, defaultValue: CONFIG.visual[item.key], onChange: (value) => { onChangeItem(item.key, value); forceUpdate({}); } }),
			item.info && react.createElement("span", { dangerouslySetInnerHTML: { __html: item.info } })
		);
	});
};

const languageCodes = "none,en,af,ar,bg,bn,ca,zh,cs,da,de,el,es,et,fa,fi,fr,gu,he,hi,hr,hu,id,is,it,ja,jv,kn,ko,lt,lv,ml,mr,ms,nl,no,pl,pt,ro,ru,sk,sl,sr,su,sv,ta,te,th,tr,uk,ur,vi,zu".split(",");
const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
const languageOptions = languageCodes.reduce((acc, code) => { acc[code] = code === "none" ? "None" : displayNames.of(code); return acc; }, {});

const CollapsibleSection = ({ title, defaultOpen = true, children }) => {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	return react.createElement("div", { className: `config-section ${isOpen ? "open" : ""}` },
		react.createElement("div", { className: "config-section-header", onClick: () => setIsOpen(!isOpen) },
			title,
			react.createElement("svg", { className: "chevron", width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor" },
				react.createElement("path", { d: "M4.5 6L8 9.5L11.5 6" })
			)
		),
		react.createElement("div", { className: "config-section-content" }, children)
	);
};

const ConfigHelper = () => {
	const [activeTab, setActiveTab] = useState("general");
	const tabKeys = ["general", "translation", "providers", "background", "advanced"];

	// General Settings
	const generalSettings = [
		{ desc: getText("settings.language.label"), key: "ui-language", info: getText("settings.language.desc"), type: ConfigSelection, options: { "en": "English", "vi": "Tiếng Việt" }, onChange: (name, value) => { CONFIG.visual[name] = value; ConfigUtils.setPersisted(`${APP_NAME}:visual:${name}`, value); Spicetify.PopupModal.hide(); setTimeout(() => openConfig(), 100); } },
		{ desc: getText("settings.playbarButton.label"), key: "playbar-button", info: getText("settings.playbarButton.desc"), type: ConfigSlider },
		{ desc: getText("settings.globalDelay.label"), info: getText("settings.globalDelay.desc"), key: "global-delay", type: ConfigAdjust, min: -10000, max: 10000, step: 250 },
		{ desc: getText("settings.fontSize.label"), info: getText("settings.fontSize.desc"), key: "font-size", type: ConfigAdjust, min: fontSizeLimit.min, max: fontSizeLimit.max, step: fontSizeLimit.step },
		{ desc: getText("settings.alignment.label"), key: "alignment", type: ConfigSelection, options: { left: getText("settings.alignment.options.left"), center: getText("settings.alignment.options.center"), right: getText("settings.alignment.options.right") } },
		{ desc: getText("settings.fullscreenKey.label"), key: "fullscreen-key", type: ConfigHotkey },
	];

	const syncedSettings = [
		{ desc: getText("settings.linesBefore.label"), key: "lines-before", type: ConfigSelection, options: [0, 1, 2, 3, 4] },
		{ desc: getText("settings.linesAfter.label"), key: "lines-after", type: ConfigSelection, options: [0, 1, 2, 3, 4] },
		{ desc: getText("settings.fadeBlur.label"), key: "fade-blur", type: ConfigSlider },
	];

	const unsyncedSettings = [
		{ desc: getText("settings.unsyncedAutoScroll.label"), info: getText("settings.unsyncedAutoScroll.desc"), key: "unsynced-auto-scroll", type: ConfigSlider },
	];

	// Translation Settings
	const translationSettings = [
		{ desc: getText("settings.apiMode.label"), key: "gemini:api-mode", type: ConfigSelection, options: { "official": getText("settings.apiMode.options.official"), "proxy": getText("settings.apiMode.options.proxy") }, info: getText("settings.apiMode.desc") },

		// Official Settings
		{ desc: getText("settings.geminiApiKey.label"), key: "gemini-api-key", type: ConfigInput, info: getText("settings.geminiApiKey.desc"), when: () => CONFIG.visual["gemini:api-mode"] !== "proxy" },
		{ desc: getText("settings.geminiApiKeyRomaji.label"), key: "gemini-api-key-romaji", type: ConfigInput, info: getText("settings.geminiApiKeyRomaji.desc"), when: () => CONFIG.visual["gemini:api-mode"] !== "proxy" },

		// Proxy Settings
		{ desc: getText("settings.proxyModel.label"), key: "gemini:proxy-model", type: ConfigSelection, options: { "gemini-2.5-flash": "Gemini 2.5 Flash (Default)", "gemini-2.5-pro": "Gemini 2.5 Pro", "gemini-3-flash-preview": "Gemini 3 Flash Preview", "gemini-3-pro-preview": "Gemini 3 Pro Preview" }, info: getText("settings.proxyModel.desc"), when: () => CONFIG.visual["gemini:api-mode"] === "proxy" },
		{ desc: getText("settings.proxyApiKey.label"), key: "gemini:proxy-api-key", type: ConfigInput, info: getText("settings.proxyApiKey.desc"), when: () => CONFIG.visual["gemini:api-mode"] === "proxy" },
		{ desc: getText("settings.proxyEndpoint.label"), key: "gemini:proxy-endpoint", type: ConfigInput, info: getText("settings.proxyEndpoint.desc"), when: () => CONFIG.visual["gemini:api-mode"] === "proxy" },

		// Common Settings
		{ desc: getText("settings.preTranslation.label"), key: "pre-translation", type: ConfigSlider, info: getText("settings.preTranslation.desc") },
		{ desc: getText("settings.disableQueue.label"), key: "gemini:disable-queue", type: ConfigSlider, info: getText("settings.disableQueue.desc") },
	];

	// Callback - persist all settings to both storages
	const onChange = (name, value) => {
		CONFIG.visual[name] = value;
		
		// Special handling for musixmatch
		if (name === "musixmatch-translation-language") {
			if (value === "none") {
				CONFIG.visual["translate:translated-lyrics-source"] = "none";
				ConfigUtils.setPersisted(`${APP_NAME}:visual:translate:translated-lyrics-source`, "none");
			}
			reloadLyrics?.();
		}
		
		// Persist to both storages for all settings (survive spicetify apply)
		ConfigUtils.setPersisted(`${APP_NAME}:visual:${name}`, value);

		if (name !== "musixmatch-translation-language") lyricContainerUpdate?.();

		const configChange = new CustomEvent("lyrics-plus", {
			detail: { type: "config", name: name, value: value },
		});
		window.dispatchEvent(configChange);
	};

	let content;
	switch (activeTab) {
		case "general":
			content = react.createElement("div", null,
				react.createElement(CollapsibleSection, { title: getText("sections.displayControls") }, react.createElement(OptionList, { items: generalSettings, onChange })),
				react.createElement(CollapsibleSection, { title: getText("sections.syncedOptions") }, react.createElement(OptionList, { items: syncedSettings, onChange })),
				react.createElement(CollapsibleSection, { title: getText("sections.unsyncedOptions") }, react.createElement(OptionList, { items: unsyncedSettings, onChange }))
			);
			break;
		case "translation":
			content = react.createElement(CollapsibleSection, { title: getText("sections.geminiApi") }, react.createElement(OptionList, { items: translationSettings, onChange }));
			break;
		case "providers":
			content = react.createElement("div", null,
				react.createElement(CollapsibleSection, { title: getText("sections.serviceOrder") },
					react.createElement(ServiceList, {
						itemsList: CONFIG.providersOrder,
						onListChange: (list) => { CONFIG.providersOrder = list; localStorage.setItem(`${APP_NAME}:services-order`, JSON.stringify(list)); reloadLyrics?.(); },
						onToggle: (name, value) => { CONFIG.providers[name].on = value; localStorage.setItem(`${APP_NAME}:provider:${name}:on`, value); reloadLyrics?.(); },
						onTokenChange: (name, value) => { CONFIG.providers[name].token = value; localStorage.setItem(`${APP_NAME}:provider:${name}:token`, value); reloadLyrics?.(); },
					})
				)
			);
			break;
		case "background":
			const bgSettings = [
				{ desc: getText("settings.videoBackground.label"), key: "video-background", type: ConfigSlider, info: getText("settings.videoBackground.desc") },
				{ desc: getText("settings.videoBackgroundScale.label"), key: "video-background-scale", type: ConfigAdjust, min: 1, max: 2, step: 0.1, defaultValue: 1.1 },
				{ desc: getText("settings.videoBackgroundDim.label"), key: "video-background-dim", type: ConfigAdjust, min: 0, max: 100, step: 10, defaultValue: 50 },
				{ desc: getText("settings.transparentBackground.label"), key: "transparent-background", type: ConfigSlider, info: getText("settings.transparentBackground.desc") },
				{ desc: getText("settings.noise.label"), key: "noise", type: ConfigSlider },
				{ desc: getText("settings.backgroundBrightness.label"), key: "background-brightness", type: ConfigAdjust, min: 0, max: 100, step: 10 },
			];
			content = react.createElement(OptionList, { items: bgSettings, onChange });
			break;
		case "advanced":
			const advSettings = [
				{ desc: getText("settings.debugMode.label"), key: "debug-mode", info: getText("settings.debugMode.desc"), type: ConfigSlider },
				{ desc: getText("settings.jaDetectThreshold.label"), info: getText("settings.jaDetectThreshold.desc"), key: "ja-detect-threshold", type: ConfigAdjust, min: thresholdSizeLimit.min, max: thresholdSizeLimit.max, step: thresholdSizeLimit.step },
				{ desc: getText("settings.hansDetectThreshold.label"), info: getText("settings.hansDetectThreshold.desc"), key: "hans-detect-threshold", type: ConfigAdjust, min: thresholdSizeLimit.min, max: thresholdSizeLimit.max, step: thresholdSizeLimit.step },
				{ desc: getText("settings.musixmatchLanguage.label"), info: getText("settings.musixmatchLanguage.desc"), key: "musixmatch-translation-language", type: ConfigSelection, options: languageOptions },
				{ desc: getText("settings.clearMemoryCache.label"), info: getText("settings.clearMemoryCache.desc"), key: "clear-memore-cache", text: getText("settings.clearMemoryCache.button"), type: ConfigButton, onChange: () => reloadLyrics?.() },
			];
			content = react.createElement("div", null,
				react.createElement(OptionList, { items: advSettings, onChange }),
				react.createElement("h2", { style: { marginTop: 20 } }, getText("sections.corsProxy")),
				react.createElement("span", { dangerouslySetInnerHTML: { __html: getText("settings.corsProxyDesc") } }),
				react.createElement(corsProxyTemplate),
				react.createElement("span", { dangerouslySetInnerHTML: { __html: getText("settings.corsProxyDefault") } })
			);
			break;
	}

	return react.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%" } },
		react.createElement("div", { className: "config-tabs" },
			tabKeys.map(tabKey => react.createElement("div", {
				className: `config-tab ${activeTab === tabKey ? "active" : ""}`,
				onClick: () => setActiveTab(tabKey)
			}, getText(`tabs.${tabKey}`))
		)),
		react.createElement("div", { className: "config-content" }, content)
	);
};

function openConfig() {
	const configContainer = react.createElement(
		"div",
		{ id: `${APP_NAME}-config-container` },
		react.createElement("style", {
			dangerouslySetInnerHTML: {
				__html: `
#${APP_NAME}-config-container { 
	display: flex; 
	flex-direction: column; 
	height: 100%; 
	max-height: 70vh;
	font-family: var(--font-family, CircularSp, CircularSp-Arab, CircularSp-Hebr, CircularSp-Cyrl, CircularSp-Grek, CircularSp-Deva, var(--fallback-fonts, sans-serif));
}
#${APP_NAME}-config-container .setting-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 16px;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid rgba(255,255,255,.05);
	min-height: 50px;
}
#${APP_NAME}-config-container .setting-row:hover { background: rgba(255,255,255,.03); }
#${APP_NAME}-config-container .col.description { font-weight: 500; font-size: 14px; opacity: .9; }
#${APP_NAME}-config-container .col.action { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
#${APP_NAME}-config-container input, #${APP_NAME}-config-container select {
	background: rgba(255,255,255,.08);
	border: 1px solid transparent;
	border-radius: 4px;
	padding: 8px 12px;
	color: inherit;
	min-width: 200px;
	transition: 0.2s ease;
}
#${APP_NAME}-config-container input:focus, #${APP_NAME}-config-container select:focus {
	background: rgba(255,255,255,.12);
	border-color: rgba(255,255,255,.2);
	outline: none;
}
#${APP_NAME}-config-container h2 { font-size: 18px; margin: 0 0 16px; font-weight: 700; }

/* Tabs */
.config-tabs {
	display: flex;
	border-bottom: 1px solid rgba(255,255,255,.1);
	margin: 0 0 16px;
	padding: 0 20px;
	overflow-x: auto;
}
.config-tab {
	padding: 12px 16px;
	cursor: pointer;
	opacity: 0.7;
	border-bottom: 2px solid transparent;
	transition: all 0.2s;
	font-weight: 600;
	font-size: 14px;
	white-space: nowrap;
}
.config-tab:hover { opacity: 1; background: rgba(255,255,255,.05); }
.config-tab.active { opacity: 1; border-bottom-color: var(--spice-text); color: var(--spice-text); }

/* Collapsible Sections */
.config-section { margin-bottom: 24px; }
.config-section-header {
	padding: 12px 0;
	border-bottom: 1px solid rgba(255,255,255,.1);
	cursor: pointer;
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-weight: 700;
	font-size: 14px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	user-select: none;
	color: var(--spice-text);
}
.config-section-header:hover { opacity: 0.8; }
.config-section-content { display: none; padding-top: 8px; }
.config-section.open .config-section-content { display: block; }
.chevron { transition: transform 0.3s ease; }
.config-section.open .chevron { transform: rotate(180deg); }

/* Scrollable Content */
.config-content { flex: 1; overflow-y: auto; padding-right: 8px; }
.config-content::-webkit-scrollbar { width: 8px; }
.config-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 4px; }

.small-info { font-size: 12px; opacity: 0.7; margin-top: 4px; display: block; }
`
			}
		}),
		react.createElement(ConfigHelper)
	);

	Spicetify.PopupModal.display({
		title: "Lyrics Plus Settings",
		content: configContainer,
		isLarge: true,
	});
}

window.openConfig = openConfig;
