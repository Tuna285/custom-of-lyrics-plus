// GeminiClient.js - Network & API Handling

class RequestQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.pendingPromises = new Map(); // For deduplication
        this.lastRateLimited = false;
        this.baseDelay = 100; // Adaptive delay
    }

    add(requestFn, priority = false, key = null) {
        // Deduplication: If same key is already pending, return existing promise
        if (key && this.pendingPromises.has(key)) {
            console.log(`[Queue] Deduped request: ${key}`);
            return this.pendingPromises.get(key);
        }

        const promise = new Promise((resolve, reject) => {
            const item = { requestFn, resolve, reject, key };
            priority ? this.queue.unshift(item) : this.queue.push(item);
            this.process();
        });

        // Track pending promise for deduplication
        if (key) {
            this.pendingPromises.set(key, promise);
            promise.finally(() => this.pendingPromises.delete(key));
        }

        return promise;
    }

    promote(key) {
        if (!key) return;
        const index = this.queue.findIndex(item => item.key === key);
        if (index > 0) {
            const [item] = this.queue.splice(index, 1);
            this.queue.unshift(item);
            console.log(`[Queue] Promoted task: ${key}`);
        }
    }

    // Cancel all pending requests (call when track changes)
    cancelAll(reason = 'Track changed') {
        const cancelled = this.queue.length;
        this.queue.forEach(item => {
            item.reject(new Error(reason));
            if (item.key) this.pendingPromises.delete(item.key);
        });
        this.queue = [];
        if (cancelled > 0) console.log(`[Queue] Cancelled ${cancelled} pending requests`);
        return cancelled;
    }

    // Remove specific key from queue
    cancel(key) {
        if (!key) return false;
        const index = this.queue.findIndex(item => item.key === key);
        if (index !== -1) {
            const [item] = this.queue.splice(index, 1);
            item.reject(new Error('Cancelled'));
            this.pendingPromises.delete(key);
            return true;
        }
        return false;
    }

    async process() {
        if (this.isProcessing) return;
        if (this.queue.length === 0) return;

        this.isProcessing = true;
        const { requestFn, resolve, reject, key } = this.queue.shift();

        try {
            const result = await requestFn();
            this.lastRateLimited = false;
            resolve(result);
        } catch (e) {
            // Track rate limiting for adaptive delay
            if (e.status === 429) this.lastRateLimited = true;
            reject(e);
        } finally {
            // Adaptive delay: longer if rate limited, shorter otherwise
            const delay = this.lastRateLimited ? 500 : this.baseDelay;
            await new Promise(r => setTimeout(r, delay));
            this.isProcessing = false;
            this.process();
        }
    }

    // Get queue status
    get status() {
        return {
            pending: this.queue.length,
            isProcessing: this.isProcessing,
            rateLimited: this.lastRateLimited
        };
    }
}

// Global queue instances
const geminiQueueTranslation = new RequestQueue();
const geminiQueuePhonetic = new RequestQueue();

const GeminiClient = {
    // Cancel all pending requests in both queues (call when track changes)
    cancelAllQueues() {
        const cancelled = geminiQueueTranslation.cancelAll() + geminiQueuePhonetic.cancelAll();
        return cancelled;
    },

    async fetchWithRetry(fn, retries = 3, baseDelay = 1000, attempt = 1) {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;
            // Don't retry on client errors (4xx), except 429 (Too Many Requests)
            if (error.status >= 400 && error.status < 500 && error.status !== 429) throw error;

            // True exponential backoff: delay = baseDelay * 2^attempt
            const delay = baseDelay * Math.pow(2, attempt - 1);
            if (error.status === 429) {
                const retryMsg = `Rate Limited (429). Retrying in ${delay / 1000}s...`;
                console.warn(`[Lyrics+] ${retryMsg}`);
                Spicetify.showNotification(retryMsg);
            } else {
                console.warn(`[Retry] Attempt ${attempt}: retrying in ${delay}ms... (${retries} left)`, error.message);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchWithRetry(fn, retries - 1, baseDelay, attempt + 1);
        }
    },

    promote(key) {
        if (key.includes(':gemini_romaji')) geminiQueuePhonetic.promote(key);
        else geminiQueueTranslation.promote(key);
    },

    extractGeminiJson(text) {
        let raw = String(text || "").trim();
        raw = raw.replace(/```[a-z]*\n?/gim, "").replace(/```/g, "").trim();

        function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

        let parsed = safeParse(raw);
        if (!parsed || !Array.isArray(parsed)) {
            const start = raw.indexOf("[");
            const end = raw.lastIndexOf("]");
            if (start !== -1 && end > start) {
                parsed = safeParse(raw.slice(start, end + 1));
            }
        }

        if (Array.isArray(parsed)) {
            console.log(`[Lyrics+] Parsed ${parsed.length} lines via JSON`);
            return { vi: parsed, phonetic: parsed.join('\n') };
        }

        DebugLogger.warn("JSON parse failed, trying fallback...");
        const hasDelimiter = raw.includes("|||");
        const hasNumberedLines = /^\d+\.\s+/m.test(raw);

        if (hasDelimiter || hasNumberedLines) {
            let normalized = raw.replace(/\n+(\d+\.)/g, '|||$1');
            const parts = normalized.split("|||").map(p => p.trim()).filter(Boolean);
            const result = [];

            parts.forEach(part => {
                const match = part.match(/^(\d+)\.\s*(.*)/s);
                if (match) {
                    result[parseInt(match[1], 10) - 1] = match[2].trim();
                } else if (result.length === 0) {
                    result.push(part);
                }
            });

            const cleaned = result.filter(item => item !== undefined && item !== null);
            if (cleaned.length > 0) {
                DebugLogger.log(`Parsed ${cleaned.length} lines via Fallback`);
                return { vi: cleaned, phonetic: cleaned.join('\n') };
            }
        }

        const rawLines = raw.split('\n').filter(l => l.trim());
        return { vi: rawLines, phonetic: rawLines.join('\n') };
    },

    async callGemini({ apiKey, artist, title, text, styleKey, pronounKey, wantSmartPhonetic, _isRetry, priority, taskId }) {
        const startTime = Date.now();
        const lineCount = text.split('\n').length;

        DebugLogger.group(`${wantSmartPhonetic ? 'Phonetic' : 'Translation'} Request`);

        const apiMode = CONFIG?.visual?.["gemini:api-mode"] || "official";
        const proxyEndpoint = CONFIG?.visual?.["gemini:proxy-endpoint"] || "http://localhost:8317/v1/chat/completions";

        let endpoint, body, headers;

        if (apiMode === "proxy") {
            const proxyModel = CONFIG?.visual?.["gemini:proxy-model"] || "gemini-3-flash-preview";
            const proxyApiKey = CONFIG?.visual?.["gemini:proxy-api-key"] || "proxypal-local";
            endpoint = proxyEndpoint;
            headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${proxyApiKey}`
            };

            let proxyPrompt;
            if (_isRetry) {
                proxyPrompt = {
                    system: "You are a translator. Output valid JSON only.",
                    user: Prompts.buildMinimalFallbackPrompt({ artist, title, text })
                };
            } else if (wantSmartPhonetic) {
                proxyPrompt = Prompts.buildProxyPhoneticPrompt({ artist, title, text });
            } else {
                proxyPrompt = Prompts.buildProxyVietnamesePrompt({ artist, title, text, styleKey, pronounKey });
            }

            body = {
                model: proxyModel,
                messages: [
                    { role: "system", content: proxyPrompt.system },
                    { role: "user", content: proxyPrompt.user }
                ],
                temperature: 1.0,
                max_tokens: 4000,
                response_format: { type: "json_object" }
            };
        } else {
            if (!apiKey?.trim()) throw new Error("Missing API key");
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${encodeURIComponent(apiKey)}`;
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "Spicetify-LyricsPlus/1.0"
            };

            const gemma3Prompt = _isRetry
                ? Prompts.buildMinimalFallbackPrompt({ artist, title, text })
                : Prompts.buildGemma3Prompt({ artist, title, text, styleKey, pronounKey, wantSmartPhonetic });

            body = {
                contents: [{ parts: [{ text: gemma3Prompt }] }],
                generationConfig: {
                    temperature: 1.0,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 3000
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            };
        }

        try {
            const selectedQueue = wantSmartPhonetic ? geminiQueuePhonetic : geminiQueueTranslation;
            const disableQueue = CONFIG?.visual?.["gemini:disable-queue"] === true;

            const makeRequest = async () => {
                const res = await this.fetchWithRetry(async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 120000);
                    try {
                        const response = await fetch(endpoint, {
                            method: "POST",
                            headers,
                            body: JSON.stringify(body),
                            signal: controller.signal
                        });
                        if (!response.ok) {
                            let errorDetails = `HTTP ${response.status}`;
                            try {
                                const errorBody = await response.text();
                                if (errorBody) {
                                    // Try to parse JSON error
                                    try {
                                        // Handle various error formats
                                        const errorJson = JSON.parse(errorBody);
                                        const msg = errorJson.error?.message || errorJson.message || errorJson.error || JSON.stringify(errorJson);
                                        errorDetails = `HTTP ${response.status}: ${msg}`;
                                    } catch {
                                        errorDetails = `HTTP ${response.status}: ${errorBody.substring(0, 300)}`; // Increased limit
                                    }
                                }
                            } catch (e) {
                                console.warn('[Lyrics+] Failed to read error response body:', e);
                            }
                            
                            const error = new Error(errorDetails);
                            error.status = response.status;
                            // Attach extra info for the catch block
                            error.endpoint = endpoint;
                            error.model = body.model; 
                            throw error;
                        }
                        return response;
                    } finally { clearTimeout(timeoutId); }
                });

                const data = await res.json();
                return this.processResponse(data, apiMode, wantSmartPhonetic, lineCount, startTime);
            };

            if (disableQueue) {
                return await makeRequest();
            } else {
                return await selectedQueue.add(makeRequest, priority, taskId);
            }

        } catch (error) {
            const errorMsg = error.message || 'Unknown error';
            
            // Log full details for debugging
            console.error(`[Lyrics+] Translation Error:`, { 
                message: errorMsg, 
                status: error.status,
                apiMode,
                model: error.model || body?.model,
                endpoint: error.endpoint || (apiMode === 'proxy' ? proxyEndpoint : 'Official API'),
                stack: error.stack
            });
            console.groupEnd();

            if (error.name !== 'AbortError' && !_isRetry) {
                console.log('[Lyrics+] Retrying with fallback minimal prompt...');
                return this.callGemini({
                    apiKey, artist, title, text,
                    styleKey: 'literal_study', pronounKey: 'default',
                    wantSmartPhonetic, _isRetry: true
                });
            }

            // Make error message more user-friendly for UI
            let userMessage = errorMsg;
            if (error.status === 500) {
                userMessage = `Server Error (500). Please check if ProxyPal is running and connected. Details: ${errorMsg.replace(/^HTTP 500:\s*/, '')}`;
            } else if (error.status === 404) {
                userMessage = `Model Not Found (404). The model '${error.model || body?.model}' might not be supported by your proxy.`;
            } else if (error.status === 401 || error.status === 403) {
                userMessage = `Authentication Failed (${error.status}). Please check your API key in Settings.`;
            } else if (error.status === 429) {
                userMessage = `Rate Limit Exceeded. Please wait a moment.`;
            }
            
            error.message = userMessage;
            throw error;
        }
    },

    processResponse(data, apiMode, wantSmartPhonetic, lineCount, startTime) {
        let raw;
        if (apiMode === "proxy") {
            if (!data?.choices?.length) throw new Error("No choices returned from proxy");
            raw = data.choices[0]?.message?.content;
        } else {
            if (!data?.candidates?.length) throw new Error("No candidates returned");
            const candidate = data.candidates[0];
            if (candidate?.finishReason === "SAFETY") {
                throw new Error("Translation blocked by safety filters.");
            }
            raw = candidate?.content?.parts?.[0]?.text;
        }

        if (!raw) throw new Error("Empty response content");

        let result;
        if (apiMode === "proxy") {
            try {
                let cleanRaw = raw.trim();
                if (cleanRaw.startsWith('```')) {
                    cleanRaw = cleanRaw.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
                }
                const parsed = JSON.parse(cleanRaw);
                if (wantSmartPhonetic && parsed.phonetics) {
                    result = { vi: parsed.phonetics, phonetic: parsed.phonetics.join('\n') };
                } else if (parsed.translations) {
                    result = { vi: parsed.translations, phonetic: parsed.translations.join('\n') };
                } else if (Array.isArray(parsed)) {
                    result = { vi: parsed, phonetic: parsed.join('\n') };
                } else {
                    throw new Error("Invalid JSON structure");
                }
            } catch (e) {
                result = this.extractGeminiJson(raw);
            }
        } else {
            result = this.extractGeminiJson(raw);
        }

        const duration = Date.now() - startTime;

        // Validate line count
        if (result.vi && result.vi.length !== lineCount) {
            DebugLogger.warn(`Line count mismatch! Expected: ${lineCount}, Got: ${result.vi.length}`);
            // Pad or trim to match expected count
            if (result.vi.length < lineCount) {
                while (result.vi.length < lineCount) result.vi.push("");
            } else if (result.vi.length > lineCount) {
                result.vi = result.vi.slice(0, lineCount);
            }
            result.phonetic = result.vi.join('\n');
        }
        // Log translation results for debugging
        if (wantSmartPhonetic) {
            DebugLogger.log(`Phonetic result:`, result.vi);
        } else {
            DebugLogger.log(`Vietnamese result:`, result.vi);
        }

        DebugLogger.log(`Completed in ${duration}ms.`);
        DebugLogger.groupEnd();
        return { ...result, duration };
    }
};
