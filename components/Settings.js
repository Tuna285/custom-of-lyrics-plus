

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
		let cancelled = false;
		const loadCount = async () => {
			try {
				const unified = (typeof UnifiedDB !== "undefined" && UnifiedDB) || window.LyricsPlus?.UnifiedDB;
				if (unified?.getStats) {
					const stats = await unified.getStats();
					if (!cancelled) setCount(stats.clearableTrackEstimate || 0);
					return;
				}
				if (typeof DBManager !== "undefined" && DBManager.getCount) {
					const c = await DBManager.getCount();
					if (!cancelled) setCount(c);
				}
			} catch {
				if (!cancelled) setCount(0);
			}
		};
		loadCount();
		return () => { cancelled = true; };
	}, []);

	const clearCache = async () => {
		setIsLoading(true);
		try {
			const unified = (typeof UnifiedDB !== "undefined" && UnifiedDB) || window.LyricsPlus?.UnifiedDB;
			await CacheManager.clear();
			if (unified?.clearCachesOnly) {
				await unified.clearCachesOnly();
			} else if (typeof DBManager !== "undefined" && typeof DBManager.clear === "function") {
				await DBManager.clear();
			}
			if (typeof CACHE !== "undefined") {
				for (const k in CACHE) delete CACHE[k];
			}
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

const BackupAndStorageSection = () => {
	const [stats, setStats] = useState({ userTrackCount: 0, lyricsCacheCount: 0, aiCacheCount: 0, ephemeralCacheCount: 0 });
	const [confirmWipe, setConfirmWipe] = useState(false);
	const fileInputRef = useRef(null);

	const refreshStats = async () => {
		const unified = (typeof UnifiedDB !== "undefined" && UnifiedDB) || window.LyricsPlus?.UnifiedDB;
		if (!unified?.getStats) return;
		try {
			const next = await unified.getStats();
			setStats(next);
		} catch { }
	};

	useEffect(() => {
		refreshStats();
	}, []);

	useEffect(() => {
		if (!confirmWipe) return;
		const timer = setTimeout(() => setConfirmWipe(false), 4000);
		return () => clearTimeout(timer);
	}, [confirmWipe]);

	const handleExport = async () => {
		const unified = (typeof UnifiedDB !== "undefined" && UnifiedDB) || window.LyricsPlus?.UnifiedDB;
		if (!unified?.exportBackup) return;
		try {
			const backup = await unified.exportBackup();
			const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			const dateStr = new Date().toISOString().slice(0, 10);
			a.href = url;
			a.download = `lyrics-plus-backup-${dateStr}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			Spicetify.showNotification(
				`✓ ${getText("notifications.backupExported", { count: backup.trackCount }, `Đã xuất sao lưu (${backup.trackCount} bài hát)`)}`,
				false,
				2500
			);
		} catch (e) {
			console.error("[Lyrics+] Export backup failed:", e);
			Spicetify.showNotification(getText("notifications.backupFailed", {}, "Sao lưu thất bại"), true, 3000);
		}
	};

	const handleImportFile = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			const unified = (typeof UnifiedDB !== "undefined" && UnifiedDB) || window.LyricsPlus?.UnifiedDB;
			const res = await unified.importBackup(parsed, { mode: "merge" });
			await refreshStats();
			if (window.lyricContainer && Spicetify.Player?.data?.item) {
				delete CACHE[Spicetify.Player.data.item.uri];
				window.lyricContainer.fetchLyrics(Spicetify.Player.data.item);
			}
			Spicetify.showNotification(
				`✓ ${getText("notifications.backupImported", { count: res.total }, `Đã khôi phục ${res.total} bài hát`)}`,
				false,
				3000
			);
		} catch (err) {
			console.error("[Lyrics+] Import backup failed:", err);
			Spicetify.showNotification(getText("notifications.backupInvalid", {}, "File sao lưu không hợp lệ"), true, 3000);
		} finally {
			e.target.value = "";
		}
	};

	const handleWipeUserTracks = async () => {
		if (!confirmWipe) {
			setConfirmWipe(true);
			return;
		}
		setConfirmWipe(false);
		const unified = (typeof UnifiedDB !== "undefined" && UnifiedDB) || window.LyricsPlus?.UnifiedDB;
		if (unified?.clearAllUserTracks) {
			await unified.clearAllUserTracks();
			await refreshStats();
			if (window.lyricContainer && Spicetify.Player?.data?.item) {
				delete CACHE[Spicetify.Player.data.item.uri];
				window.lyricContainer.fetchLyrics(Spicetify.Player.data.item);
			}
			Spicetify.showNotification(`✓ ${getText("notifications.personalDataCleared", {}, "Đã xóa toàn bộ dữ liệu cá nhân")}`, false, 2500);
		}
	};

	return react.createElement(
		"div",
		{ className: "lp-backup-card" },
		react.createElement(
			"div",
			{ className: "lp-backup-stats" },
			react.createElement(
				"div",
				{ className: "lp-backup-stat" },
				react.createElement("span", { className: "lp-backup-stat-num" }, stats.userTrackCount),
				react.createElement("span", { className: "lp-backup-stat-label" }, getText("settings.backup.permanentTracks", {}, "Bài đã chỉnh sửa / lưu vĩnh viễn"))
			),
			react.createElement(
				"div",
				{ className: "lp-backup-stat" },
				react.createElement("span", { className: "lp-backup-stat-num" }, stats.aiCacheCount + stats.lyricsCacheCount),
				react.createElement("span", { className: "lp-backup-stat-label" }, getText("settings.backup.cachedEntries", {}, "Cache AI & Lời bài hát"))
			)
		),
		react.createElement(
			"div",
			{ className: "lp-backup-actions" },
			react.createElement("button", { type: "button", className: "btn", onClick: handleExport }, getText("settings.backup.exportBtn", {}, "Xuất sao lưu (.json)")),
			react.createElement("button", { type: "button", className: "btn", onClick: () => fileInputRef.current?.click() }, getText("settings.backup.importBtn", {}, "Nhập sao lưu (.json)")),
			react.createElement(
				"button",
				{
					type: "button",
					className: `btn ${confirmWipe ? "lp-btn-danger-outline" : ""}`,
					disabled: stats.userTrackCount === 0,
					onClick: handleWipeUserTracks,
				},
				confirmWipe
					? getText("settings.backup.confirmWipeBtn", {}, "Bấm lại để xác nhận xóa")
					: getText("settings.backup.wipeBtn", {}, "Xóa dữ liệu cá nhân")
			),
			react.createElement("input", {
				ref: fileInputRef,
				type: "file",
				accept: ".json",
				style: { display: "none" },
				onChange: handleImportFile,
			})
		)
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
			const tokenUrl = "https://apic-appmobile.musixmatch.com/ws/1.1/token.get?app_id=mac-ios-v2.0";
			const fetchToken = typeof ProviderMusixmatch?.fetchMxm === "function"
				? ProviderMusixmatch.fetchMxm(tokenUrl)
				: Spicetify.CosmosAsync.get(tokenUrl, null, {
					Host: "apic-appmobile.musixmatch.com",
					authority: "apic-appmobile.musixmatch.com",
					cookie: "x-mxm-token-guid=",
					"X-Cookie": "x-mxm-token-guid=",
					"x-mxm-app-version": "10.1.1",
					"User-Agent": "Musixmatch/2025120901 CFNetwork/3860.300.31 Darwin/25.2.0",
					"X-User-Agent": "Musixmatch/2025120901 CFNetwork/3860.300.31 Darwin/25.2.0",
					"Accept-Language": "en-US,en;q=0.9",
					Connection: "keep-alive",
					Accept: "application/json",
				});

			fetchToken
				.then((data) => {
					const response = data?.message;
					if (response?.header?.status_code === 200 && response?.body?.user_token) {
						setTokenCallback(response.body.user_token);
						setStatus("success");
					} else if (response?.header?.status_code === 401 || response?.header?.status_code === 402) {
						setStatus("rateLimit");
					} else {
						setStatus("error");
						console.error("Failed to refresh token", response);
					}
				})
				.catch((error) => {
					setStatus("error");
					console.error("Failed to refresh token", error);
				});
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

const ConfigDynamicKeys = ({ name, defaultValue, onChange = () => { }, info = "" }) => {
	const parseValue = (val) => {
		try {
			if (val) {
				const parsed = JSON.parse(val);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed.filter(k => typeof k === 'string');
				}
			}
		} catch (e) {
			// ignore
		}
		if (typeof val === 'string' && val.trim() !== '' && val !== '[]') {
			return [val];
		}
		
		// Fallback: If new dynamic keys list is empty, pre-populate with legacy single keys
		const legacyKey1 = CONFIG.visual["gemini-api-key"];
		const legacyKey2 = CONFIG.visual["gemini-api-key-romaji"];
		const legacyKeys = [legacyKey1, legacyKey2].filter(k => typeof k === 'string' && k.trim() !== '');
		
		if (legacyKeys.length > 0) {
			return legacyKeys;
		}
		
		return [""]; // Default to 1 empty field if absolutely nothing exists
	};

	const [keys, setKeys] = useState(() => parseValue(defaultValue));

	useEffect(() => {
		setKeys(parseValue(defaultValue));
	}, [defaultValue]);

	const updateKeys = (newKeys) => {
		setKeys(newKeys);
		const filtered = newKeys.filter(k => k.trim() !== "");
		const jsonStr = JSON.stringify(filtered);
		onChange(jsonStr);
		
		const firstKey = filtered[0] || "";
		CONFIG.visual["gemini-api-key"] = firstKey;
		localStorage.setItem("lyrics-plus:visual:gemini-api-key", firstKey);
	};

	const handleKeyChange = (index, value) => {
		const newKeys = [...keys];
		newKeys[index] = value;
		updateKeys(newKeys);
	};

	const addKeyField = () => {
		updateKeys([...keys, ""]);
	};

	const removeKeyField = (index) => {
		if (keys.length <= 1) {
			updateKeys([""]);
			return;
		}
		const newKeys = keys.filter((_, i) => i !== index);
		updateKeys(newKeys);
	};

	return react.createElement("div", { className: "setting-row lp-dynamic-keys-row" },
		react.createElement("label", { className: "col description" },
			name,
			info && react.createElement("span", {
				style: { display: "block", fontSize: "11.5px", color: "var(--lp-text-muted)", marginTop: "4px", lineHeight: "1.45", fontWeight: 400 }
			}, info)
		),
		react.createElement("div", { className: "col action lp-dynamic-keys-list" },
			keys.map((keyVal, idx) => react.createElement("div", { key: idx, className: "lp-dynamic-key-item" },
				react.createElement("input", {
					value: keyVal,
					onChange: (e) => handleKeyChange(idx, e.target.value),
					placeholder: idx === 0 ? "Primary API Key" : `API Key ${idx + 1}`,
					type: "password",
					autoComplete: "off",
					spellCheck: false,
				}),
				react.createElement("button", {
					type: "button",
					className: "lp-btn-icon is-danger",
					"aria-label": `Remove API Key ${idx + 1}`,
					title: "Remove",
					onClick: (e) => {
						e.stopPropagation();
						e.preventDefault();
						removeKeyField(idx);
					},
				}, react.createElement("svg", {
					width: 14, height: 14, viewBox: "0 0 24 24", fill: "none",
					stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
					"aria-hidden": "true"
				},
					react.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
					react.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 })
				))
			)),
			react.createElement("button", {
				type: "button",
				className: "btn lp-btn-sm add-key-btn",
				style: { alignSelf: "flex-start" },
				onClick: (e) => {
					e.stopPropagation();
					e.preventDefault();
					addKeyField();
				},
			}, "+ Add API Key")
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
				onInput: setValueCallback,
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
		react.createElement("div", { className: "col action" },
			react.createElement("input", {
				type: "range",
				className: "lp-range",
				min,
				max,
				step,
				value,
				onChange: handleSliderChange,
			}),
			react.createElement("input", {
				type: "number",
				className: "lp-range-number",
				min,
				max,
				step,
				value,
				onChange: handleInputChange,
			}),
			react.createElement("span", { style: { color: "var(--lp-text-muted)", fontSize: "12px" } }, "%")
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
	const displayName = localizedName === providerNamePath ? (item.label || item.name) : localizedName;
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
	const [proxyValue, setProxyValue] = react.useState(
		localStorage.getItem("spicetify:corsProxyTemplate") || "https://cors-proxy.spicetify.app/{url}"
	);
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

	const FONT_PRESETS = [
		"Nunito",
		"Quicksand",
		"M PLUS Rounded 1c",
		"M PLUS 1",
		"Be Vietnam Pro",
		"Inter",
		"Roboto",
		"Montserrat",
		"Dancing Script",
		"Playfair Display",
		"JetBrains Mono",
		"Segoe UI",
		"Arial",
		"Times New Roman",
		"Georgia",
		"Courier New",
		"Consolas",
		"monospace"
	];

	// General Settings
	const generalSettings = [
		{ desc: getText("settings.language.label"), key: "ui-language", info: getText("settings.language.desc"), type: ConfigSelection, options: { "en": "English", "vi": "Tiếng Việt", "ko": "한국어", "ja": "日本語", "zh": "中文（简体）" }, onChange: (name, value) => { CONFIG.visual[name] = value; ConfigUtils.setPersisted(`${APP_NAME}:visual:${name}`, value); lyricContainerUpdate?.(); Spicetify.PopupModal.hide(); setTimeout(() => openConfig(), 100); } },
		{ desc: getText("settings.playbarButton.label"), key: "playbar-button", info: getText("settings.playbarButton.desc"), type: ConfigSlider },
		{ desc: getText("settings.globalDelay.label"), info: getText("settings.globalDelay.desc"), key: "global-delay", type: ConfigAdjust, min: -10000, max: 10000, step: 250 },
		{ desc: getText("settings.fontSize.label"), info: getText("settings.fontSize.desc"), key: "font-size", type: ConfigAdjust, min: fontSizeLimit.min, max: fontSizeLimit.max, step: fontSizeLimit.step },
		{ desc: getText("settings.fontFamily.label"), info: getText("settings.fontFamily.desc"), key: "font-family", type: ConfigComboBox, placeholder: getText("settings.fontFamily.placeholder") || "Default (Spotify)", options: FONT_PRESETS },
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

	const MODEL_PRESETS = [
		// Google Gemini 4.x series
		"gemini-4-hydrogen",
		// Google Gemini 3.x series
		"gemini-3.8-flash",
		"gemini-3.7-flash",
		"gemini-3.6-flash",
		"gemini-3.5-flash-lite",
		"gemini-3.5-flash",
		"gemini-3.1-flash-lite",
		// Google Gemma 4 series
		"gemma-4-26b-a4b-it",
		"gemma-4-31b-it",
	];

	// Translation Settings (OpenAI-compatible endpoint + keys; no proxy/official split)
	const translationSettings = [
		{ desc: getText("settings.apiEndpoint.label"), key: "gemini:endpoint", type: ConfigComboBox, info: getText("settings.apiEndpoint.desc"), placeholder: "https://…/v1/chat/completions", options: ENDPOINT_PRESETS },
		{ desc: getText("settings.modelName.label"), key: "gemini:model", type: ConfigComboBox, info: getText("settings.modelName.desc"), placeholder: "gemini-3.6-flash", options: MODEL_PRESETS },
		{ desc: getText("settings.phoneticModelName.label"), key: "gemini:phonetic-model", type: ConfigComboBox, info: getText("settings.phoneticModelName.desc"), placeholder: "gemini-3.5-flash-lite", options: MODEL_PRESETS },
		{ desc: getText("settings.apiKeys.label"), key: "gemini-api-keys", type: ConfigDynamicKeys, info: getText("settings.apiKeys.desc") },
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
		{ desc: getText("settings.smartPreload.label"), key: "smart-pre-load", type: ConfigSlider, info: getText("settings.smartPreload.desc") },
		{ desc: getText("settings.smartPreloadTime.label"), key: "smart-pre-load-time", type: ConfigSelection, options: preTranslationTimePresets, info: getText("settings.smartPreloadTime.desc"), when: () => CONFIG.visual["smart-pre-load"] },
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
		if (name.startsWith("ui-") && typeof Utils !== "undefined" && Utils.syncUiThemeVariables) {
			Utils.syncUiThemeVariables(CONFIG.visual);
		}

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
				{ desc: getText("settings.videoBackgroundFullscreen.label") || "Bao phủ toàn bộ cửa sổ", key: "video-background-fullscreen", type: ConfigSlider, info: getText("settings.videoBackgroundFullscreen.desc") || "Cho phép video nền tràn ra toàn bộ cửa sổ Spotify thay vì chỉ ở khung lời nhạc." },
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
				react.createElement(CollapsibleSection, { title: getText("sections.backupAndStorage", {}, "Sao lưu & Dữ liệu cá nhân") },
					react.createElement(BackupAndStorageSection, null)
				),
				react.createElement(CollapsibleSection, { title: getText("sections.aboutAndUpdates") },
					react.createElement("div", { className: "lp-update-card" },
						react.createElement("div", null,
							react.createElement("div", { className: "lp-update-title" }, `Lyric Plus Translate v${window.UpdateService?.CURRENT_VERSION || "1.9.6"}`),
							react.createElement("div", { className: "lp-update-sub" }, getText("settings.updateAppSubtitle"))
						),
						react.createElement("button", {
							type: "button",
							className: "lp-btn lp-btn-primary",
							onClick: () => {
								if (window.UpdateService?.checkForUpdates) {
									window.UpdateService.checkForUpdates(false);
								}
							},
						}, getText("settings.checkForUpdates"))
					)
				),
				react.createElement("div", { className: "cors-proxy-section" },
					react.createElement("h2", null, getText("sections.corsProxy")),
					react.createElement("p", { className: "setting-desc cors-proxy-desc", dangerouslySetInnerHTML: { __html: getText("settings.corsProxyDesc") } }),
					react.createElement(corsProxyTemplate),
					react.createElement("p", { className: "setting-desc cors-proxy-desc", dangerouslySetInnerHTML: { __html: getText("settings.corsProxyDefault") } })
				)
			);
			break;
	}

	return react.createElement("div", { style: { display: "flex", flexDirection: "column" } },
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
	if (typeof Utils !== "undefined" && Utils.syncUiThemeVariables) {
		Utils.syncUiThemeVariables(CONFIG.visual);
	}
	const configContainer = react.createElement(
		"div",
		{
			id: `${APP_NAME}-config-container`,
			className: "lp-config-shell lp-config-shell--full",
		},
		react.createElement(ConfigHelper)
	);

	Spicetify.PopupModal.display({
		title: getText("modal.title"),
		content: configContainer,
		isLarge: true,
	});
}

window.openConfig = openConfig;
