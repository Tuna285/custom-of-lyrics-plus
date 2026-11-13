// components/VideoSettingsModal.js
window.LyricsPlus = window.LyricsPlus || {};

window.LyricsPlus.openVideoSettingsModal = function(self) {
	const react = Spicetify.React;
	const currentVideo = self.state.videoBackground?.video_id || "";
	const currentOffset = self.state.videoBackground?.sync_offset || 0;
	const track = Spicetify.Player.data.item;
	const info = self.infoFromTrack(track);
	
	if (!info) {
		Spicetify.showNotification(getText("notifications.noTrack"), true, 2000);
		return;
	}

	// Modal content component
	const ModalContent = () => {
		const [view, setView] = react.useState(currentVideo ? "sync" : "search"); // "sync" or "search"
		const [offset, setOffset] = react.useState(currentOffset);
		const [videoId, setVideoId] = react.useState(currentVideo);
		const [manualInput, setManualInput] = react.useState(currentVideo);
		const [searchResults, setSearchResults] = react.useState([]);
		const [searchLoading, setSearchLoading] = react.useState(false);
		const [searchQuery, setSearchQuery] = react.useState(`${info.title} - ${info.artist}`);
		const [isManualInput, setIsManualInput] = react.useState(false);
		const [localSuggestions, setLocalSuggestions] = react.useState(null);
		const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;

		const isMountedRef = react.useRef(true);
		react.useEffect(() => {
			isMountedRef.current = true;
			return () => { isMountedRef.current = false; };
		}, []);

		const getLocalSuggestions = async () => {
			if (!self.translator) {
				if (typeof Translator !== "undefined") {
					self.translator = new Translator("en");
				} else {
					return;
				}
			}

			const suggestions = {};
			const title = info.title;
			const artist = info.artist;

			// Check for Japanese Kana/Kanji
			const hasJapanese = (str) => /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(str);
			// Check for Korean Hangul
			const hasKorean = (str) => /[\uac00-\ud7af]/.test(str);
			// Check for Chinese Hanzi
			const hasChinese = (str) => /[\u4e00-\u9fa5]/.test(str);

			try {
				if (hasJapanese(title) || hasJapanese(artist)) {
					await self.translator.createTranslator("ja");
					const titleRomaji = await self.translator.romajifyText(title);
					const artistRomaji = await self.translator.romajifyText(artist);
					if (titleRomaji && artistRomaji) {
						suggestions.romaji = `${titleRomaji} - ${artistRomaji}`;
					}
				}

				if (hasKorean(title) || hasKorean(artist)) {
					await self.translator.createTranslator("ko");
					const titleRomaja = await self.translator.convertToRomaja(title);
					const artistRomaja = await self.translator.convertToRomaja(artist);
					if (titleRomaja && artistRomaja) {
						suggestions.romaja = `${titleRomaja} - ${artistRomaja}`;
					}
				}

				if (hasChinese(title) || hasChinese(artist)) {
					await self.translator.createTranslator("zh");
					const titlePinyin = await self.translator.convertToPinyin(title);
					const artistPinyin = await self.translator.convertToPinyin(artist);
					if (titlePinyin && artistPinyin) {
						suggestions.pinyin = `${titlePinyin} - ${artistPinyin}`;
					}
				}

				if (isMountedRef.current && Object.keys(suggestions).length > 0) {
					setLocalSuggestions(suggestions);
				}
			} catch (err) {
				console.error("[Lyrics+] Failed to generate CJK suggestions:", err);
			}
		};

		const executeSearch = async (queryToSearch) => {
			if (!queryToSearch || !queryToSearch.trim()) return;
			setSearchLoading(true);
			try {
				const results = await VideoManager.searchMultipleVideos(queryToSearch, info.uri, info);
				if (isMountedRef.current) {
					setSearchResults(results);
				}
			} catch (e) {
				console.error("[Lyrics+] Failed to fetch top videos:", e);
			} finally {
				if (isMountedRef.current) setSearchLoading(false);
			}
		};

		// Run automated search and generate phonetic CJK suggestions when entering search view
		react.useEffect(() => {
			if (view === "search") {
				executeSearch(searchQuery);
				getLocalSuggestions();
			}
		}, [view]);

		// Real-time offset sync as user drags slider or edits number
		const handleOffsetChange = (newOffset) => {
			setOffset(newOffset);
			if (videoId) {
				const result = VideoManager.setManualVideo(info, videoId, newOffset);
				if (result) {
					self.setState({ videoBackground: result });
					VideoManager.saveOffset(info.uri, newOffset);
					window.dispatchEvent(new CustomEvent("lyricsPlusSyncRequest", { detail: { forceSeek: true, offset: newOffset } }));
				}
			}
		};

		// Apply selected video immediately and switch to sync view
		const handleSelectVideo = (newVideoId) => {
			setVideoId(newVideoId);
			setManualInput(newVideoId);
			const result = VideoManager.setManualVideo(info, newVideoId, offset);
			if (result) {
				self.setState({ videoBackground: result });
				VideoManager.saveManualVideo(info.uri, newVideoId);
				VideoManager.saveOffset(info.uri, offset);
				Spicetify.showNotification("✓ " + getText("notifications.videoSetSaved", { videoId: newVideoId }), false, 2000);
			}
			setView("sync");
		};

		// Reset video background entirely
		const handleReset = () => {
			VideoManager.reset(info.uri);
			self.setState({ videoBackground: null });
			setVideoId("");
			setManualInput("");
			setOffset(0);
			setView("search");
			Spicetify.showNotification(getText("notifications.videoReset"), false, 2000);
		};

		const formatVideoDuration = (secs) => {
			if (!secs) return "0:00";
			const h = Math.floor(secs / 3600);
			const m = Math.floor((secs % 3600) / 60);
			const s = Math.floor(secs % 60);
			return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
		};

		return react.createElement("div", { className: "lp-modal-body lp-modal-body--md" },
			// Current Track Info Card
			react.createElement("div", { className: "lp-card lp-track-card" },
				info.image && react.createElement("img", {
					src: info.image,
					alt: "",
					className: "lp-track-thumb",
				}),
				react.createElement("div", { className: "lp-track-meta" },
					react.createElement("div", { className: "lp-track-title" }, info.title),
					react.createElement("div", { className: "lp-track-sub" }, info.artist)
				),
				// YouTube Icon Link
				react.createElement(Spicetify.ReactComponent.TooltipWrapper, { label: getText("tooltips.searchYoutube") || "Search on YouTube" },
					react.createElement("button", {
						type: "button",
						className: "lp-btn-icon",
						"aria-label": getText("tooltips.searchYoutube") || "Search on YouTube",
						onClick: (e) => {
							e.stopPropagation();
							const query = searchQuery || `${info.title} - ${info.artist}`;
							const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
							window.open(searchUrl, "_blank");
						}
					}, react.createElement("svg", {
						width: 15, height: 15, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true",
						dangerouslySetInnerHTML: { __html: '<path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.104 2.48l-.008.104-.022.26-.01.104c-.048.52-.119 1.023-.22 1.402a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.287-.012-.17-.008c-1.372-.064-2.285-.102-2.484-.105a2.01 2.01 0 0 1-1.415-1.42c-.101-.38-.172-.882-.22-1.401l-.01-.104-.022-.26-.008-.104C.065 9.01.057 8.154.056 7.967v-.075c.001-.194.01-1.108.104-2.48l.008-.105.022-.26.01-.104c.048-.52.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42C3.125 2.006 7.625 1.999 8.051 2zm-.965 3.19v4.62l4.002-2.31-4.002-2.31z"/>' }
					}))
				)
			),

			// VIEW A: SYNC & SYNC CONTROLS
			view === "sync" && react.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
				// Active Video Status Bar
				react.createElement("div", {
					className: "lp-card",
					style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
				},
					react.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 } },
						react.createElement("span", { className: "lp-section-label", style: { marginBottom: 0 } }, getText("videoModal.manualVideo")),
						react.createElement("span", { style: { fontSize: "13px", fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }, videoId),
						react.createElement("div", { className: "lp-badge lp-badge--success", style: { alignSelf: "flex-start" } },
							react.createElement("svg", {
								width: 11, height: 11, viewBox: "0 0 24 24", fill: "none",
								stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round",
								"aria-hidden": "true"
							}, react.createElement("polyline", { points: "20 6 9 17 4 12" })),
							getText("videoModal.active") || "Active"
						)
					),
					// Action buttons
					react.createElement("div", { style: { display: "flex", gap: "6px", flexShrink: 0 } },
						react.createElement("button", {
							type: "button",
							className: "lp-btn lp-btn-secondary lp-btn-sm",
							onClick: (e) => {
								e.stopPropagation();
								setView("search");
							},
						}, getText("videoModal.change") || "Change"),
						react.createElement("button", {
							type: "button",
							className: "lp-btn lp-btn-danger lp-btn-sm",
							onClick: (e) => {
								e.stopPropagation();
								handleReset();
							},
						}, getText("videoModal.remove") || "Remove")
					)
				),

				// Real-time Sync Offset Section
				react.createElement("div", { className: "lp-card" },
					react.createElement("div", { className: "lp-section-head", style: { marginBottom: "10px" } },
						react.createElement("label", { style: { fontSize: "13px", fontWeight: 700 } }, getText("videoModal.totalOffset")),
						react.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
							react.createElement("input", {
								type: "number",
								step: "0.1",
								className: "lp-input lp-range-number",
								style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
								value: offset,
								onChange: (e) => handleOffsetChange(parseFloat(e.target.value) || 0),
							}),
							react.createElement("span", { style: { fontSize: "12px", color: "var(--lp-text-muted)" } }, "s")
						)
					),
					react.createElement("input", {
						type: "range",
						className: "lp-range lp-range--full",
						min: "-15",
						max: "15",
						step: "0.1",
						value: offset,
						onChange: (e) => handleOffsetChange(parseFloat(e.target.value) || 0),
					}),
					react.createElement("div", { className: "lp-slider-meta" },
						react.createElement("span", null, "-15s"),
						react.createElement("span", null, "0s (" + (getText("videoModal.unsynced") || "unsynced") + ")"),
						react.createElement("span", null, "+15s")
					)
				),

				react.createElement("div", { className: "lp-hint-box" },
					getText("videoModal.syncHint") || "Drag slider to sync: negative values play video earlier, positive values play it later."
				)
			),

			// VIEW B: SEARCH & SELECT VIDEOS
			view === "search" && react.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
				// Search Input + Button
				react.createElement("div", { className: "lp-search-row" },
					react.createElement("input", {
						type: "text",
						className: "lp-input",
						placeholder: getText("videoModal.searchPlaceholder") || "Search video title...",
						value: searchQuery,
						onChange: (e) => setSearchQuery(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && executeSearch(searchQuery),
					}),
					react.createElement("button", {
						type: "button",
						className: "lp-btn lp-btn-primary",
						onClick: () => executeSearch(searchQuery),
					}, getText("videoModal.search") || "Search")
				),

				// CJK Suggestions
				localSuggestions && react.createElement("div", { className: "lp-card" },
					react.createElement("span", { className: "lp-section-label" }, getText("videoModal.aiSuggestions") || "CJK Phonetic Suggestions:"),
					react.createElement("div", { className: "lp-chip-row" },
						Object.entries(localSuggestions).map(([type, sugQuery]) =>
							react.createElement("button", {
								key: type,
								type: "button",
								className: "lp-chip",
								onClick: (e) => {
									e.stopPropagation();
									setSearchQuery(sugQuery);
									executeSearch(sugQuery);
								},
							},
								react.createElement("span", { style: { fontWeight: 700, color: "var(--lp-accent)", textTransform: "uppercase" } }, type),
								sugQuery.substring(0, 25) + (sugQuery.length > 25 ? "..." : "")
							)
						)
					)
				),

				// Manual URL/ID Input toggle
				isManualInput ? react.createElement("div", { className: "lp-search-row" },
					react.createElement("input", {
						type: "text",
						className: "lp-input",
						placeholder: "YouTube URL or 11-char Video ID",
						value: manualInput,
						onChange: (e) => setManualInput(e.target.value),
					}),
					react.createElement("button", {
						type: "button",
						className: "lp-btn lp-btn-primary lp-btn-sm",
						onClick: (e) => {
							e.stopPropagation();
							e.preventDefault();
							const val = manualInput.trim();
							const match = val.match(ytRegex);
							const finalId = match ? match[1] : (val.length === 11 ? val : "");
							if (finalId) {
								handleSelectVideo(finalId);
								setIsManualInput(false);
							} else {
								Spicetify.showNotification("Invalid YouTube Link / Video ID", true, 2000);
							}
						},
					}, getText("videoModal.save") || "Save"),
					react.createElement("button", {
						type: "button",
						className: "lp-btn-icon",
						"aria-label": getText("editor.cancel", {}, "Cancel"),
						onClick: (e) => {
							e.stopPropagation();
							e.preventDefault();
							setIsManualInput(false);
						},
					}, react.createElement("svg", {
						width: 14, height: 14, viewBox: "0 0 24 24", fill: "none",
						stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
						"aria-hidden": "true"
					},
						react.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
						react.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 })
					))
				) : react.createElement("button", {
					type: "button",
					className: "lp-btn lp-btn-secondary lp-btn-full",
					onClick: (e) => {
						e.stopPropagation();
						e.preventDefault();
						setIsManualInput(true);
					},
				}, "+ " + (getText("videoModal.enterManual") || "Enter Video ID / YouTube URL manually...")),

				// Search Results list
				searchLoading ? react.createElement("div", { className: "lp-status-msg" }, LoadingIcon) : react.createElement("div", {
					className: "lp-result-list",
					style: { maxHeight: "260px" },
				},
					searchResults.length === 0 ? react.createElement("div", { className: "lp-status-msg" },
						getText("videoModal.noResults") || "No videos found. Try a different query."
					) :
					searchResults.map((video) => {
						const vId = video.videoId || video.id;
						const title = video.title || "";
						const author = video.author || video.channel || "";
						const lengthSeconds = video.lengthSeconds || 0;
						const thumbnailUrl = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;

						return react.createElement("button", {
							key: vId,
							type: "button",
							className: "lp-result-item",
							onClick: (e) => {
								e.stopPropagation();
								handleSelectVideo(vId);
							},
						},
							react.createElement("div", { className: "lp-video-thumb-wrap" },
								react.createElement("img", {
									src: thumbnailUrl,
									alt: "",
									className: "lp-video-thumb",
								}),
								react.createElement("span", { className: "lp-video-duration" }, formatVideoDuration(lengthSeconds))
							),
							react.createElement("div", { className: "lp-track-meta" },
								react.createElement("div", { className: "lp-result-title" }, title),
								react.createElement("div", { className: "lp-result-sub" }, author)
							)
						);
					})
				)
			)
		);
	};

	Spicetify.PopupModal.display({
		title: getText("videoModal.title"),
		content: react.createElement(ModalContent)
	});
};
