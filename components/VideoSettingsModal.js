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

		return react.createElement("div", { 
			style: { 
				padding: "10px", 
				width: "100%",
				boxSizing: "border-box",
				color: "#fff"
			} 
		},
			// Current Track Info Card
			react.createElement("div", {
				style: {
					marginBottom: "12px",
					padding: "8px 10px",
					background: "rgba(255,255,255,0.04)",
					borderRadius: "6px",
					display: "flex",
					alignItems: "center",
					gap: "10px"
				}
			},
				info.image && react.createElement("img", {
					src: info.image,
					style: {
						width: "36px",
						height: "36px",
						borderRadius: "4px",
						objectFit: "cover"
					}
				}),
				react.createElement("div", { style: { flex: 1, minWidth: 0 } },
					react.createElement("div", { 
						style: { fontWeight: "bold", fontSize: "13px", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } 
					}, info.title),
					react.createElement("div", { 
						style: { fontSize: "11px", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } 
					}, info.artist)
				),
				// YouTube Icon Link
				react.createElement(Spicetify.ReactComponent.TooltipWrapper, { label: getText("tooltips.searchYoutube") || "Search on YouTube" },
					react.createElement("button", {
						style: {
							background: "transparent",
							border: "none",
							color: "#aaa",
							cursor: "pointer",
							padding: "5px"
						},
						onClick: (e) => {
							e.stopPropagation();
							const query = searchQuery || `${info.title} - ${info.artist}`;
							const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
							window.open(searchUrl, "_blank");
						}
					}, react.createElement("svg", {
						width: 15, height: 15, viewBox: "0 0 16 16", fill: "currentColor",
						dangerouslySetInnerHTML: { __html: '<path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.104 2.48l-.008.104-.022.26-.01.104c-.048.52-.119 1.023-.22 1.402a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.287-.012-.17-.008c-1.372-.064-2.285-.102-2.484-.105a2.01 2.01 0 0 1-1.415-1.42c-.101-.38-.172-.882-.22-1.401l-.01-.104-.022-.26-.008-.104C.065 9.01.057 8.154.056 7.967v-.075c.001-.194.01-1.108.104-2.48l.008-.105.022-.26.01-.104c.048-.52.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42C3.125 2.006 7.625 1.999 8.051 2zm-.965 3.19v4.62l4.002-2.31-4.002-2.31z"/>' }
					}))
				)
			),

			// VIEW A: SYNC & SYNC CONTROLS
			view === "sync" && react.createElement("div", null,
				// Active Video Status Bar
				react.createElement("div", {
					style: {
						background: "rgba(255,255,255,0.03)",
						border: "1px solid rgba(255,255,255,0.08)",
						padding: "10px 12px",
						borderRadius: "8px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "12px"
					}
				},
					react.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2px" } },
						react.createElement("span", { style: { fontSize: "10px", color: "#888", textTransform: "uppercase", fontWeight: "bold" } }, getText("videoModal.manualVideo")),
						react.createElement("span", { style: { fontSize: "12px", fontWeight: "bold", fontFamily: "monospace" } }, videoId),
						react.createElement("div", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								padding: "1px 5px",
								borderRadius: "3px",
								fontSize: "9px",
								fontWeight: "bold",
								background: "rgba(29, 185, 84, 0.15)",
								color: "#1db954",
								border: "1px solid rgba(29, 185, 84, 0.25)",
								marginTop: "4px",
								alignSelf: "flex-start"
							}
						}, "✓ " + (getText("videoModal.active") || "Active"))
					),
					// Action buttons
					react.createElement("div", { style: { display: "flex", gap: "6px" } },
						react.createElement("button", {
							onClick: (e) => {
								e.stopPropagation();
								setView("search");
							},
							style: {
								padding: "4px 8px",
								borderRadius: "4px",
								background: "rgba(255,255,255,0.08)",
								border: "none",
								color: "#fff",
								fontSize: "11px",
								fontWeight: "bold",
								cursor: "pointer"
							}
						}, getText("videoModal.change") || "Change"),
						react.createElement("button", {
							onClick: (e) => {
								e.stopPropagation();
								handleReset();
							},
							style: {
								padding: "4px 8px",
								borderRadius: "4px",
								background: "rgba(235, 87, 87, 0.15)",
								border: "none",
								color: "#eb5757",
								fontSize: "11px",
								fontWeight: "bold",
								cursor: "pointer"
							}
						}, getText("videoModal.remove") || "Remove")
					)
				),

				// Real-time Sync Offset Section
				react.createElement("div", { style: { marginBottom: "14px" } },
					react.createElement("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "6px"
						}
					},
						react.createElement("label", { style: { fontSize: "12px", fontWeight: "bold" } }, getText("videoModal.totalOffset")),
						react.createElement("div", { style: { display: "flex", alignItems: "center", gap: "4px" } },
							react.createElement("input", {
								type: "number",
								step: "0.1",
								value: offset,
								onChange: (e) => handleOffsetChange(parseFloat(e.target.value) || 0),
								style: {
									width: "64px",
									padding: "2px 4px",
									background: "rgba(255,255,255,0.06)",
									border: "1px solid rgba(255,255,255,0.15)",
									borderRadius: "4px",
									color: "#fff",
									fontSize: "12px",
									textAlign: "center",
									fontFamily: "monospace"
								}
							}),
							react.createElement("span", { style: { fontSize: "12px", color: "#aaa" } }, "s")
						)
					),
					react.createElement("input", {
						type: "range",
						min: "-15",
						max: "15",
						step: "0.1",
						value: offset,
						onChange: (e) => handleOffsetChange(parseFloat(e.target.value) || 0),
						style: {
							width: "100%",
							accentColor: "var(--lp-ui-accent, #1db954)",
							cursor: "pointer"
						}
					}),
					react.createElement("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							fontSize: "10px",
							color: "#888",
							marginTop: "2px"
						}
					},
						react.createElement("span", null, "-15s"),
						react.createElement("span", null, "0s (" + (getText("videoModal.unsynced") || "unsynced") + ")"),
						react.createElement("span", null, "+15s")
					)
				),

				react.createElement("div", {
					style: {
						fontSize: "11px",
						color: "#aaa",
						lineHeight: "1.4",
						padding: "8px 10px",
						background: "rgba(255,255,255,0.02)",
						borderLeft: "2px solid #888",
						borderRadius: "3px"
					}
				}, getText("videoModal.syncHint") || "Drag slider to sync: negative values play video earlier, positive values play it later.")
			),

			// VIEW B: SEARCH & SELECT VIDEOS
			view === "search" && react.createElement("div", null,
				// Search Input + Button
				react.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "12px" } },
					react.createElement("input", {
						type: "text",
						placeholder: getText("videoModal.searchPlaceholder") || "Search video title...",
						value: searchQuery,
						onChange: (e) => setSearchQuery(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && executeSearch(searchQuery),
						style: {
							flex: 1,
							padding: "6px 10px",
							borderRadius: "4px",
							border: "1px solid rgba(255,255,255,0.15)",
							background: "rgba(0,0,0,0.2)",
							color: "#fff",
							fontSize: "12px"
						}
					}),
					react.createElement("button", {
						onClick: () => executeSearch(searchQuery),
						style: {
							padding: "6px 12px",
							borderRadius: "4px",
							background: "var(--lp-ui-accent, #1db954)",
							border: "none",
							color: "#fff",
							fontWeight: "bold",
							fontSize: "12px",
							cursor: "pointer"
						}
					}, getText("videoModal.search") || "Search")
				),

				// CJK Suggestions
				localSuggestions && react.createElement("div", { 
					style: { marginBottom: "12px", display: "flex", flexDirection: "column", gap: "6px" } 
				},
					react.createElement("span", { style: { fontSize: "10px", color: "#888", fontWeight: "bold", textTransform: "uppercase" } }, getText("videoModal.aiSuggestions") || "CJK Phonetic Suggestions:"),
					react.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
						Object.entries(localSuggestions).map(([type, sugQuery]) => 
							react.createElement("button", {
								key: type,
								onClick: (e) => {
									e.stopPropagation();
									setSearchQuery(sugQuery);
									executeSearch(sugQuery);
								},
								style: {
									padding: "4px 8px",
									borderRadius: "12px",
									background: "rgba(255,255,255,0.06)",
									border: "1px solid rgba(255,255,255,0.12)",
									color: "#ccc",
									fontSize: "10px",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px"
								}
							}, 
								react.createElement("span", { style: { fontWeight: "bold", color: "var(--lp-ui-accent, #1db954)", textTransform: "uppercase" } }, type),
								sugQuery.substring(0, 25) + (sugQuery.length > 25 ? "..." : "")
							)
						)
					)
				),

				// Manual URL/ID Input toggle
				isManualInput ? react.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "12px" } },
					react.createElement("input", {
						type: "text",
						placeholder: "YouTube URL or 11-char Video ID",
						value: manualInput,
						onChange: (e) => setManualInput(e.target.value),
						style: {
							flex: 1,
							padding: "6px 10px",
							borderRadius: "4px",
							border: "1px solid rgba(255,255,255,0.15)",
							background: "rgba(0,0,0,0.2)",
							color: "#fff",
							fontSize: "12px"
						}
					}),
					react.createElement("button", {
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
						style: {
							padding: "6px 12px",
							borderRadius: "4px",
							background: "var(--lp-ui-accent, #1db954)",
							border: "none",
							color: "#fff",
							fontWeight: "bold",
							fontSize: "12px",
							cursor: "pointer"
						}
					}, getText("videoModal.save") || "Save"),
					react.createElement("button", {
						onClick: (e) => {
							e.stopPropagation();
							e.preventDefault();
							setIsManualInput(false);
						},
						style: {
							padding: "6px 8px",
							borderRadius: "4px",
							background: "rgba(255,255,255,0.08)",
							border: "none",
							color: "#ccc",
							fontSize: "12px",
							cursor: "pointer"
						}
					}, "X")
				) : react.createElement("button", {
					onClick: (e) => {
						e.stopPropagation();
						e.preventDefault();
						setIsManualInput(true);
					},
					style: {
						width: "100%",
						padding: "6px",
						borderRadius: "4px",
						background: "rgba(255,255,255,0.04)",
						border: "1px dashed rgba(255,255,255,0.15)",
						color: "#ccc",
						fontSize: "11px",
						cursor: "pointer",
						marginBottom: "12px",
						textAlign: "center"
					}
				}, "+ " + (getText("videoModal.enterManual") || "Enter Video ID / YouTube URL manually...")),

				// Search Results list
				searchLoading ? react.createElement("div", { 
					style: { textAlign: "center", padding: "20px 0", color: "#888", fontSize: "12px" } 
				}, LoadingIcon) : react.createElement("div", { 
					style: { display: "flex", flexDirection: "column", gap: "6px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" } 
				},
					searchResults.length === 0 ? react.createElement("div", { 
						style: { textAlign: "center", padding: "10px 0", color: "#888", fontSize: "11px" } 
					}, getText("videoModal.noResults") || "No videos found. Try a different query.") :
					searchResults.map((video) => {
						const videoId = video.videoId || video.id;
						const title = video.title || "";
						const author = video.author || video.channel || "";
						const lengthSeconds = video.lengthSeconds || 0;
						const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

						const formatVideoDuration = (secs) => {
							if (!secs) return "0:00";
							const h = Math.floor(secs / 3600);
							const m = Math.floor((secs % 3600) / 60);
							const s = Math.floor(secs % 60);
							return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
						};

						return react.createElement("div", {
							key: videoId,
							onClick: (e) => {
								e.stopPropagation();
								handleSelectVideo(videoId);
							},
							style: {
								display: "flex",
								gap: "10px",
								padding: "6px",
								background: "rgba(255,255,255,0.03)",
								border: "1px solid rgba(255,255,255,0.06)",
								borderRadius: "6px",
								cursor: "pointer",
								transition: "background 0.2s"
							},
							onMouseEnter: (e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; },
							onMouseLeave: (e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }
						},
							react.createElement("div", { style: { position: "relative", width: "70px", height: "40px", flexShrink: 0 } },
								react.createElement("img", {
									src: thumbnailUrl,
									style: { width: "100%", height: "100%", borderRadius: "4px", objectFit: "cover" }
								}),
								react.createElement("span", {
									style: {
										position: "absolute",
										bottom: "2px",
										right: "2px",
										background: "rgba(0,0,0,0.8)",
										color: "#fff",
										fontSize: "8px",
										padding: "1px 3px",
										borderRadius: "2px",
										fontFamily: "monospace"
									}
								}, formatVideoDuration(lengthSeconds))
							),
							react.createElement("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" } },
								react.createElement("div", { 
									style: { fontWeight: "bold", fontSize: "11px", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } 
								}, title),
								react.createElement("div", { 
									style: { fontSize: "9px", color: "#aaa", display: "flex", justifyContent: "space-between" } 
								}, 
									react.createElement("span", null, author)
								)
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
