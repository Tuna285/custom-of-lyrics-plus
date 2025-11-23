const kuroshiroPath = "https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js";
const kuromojiPath = "https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js";
const aromanize = "https://cdn.jsdelivr.net/npm/aromanize@0.1.5/aromanize.min.js";
const openCCPath = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.min.js";
const pinyinProPath = "https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.7/dist/index.min.js";
const tinyPinyinPath = "https://cdn.jsdelivr.net/npm/tiny-pinyin/dist/tiny-pinyin.min.js";

const dictPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

// Cấu hình giới hạn dựa trên ảnh chụp màn hình AI Studio của bạn
// Model: gemini-2.5-flash
const RATE_LIMITS = {
	RPM: 10,    // Giới hạn 10 requests/phút
	RPD: 250,   // Giới hạn 250 requests/ngày
	RESET_TIME: 60000 // 1 phút tính bằng ms
};

class GeminiRateLimiter {
	static getStats() {
		const now = Date.now();
		const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		
		let stats = JSON.parse(localStorage.getItem('gemini_rate_stats') || '{"date": "", "dayCount": 0, "minuteWindowStart": 0, "minuteCount": 0}');
		
		// Reset bộ đếm ngày nếu sang ngày mới
		if (stats.date !== today) {
			stats.date = today;
			stats.dayCount = 0;
			stats.minuteCount = 0;
			stats.minuteWindowStart = now;
		}
		
		// Reset bộ đếm phút (Cửa sổ trượt đơn giản)
		if (now - stats.minuteWindowStart > RATE_LIMITS.RESET_TIME) {
			stats.minuteWindowStart = now;
			stats.minuteCount = 0;
		}
		
		return stats;
	}

	static increment() {
		const stats = this.getStats();
		stats.minuteCount++;
		stats.dayCount++;
		localStorage.setItem('gemini_rate_stats', JSON.stringify(stats));
		return stats;
	}

	static checkAndThrow() {
		const stats = this.getStats();
		
		// Log để debug (F12)
		console.log(`[Gemini Limit] RPM: ${stats.minuteCount}/${RATE_LIMITS.RPM} | RPD: ${stats.dayCount}/${RATE_LIMITS.RPD}`);
		
		if (stats.minuteCount >= RATE_LIMITS.RPM) {
			const waitTime = Math.ceil((60000 - (Date.now() - stats.minuteWindowStart)) / 1000);
			throw new Error(`Quá tốc độ (RPM). Vui lòng đợi ${waitTime}s. (${stats.minuteCount}/${RATE_LIMITS.RPM})`);
		}
		
		if (stats.dayCount >= RATE_LIMITS.RPD) {
			throw new Error(`Hết lượt dùng trong ngày (RPD). Mai quay lại nhé! (${stats.dayCount}/${RATE_LIMITS.RPD})`);
		}
	}
	
	// Hàm này để hiển thị lên UI Spicetify nếu cần
	static getDisplayString() {
		const stats = this.getStats();
		return `RPM: ${stats.minuteCount}/${RATE_LIMITS.RPM} • RPD: ${stats.dayCount}/${RATE_LIMITS.RPD}`;
	}
}

// Translation Style Instructions (Detailed prompts for each style)
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

1. **Nhân xưng:** Mặc định **"Anh - Em"**. (Linh hoạt đổi chiều tùy ngữ cảnh bài hát).

2. **Kỹ thuật "Nội tâm hóa" (Internalization):**
   - Đừng chỉ mô tả hành động bên ngoài, hãy mô tả sự lay động bên trong.
   - *Ví dụ:* Gốc "Anh đợi em" → Dịch: "Lòng anh mòn mỏi ngóng trông".
   - *Ví dụ:* Gốc "Trời đang mưa" → Dịch: "Mưa tuôn trong lòng" (nếu bài hát buồn).

3. **Từ ngữ:** Ưu tiên từ ngữ có tính nhạc (melodic), giàu hình ảnh và cảm xúc. Tránh dùng từ quá đời thường (như "ăn cơm", "đi bộ") nếu không cần thiết, hãy dùng "dùng bữa", "bước đi".

4. **Lưu ý:** Câu văn phải mượt mà, đọc lên nghe êm tai, có vần điệu ngầm càng tốt.`,

	"youth_story": `**VAI TRÒ:** Bạn là một dịch giả Light Novel/Anime chuyên nghiệp (như dịch giả của Shinkai Makoto).

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Ưu tiên **"Tớ - Cậu"** hoặc **"Mình - Cậu"**. Tuyệt đối tránh "Anh-Em" sến súa.

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

1. **Nhân xưng:** **"Tôi - Bạn"** (Cool ngầu), **"Tao - Mày"** (Aggressive/Diss), hoặc **"Anh - Em"** (Rap Love).

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

1. **Nhân xưng:** **"Ta - Người"**, **"Tôi - Em"**, hoặc **"Ta - Em"**.

2. **Kỹ thuật "Hán Việt hóa":**
   - Tận dụng từ Hán Việt để tạo chiều sâu và sự trang trọng.
   - *Ví dụ:* "Buồn" → "Sầu bi/U hoài"; "Chết" → "Tàn phai/Về với cát bụi"; "Mãi mãi" → "Thiên thu/Vạn kiếp".

3. **Hình ảnh:** Sử dụng các hình ảnh ước lệ của thiên nhiên (mây, gió, trăng, bụi, kiếp người) để diễn tả tâm trạng.

4. **Lưu ý:** Giọng văn phải trầm lắng, suy tư, mang màu sắc triết lý hiện sinh. Tránh từ ngữ hiện đại (như "Crush", "Check-in").`,

	"literal_study": `**VAI TRÒ:** Bạn là Giáo sư ngôn ngữ học. Mục tiêu là sự CHÍNH XÁC và GIÁO DỤC.

**PHONG CÁCH DỊCH:**

1. **Nhân xưng:** Trung lập (**Tôi - Bạn**) hoặc bám sát ngôi gốc của bài hát.

2. **Nguyên tắc "Trung thực" (Faithfulness):**
   - Dịch sát nghĩa đen (Literal meaning). Không phóng tác, không thêm thắt cảm xúc cá nhân.
   - Giữ nguyên cấu trúc câu gốc nếu có thể, để người học đối chiếu ngữ pháp.

3. **Xử lý Thành ngữ:**
   - Nếu gặp thành ngữ khó, hãy dịch nghĩa thực của nó.
   - *Ví dụ:* "Break a leg" → "Chúc may mắn" (không dịch là "Gãy chân").

4. **Mục đích:** Giúp người dùng hiểu chính xác ca sĩ đang nói gì, từng từ một.`
};

// Translation Style Metadata (for UI display)
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

// Pronoun Modes (for Mix & Match with styles)
const PRONOUN_MODES = {
	"default": {
		value: null,
		name: "Auto (Theo phong cách)",
		description: "AI chọn xưng hô phù hợp với Style đã chọn"
	},
	"anh_em": {
		value: "Anh - Em",
		name: "Anh - Em",
		description: "Trữ tình, tình yêu đôi lứa (phổ biến nhất)"
	},
	"chi_em": {
		value: "Chị - Em",
		name: "Chị - Em",
		description: "Góc nhìn nữ giới, hoặc quan hệ chị-em"
	},
	"to_cau": {
		value: "Tớ - Cậu",
		name: "Tớ - Cậu",
		description: "Thanh xuân, vườn trường, Anime/J-Pop"
	},
	"minh_ban": {
		value: "Mình - Bạn",
		name: "Mình - Bạn",
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
		// Start initialization asynchronously but don't await in constructor
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
		// Default to Vietnamese translation
		const styleInstruction = STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS['smart_adaptive'];
		const styleName = TRANSLATION_STYLES[styleKey]?.name || "Tự Động Thông Minh (Khuyên dùng)";
		
		// Pronoun Override Logic
		let pronounInstruction = "";
		if (pronounKey && pronounKey !== 'default' && PRONOUN_MODES[pronounKey]?.value) {
			pronounInstruction = `

**⚠️ YÊU CẦU ĐẶC BIỆT VỀ XƯNG HÔ (GHI ĐÈ PHONG CÁCH):**
Bất kể phong cách trên quy định thế nào, bạn BẮT BUỘC phải sử dụng cặp đại từ nhân xưng: **"${PRONOUN_MODES[pronounKey].value}"** cho toàn bộ bài hát.
- Nếu bài hát là độc thoại (không có đối tượng thứ 2), hãy chỉ dùng ngôi thứ nhất trong cặp trên.
- Duy trì nhất quán xưng hô này cho toàn bộ ${lineCount} dòng.`;
		}
		
		return `${styleInstruction}
${pronounInstruction}

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
		
		// With JSON mode enabled, response should be clean JSON
		let raw = String(text || "").trim();

		// First attempt: direct JSON parse (should work with responseMimeType: "application/json")
		let parsed = safeParse(raw);
		
		if (!parsed) {
			// Fallback: clean up potential markdown artifacts (though should be rare with JSON mode)
			raw = raw.replace(/```[a-z]*\n?/gim, "").replace(/```/g, "");
			raw = raw.replace(/^\s*json\s*$/gim, "");
			
			// Second attempt: direct parse after cleanup
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
		
		// Final fallback: treat entire text as Vietnamese
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
		
		// Log request info
		console.group(`[Gemini] ${wantSmartPhonetic ? 'Phonetic Transcription' : 'Translation'} Request`);
		console.log(`Song: ${artist} - ${title}`);
		console.log(`Lines: ${lineCount}`);
		if (!wantSmartPhonetic) {
			console.log(`Style: ${TRANSLATION_STYLES[styleKey]?.name || styleKey}`);
			console.log(`Pronoun: ${PRONOUN_MODES[pronounKey]?.name || pronounKey}`);
		}
		console.log(`Retry: ${_isRetry ? 'Yes (Safety Fallback)' : 'No'}`);
		
		// 1. KIỂM TRA LIMIT TRƯỚC KHI GỌI
		GeminiRateLimiter.checkAndThrow();
		
		// Enhanced validation
		if (!apiKey?.trim()) throw new Error("Missing or invalid Gemini API key");
		if (!text?.trim()) throw new Error("No text provided for translation");

		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
		
		// Use minimal fallback prompt if this is a retry after safety block
		const prompt = _isRetry 
			? Translator.buildMinimalFallbackPrompt({ artist, title, text })
			: Translator.buildGeminiPrompt({ artist, title, text, styleKey, pronounKey, wantSmartPhonetic });

		// Define response schema for JSON mode
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
			// Add timeout support
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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

			// Enhanced error handling
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

			// Validate response structure
			if (!data?.candidates?.length) {
				console.error("Gemini API response:", JSON.stringify(data, null, 2));
				throw new Error("No translation candidates returned from API");
			}

			// 2. NẾU GỌI THÀNH CÔNG, TĂNG BỘ ĐẾM
			GeminiRateLimiter.increment();

			const candidate = data.candidates[0];
			const responseTime = Date.now() - startTime;

			// Log response time
			console.log(`Response Time: ${responseTime}ms`);

			// Check for safety filter blocks
			if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "BLOCKED_REASON_UNSPECIFIED") {
				const safetyRatings = candidate?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(", ") || "Unknown";
				console.error("Safety filter block:", safetyRatings);
				console.groupEnd();
				
				// Create a special error type to signal that we need fallback
				const error = new Error(`SAFETY_BLOCKED:${safetyRatings}`);
				error.isSafetyBlock = true;
				throw error;
			}

			// Check for other non-STOP finish reasons
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

				// Try to get more info
				const promptFeedback = data?.promptFeedback;
				if (promptFeedback?.blockReason) {
					throw new Error(`Prompt bị chặn: ${promptFeedback.blockReason}. Có thể lời bài hát chứa nội dung nhạy cảm.`);
				}

				throw new Error("API trả về response trống. Hãy kiểm tra Console (F12) để xem log chi tiết, hoặc thử bài hát khác.");
			}

			// Log full raw response
			console.log(`Gemini Raw Response (${raw.length} chars):`);
			console.log(raw);

			const result = Translator.extractGeminiJson(raw);
			
			// Verify line count
			const translatedLines = wantSmartPhonetic 
				? (result.phonetic ? result.phonetic.split('\n').length : 0)
				: (Array.isArray(result.vi) ? result.vi.length : 0);
			
			const lineIntegrity = translatedLines === lineCount;
			
			// Log line integrity check
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
			
			// Fallback mechanism: If safety blocked and not already retrying, try minimal prompt
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
			
			// Log error details
			console.error(`Error after ${responseTime}ms:`, error.message);
			console.groupEnd();
			
			// Re-throw with more context
			const errorMsg = error.message?.replace('SAFETY_BLOCKED:', 'Nội dung bị chặn bởi bộ lọc an toàn: ');
			throw new Error(`Gemini translation failed: ${errorMsg}`);
		}
	}

	includeExternal(url) {
		return new Promise((resolve, reject) => {
			const existingScript = document.querySelector(`script[src="${url}"]`);
			if (existingScript) {
				// If script already exists, resolve immediately; readiness is ensured by waitForGlobals when needed
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
					// OpenCC is required
					await this.includeExternal(openCCPath);
					// Prefer pinyin-pro (tones). Preload non-blockingly; tiny-pinyin as backup.
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
		// Wait for any in-flight initial initialization
		if (this.initializationPromise) {
			await this.initializationPromise;
		}
		// If the requested language is not yet initialized, initialize it now
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

				// Wait for libraries to be available with timeout
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
			// Keep macrons (ō, ū, ā, ī, ē) for beautiful and standard Hepburn Romaji
			// Normalize multiple spaces
			.replace(/\s{2,}/g, " ")
			.trim();
	}

	async romajifyText(text, target = "romaji", mode = "spaced") {
		// Ensure initialization is complete
		await this.awaitFinished("ja");

		const out = await this.kuroshiro.convert(text, {
			to: target,
			mode: mode,
			romajiSystem: "hepburn",
		});
		return Translator.normalizeRomajiString(out);
	}

	async convertToRomaja(text, target) {
		// Ensure initialization is complete
		await this.awaitFinished("ko");

		if (target === "hangul") return text;
		if (!this.Aromanize || typeof this.Aromanize.hangulToLatin !== "function") {
			throw new Error("Korean converter not initialized");
		}
		return this.Aromanize.hangulToLatin(text, "rr-translit");
	}

	async convertChinese(text, from, target) {
		// Ensure initialization is complete
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
			// Try tiny-pinyin first (highest availability, no tones)
			if (await this.loadTinyPinyin()) {
				return TinyPinyin.convertToPinyin(text || "");
			}
			// Then try pinyin-pro (tones)
			if (await this.loadPinyinPro()) {
				const toneType = options.toneType || "mark"; // mark | num | none
				const type = options.type || "string"; // string | array
				const nonZh = options.nonZh || "consecutive"; // keep non-Chinese intact
				return pinyinPro.pinyin(text || "", { toneType, type, nonZh });
			}
			// As a last resort, return original text
			return text || "";
		} catch {
			// Graceful fallback: never break conversion pipeline
			return text || "";
		}
	}

}
