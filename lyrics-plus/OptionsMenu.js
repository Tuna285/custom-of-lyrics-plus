const OptionsMenuItemIcon = react.createElement(
	"svg",
	{
		width: 16,
		height: 16,
		viewBox: "0 0 16 16",
		fill: "currentColor",
	},
	react.createElement("path", {
		d: "M13.985 2.383L5.127 12.754 1.388 8.375l-.658.77 4.397 5.149 9.618-11.262z",
	})
);

// Optimized OptionsMenuItem with better performance
const OptionsMenuItem = react.memo(({ onSelect, value, isSelected }) => {
	const menuItemProps = useMemo(() => ({
		onClick: onSelect,
		icon: isSelected ? OptionsMenuItemIcon : null,
		trailingIcon: isSelected ? OptionsMenuItemIcon : null,
	}), [onSelect, isSelected]);

	return react.createElement(
		Spicetify.ReactComponent.MenuItem,
		menuItemProps,
		value
	);
});

const OptionsMenu = react.memo(({ options, onSelect, selected, defaultValue, bold = false }) => {
	/**
	 * <Spicetify.ReactComponent.ContextMenu
	 *      menu = { options.map(a => <OptionsMenuItem>) }
	 * >
	 *      <button>
	 *          <span> {select.value} </span>
	 *          <svg> arrow icon </svg>
	 *      </button>
	 * </Spicetify.ReactComponent.ContextMenu>
	 */
	const menuRef = react.useRef(null);
	return react.createElement(
		Spicetify.ReactComponent.ContextMenu,
		{
			menu: react.createElement(
				Spicetify.ReactComponent.Menu,
				{},
				options.map(({ key, value }) =>
					react.createElement(OptionsMenuItem, {
						value,
						onSelect: () => {
							onSelect(key);
							// Close menu on item click
							menuRef.current?.click();
						},
						isSelected: selected?.key === key,
					})
				)
			),
			trigger: "click",
			action: "toggle",
			renderInline: false,
		},
		react.createElement(
			"button",
			{
				className: "optionsMenu-dropBox",
				ref: menuRef,
			},
			react.createElement(
				"span",
				{
					className: bold ? "main-type-mestoBold" : "main-type-mesto",
				},
				selected?.value || defaultValue
			),
			react.createElement(
				"svg",
				{
					height: "16",
					width: "16",
					fill: "currentColor",
					viewBox: "0 0 16 16",
				},
				react.createElement("path", {
					d: "M3 6l5 5.794L13 6z",
				})
			)
		)
	);
});

// Helper: open a compact options modal using existing settings styles
function openOptionsModal(title, items, onChange, eventType = null) {
	const container = react.createElement(
		"div",
		{ id: `${APP_NAME}-config-container` },
		react.createElement("style", {
			dangerouslySetInnerHTML: {
				__html: `
#${APP_NAME}-config-container { padding: 12px 16px; }
#${APP_NAME}-config-container .setting-row {
	display: grid;
	grid-template-columns: minmax(220px, 1fr) auto;
	gap: 12px;
	align-items: center;
	padding: 8px 0;
	border-bottom: 1px solid rgba(255,255,255,.06);
}
#${APP_NAME}-config-container .setting-row:last-child { border-bottom: none; }
#${APP_NAME}-config-container .col.description { font-weight: 600; opacity: .9; }
#${APP_NAME}-config-container .col.action { display: inline-flex; gap: 8px; align-items: center; justify-content: flex-end; }
#${APP_NAME}-config-container input, #${APP_NAME}-config-container select {
	background: rgba(255,255,255,.04);
	border: 1px solid rgba(255,255,255,.08);
	border-radius: 8px;
	padding: 6px 10px;
	width: min(320px, 100%);
	outline: none;
}
#${APP_NAME}-config-container .adjust-value { min-width: 48px; text-align: center; }
#${APP_NAME}-config-container .switch, #${APP_NAME}-config-container .btn { height: 28px; }
`
			}
		}),
		react.createElement(OptionList, Object.assign({ items, onChange }, eventType ? { type: eventType } : {}))
	);

	Spicetify.PopupModal.display({ title, content: container, isLarge: false });
}

// Debounce handle for adjustments modal
let adjustmentsDebounceTimeout = null;

// Define static options outside component to avoid recreation
const STATIC_OPTIONS = {
	source: {
		geminiVi: "Gemini",
	},
	translationDisplay: {
		replace: "Replace original",
		below: "Below original",
	},
	language: {
		off: "Off",
		"zh-hans": "Chinese (Simplified)",
		"zh-hant": "Chinese (Traditional)",
		ja: "Japanese",
		ko: "Korean",
	},
	modeBase: {
		none: "None",
	},
	geminiModes: {
		gemini_romaji: "Romaji (Gemini)",
		gemini_vi: "Vietnamese (Gemini)",
	},
	languageModes: {
		japanese: {
			furigana: "Furigana",
			romaji: "Romaji", 
			hiragana: "Hiragana",
			katakana: "Katakana",
		},
		korean: {
			romaja: "Romaja",
		},
		chinese: {
			cn: "Simplified Chinese",
			hk: "Traditional Chinese (Hong Kong)", 
			tw: "Traditional Chinese (Taiwan)",
		}
	}
};

const TranslationMenu = react.memo(({ friendlyLanguage, hasTranslation }) => {
	const items = useMemo(() => {
		const sourceOptions = STATIC_OPTIONS.source;
		const translationDisplayOptions = STATIC_OPTIONS.translationDisplay;
		const languageOptions = STATIC_OPTIONS.language;
		
		let modeOptions = { ...STATIC_OPTIONS.modeBase };

		const isGeminiProvider = CONFIG.visual["translate:translated-lyrics-source"] === "geminiVi";
		if (isGeminiProvider) {
			modeOptions = STATIC_OPTIONS.geminiModes;
		} else if (friendlyLanguage) {
			// Use pre-defined language modes
			modeOptions = STATIC_OPTIONS.languageModes[friendlyLanguage] || STATIC_OPTIONS.modeBase;
		}

		return [
			{
				desc: "Translation Provider",
				key: "translate:translated-lyrics-source",
				type: ConfigSelection,
				options: sourceOptions,
				renderInline: true,
			},
			{
				desc: "Translation Display",
				key: "translate:display-mode",
				type: ConfigSelection,
				options: translationDisplayOptions,
				renderInline: true,
			},
			{
				desc: "Language Override",
				key: "translate:detect-language-override",
				type: ConfigSelection,
				options: languageOptions,
				renderInline: true,
				// for songs in languages that support translation but not Convert (e.g., English), the option is disabled.
				when: () => friendlyLanguage,
			},
			{
				desc: "Display Mode",
				key: `translation-mode:${friendlyLanguage}`,
				type: ConfigSelection,
				options: { none: "None", ...modeOptions }, // Add "None" option
				renderInline: true,
				// for songs in languages that support translation but not Convert (e.g., English), the option is disabled.
				when: () => friendlyLanguage,
			},
			{
				desc: "Display Mode 2",
				key: `translation-mode-2:${friendlyLanguage}`,
				type: ConfigSelection,
				options: { none: "None", ...modeOptions }, // Add "None" option
				renderInline: true,
				when: () => friendlyLanguage,
			},
		];
	}, [friendlyLanguage, CONFIG.visual["translate:translated-lyrics-source"]]);

	// Re-dispatch dynamic items so an open modal can update its OptionList
	useEffect(() => {
		const event = new CustomEvent("lyrics-plus", {
			detail: { type: "translation-menu", items },
		});
		document.dispatchEvent(event);
	}, [items, friendlyLanguage, CONFIG.visual["translate:translated-lyrics-source"]]);

	// Open modal on click instead of ContextMenu to avoid xpui hook errors
	const open = () => {
		openOptionsModal("Conversions", items, (name, value) => {
			if (name === "translate:translated-lyrics-source" && friendlyLanguage) {
				const modeKey = `translation-mode:${friendlyLanguage}`;
				const modeKey2 = `translation-mode-2:${friendlyLanguage}`;
				if (value === "geminiVi") {
					CONFIG.visual[modeKey] = "none";
					localStorage.setItem(`${APP_NAME}:visual:${modeKey}`, "none");
					CONFIG.visual[modeKey2] = "none";
					localStorage.setItem(`${APP_NAME}:visual:${modeKey2}`, "none");
				} else if (String(CONFIG.visual[modeKey] || "").startsWith("gemini")) {
					CONFIG.visual[modeKey] = "none";
					localStorage.setItem(`${APP_NAME}:visual:${modeKey}`, "none");
				}
			}

			CONFIG.visual[name] = value;
			localStorage.setItem(`${APP_NAME}:visual:${name}`, value);

			if (name.startsWith("translation-mode:")) {
				if (window.lyricContainer) {
					window.lyricContainer.lastProcessedUri = null;
					window.lyricContainer.lastProcessedMode = null;
					window.lyricContainer.forceUpdate();
				}
			}

			lyricContainerUpdate?.();
		}, "translation-menu");
	};

	return react.createElement(
		Spicetify.ReactComponent.TooltipWrapper,
		{ label: "Conversion" },
		react.createElement(
			"button",
			{ className: "lyrics-config-button", onClick: open },
			"⇄"
		)
	);
});

const AdjustmentsMenu = react.memo(({ mode }) => {
	const items = [
		{ desc: "Font size", key: "font-size", type: ConfigAdjust, min: fontSizeLimit.min, max: fontSizeLimit.max, step: fontSizeLimit.step },
		{ desc: "Track delay", key: "delay", type: ConfigAdjust, min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY, step: 250, when: () => mode === SYNCED },
		{ desc: "Dual panel", key: "dual-genius", type: ConfigSlider, when: () => mode === GENIUS },
	];

	const onChange = (name, value) => {
		clearTimeout(adjustmentsDebounceTimeout);
		adjustmentsDebounceTimeout = setTimeout(() => {
			CONFIG.visual[name] = value;
			try {
				Spicetify.Config.visual = Spicetify.Config.visual || {};
				Spicetify.Config.visual[name] = value;
			} catch {}
			localStorage.setItem(`${APP_NAME}:visual:${name}`, value);
			// Persist per-track delay as used by resetDelay()
			if (name === "delay") {
				const uri = Spicetify?.Player?.data?.item?.uri;
				if (uri) {
					try { localStorage.setItem(`lyrics-delay:${uri}`, String(value)); } catch {}
				}
			}
			if (name.startsWith("translation-mode:") && window.lyricContainer) {
				window.lyricContainer.lastProcessedUri = null;
				window.lyricContainer.lastProcessedMode = null;
				window.lyricContainer.forceUpdate();
			}
			// Ensure live UI update for font-size/compact/etc.
			lyricContainerUpdate?.();
		}, 200);
	};

	const open = () => openOptionsModal("Adjustments", items, onChange);

	return react.createElement(
		Spicetify.ReactComponent.TooltipWrapper,
		{ label: "Adjustments" },
		react.createElement(
			"button",
			{ className: "lyrics-config-button", onClick: open },
			react.createElement(
				"svg",
				{ width: 16, height: 16, viewBox: "0 0 16 10.3", fill: "currentColor" },
				react.createElement("path", { d: "M 10.8125,0 C 9.7756347,0 8.8094481,0.30798341 8,0.836792 7.1905519,0.30798341 6.2243653,0 5.1875,0 2.3439941,0 0,2.3081055 0,5.15625 0,8.0001222 2.3393555,10.3125 5.1875,10.3125 6.2243653,10.3125 7.1905519,10.004517 8,9.4757081 8.8094481,10.004517 9.7756347,10.3125 10.8125,10.3125 13.656006,10.3125 16,8.0043944 16,5.15625 16,2.3123779 13.660644,0 10.8125,0 Z M 8,2.0146484 C 8.2629394,2.2503662 8.4963378,2.5183106 8.6936034,2.8125 H 7.3063966 C 7.5036622,2.5183106 7.7370606,2.2503662 8,2.0146484 Z M 6.619995,4.6875 C 6.6560059,4.3625487 6.7292481,4.0485841 6.8350831,3.75 h 2.3298338 c 0.1059572,0.2985841 0.1790772,0.6125487 0.21521,0.9375 z M 9.380005,5.625 C 9.3439941,5.9499512 9.2707519,6.2639159 9.1649169,6.5625 H 6.8350831 C 6.7291259,6.2639159 6.6560059,5.9499512 6.6198731,5.625 Z M 5.1875,9.375 c -2.3435059,0 -4.25,-1.8925781 -4.25,-4.21875 0,-2.3261719 1.9064941,-4.21875 4.25,-4.21875 0.7366944,0 1.4296875,0.1899414 2.0330809,0.5233154 C 6.2563478,2.3981934 5.65625,3.7083741 5.65625,5.15625 c 0,1.4478759 0.6000978,2.7580566 1.5643309,3.6954347 C 6.6171875,9.1850584 5.9241944,9.375 5.1875,9.375 Z M 8,8.2978516 C 7.7370606,8.0621337 7.5036622,7.7938231 7.3063966,7.4996337 H 8.6936034 C 8.4963378,7.7938231 8.2629394,8.0621338 8,8.2978516 Z M 10.8125,9.375 C 10.075806,9.375 9.3828125,9.1850584 8.7794191,8.8516847 9.7436522,7.9143066 10.34375,6.6041259 10.34375,5.15625 10.34375,3.7083741 9.7436522,2.3981934 8.7794191,1.4608154 9.3828125,1.1274414 10.075806,0.9375 10.8125,0.9375 c 2.343506,0 4.25,1.8925781 4.25,4.21875 0,2.3261719 -1.906494,4.21875 -4.25,4.21875 z m 0,0" })
			)
		)
	);
});
