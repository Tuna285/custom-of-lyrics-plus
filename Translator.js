const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath = "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath = "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

// ============================================
// GEMINI API RATE LIMITER
// ============================================
const RATE_LIMITS = {
	RPM: 10,
	RESET_TIME: 60000
};

class GeminiRateLimiter {
	static getStats() {
		const now = Date.now();
		let stats = JSON.parse(localStorage.getItem('gemini_rate_stats') || '{"minuteWindowStart": 0, "minuteCount": 0}');

		if (now - stats.minuteWindowStart > RATE_LIMITS.RESET_TIME) {
			stats.minuteWindowStart = now;
			stats.minuteCount = 0;
		}

		return stats;
	}

	static incrementAndCheck() {
		const stats = this.getStats();

		if (stats.minuteCount >= RATE_LIMITS.RPM) {
			const waitTime = Math.ceil((RATE_LIMITS.RESET_TIME - (Date.now() - stats.minuteWindowStart)) / 1000);
			throw new Error(`Quá tốc độ (RPM). Vui lòng đợi ${waitTime}s. (${stats.minuteCount}/${RATE_LIMITS.RPM})`);
		}

		stats.minuteCount++;
		localStorage.setItem('gemini_rate_stats', JSON.stringify(stats));

		console.log(`[Gemini RPM] ${stats.minuteCount}/${RATE_LIMITS.RPM}`);
		return stats;
	}

	static getDisplayString() {
		const stats = this.getStats();
		return `RPM: ${stats.minuteCount}/${RATE_LIMITS.RPM}`;
	}
}

// ============================================
// TRANSLATION STYLE PROMPTS
// ============================================
const STYLE_INSTRUCTIONS = {
	"smart_adaptive": `**VAI TRÒ:** Bạn là một AI âm nhạc tinh tế. Nhiệm vụ của bạn là **TỰ ĐỘNG PHÂN TÍCH** lời bài hát để chọn giọng văn "chuẩn gu" nhất.

**QUY TRÌNH XỬ LÝ (AUTO-DETECT):**

1. **Phân tích Vibe:**
   - Hùng hổ, gai góc (Rap/Rock) → Tone "Bụi bặm" (Tôi-Ông/Tao-Mày).
   - Ngọt ngào, da diết (Ballad/Pop) → Tone "Thơ mộng" (Anh-Em).
   - Trong sáng, hoài niệm (J-Pop/Indie) → Tone "Thanh xuân" (Tớ-Cậu).
   - Triết lý, cổ kính (Nhạc xưa) → Tone "Hoài cổ" (Ta-Người).

2. **Nguyên tắc cốt lõi:**
   - **Tự nhiên:** Dịch sao cho người đọc tưởng đây là lời Việt gốc, không phải bản dịch.
   - **Linh hoạt:** Nếu gặp từ văn hóa (Sensei, Oppa), hãy giữ nguyên hoặc xử lý khéo léo để không mất chất.`,

	"poetic_standard": `**VAI TRÒ:** Bạn là một nhạc sĩ chuyên viết lời Việt (như Phan Mạnh Quỳnh, Khắc Hưng). Bạn không chỉ dịch nghĩa, bạn đang "phổ thơ" cho giai điệu.

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Gợi ý **"Anh - Em"** (nếu không có yêu cầu cụ thể khác). Linh hoạt đổi chiều tùy ngữ cảnh bài hát.

2. **Kỹ thuật "Nội tâm hóa" (Internalization):**
   - Đừng chỉ mô tả hành động bên ngoài, hãy mô tả sự lay động bên trong.
   - *Ví dụ:* Gốc "Anh đợi em" → Dịch: "Lòng anh mòn mỏi ngóng trông".
   - *Ví dụ:* Gốc "Trời đang mưa" → Dịch: "Mưa tuôn trong lòng" (nếu bài hát buồn).

3. **Từ ngữ:** Ưu tiên từ ngữ có tính nhạc (melodic), giàu hình ảnh và cảm xúc. Tránh dùng từ quá đời thường (như "ăn cơm", "đi bộ") nếu không cần thiết, hãy dùng "dùng bữa", "bước đi".

4. **Lưu ý:** Câu văn phải mượt mà, đọc lên nghe êm tai, có vần điệu ngầm càng tốt.`,

	"youth_story": `**VAI TRÒ:** Bạn là một dịch giả Light Novel/Anime chuyên nghiệp (như dịch giả của Shinkai Makoto).

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Gợi ý **"Tớ - Cậu"** hoặc **"Mình - Cậu"** (nếu không có yêu cầu cụ thể khác). Tránh "Anh-Em" nếu không phù hợp với vibe thanh xuân.

2. **Kỹ thuật "Show, Don't Tell":**
   - Dịch chi tiết các hành động nhỏ để tạo tính tự sự (Storytelling).
   - *Ví dụ:* Gốc "Khóc" → Dịch: "Nước mắt khẽ rơi", "Ướt đẫm gối".
   - *Ví dụ:* Gốc "Ăn kem" → Dịch: "Thả miếng kem lạnh tan trong miệng".

3. **Không khí (Atmosphere):**
   - Giữ nguyên màu sắc hoài niệm (Nostalgic), trong sáng.
   - Bảo tồn các hình ảnh văn hóa Nhật (tiếng ve sầu, sân thượng, pháo hoa, tàu điện).

4. **Lưu ý:** Dùng từ ngữ nhẹ nhàng, giống như đang thì thầm kể chuyện.`,

	"street_bold": `**VAI TRÒ:** Bạn là một Rapper/Battle Rapper trong giới Underground. Ngôn từ là vũ khí và phong cách của bạn.

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Gợi ý **"Tôi - Bạn"** (Cool ngầu), **"Tao - Mày"** (Aggressive/Diss), hoặc **"Anh - Em"** (Rap Love) - nếu không có yêu cầu cụ thể khác.

2. **Kỹ thuật "Flow & Impact":**
   - Ưu tiên sự gãy gọn, dứt khoát. Câu văn phải có "lực" (punchline).
   - Không được dài dòng văn tự. Cắt bớt các từ đệm vô nghĩa.

3. **Từ ngữ:**
   - Dùng từ mạnh (Strong words): "Điên cuồng", "Bùng cháy", "Vụt tắt", "Tan nát".
   - Được phép dùng Slang (tiếng lóng) hợp thời (như "Chất", "Suy", "Gắt").
   - Giữ nguyên các thuật ngữ Hip-hop (Flow, Beat, Rhyme, Homie) nếu cần.

4. **Lưu ý:** Tuyệt đối KHÔNG dùng từ ngữ sến súa, ủy mị (như "lệ rơi", "vấn vương"). Hãy dùng "nước mắt", "ám ảnh".`,

	"vintage_classic": `**VAI TRÒ:** Bạn là một nhà thơ thời tiền chiến hoặc nhạc sĩ dòng nhạc Trịnh/Bolero. Bạn yêu vẻ đẹp của sự phôi pha và triết lý.

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Gợi ý **"Ta - Người"**, **"Tôi - Em"**, hoặc **"Ta - Em"** (nếu không có yêu cầu cụ thể khác).

2. **Kỹ thuật "Hán Việt hóa":**
   - Tận dụng từ Hán Việt để tạo chiều sâu và sự trang trọng.
   - *Ví dụ:* "Buồn" → "Sầu bi/U hoài"; "Chết" → "Tàn phai/Về với cát bụi"; "Mãi mãi" → "Thiên thu/Vạn kiếp".

3. **Hình ảnh:** Sử dụng các hình ảnh ước lệ của thiên nhiên (mây, gió, trăng, bụi, kiếp người) để diễn tả tâm trạng.

4. **Lưu ý:** Giọng văn phải trầm lắng, suy tư, mang màu sắc triết lý hiện sinh. Tránh từ ngữ hiện đại (như "Crush", "Check-in").`,

	"literal_study": `**VAI TRÒ:** Bạn là Giáo sư ngôn ngữ học. Mục tiêu là sự CHÍNH XÁC và GIÁO DỤC.

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Gợi ý trung lập (**Tôi - Bạn**) hoặc bám sát ngôi gốc của bài hát (nếu không có yêu cầu cụ thể khác).

2. **Nguyên tắc "Trung thực" (Faithfulness):**
   - Dịch sát nghĩa đen (Literal meaning). Không phóng tác, không thêm thắt cảm xúc cá nhân.
   - Giữ nguyên cấu trúc câu gốc nếu có thể, để người học đối chiếu ngữ pháp.

3. **Xử lý Thành ngữ:**
   - Nếu gặp thành ngữ khó, hãy dịch nghĩa thực của nó.
   - *Ví dụ:* "Break a leg" → "Chúc may mắn" (không dịch là "Gãy chân").

4. **Mục đích:** Giúp người dùng hiểu chính xác ca sĩ đang nói gì, từng từ một.`
};

// UI metadata for translation styles dropdown
const TRANSLATION_STYLES = {
	"smart_adaptive": {
		name: "Tự Động Thông Minh (Khuyên dùng)",
		description: "AI tự phân tích thể loại và chọn phong cách phù hợp nhất. Dành cho người 'lười' hoặc muốn kết quả tối ưu."
	},
	"poetic_standard": {
		name: "Trữ tình & Lãng mạn",
		description: "Phù hợp cho Ballad, Pop, tình ca V-Pop/K-Pop/US-UK."
	},
	"youth_story": {
		name: "Thanh xuân & Tự sự (Anime/Indie)",
		description: "Phù hợp cho J-Pop, Anime, Light Novel, nhạc Indie."
	},
	"street_bold": {
		name: "Cá tính & Mạnh mẽ (Rap/Hip-hop)",
		description: "Phù hợp cho Rap, Hip-hop, Rock, R&B sôi động."
	},
	"vintage_classic": {
		name: "Cổ điển & Suy tư (Nhạc xưa/Acoustic)",
		description: "Phù hợp cho nhạc Trịnh, Bolero, nhạc Hoa, Jazz/Blues."
	},
	"literal_study": {
		name: "Sát nghĩa (Học thuật)",
		description: "Dành cho người học ngôn ngữ, hiểu chính xác nghĩa đen."
	}
};

// Pronoun override options (Mix & Match with styles)
const PRONOUN_MODES = {
	"default": {
		value: null,
		name: "Auto (Theo nội dung)",
		description: "AI tự do sáng tạo, không giới hạn - chọn xưng hô dựa hoàn toàn vào nội dung và cảm xúc bài hát"
	},
	"anh_em": {
		value: "Anh - Em",
		name: "Anh - Em",
		description: "Trữ tình, tình yêu đôi lứa (phổ biến nhất)"
	},
	"em_anh": {
		value: "Em - Anh",
		name: "Em - Anh",
		description: "Góc nhìn nữ giới, trẻ trung, tình cảm"
	},
	"to_cau": {
		value: "Tớ - Cậu",
		name: "Tớ - Cậu",
		description: "Thanh xuân, vườn trường, Anime/J-Pop"
	},
	"minh_ban": {
		value: "Tôi - Cậu",
		name: "Tôi - Cậu",
		description: "Trung tính, Indie, City Pop (Sakanaction)"
	},
	"toi_ban": {
		value: "Tôi - Bạn",
		name: "Tôi - Bạn",
		description: "Lịch sự, chín chắn, Rap nhẹ nhàng"
	},
	"toi_em": {
		value: "Tôi - Em",
		name: "Tôi - Em",
		description: "Khoảng cách tuổi tác, người lớn-trẻ"
	},
	"ta_nguoi": {
		value: "Ta - Người",
		name: "Ta - Người",
		description: "Cổ điển, văn chương, sâu lắng"
	},
	"tao_may": {
		value: "Tao - Mày",
		name: "Tao - Mày",
		description: "Đường phố, Diss tracks, Aggressive Rap"
	}
};

// ============================================
// TRANSLATOR CLASS - MAIN LOGIC
// ============================================
class Translator {
	constructor(lang, isUsingNetease = false) {
		this.finished = {
			ja: false,
			ko: false,
			zh: false,
		};
		this.isUsingNetease = isUsingNetease;
		this.initializationPromise = null;

		this.applyKuromojiFix();
		this.initializationPromise = this.initializeAsync(lang);
	}

	/**
	 * Async initialization method that can be awaited
	 * @param {string} lang - Language code
	 * @returns {Promise<void>}
	 */
	async initializeAsync(lang) {
		try {
			await this.injectExternals(lang);
			await this.createTranslator(lang);
		} catch (error) {
			console.error(`Failed to initialize translator for language ${lang}:`, error);
			throw error;
		}
	}

	// ============================================
	// GEMINI API METHODS
	// ============================================

	static buildGeminiPrompt({ artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default', wantSmartPhonetic = false }) {
		const lineCount = text.split('\n').length;

		if (wantSmartPhonetic) {
			return `You are a linguistics expert specializing in CJK phonetic transcription. Your task is to detect the language of the lyrics and transcribe them to the correct phonetic system.

**Instructions**:

1.  **Line Integrity**: The output MUST contain exactly ${lineCount} lines. Each transcribed line must correspond to the original line's position. Do not add, merge, or remove lines.

2.  **Language Detection & Transcription**:
    - **If Japanese**: Transcribe to **Hepburn Romaji**.
        - Use macrons for long vowels (e.g., とうきょう → Tōkyō).
        - Particles: は→wa, へ→e, を→o.
        - Syllabic 'ん' before vowel/y -> n' (e.g., しんや → shin'ya).
    - **If Korean**: Transcribe to **Revised Romanization (Romaja)**.
    - **If Chinese**: Transcribe to **Hanyu Pinyin** with tone marks.

3.  **Preserve Content**:
    - Leave all non-CJK text (English, numbers) and punctuation unchanged.
    - Preserve empty lines.

**Verification**:
- [ ] Output has exactly ${lineCount} lines.
- [ ] Language correctly identified and transcribed.
- [ ] Non-CJK text and punctuation are preserved.

**Song Info**:
- Artist: ${artist}
- Title: ${title}

**Output Format**:
Return JSON with "phonetic" (transcribed lyrics) and "detected_language" (ja|ko|zh).

**Input Lyrics**:
----
${text}
----`;
		}
		const styleInstruction = STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS['smart_adaptive'];
		const styleName = TRANSLATION_STYLES[styleKey]?.name || "Tự Động Thông Minh (Khuyên dùng)";

		let pronounInstruction = "";
		if (pronounKey === 'default') {
			pronounInstruction = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 YÊU CẦU TỐI QUAN TRỌNG VỀ XƯNG HÔ (TỰ DO HOÀN TOÀN) 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**BẮT BUỘC PHẢI ĐỌC VÀ TUÂN THEO:**

❌ **BỎ QUA HOÀN TOÀN** mọi quy định về nhân xưng trong phong cách dịch (nếu có).
✅ **TỰ DO SÁNG TẠO** - Bạn được quyền sử dụng BẤT KỲ đại từ nhân xưng nào trong tiếng Việt mà bạn cho là phù hợp nhất.

**NGUYÊN TẮC CHỌN XƯNG HÔ:**

1. **Phân tích sâu nội dung bài hát:**
   • Chủ đề: Tình yêu? Tự sự? Phẫn nộ? Hoài niệm? Triết lý?
   • Giọng điệu: Ngọt ngào? Mạnh mẽ? Buồn bã? Trong sáng? Gai góc?
   • Mối quan hệ (nếu có): Đôi lứa? Bạn bè? Kẻ thù? Người xa lạ?
   • Độ tuổi/thế hệ: Trẻ trung? Trưởng thành? Già nua?

2. **Tự do lựa chọn đại từ phù hợp:**
   • KHÔNG bị giới hạn bởi bất kỳ danh sách nào
   • Có thể dùng: Tôi, Anh, Em, Tớ, Cậu, Mình, Ta, Người, Tao, Mày, Chúng ta, Bạn, Ông, Bà, Cô, Chú, v.v.
   • Có thể dùng 1 đại từ (độc thoại) hoặc nhiều đại từ (đối thoại) tùy nội dung
   • Ưu tiên sự TỰ NHIÊN như người Việt viết lời gốc

3. **Tiêu chí quyết định:**
   ✅ Phù hợp với nội dung và cảm xúc của bài hát
   ✅ Nghe tự nhiên, không gượng ép
   ✅ Nhất quán xuyên suốt ${lineCount} dòng
   ❌ KHÔNG quan tâm đến phong cách dịch đã chọn
   ❌ KHÔNG bị ràng buộc bởi bất kỳ quy tắc nào khác

**⚠️ LƯU Ý:** Yêu cầu này có ưu tiên TUYỆT ĐỐI, ghi đè MỌI quy định khác về nhân xưng.
`;
		} else if (pronounKey && PRONOUN_MODES[pronounKey]?.value) {
			pronounInstruction = `

**⚠️ YÊU CẦU ĐẶC BIỆT VỀ XƯNG HÔ (GHI ĐÈ PHONG CÁCH):**
Bất kể phong cách trên quy định thế nào, bạn BẮT BUỘC phải sử dụng cặp đại từ nhân xưng: **"${PRONOUN_MODES[pronounKey].value}"** cho toàn bộ bài hát.
- Nếu bài hát là độc thoại (không có đối tượng thứ 2), hãy chỉ dùng ngôi thứ nhất trong cặp trên.
- Duy trì nhất quán xưng hô này cho toàn bộ ${lineCount} dòng.`;
		}

		return `${pronounInstruction}

${styleInstruction}

**━━━ QUY TẮC VÀNG (BẤT DI BẤT DỊCH) ━━━**

**⚠️ TOÀN VẸN SỐ DÒNG (QUAN TRỌNG NHẤT!):**
• Output BẮT BUỘC là mảng có CHÍNH XÁC **${lineCount} phần tử** (1 dòng gốc = 1 dòng dịch).
• ❌ TUYỆT ĐỐI KHÔNG được tách dòng, gộp dòng, thêm hoặc bớt dòng.
• Dòng trống → giữ nguyên là chuỗi rỗng "".
• Các nhãn [Intro], [Chorus], (Instrumental) → giữ nguyên 100%.

**VÍ DỤ:**
Input (3 dòng):
  "I love you"
  "Can't live without you"
  "Forever"

❌ SAI (4 dòng): ["Anh yêu em", "Yêu em nhiều", "Không thể thiếu em", "Mãi mãi"]
✅ ĐÚNG (3 dòng): ["Anh yêu em", "Không thể sống thiếu em", "Mãi mãi"]

**━━━ CHECKLIST CUỐI CÙNG ━━━**
☐ Mảng có CHÍNH XÁC ${lineCount} phần tử?
☐ Không có dòng nào bị tách/gộp?
☐ Bản dịch phù hợp với phong cách đã chọn?
☐ Nghĩa rõ ràng, tự nhiên trong tiếng Việt?

**━━━ THÔNG TIN BÀI HÁT ━━━**
🎤 Nghệ sĩ: ${artist}
🎵 Tên bài: ${title}

**━━━ ĐỊNH DẠNG OUTPUT ━━━**
Trả về JSON object với mảng "vi" chứa CHÍNH XÁC ${lineCount} phần tử (mỗi dòng gốc = 1 phần tử mảng).

**━━━ LỜI BÀI HÁT CẦN DỊCH ━━━**
${text}`
	}

	static extractGeminiJson(text) {
		function safeParse(s) {
			try {
				return JSON.parse(s);
			} catch {
				return null;
			}
		}

		let raw = String(text || "").trim();
		let parsed = safeParse(raw);

		if (!parsed) {
			raw = raw.replace(/```[a-z]*\n?/gim, "").replace(/```/g, "");
			raw = raw.replace(/^\s*json\s*$/gim, "");
			parsed = safeParse(raw);
		}

		if (!parsed) {
			// Third attempt: extract the largest {...} block
			const start = raw.indexOf("{");
			const end = raw.lastIndexOf("}");
			if (start !== -1 && end !== -1 && end > start) {
				parsed = safeParse(raw.slice(start, end + 1));
			}
		}

		// If we successfully parsed and have expected fields, return them
		if (parsed && (parsed.vi !== undefined || parsed.phonetic !== undefined)) {
			return {
				vi: parsed.vi,
				phonetic: parsed.phonetic,
				detected_language: parsed.detected_language
			};
		}

		console.warn("Could not parse Gemini JSON response, using fallback");
		const fallback = raw.replace(/\\n/g, "\n");
		return { vi: fallback };
	}

	static buildMinimalFallbackPrompt({ artist, title, text }) {
		const lineCount = text.split('\n').length;
		return `
Translate the following song lyrics to Vietnamese.

**CRITICAL RULES:**
• Output MUST be a JSON array named "vi" with EXACTLY ${lineCount} elements.
• 1 source line = 1 translated line. DO NOT split or merge lines.
• Keep translations neutral and accurate.

**SONG INFO:**
Artist: ${artist}
Title: ${title}

**LYRICS:**
${text}`;
	}

	static async callGemini({ apiKey, artist, title, text, styleKey = 'smart_adaptive', pronounKey = 'default', wantSmartPhonetic = false, _isRetry = false }) {
		const startTime = Date.now();
		const lineCount = text.split('\n').length;

		console.group(`[Gemini] ${wantSmartPhonetic ? 'Phonetic Transcription' : 'Translation'} Request`);
		console.log(`Song: ${artist} - ${title}`);
		console.log(`Lines: ${lineCount}`);
		if (!wantSmartPhonetic) {
			console.log(`Style: ${TRANSLATION_STYLES[styleKey]?.name || styleKey}`);
			console.log(`Pronoun: ${PRONOUN_MODES[pronounKey]?.name || pronounKey}`);
		}
		console.log(`Retry: ${_isRetry ? 'Yes (Safety Fallback)' : 'No'}`);

		GeminiRateLimiter.incrementAndCheck();

		if (!apiKey?.trim()) throw new Error("Missing or invalid Gemini API key");
		if (!text?.trim()) throw new Error("No text provided for translation");

		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

		const prompt = _isRetry
			? Translator.buildMinimalFallbackPrompt({ artist, title, text })
			: Translator.buildGeminiPrompt({ artist, title, text, styleKey, pronounKey, wantSmartPhonetic });

		const responseSchema = wantSmartPhonetic ? {
			type: "object",
			properties: {
				phonetic: {
					type: "string",
					description: "Transcribed lyrics with newlines"
				},
				detected_language: {
					type: "string",
					enum: ["ja", "ko", "zh"],
					description: "Detected language code"
				}
			},
			required: ["phonetic", "detected_language"]
		} : {
			type: "object",
			properties: {
				vi: {
					type: "array",
					items: { type: "string" },
					description: "Array of translated Vietnamese lyrics lines"
				}
			},
			required: ["vi"]
		};

		const body = {
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.1, // Lower temperature for more consistent results
				maxOutputTokens: 8192,
				candidateCount: 1,
				responseMimeType: "application/json", // Native JSON mode
				responseSchema: responseSchema // Schema validation
			},
			safetySettings: [
				{
					category: "HARM_CATEGORY_HARASSMENT",
					threshold: "BLOCK_ONLY_HIGH"
				},
				{
					category: "HARM_CATEGORY_HATE_SPEECH",
					threshold: "BLOCK_ONLY_HIGH"
				},
				{
					category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
					threshold: "BLOCK_ONLY_HIGH"
				},
				{
					category: "HARM_CATEGORY_DANGEROUS_CONTENT",
					threshold: "BLOCK_ONLY_HIGH"
				}
			]
		};

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			const res = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"User-Agent": "Spicetify-LyricsPlus/1.0"
				},
				body: JSON.stringify(body),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!res.ok) {
				const errorText = await res.text().catch(() => 'Unknown error');
				switch (res.status) {
					case 401:
						throw new Error("Invalid API key. Please check your Gemini API key.");
					case 403:
						throw new Error("API access forbidden. Verify your API key permissions.");
					case 429:
						throw new Error("Rate limit exceeded. Please wait before retrying.");
					case 500:
					case 502:
					case 503:
						throw new Error("Gemini service temporarily unavailable. Please try again later.");
					default:
						throw new Error(`API request failed (${res.status}): ${errorText}`);
				}
			}

			const data = await res.json();

			if (!data?.candidates?.length) {
				console.error("Gemini API response:", JSON.stringify(data, null, 2));
				throw new Error("No translation candidates returned from API");
			}

			const candidate = data.candidates[0];
			const responseTime = Date.now() - startTime;

			console.log(`Response Time: ${responseTime}ms`);

			if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "BLOCKED_REASON_UNSPECIFIED") {
				const safetyRatings = candidate?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(", ") || "Unknown";
				console.error("Safety filter block:", safetyRatings);
				console.groupEnd();

				const error = new Error(`SAFETY_BLOCKED:${safetyRatings}`);
				error.isSafetyBlock = true;
				throw error;
			}

			if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
				console.error("Unexpected finish reason:", candidate.finishReason);
				console.groupEnd();
				throw new Error(`Dịch thuật dừng bất ngờ (lý do: ${candidate.finishReason}). Có thể do lời bài hát quá dài hoặc có vấn đề với API.`);
			}

			const raw = candidate?.content?.parts?.[0]?.text;
			if (!raw) {
				console.error("Empty text content. Full candidate structure:", JSON.stringify(candidate, null, 2));
				console.error("Full API response:", JSON.stringify(data, null, 2));
				console.groupEnd();

				const promptFeedback = data?.promptFeedback;
				if (promptFeedback?.blockReason) {
					throw new Error(`Prompt bị chặn: ${promptFeedback.blockReason}. Có thể lời bài hát chứa nội dung nhạy cảm.`);
				}

				throw new Error("API trả về response trống. Hãy kiểm tra Console (Ctrl+Shift+I) để xem log chi tiết, hoặc thử bài hát khác.");
			}

			console.log(`Gemini Raw Response (${raw.length} chars):`);
			console.log(raw);

			const result = Translator.extractGeminiJson(raw);

			const translatedLines = wantSmartPhonetic
				? (result.phonetic ? result.phonetic.split('\n').length : 0)
				: (Array.isArray(result.vi) ? result.vi.length : 0);

			const lineIntegrity = translatedLines === lineCount;

			console.log(`Lines: ${translatedLines}/${lineCount} ${lineIntegrity ? 'OK' : 'MISMATCH!'}`);
			console.log(`Success: ${wantSmartPhonetic ? 'Phonetic transcription' : 'Translation'} completed`);
			console.groupEnd();

			return result;
		} catch (error) {
			const responseTime = Date.now() - startTime;

			if (error.name === 'AbortError') {
				console.error(`Timeout after ${responseTime}ms`);
				console.groupEnd();
				throw new Error("Translation request timed out. Please try again.");
			}

			if (error.isSafetyBlock && !_isRetry) {
				console.warn("Safety block detected. Retrying with minimal/neutral prompt...");
				console.groupEnd();
				return Translator.callGemini({
					apiKey,
					artist,
					title,
					text,
					styleKey: 'literal_study', // Force literal style
					pronounKey: 'default', // Reset to default pronouns for safety
					wantSmartPhonetic,
					_isRetry: true
				});
			}

			console.error(`Error after ${responseTime}ms:`, error.message);
			console.groupEnd();

			const errorMsg = error.message?.replace('SAFETY_BLOCKED:', 'Nội dung bị chặn bởi bộ lọc an toàn: ');
			throw new Error(`Gemini translation failed: ${errorMsg}`);
		}
	}

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

			script.addEventListener('load', () => {
				script.dataset.loaded = 'true';
				resolve();
			});

			script.addEventListener('error', () => {
				reject(new Error(`Failed to load script: ${url}`));
			});

			document.head.appendChild(script);
		});
	}

	async injectExternals(lang) {
		const langCode = lang?.slice(0, 2);
		try {
			switch (langCode) {
				case "ja":
					await Promise.all([
						this.includeExternal(kuromojiPath),
						this.includeExternal(kuroshiroPath)
					]);
					break;
				case "ko":
					await this.includeExternal(aromanize);
					break;
				case "zh":
					await this.includeExternal(openCCPath);
					this.includeExternal(pinyinProPath).catch(() => { });
					this.includeExternal(tinyPinyinPath).catch(() => { });
					break;
			}
		} catch (error) {
			console.error(`Failed to load external scripts for language ${langCode}:`, error);
			throw error;
		}
	}

	async awaitFinished(language) {
		const langCode = language?.slice(0, 2);
		if (this.initializationPromise) {
			await this.initializationPromise;
		}
		if (langCode && !this.finished[langCode]) {
			await this.injectExternals(language);
			await this.createTranslator(language);
		}
	}

	/**
	 * Fix an issue with kuromoji when loading dict from external urls
	 * Adapted from: https://github.com/mobilusoss/textlint-browser-runner/pull/7
	 */
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

	/**
	 * Wait for global variables to become available
	 * @param {string[]} globalNames - Array of global variable names to wait for
	 * @param {number} timeoutMs - Timeout in milliseconds
	 * @returns {Promise<void>}
	 */
	async waitForGlobals(globalNames, timeoutMs = 5000) {
		const startTime = Date.now();

		return new Promise((resolve, reject) => {
			const checkGlobals = () => {
				const allAvailable = globalNames.every(name => typeof window[name] !== 'undefined');

				if (allAvailable) {
					resolve();
					return;
				}

				if (Date.now() - startTime > timeoutMs) {
					reject(new Error(`Timeout waiting for globals: ${globalNames.join(', ')}`));
					return;
				}

				setTimeout(checkGlobals, 50);
			};

			checkGlobals();
		});
	}

	static normalizeRomajiString(s) {
		if (typeof s !== "string") return "";
		return s
			.replace(/\s{2,}/g, " ")
			.trim();
	}

	// ============================================
	// CJK LANGUAGE CONVERSION METHODS
	// ============================================

	async romajifyText(text, target = "romaji", mode = "spaced") {
		await this.awaitFinished("ja");

		const out = await this.kuroshiro.convert(text, {
			to: target,
			mode: mode,
			romajiSystem: "hepburn",
		});
		return Translator.normalizeRomajiString(out);
	}

	async convertToRomaja(text, target) {
		await this.awaitFinished("ko");

		if (target === "hangul") return text;
		if (!this.Aromanize || typeof this.Aromanize.hangulToLatin !== "function") {
			throw new Error("Korean converter not initialized");
		}
		return this.Aromanize.hangulToLatin(text, "rr-translit");
	}

	async convertChinese(text, from, target) {
		await this.awaitFinished("zh");

		const converter = this.OpenCC.Converter({
			from: from,
			to: target,
		});

		return converter(text);
	}

	async loadPinyinPro() {
		if (typeof pinyinPro !== "undefined") return true;
		const urls = [
			pinyinProPath,
			"https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.js",
			"https://unpkg.com/pinyin-pro@3.19.7/dist/index.min.js",
			"https://unpkg.com/pinyin-pro@3.19.7/dist/index.js",
			"https://fastly.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js",
			"https://fastly.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.js",
		];
		for (const url of urls) {
			try {
				await this.includeExternal(url);
				await this.waitForGlobals(["pinyinPro"], 8000);
				return true;
			} catch { }
		}
		return false;
	}

	async loadTinyPinyin() {
		if (typeof TinyPinyin !== "undefined") return true;
		const urls = [
			tinyPinyinPath,
			"https://unpkg.com/tiny-pinyin/dist/tiny-pinyin.min.js",
			"https://fastly.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js",
		];
		for (const url of urls) {
			try {
				await this.includeExternal(url);
				await this.waitForGlobals(["TinyPinyin"], 8000);
				return true;
			} catch { }
		}
		return false;
	}

	async convertToPinyin(text, options = {}) {
		try {
			if (await this.loadTinyPinyin()) {
				return TinyPinyin.convertToPinyin(text || "");
			}
			if (await this.loadPinyinPro()) {
				const toneType = options.toneType || "mark";
				const type = options.type || "string";
				const nonZh = options.nonZh || "consecutive";
				return pinyinPro.pinyin(text || "", { toneType, type, nonZh });
			}
			return text || "";
		} catch {
			return text || "";
		}
	}

}
