

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

const UI_COLOR_DEFAULTS = {
	"ui-switch-on-color": "",
	"ui-switch-off-color": "",
	"ui-button-bg-color": "",
	"ui-button-text-color": "",
	"ui-fab-bg-color": "",
	"ui-fab-icon-color": "",
	"ui-accent-color": "",
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
			Spicetify.showNotification(getText("notifications.cacheClearedShort"), false, 2000);
		} catch (e) {
			console.error("Failed to clear cache:", e);
			Spicetify.showNotification(getText("notifications.translationFailed"), true, 2000);
		} finally {
			setIsLoading(false);
		}
	};

	const text = count > 0
		? getText("buttons.clearCache")
		: getText("buttons.noCache");

	return react.createElement(
		"button",
		{ className: "btn", onClick: clearCache, disabled: isLoading || count === 0 },
		text
	);
};

const RefreshTokenButton = ({ setTokenCallback }) => {
	const [status, setStatus] = useState("idle");
	const buttonTextByStatus = {
		idle: getText("buttons.refreshToken"),
		loading: getText("buttons.refreshingToken"),
		success: getText("buttons.tokenRefreshed"),
		rateLimit: getText("buttons.tooManyAttempts"),
		error: getText("buttons.failedRefreshToken"),
	};
	const buttonText = buttonTextByStatus[status] || buttonTextByStatus.idle;

	useEffect(() => {
		if (status === "loading") {
			Spicetify.CosmosAsync.get("https://apic-appmobile.musixmatch.com/ws/1.1/token.get?app_id=mac-ios-v2.0", null, {
				Host: "apic-appmobile.musixmatch.com",
				authority: "apic-appmobile.musixmatch.com",
				"X-Cookie": "x-mxm-token-guid=",
				"x-mxm-app-version": "10.1.1",
				"X-User-Agent": "Musixmatch/2025120901 CFNetwork/3860.300.31 Darwin/25.2.0",
				"Accept-Language": "en-US,en;q=0.9",
				Connection: "keep-alive",
				Accept: "application/json",
			})
				.then(({ message: response }) => {
					if (response.header.status_code === 200 && response.body.user_token) { setTokenCallback(response.body.user_token); setStatus("success"); }
					else if (response.header.status_code === 401) { setStatus("rateLimit"); }
					else { setStatus("error"); console.error("Failed to refresh token", response); }
				})
				.catch((error) => { setStatus("error"); console.error("Failed to refresh token", error); });
		} else if (status === "error" || status === "rateLimit" || status === "success") {
			const timer = setTimeout(() => setStatus("idle"), 3000);
			return () => clearTimeout(timer);
		}
	}, [status]);

	return react.createElement("button", { className: "btn", onClick: () => setStatus("loading"), disabled: status !== "idle" }, buttonText);
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
	const normalizeSelectValue = (v) => (v === undefined || v === null ? "" : String(v));
	const [value, setValue] = useState(normalizeSelectValue(defaultValue));
	const setValueCallback = useCallback((event) => {
		const raw = event.target.value;
		let out = raw;
		if (Array.isArray(options)) {
			out = Number.parseInt(raw, 10);
			if (Number.isNaN(out)) out = 0;
		} else if (options && typeof options === "object") {
			const keys = Object.keys(options);
			const allNumericKeys = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
			if (allNumericKeys) {
				const n = Number.parseInt(raw, 10);
				out = Number.isNaN(n) ? raw : String(n);
			}
		}
		setValue(raw);
		onChange(out);
	}, [options, onChange]);
	useEffect(() => { setValue(normalizeSelectValue(defaultValue)); }, [defaultValue]);

	const entries = Array.isArray(options)
		? options.map((v) => [String(v), v])
		: Object.keys(options).map((k) => [k, options[k]]);
	if (!entries.length) return null;

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement("select", { className: "main-dropDown-dropDown", value, onChange: setValueCallback },
				entries.map(([optVal, label]) => react.createElement("option", { key: optVal, value: optVal }, label))
			)
		)
	);
};

const ConfigInput = ({ name, defaultValue, onChange = () => { }, placeholder = "", inputType = "text", autoComplete = "off" }) => {
	const [value, setValue] = useState(defaultValue ?? "");
	const setValueCallback = useCallback((event) => {
		const v = event.target.value;
		setValue(v);
		onChange(v);
	}, [onChange]);
	useEffect(() => { setValue(defaultValue ?? ""); }, [defaultValue]);

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action" },
			react.createElement("input", { value, onChange: setValueCallback, placeholder, type: inputType, autoComplete, spellCheck: false })
		)
	);
};

// Combo input = free-form text input + native <datalist> of preset suggestions.
// Users can either pick a preset from the dropdown or type any custom value.
// `options` accepts either ["string", ...] or [{ value, label }, ...] entries.
const ConfigComboBox = ({ name, defaultValue, onChange = () => { }, placeholder = "", inputType = "text", autoComplete = "off", options = [] }) => {
	const listId = useMemo(
		() => `lp-datalist-${String(name).replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
		[name]
	);
	const [value, setValue] = useState(defaultValue ?? "");
	const setValueCallback = useCallback((event) => {
		const v = event.target.value;
		setValue(v);
		onChange(v);
	}, [onChange]);
	useEffect(() => { setValue(defaultValue ?? ""); }, [defaultValue]);

	const optionEls = (options || []).map((opt) => {
		const optValue = typeof opt === "string" ? opt : opt.value;
		const optLabel = typeof opt === "string" ? undefined : opt.label;
		return react.createElement("option", { key: optValue, value: optValue, label: optLabel });
	});

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action lp-combo-action" },
			react.createElement("input", {
				value,
				onChange: setValueCallback,
				placeholder,
				type: inputType,
				autoComplete,
				spellCheck: false,
				list: listId,
				className: "lp-combo-input"
			}),
			react.createElement("datalist", { id: listId }, optionEls)
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

const ConfigColor = ({ name, defaultValue, onChange = () => { }, resetValue = "" }) => {
	const [value, setValue] = useState(defaultValue || resetValue);
	const debounceRef = react.useRef(null);
	const pendingValueRef = react.useRef(null);

	const flushPending = useCallback(() => {
		if (pendingValueRef.current === null) return;
		onChange(pendingValueRef.current);
		pendingValueRef.current = null;
	}, [onChange]);

	const scheduleChange = useCallback((nextValue) => {
		pendingValueRef.current = nextValue;
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			flushPending();
			debounceRef.current = null;
		}, 120);
	}, [flushPending]);

	useEffect(() => {
		setValue(defaultValue || resetValue);
	}, [defaultValue, resetValue]);

	useEffect(() => () => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		flushPending();
	}, [flushPending]);

	const handleColorChange = (e) => {
		const v = e.target.value;
		setValue(v);
		scheduleChange(v);
	};

	const handleCommit = () => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}
		flushPending();
	};

	const handleReset = () => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}
		pendingValueRef.current = null;
		setValue(resetValue);
		onChange(resetValue);
	};

	return react.createElement("div", { className: "setting-row" },
		react.createElement("label", { className: "col description" }, name),
		react.createElement("div", { className: "col action lp-color-action" },
			react.createElement("input", { type: "color", value: value || "#000000", onChange: handleColorChange, onBlur: handleCommit, className: "lp-color-swatch" }),
			react.createElement("button", { className: "btn lp-color-reset-btn", onClick: handleReset }, getText("buttons.resetToTheme"))
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
	const providerNamePath = `providers.${item.name}.name`;
	const providerDescPath = `providers.${item.name}.desc`;
	const localizedName = getText(providerNamePath);
	const localizedDesc = getText(providerDescPath);
	const displayName = localizedName === providerNamePath ? item.name : localizedName;
	const displayDesc = localizedDesc === providerDescPath ? item.desc : localizedDesc;

	const setTokenCallback = useCallback((token) => { setToken(token); onTokenChange(item.name, token); }, [item.token]);
	const toggleActive = useCallback(() => {
		const state = !active; setActive(state); onToggle(item.name, state);
	}, [active]);
	const tokenPlaceholder = getText("settings.providerTokenPlaceholder", {}, `Paste ${item.name} token`);
	const tokenInput = item.token !== undefined
		? react.createElement("div", { className: "provider-input-row" },
			react.createElement("input", {
				className: "provider-token-input",
				placeholder: tokenPlaceholder,
				value: token,
				onChange: (event) => setTokenCallback(event.target.value),
				autoComplete: "off",
				spellCheck: false
			})
		)
		: null;

	return react.createElement("div", { className: "setting-group" },
		react.createElement("div", { className: "setting-row provider-row" },
			react.createElement("div", { className: "col description provider-meta" },
				react.createElement("h3", { className: "provider-title" }, displayName),
				react.createElement("p", { className: "setting-desc provider-desc", dangerouslySetInnerHTML: { __html: displayDesc } })
			),
			react.createElement("div", { className: "col action" },
				react.createElement(ServiceAction, { item, setTokenCallback }),
				react.createElement(SwapButton, { icon: Spicetify.SVGIcons["chart-up"], onClick: () => onSwap(item.name, -1), disabled: isFirst }),
				react.createElement(SwapButton, { icon: Spicetify.SVGIcons["chart-down"], onClick: () => onSwap(item.name, 1), disabled: isLast }),
				react.createElement(ButtonSVG, { icon: Spicetify.SVGIcons.check, active, onClick: toggleActive })
			)
		),
		tokenInput
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
		return react.createElement("div", { className: "setting-group" },
			react.createElement(item.type, { ...item, name: item.desc, defaultValue: CONFIG.visual[item.key], onChange: (value) => { onChangeItem(item.key, value); forceUpdate({}); } }),
			item.info && react.createElement("p", { className: "setting-desc", dangerouslySetInnerHTML: { __html: item.info } })
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
	const tabKeys = ["general", "translation", "providers", "background", "appearance", "advanced"];

	// General Settings
	const generalSettings = [
		{ desc: getText("settings.language.label"), key: "ui-language", info: getText("settings.language.desc"), type: ConfigSelection, options: { "en": "English", "vi": "Tiếng Việt", "ko": "한국어", "ja": "日本語", "zh": "中文（简体）" }, onChange: (name, value) => { CONFIG.visual[name] = value; ConfigUtils.setPersisted(`${APP_NAME}:visual:${name}`, value); lyricContainerUpdate?.(); Spicetify.PopupModal.hide(); setTimeout(() => openConfig(), 100); } },
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

	const preTranslationTimePresets = [10, 15, 20, 30, 45, 60, 90, 120].reduce((acc, sec) => {
		acc[String(sec)] = `${sec} s`;
		return acc;
	}, {});

	// Popular OpenAI-compatible endpoints. Users can still type any custom URL.
	const ENDPOINT_PRESETS = [
		{ value: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", label: "Google Gemini / Gemma (official)" },
		{ value: "https://openrouter.ai/api/v1/chat/completions", label: "OpenRouter (gateway)" },
		{ value: "https://api.deepseek.com/v1/chat/completions", label: "DeepSeek" },
		{ value: "https://api.openai.com/v1/chat/completions", label: "OpenAI" },
		{ value: "https://api.anthropic.com/v1/chat/completions", label: "Anthropic Claude (OpenAI-compat)" },
	];

	// Popular models matching the endpoints above (verified Apr 2026). Free-form input still allowed.
	const MODEL_PRESETS = [
		// Gemma 4 26B A4B (MoE, ~3.88B active) — fastest option with quality on par with 31B
		// for translation tasks. No thinking mode, so no Pass 3/4 overhead. Free tier: 1500 RPD.
		{ value: "gemma-4-26b-a4b-it", label: "Recommended — fast, good quality" },
		// Google Gemini 2.5 — fast tiers (free-tier friendly)
		"gemini-2.5-flash",
		"gemini-2.5-flash-lite",
		// Gemma 4 31B (dense) — strongest Gemma 4 with thinking mode
		"gemma-4-31b-it",
		// Gemma 3 legacy (still served, useful as fallback)
		"gemma-3-27b-it",
		// OpenRouter (gateway namespace prefix) — current routes
		"openai/gpt-5.4-mini",
		"anthropic/claude-sonnet-4.6",
		// DeepSeek — aliases auto-route to V3.2 (chat = non-thinking, reasoner = thinking)
		"deepseek-chat",
		"deepseek-reasoner",
		// OpenAI GPT-5.4 family (Mar 2026)
		"gpt-5.4",
		"gpt-5.4-mini",
		// Anthropic Claude 4.x (Feb–Apr 2026)
		"claude-opus-4-7",
		"claude-sonnet-4-6",
		"claude-haiku-4-5",
	];

	// Translation Settings (OpenAI-compatible endpoint + keys; no proxy/official split)
	const translationSettings = [
		{ desc: getText("settings.apiEndpoint.label"), key: "gemini:endpoint", type: ConfigComboBox, info: getText("settings.apiEndpoint.desc"), placeholder: "https://…/v1/chat/completions", options: ENDPOINT_PRESETS },
		{ desc: getText("settings.modelName.label"), key: "gemini:model", type: ConfigComboBox, info: getText("settings.modelName.desc"), placeholder: "gemma-4-26b-a4b-it", options: MODEL_PRESETS },
		{ desc: getText("settings.apiKey.label"), key: "gemini-api-key", type: ConfigInput, info: getText("settings.apiKey.desc"), inputType: "password", placeholder: "••••••••" },
		{ desc: getText("settings.apiKey2.label"), key: "gemini-api-key-romaji", type: ConfigInput, info: getText("settings.apiKey2.desc"), inputType: "password", placeholder: "Optional" },
		{ desc: getText("settings.responseMode.label"), key: "gemini:response-mode", type: ConfigSelection, options: { prompt: getText("settings.responseMode.options.prompt"), json_schema: getText("settings.responseMode.options.json_schema") }, info: getText("settings.responseMode.desc") },
		{
			desc: getText("settings.reasoningEffort.label"),
			key: "gemini:reasoning-effort",
			type: ConfigSelection,
			options: {
				off: getText("settings.reasoningEffort.options.off"),
				low: getText("settings.reasoningEffort.options.low"),
				medium: getText("settings.reasoningEffort.options.medium"),
				high: getText("settings.reasoningEffort.options.high"),
			},
			info: getText("settings.reasoningEffort.desc")
		},
		{ desc: getText("settings.preTranslation.label"), key: "pre-translation", type: ConfigSlider, info: getText("settings.preTranslation.desc") },
		{ desc: getText("settings.preTranslationTime.label"), key: "pre-translation-time", type: ConfigSelection, options: preTranslationTimePresets, info: getText("settings.preTranslationTime.desc"), when: () => CONFIG.visual["pre-translation"] },
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
				{ desc: getText("settings.videoBackgroundBlur.label") || "Độ mờ Video", key: "video-background-blur", type: ConfigAdjust, min: 0, max: 80, step: 2, defaultValue: 0 },
				{ desc: getText("settings.transparentBackground.label"), key: "transparent-background", type: ConfigSlider, info: getText("settings.transparentBackground.desc") },
				{ desc: getText("settings.noise.label"), key: "noise", type: ConfigSlider },
				{ desc: getText("settings.backgroundBrightness.label"), key: "background-brightness", type: ConfigAdjust, min: 0, max: 100, step: 10 },
			];
			content = react.createElement(OptionList, { items: bgSettings, onChange });
			break;
		case "appearance": {
			const appearanceSettings = [
				{ desc: getText("contextMenu.lyricPos"), key: "lyric-position", type: ConfigRange, min: 0, max: 100, step: 5 },
			];
			const buttonColorSettings = [
				{ desc: getText("settings.uiSwitchOnColor.label"), key: "ui-switch-on-color", type: ConfigColor, info: getText("settings.uiSwitchOnColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-switch-on-color"] },
				{ desc: getText("settings.uiSwitchOffColor.label"), key: "ui-switch-off-color", type: ConfigColor, info: getText("settings.uiSwitchOffColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-switch-off-color"] },
				{ desc: getText("settings.uiAccentColor.label"), key: "ui-accent-color", type: ConfigColor, info: getText("settings.uiAccentColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-accent-color"] },
				{ desc: getText("settings.uiButtonBgColor.label"), key: "ui-button-bg-color", type: ConfigColor, info: getText("settings.uiButtonBgColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-button-bg-color"] },
				{ desc: getText("settings.uiButtonTextColor.label"), key: "ui-button-text-color", type: ConfigColor, info: getText("settings.uiButtonTextColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-button-text-color"] },
				{ desc: getText("settings.uiFabBgColor.label"), key: "ui-fab-bg-color", type: ConfigColor, info: getText("settings.uiFabBgColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-fab-bg-color"] },
				{ desc: getText("settings.uiFabIconColor.label"), key: "ui-fab-icon-color", type: ConfigColor, info: getText("settings.uiFabIconColor.desc"), resetValue: UI_COLOR_DEFAULTS["ui-fab-icon-color"] },
			];
			content = react.createElement("div", null,
				react.createElement(CollapsibleSection, { title: getText("sections.displayControls") }, react.createElement(OptionList, { items: appearanceSettings, onChange })),
				react.createElement(CollapsibleSection, { title: getText("sections.appearanceButton") }, react.createElement(OptionList, { items: buttonColorSettings, onChange }))
			);
			break;
		}
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
				react.createElement("div", { className: "cors-proxy-section" },
				react.createElement("h2", null, getText("sections.corsProxy")),
				react.createElement("p", { className: "setting-desc cors-proxy-desc", dangerouslySetInnerHTML: { __html: getText("settings.corsProxyDesc") } }),
				react.createElement(corsProxyTemplate),
				react.createElement("p", { className: "setting-desc cors-proxy-desc", dangerouslySetInnerHTML: { __html: getText("settings.corsProxyDefault") } })
			)
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
		{
			id: `${APP_NAME}-config-container`,
			style: {
				"--lp-ui-switch-on": CONFIG.visual["ui-switch-on-color"] || "var(--spice-button)",
				"--lp-ui-switch-off": CONFIG.visual["ui-switch-off-color"] || "rgba(var(--spice-rgb-subtext), 0.2)",
				"--lp-ui-btn-bg": CONFIG.visual["ui-button-bg-color"] || "var(--spice-button-disabled, rgba(255,255,255,0.08))",
				"--lp-ui-btn-text": CONFIG.visual["ui-button-text-color"] || "var(--spice-text)",
				"--lp-fab-bg": CONFIG.visual["ui-fab-bg-color"] || "rgba(var(--spice-rgb-main, 20, 20, 20), 0.72)",
				"--lp-fab-icon": CONFIG.visual["ui-fab-icon-color"] || "var(--spice-button)",
				"--lp-ui-accent": CONFIG.visual["ui-accent-color"] || "var(--spice-button)",
			}
		},
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
#${APP_NAME}-config-container .setting-group {
	border-bottom: 1px solid rgba(255,255,255,.05);
	border-radius: 6px;
	transition: background 0.15s ease;
}
#${APP_NAME}-config-container .setting-group:hover { background: rgba(255,255,255,.03); }
#${APP_NAME}-config-container .setting-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 16px;
	align-items: center;
	padding: 12px 16px;
	min-height: 50px;
}
#${APP_NAME}-config-container .setting-group .setting-row:hover { background: transparent; }
#${APP_NAME}-config-container .setting-group:has(.setting-desc) .setting-row { padding-bottom: 6px; }
#${APP_NAME}-config-container .setting-desc {
	display: block;
	margin: 0;
	padding: 0 16px 10px 16px;
	font-size: 11.5px;
	line-height: 1.5;
	opacity: 0.45;
	color: var(--spice-subtext, var(--spice-text));
}
#${APP_NAME}-config-container .setting-desc code {
	font-family: monospace;
	background: rgba(255,255,255,.08);
	padding: 1px 4px;
	border-radius: 3px;
	font-size: 10.5px;
}
#${APP_NAME}-config-container .provider-row {
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: start;
	padding-bottom: 10px;
}
#${APP_NAME}-config-container .provider-meta { display: flex; flex-direction: column; gap: 4px; }
#${APP_NAME}-config-container .provider-title { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
#${APP_NAME}-config-container .provider-desc {
	padding: 0;
	font-size: 13px;
	line-height: 1.55;
	opacity: 0.66;
	max-width: 720px;
}
#${APP_NAME}-config-container .provider-input-row { padding: 0 16px 12px 16px; }
#${APP_NAME}-config-container .provider-token-input {
	width: 100%;
	min-width: 0;
	font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
	font-size: 12.5px;
}
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
	border-color: var(--lp-ui-accent, var(--spice-button));
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--lp-ui-accent, var(--spice-button)) 30%, transparent);
	outline: none;
}
#${APP_NAME}-config-container select {
	background: rgba(46,46,46,.9);
	border-color: rgba(255,255,255,.16);
}
#${APP_NAME}-config-container select option {
	background: #2b2b2b;
	color: #f2f2f2;
}
#${APP_NAME}-config-container .lp-combo-action { width: 100%; max-width: 360px; }
#${APP_NAME}-config-container .lp-combo-input {
	width: 100%;
	min-width: 240px;
	font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
	font-size: 12.5px;
}
#${APP_NAME}-config-container h2 { font-size: 13px; margin: 0 0 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; }
.cors-proxy-section { padding: 16px 16px 8px; border-top: 1px solid rgba(255,255,255,.05); margin-top: 8px; }
.cors-proxy-section .cors-proxy-desc { padding: 0 0 10px 0; font-size: 12px; opacity: 0.5; line-height: 1.55; }
.cors-proxy-section input { width: 100%; margin-top: 4px; box-sizing: border-box; }

/* Tabs */
.config-tabs {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	box-sizing: border-box;
	max-width: 100%;
	position: sticky;
	top: 0;
	z-index: 2;
	background: transparent;
	border-bottom: 1px solid rgba(255,255,255,.05);
	margin: 0 0 16px;
	padding: 8px 16px 10px;
	overflow: visible;
}
.config-tab {
	flex: 1 1 112px;
	min-width: 0;
	padding: 8px 12px;
	cursor: pointer;
	opacity: 0.7;
	border: 1px solid transparent;
	border-radius: 999px;
	transition:
		opacity 0.16s ease,
		background-color 0.16s ease,
		border-color 0.16s ease,
		color 0.16s ease;
	font-weight: 600;
	font-size: 14px;
	text-align: center;
	white-space: normal;
	overflow-wrap: anywhere;
	line-height: 1.2;
}
.config-tab:hover { opacity: 1; background: rgba(255,255,255,.05); }
.config-tab.active { opacity: 1; border-color: rgba(255,255,255,.25); background: rgba(255,255,255,.08); color: var(--spice-text); }

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
.lp-color-action { gap: 10px !important; }
#${APP_NAME}-config-container input[type="color"].lp-color-swatch {
	width: 36px !important;
	height: 36px !important;
	padding: 2px !important;
	border-radius: 8px !important;
	border: 1px solid rgba(255,255,255,.2) !important;
	cursor: pointer !important;
	background: none !important;
	min-width: unset !important;
}
#${APP_NAME}-config-container input[type="color"].lp-color-swatch::-webkit-color-swatch-wrapper { padding: 0; border-radius: 6px; }
#${APP_NAME}-config-container input[type="color"].lp-color-swatch::-webkit-color-swatch { border: none; border-radius: 6px; }

`
			}
		}),
		react.createElement(ConfigHelper)
	);

	Spicetify.PopupModal.display({
		title: getText("modal.title"),
		content: configContainer,
		isLarge: true,
	});
}

window.openConfig = openConfig;
