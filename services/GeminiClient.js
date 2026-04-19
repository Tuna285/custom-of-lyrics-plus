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
    // Notification throttling to prevent spam
    lastNotificationTime: 0,
    lastNotificationMessage: '',
    
    shouldShowNotification(message) {
        const now = Date.now();
        const throttleWindow = 10000; // 10 seconds
        
        // If same message within throttle window, suppress
        if (this.lastNotificationMessage === message && 
            (now - this.lastNotificationTime) < throttleWindow) {
            console.log(`[Lyrics+] Suppressed duplicate notification: ${message.substring(0, 50)}...`);
            return false;
        }
        
        this.lastNotificationTime = now;
        this.lastNotificationMessage = message;
        return true;
    },
    
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
                console.warn(`[Lyrics+] Rate Limited (429). Retrying in ${delay / 1000}s... (${retries} retries left)`);
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

    /**
     * Real-time view of reasoning from a partial buffer (used during streaming).
     * Returns the union of: (a) all closed <thought>/<think> blocks, and (b) the body of the
     * last unclosed block (so the user sees tokens as they arrive).
     */
    extractStreamingReasoning(buffer) {
        const s = String(buffer || "");
        const parts = [];
        const tagRe = /<(thought|think|redacted_thinking)>([\s\S]*?)(?:<\/\1>|$)/gi;
        let m;
        while ((m = tagRe.exec(s)) !== null) {
            const inner = m[2];
            if (inner) parts.push(inner);
        }
        return parts.join("\n\n").trim();
    },

    /**
     * Strip <thought>, <think>, etc. from model output; collect inner text for optional UI.
     */
    stripReasoningBlocks(raw) {
        let s = String(raw || "");
        const collected = [];
        const patterns = [
            /<thought>([\s\S]*?)<\/thought>/gi,
            new RegExp("<" + "think" + ">[\\s\\S]*?<" + "/" + "think" + ">", "gi"),
            new RegExp("<" + "redacted_thinking" + ">[\\s\\S]*?<" + "/" + "redacted_thinking" + ">", "gi")
        ];
        let prev = null;
        while (prev !== s) {
            prev = s;
            for (const re of patterns) {
                s = s.replace(re, (_, inner) => {
                    if (inner && String(inner).trim()) collected.push(String(inner).trim());
                    return "";
                });
            }
            s = s.trim();
        }
        return { cleaned: s, reasoningContent: collected.join("\n\n") };
    },

    extractGeminiJson(text) {
        let raw = String(text || "").trim();
        raw = raw.replace(/```[a-z]*\n?/gim, "").replace(/```/g, "").trim();

        // Priority 0: Parse compact tag format (e.g., <1>content</1>)
        const compactPattern = /<(\d+)>(.*?)<\/\1>/gs;
        const compactMatches = [...raw.matchAll(compactPattern)];
        if (compactMatches.length > 0) {
            const result = [];
            for (const match of compactMatches) {
                const idx = parseInt(match[1], 10) - 1;
                result[idx] = match[2].trim();
            }
            // Fill any gaps with empty strings
            for (let i = 0; i < result.length; i++) {
                if (result[i] === undefined) result[i] = '';
            }
            if (result.length > 0) {
                console.log(`[Lyrics+] Parsed ${result.length} lines via Compact Tags`);
                return { vi: result, phonetic: result.join('\n') };
            }
        }

        // Priority 1: Parse numbered list format (e.g., "1. line1\n2. line2")
        const hasNumberedLines = /^\d+\.\s*/m.test(raw);
        if (hasNumberedLines) {
            const result = [];
            const lines = raw.split('\n');
            
            for (const line of lines) {
                const match = line.match(/^(\d+)\.\s*(.*)/s);
                if (match) {
                    const idx = parseInt(match[1], 10) - 1;
                    // Handle empty lines (e.g., "5. " or "5.")
                    result[idx] = match[2].trim();
                }
            }
            
            // Fill any gaps with empty strings
            for (let i = 0; i < result.length; i++) {
                if (result[i] === undefined) result[i] = '';
            }
            
            if (result.length > 0) {
                console.log(`[Lyrics+] Parsed ${result.length} lines via Numbered List`);
                return { vi: result, phonetic: result.join('\n') };
            }
        }

        // Priority 2: Try JSON (array OR object with array-valued field).
        // Models sometimes return {"translations": [...]}, {"phonetics": [...]}, {"lines": [...]}
        // even when prompted for tags — handle that without leaking JSON syntax to the user.
        function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
        function extractArray(obj) {
            if (!obj || typeof obj !== "object") return null;
            if (Array.isArray(obj)) return obj;
            // Prefer well-known keys
            const preferred = ["translations", "phonetics", "vi", "lines", "result", "results", "output"];
            for (const k of preferred) {
                if (Array.isArray(obj[k])) return obj[k];
            }
            // Fallback: any string-array value on the object
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (Array.isArray(v) && v.every(x => typeof x === "string")) return v;
            }
            return null;
        }

        let parsed = safeParse(raw);
        let arr = extractArray(parsed);

        // Bracket-balanced object/array slice (handles strings + escapes, ignores brackets inside quotes).
        // Used when raw has prose around the JSON (e.g. "Here is the output: {...}").
        if (!arr) {
            const sliceJson = (text, openCh, closeCh) => {
                const start = text.indexOf(openCh);
                if (start === -1) return null;
                let depth = 0, inStr = false, esc = false;
                for (let i = start; i < text.length; i++) {
                    const c = text[i];
                    if (inStr) {
                        if (esc) { esc = false; continue; }
                        if (c === "\\") { esc = true; continue; }
                        if (c === '"') inStr = false;
                        continue;
                    }
                    if (c === '"') { inStr = true; continue; }
                    if (c === openCh) depth++;
                    else if (c === closeCh) { depth--; if (depth === 0) return text.slice(start, i + 1); }
                }
                return null;
            };
            // Try object first (more common from Gemini structured output), then array
            const objSlice = sliceJson(raw, "{", "}");
            if (objSlice) arr = extractArray(safeParse(objSlice));
            if (!arr) {
                const arrSlice = sliceJson(raw, "[", "]");
                const slicedParsed = safeParse(arrSlice || "");
                arr = extractArray(slicedParsed);
            }
        }

        if (Array.isArray(arr)) {
            console.log(`[Lyrics+] Parsed ${arr.length} lines via JSON`);
            const stringArr = arr.map(x => (x == null ? "" : String(x)));
            return { vi: stringArr, phonetic: stringArr.join('\n') };
        }

        // Priority 3: Fallback - split by newlines
        DebugLogger.warn("Structured parse failed, using line split fallback...");
        const rawLines = raw.split('\n').filter(l => l.trim());
        return { vi: rawLines, phonetic: rawLines.join('\n') };
    },

    /**
     * Mutate `body` with reasoning-effort flags for the SPECIFIC API family detected from endpoint+model.
     * Strict providers (Gemini OpenAI-compat) reject unknown fields, so we cannot broadcast — we must
     * detect and send only the field that family accepts.
     *
     * `effort` values:
     *   "off"    — disable reasoning entirely (fastest, cheapest)
     *   "low"    — minimal reasoning (~512 tokens) — recommended default for lyrics
     *   "medium" — moderate reasoning (~2048 tokens)
     *   "high"   — full reasoning (~8192 tokens or dynamic)
     *
     * No-op when the model doesn't have thinking in the first place (e.g. Gemma 4 26B A4B, GPT-4o).
     */
    applyReasoningEffort(body, endpoint, model, effort) {
        if (!body || typeof body !== "object") return body;
        if (!effort || effort === "default") return body;
        const url = String(endpoint || "").toLowerCase();
        const m = String(model || "").toLowerCase();
        let applied = true;

        // Per-level Google thinking_budget (negative = dynamic). Tokens numbers are
        // calibrated for ~50-line lyric tasks: low is enough for 1-2 line reconsideration,
        // high lets the model do a full audit if it wants.
        const geminiBudget = effort === "off" ? 0 : effort === "low" ? 512 : effort === "medium" ? 2048 : -1;
        const openRouterBudget = effort === "off" ? 0 : effort === "low" ? 512 : effort === "medium" ? 2048 : 8192;

        // ── Google Gemini (OpenAI-compat or Vertex) ──────────────────────────
        if (url.includes("generativelanguage.googleapis.com") || url.includes("aiplatform.googleapis.com")) {
            const supportsThinkingConfig = /gemini-(2\.5|3)|flash-thinking|thinking-exp|gemma-4-(31b|e[24]b)/.test(m);
            if (supportsThinkingConfig) {
                body.extra_body = {
                    ...(body.extra_body || {}),
                    google: {
                        ...((body.extra_body && body.extra_body.google) || {}),
                        thinking_config: {
                            thinking_budget: geminiBudget,
                            include_thoughts: effort !== "off",
                        },
                    },
                };
            } else {
                // Model has no thinking mode (Gemma 4 26B A4B, Gemma 1/2/3) — silently skip
                // when requesting "off" (desired anyway); only warn on explicit effort levels.
                applied = effort === "off";
            }
        }
        // ── OpenRouter ───────────────────────────────────────────────────────
        else if (url.includes("openrouter.ai")) {
            if (effort === "off") {
                body.reasoning = { ...(body.reasoning || {}), exclude: true, max_tokens: 0 };
            } else {
                body.reasoning = { ...(body.reasoning || {}), max_tokens: openRouterBudget };
            }
        }
        // ── OpenAI (reasoning models: o-series, gpt-5) ───────────────────────
        else if (url.includes("api.openai.com")) {
            if (/^(o1|o3|o4|gpt-5)/.test(m)) {
                body.reasoning_effort = effort === "off" ? "minimal" : effort;
            } else {
                applied = effort === "off"; // non-reasoning GPT-4.x has nothing to cap
            }
        }
        // ── DeepSeek (model-bound: reasoning vs chat model) ─────────────────
        else if (url.includes("api.deepseek.com")) {
            applied = effort === "off"; // only "off" warns; other levels silently accepted as default
        }
        // ── Qwen DashScope ───────────────────────────────────────────────────
        else if (url.includes("dashscope.aliyuncs.com")) {
            body.extra_body = {
                ...(body.extra_body || {}),
                enable_thinking: effort !== "off",
                ...(effort !== "off" && effort !== "high" ? { thinking_budget: openRouterBudget } : {}),
            };
        }
        // ── Anthropic native (not via OpenAI-compat) ─────────────────────────
        else if (url.includes("api.anthropic.com")) {
            // Claude's effort scale: low | medium | max (no "off" / "minimal")
            const claudeEffort = effort === "off" ? "low" : effort === "high" ? "max" : effort;
            body.effort = claudeEffort;
            if (effort === "off") applied = false; // inform user Claude doesn't truly disable
        }
        // ── Local / Self-hosted runtimes ────────────────────────────────────
        else {
            const isOllama = url.includes(":11434") || url.includes("/api/chat") || url.includes("ollama");
            if (isOllama) {
                body.think = effort !== "off";
            } else {
                body.chat_template_kwargs = {
                    ...(body.chat_template_kwargs || {}),
                    enable_thinking: effort !== "off",
                };
            }
        }

        if (!applied) this.warnReasoningEffortUnsupported(endpoint, model, effort);
        return body;
    },

    /** Show a one-shot toast when the requested reasoning effort can't be honored for (endpoint, model). */
    warnReasoningEffortUnsupported(endpoint, model, effort) {
        if (!this._thinkingWarnedKeys) this._thinkingWarnedKeys = new Set();
        const key = `${endpoint}::${model}::${effort}`;
        if (this._thinkingWarnedKeys.has(key)) return;
        this._thinkingWarnedKeys.add(key);
        try {
            const msg = (typeof getText === "function" && getText("settings.reasoningEffort.unsupportedToast"))
                || "This model doesn't support adjusting reasoning effort.";
            Spicetify?.showNotification?.(msg, true);
        } catch (_) { /* notification optional */ }
    },

    /**
     * Detect whether (endpoint, model) supports `response_format: { type: "json_object" }` AND
     * the OpenAI `system` role. On Google's OpenAI-compat layer, Gemma 1/2/3 reject both
     * with HTTP 400 "Developer instruction is not enabled". Gemma 4+ and Gemini handle them fine.
     * Other endpoints (OpenAI/Anthropic/DeepSeek/OpenRouter) all support both.
     */
    modelSupportsJsonSchema(endpoint, model) {
        const ep = (endpoint || "").toLowerCase();
        const m = (model || "").toLowerCase();
        const isGoogle = ep.includes("generativelanguage.googleapis.com");
        if (!isGoogle) return true;
        // Google API: only Gemma 1/2/3 are limited. Gemini and Gemma 4+ work.
        if (/^gemma-[123](?:[^\d]|$)/.test(m)) return false;
        return true;
    },

    /** One-shot toast when JSON schema mode is auto-demoted to prompt mode. */
    warnJsonSchemaUnsupported(endpoint, model) {
        if (!this._jsonFallbackWarnedKeys) this._jsonFallbackWarnedKeys = new Set();
        const key = `${endpoint}::${model}`;
        if (this._jsonFallbackWarnedKeys.has(key)) return;
        this._jsonFallbackWarnedKeys.add(key);
        try {
            const msg = (typeof getText === "function" && getText("settings.responseMode.unsupportedToast"))
                || `${model} doesn't support JSON Schema — using Prompt Engineering instead.`;
            Spicetify?.showNotification?.(msg, false, 4000);
        } catch (_) { /* notification optional */ }
    },

    /**
     * Stream an OpenAI-compatible chat completion, emitting partial reasoning to onProgress.
     * Falls back gracefully if the server returns a non-SSE body.
     * Returns: { content, reasoningContent, message } shaped like the non-streaming `data.choices[0]`.
     */
    async streamChatCompletion({ endpoint, headers, body, onProgress, signal, lineCount = 0, responseMode = "prompt" }) {
        const streamingBody = { ...body, stream: true, stream_options: { include_usage: true } };

        // Chain external signal with an internal AbortController so we can also abort
        // proactively when we detect the model is wasting tokens on Pass 3 / Pass 4 redrafts.
        const localController = new AbortController();
        let earlyAbortReason = null; // Set when we abort proactively (vs. timeout / user cancel)
        if (signal) {
            if (signal.aborted) localController.abort();
            else signal.addEventListener("abort", () => localController.abort(), { once: true });
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { ...headers, "Accept": "text/event-stream" },
            body: JSON.stringify(streamingBody),
            signal: localController.signal,
        });
        if (!response.ok) {
            // Let the caller's error pipeline format this
            let errBody = "";
            try { errBody = await response.text(); } catch (_) { }
            const err = new Error(`HTTP ${response.status}${errBody ? `: ${errBody.slice(0, 300)}` : ""}`);
            err.status = response.status;
            throw err;
        }
        if (!response.body || !response.body.getReader) {
            // Non-streaming fallback
            const data = await response.json();
            const message = data?.choices?.[0]?.message || {};
            return {
                content: message.content || "",
                reasoningContent: this.extractReasoningFromMessage(message),
                message,
            };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let contentBuf = "";
        let reasoningBuf = ""; // From delta.reasoning_content
        let lastEmit = 0;
        let pendingDirty = false; // Set when a chunk arrives during the throttle window
        let trailingTimer = null;

        // Throttle window for onProgress emissions.
        //   - Each emit triggers a React re-render of <App> (state update for reasoningStreams).
        //   - Reading speed of humans on streaming text caps at ~5fps usefully; faster only burns CPU.
        //   - 250ms = ~4fps: feels live, ~3x fewer re-renders than the previous 80ms throttle.
        const THROTTLE_MS = 250;

        const doEmit = () => {
            if (typeof onProgress !== "function") return;
            lastEmit = Date.now();
            pendingDirty = false;
            const inline = this.extractStreamingReasoning(contentBuf);
            const merged = [reasoningBuf, inline].filter(Boolean).join("\n\n").trim();
            try { onProgress({ reasoning: merged, content: contentBuf }); } catch (_) { }
        };

        const emitProgress = (force = false) => {
            if (typeof onProgress !== "function") return;
            if (force) {
                // Cancel any pending trailing emit and flush immediately
                if (trailingTimer) { clearTimeout(trailingTimer); trailingTimer = null; }
                doEmit();
                return;
            }
            const now = Date.now();
            const elapsed = now - lastEmit;
            if (elapsed >= THROTTLE_MS) {
                doEmit();
            } else if (!trailingTimer) {
                // Schedule a trailing emit so the LAST chunk in the window isn't lost.
                pendingDirty = true;
                trailingTimer = setTimeout(() => {
                    trailingTimer = null;
                    if (pendingDirty) doEmit();
                }, THROTTLE_MS - elapsed);
            } else {
                // A trailing emit is already scheduled; just mark the buffer dirty
                pendingDirty = true;
            }
        };

        // Final message-shaped object built from accumulated deltas
        const finalMessage = { role: "assistant", content: "" };
        let usage = null;

        // ── Pass 3 / Pass 4 redraft detector ────────────────────────────────────
        // Larger LLMs sometimes emit the full N-line draft once, then start restating
        // the entire thing inside the FINAL REPLY channel ("Pass 3" audit pattern).
        // This burns the token budget, hits provider caps, and slows perceived latency.
        // Detect the start of a 2nd full draft in content and stop the stream.
        //
        // Only enabled for tag-based output (prompt mode) with N >= 3 lines.
        // Reasoning-channel redrafts are NOT auto-aborted (risk of losing answer if
        // the final reply hasn't started yet) — those are mitigated by the prompt rules
        // and by max_tokens caps.
        const useRedraftDetector = responseMode !== "json_schema" && lineCount >= 3;
        let lastContentLen = -1; // skip work on chunks that didn't grow contentBuf

        const countTagOne = (s) => {
            let count = 0;
            let idx = -1;
            while ((idx = s.indexOf("<1>", idx + 1)) !== -1) count++;
            return count;
        };

        const checkRedraftAbort = () => {
            if (!useRedraftDetector || earlyAbortReason || localController.signal.aborted) return;
            if (contentBuf.length === lastContentLen) return;
            lastContentLen = contentBuf.length;
            if (countTagOne(contentBuf) < 2) return;

            // Truncate at the start of the 2nd <1> — we keep the first complete draft
            // and discard the redraft, then abort to save tokens.
            const first = contentBuf.indexOf("<1>");
            if (first === -1) return;
            const cut = contentBuf.indexOf("<1>", first + 3);
            if (cut <= 0) return;
            contentBuf = contentBuf.slice(0, cut);
            earlyAbortReason = "content-redraft";
            try { localController.abort(); } catch (_) { }
        };
        // ────────────────────────────────────────────────────────────────────────

        // SSE parser loop (matches modelTest.html style)
        // Lines: "data: {...}" or "data: [DONE]"
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const t = line.trim();
                    if (!t || t === "data: [DONE]" || t === ":") continue;
                    if (!t.startsWith("data:")) continue;
                    const jsonStr = t.slice(5).trim();
                    if (!jsonStr || jsonStr === "[DONE]") continue;
                    let chunk;
                    try { chunk = JSON.parse(jsonStr); } catch (_) { continue; }

                    if (chunk.usage) usage = chunk.usage;
                    const choice = chunk.choices?.[0];
                    if (!choice) continue;

                    const delta = choice.delta || {};
                    if (typeof delta.content === "string" && delta.content) {
                        contentBuf += delta.content;
                        emitProgress(false);
                    }
                    // Some providers stream thinking in a separate channel
                    const dr = delta.reasoning_content ?? delta.reasoning ?? delta.thought ?? delta.thinking;
                    if (typeof dr === "string" && dr) {
                        reasoningBuf += dr;
                        emitProgress(false);
                    }
                }

                checkRedraftAbort();
                if (earlyAbortReason) break;
            }
        } catch (e) {
            // If WE aborted on purpose, swallow the AbortError and finalize gracefully.
            // Real user/timeout aborts (no earlyAbortReason set) re-throw.
            const isAbort = e && (e.name === "AbortError" || e.code === 20 || /aborted/i.test(e.message || ""));
            if (!isAbort || !earlyAbortReason) throw e;
            DebugLogger.log(`[Lyrics+] Stream aborted early: ${earlyAbortReason} — kept first complete draft, dropped redraft.`);
        }
        // Flush any tail bytes
        try { buffer += decoder.decode(); } catch (_) { }
        emitProgress(true);

        finalMessage.content = contentBuf;
        if (reasoningBuf) finalMessage.reasoning_content = reasoningBuf;

        return {
            content: contentBuf,
            reasoningContent: reasoningBuf,
            message: finalMessage,
            usage,
            earlyAbortReason,
        };
    },

    /**
     * Compute a safe `max_tokens` budget from the song length so long lyrics don't get truncated mid-JSON.
     * Heuristic per line:
     *   Translation: ~80 tokens (VI words + tag/JSON overhead + safety)
     *   Phonetic:    ~60 tokens (romanization is shorter than VI translation)
     * Floor at 2000 (short songs / single quote requests), cap at 16000 (provider limits).
     */
    estimateMaxTokens(lineCount, wantSmartPhonetic) {
        const perLine = wantSmartPhonetic ? 60 : 80;
        const overhead = 400; // JSON wrapper, system echoes, reasoning tag boilerplate
        const estimated = lineCount * perLine + overhead;
        return Math.min(16000, Math.max(2000, estimated));
    },

    async callGemini({ apiKey, artist, title, text, styleKey, pronounKey, wantSmartPhonetic, _isRetry, priority, taskId, onReasoningProgress }) {
        const startTime = Date.now();
        const lineCount = text.split('\n').length;

        DebugLogger.group(`${wantSmartPhonetic ? 'Phonetic' : 'Translation'} Request`);

        const endpoint = CONFIG?.visual?.["gemini:endpoint"] || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        const model = CONFIG?.visual?.["gemini:model"] || "gemma-4-26b-a4b-it";
        let responseMode = CONFIG?.visual?.["gemini:response-mode"] || "prompt";

        // Auto-demote JSON Schema → Prompt Engineering for models that don't support it
        // (e.g. Gemma 1/2/3 on Google API reject both `system` role and `response_format`).
        if (responseMode === "json_schema" && !this.modelSupportsJsonSchema(endpoint, model)) {
            DebugLogger.log(`Model "${model}" doesn't support JSON Schema on this endpoint — falling back to Prompt Engineering mode.`);
            this.warnJsonSchemaUnsupported(endpoint, model);
            responseMode = "prompt";
        }

        if (!apiKey?.trim()) throw new Error("Missing API key");

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        };

        let body;

        if (responseMode === "json_schema") {
            // JSON Schema mode: system/user split + response_format
            let prompt;
            if (_isRetry) {
                prompt = {
                    system: "You are a translator. Output valid JSON only.",
                    user: Prompts.buildMinimalFallbackPrompt({ artist, title, text })
                };
            } else if (wantSmartPhonetic) {
                prompt = Prompts.buildJsonSchemaPhoneticPrompt({ artist, title, text });
            } else {
                prompt = Prompts.buildJsonSchemaTranslationPrompt({ artist, title, text, styleKey, pronounKey });
            }

            body = {
                model,
                messages: [
                    { role: "system", content: prompt.system },
                    { role: "user", content: prompt.user }
                ],
                temperature: wantSmartPhonetic ? 0.35 : 1,
                max_tokens: this.estimateMaxTokens(lineCount, wantSmartPhonetic),
                response_format: { type: "json_object" }
            };
        } else {
            // Prompt Engineering mode: single user message (some models like Gemma 3 don't support system messages)
            let prompt;
            if (_isRetry) {
                prompt = {
                    system: "You are a translator. Output compact tags <1>...</1> only.",
                    user: Prompts.buildMinimalFallbackPrompt({ artist, title, text })
                };
            } else {
                prompt = Prompts.buildPromptEngPrompt({ artist, title, text, styleKey, pronounKey, wantSmartPhonetic });
            }

            // Combine system + user into single user message for universal compatibility
            const combinedContent = `${prompt.system}\n\n---\n\n${prompt.user}`;

            body = {
                model,
                messages: [{ role: "user", content: combinedContent }],
                temperature: wantSmartPhonetic ? 0.35 : 0.7,
                max_tokens: this.estimateMaxTokens(lineCount, wantSmartPhonetic)
            };
        }

        // Reasoning effort: "off" | "low" | "medium" | "high". Fallback to "low" (sweet spot
        // for lyric translation — enough thinking to handle tricky lines, tight enough to avoid
        // Pass 3/4 audit loops).
        const reasoningEffort = CONFIG?.visual?.["gemini:reasoning-effort"] || "low";
        if (reasoningEffort !== "default") {
            this.applyReasoningEffort(body, endpoint, model, reasoningEffort);
        }

        try {
            const selectedQueue = wantSmartPhonetic ? geminiQueuePhonetic : geminiQueueTranslation;
            const disableQueue = CONFIG?.visual?.["gemini:disable-queue"] === true;

            const makeRequest = async () => {
                const streamed = await this.fetchWithRetry(async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 120000);
                    try {
                        return await this.streamChatCompletion({
                            endpoint,
                            headers,
                            body,
                            signal: controller.signal,
                            lineCount,
                            responseMode,
                            onProgress: ({ reasoning }) => {
                                if (typeof onReasoningProgress === "function" && reasoning) {
                                    try { onReasoningProgress(reasoning); } catch (_) { }
                                }
                            },
                        });
                    } catch (e) {
                        // Normalize error shape so the existing error pipeline can format it
                        if (!e.endpoint) e.endpoint = endpoint;
                        if (!e.model) e.model = model;
                        throw e;
                    } finally { clearTimeout(timeoutId); }
                });

                // Adapt streamed result to the shape processResponse expects
                const data = { choices: [{ message: streamed.message }], usage: streamed.usage };
                return this.processResponse(data, responseMode, wantSmartPhonetic, lineCount, startTime);
            };

            if (disableQueue) {
                return await makeRequest();
            } else {
                return await selectedQueue.add(makeRequest, priority, taskId);
            }

        } catch (error) {
            const errorMsg = error.message || 'Unknown error';
            
            console.error(`[Lyrics+] Translation Error:`, { 
                message: errorMsg, 
                status: error.status,
                model: error.model || model,
                endpoint: error.endpoint || endpoint,
                responseMode,
                stack: error.stack
            });
            console.groupEnd();

            // Retry with fallback prompt if first attempt failed
            if (error.name !== 'AbortError' && !_isRetry && error.status) {
                console.log('[Lyrics+] Retrying with fallback minimal prompt...');
                return this.callGemini({
                    apiKey, artist, title, text,
                    styleKey: 'literal_study', pronounKey: 'default',
                    wantSmartPhonetic, _isRetry: true,
                    onReasoningProgress
                });
            }

            // Build user-friendly error message
            let userMessage = errorMsg;
            
            if (!error.status) {
                if (error.name === 'AbortError') {
                    userMessage = `Request timed out after 120s. The API is taking too long to respond.`;
                } else if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
                    userMessage = `Network Error. Check your internet connection and API endpoint: ${endpoint}`;
                } else {
                    userMessage = `Connection failed: ${errorMsg}`;
                }
            } else if (error.status === 500) {
                userMessage = `Server Error (500). The API is temporarily unavailable. Try again later.`;
            } else if (error.status === 502 || error.status === 503 || error.status === 504) {
                userMessage = `Service Unavailable (${error.status}). The API is overloaded or down. Try again later.`;
            } else if (error.status === 404) {
                userMessage = `Model Not Found (404). The model '${error.model || model}' may not be available at this endpoint.`;
            } else if (error.status === 401 || error.status === 403) {
                userMessage = `Authentication Failed (${error.status}). Check your API Key in Settings.`;
            } else if (error.status === 429) {
                userMessage = `Rate Limit Exceeded (429). Too many requests. Please wait a moment.`;
            } else if (error.status === 400) {
                userMessage = `Bad Request (400). ${errorMsg.replace(/^HTTP 400:\s*/, '').substring(0, 100)}`;
            }
            
            const shouldNotify = error.status !== 429;
            
            if (shouldNotify) {
                try {
                    if (this.shouldShowNotification(userMessage)) {
                        Spicetify.showNotification(userMessage.substring(0, 100), true, 5000);
                    }
                } catch (e) { /* Spicetify not available */ }
            }
            
            error.message = userMessage;
            throw error;
        }
    },

    /** Pull reasoning from non-content fields (o-series, some gateways) */
    extractReasoningFromMessage(message) {
        if (!message || typeof message !== "object") return "";
        const pick = message.reasoning_content ?? message.reasoning ?? message.thought ?? message.thinking;
        if (typeof pick === "string") return pick.trim();
        if (Array.isArray(pick)) {
            return pick
                .map((x) => (typeof x === "string" ? x : x?.text ?? x?.content ?? ""))
                .filter(Boolean)
                .join("\n\n")
                .trim();
        }
        return "";
    },

    processResponse(data, responseMode, wantSmartPhonetic, lineCount, startTime) {
        // OpenAI-compatible format: always data.choices[0].message.content
        if (!data?.choices?.length) throw new Error("No response from API");
        const message = data.choices[0]?.message;
        const raw = message?.content;

        if (!raw) throw new Error("Empty response content");

        const { cleaned: cleanedRaw, reasoningContent: fromContent } = this.stripReasoningBlocks(raw);
        const fromFields = this.extractReasoningFromMessage(message);
        const reasoningContent = [fromContent, fromFields].filter(Boolean).join("\n\n");
        if (!cleanedRaw) throw new Error("Empty response after stripping thinking blocks");

        let result;
        if (responseMode === "json_schema") {
            // JSON-Schema mode: model SHOULD return clean JSON, but reality bites:
            //   - Some endpoints wrap in ```json fences
            //   - Some prepend prose ("Here is the translation: {...}")
            //   - Truncation mid-array on long songs leaves trailing garbage
            // Always route through extractGeminiJson — its bracket-balanced slicer + object-key
            // extraction handles all of the above cleanly. Falls back to tag/numbered parsing if
            // the model ignored the JSON instruction entirely (e.g. Gemma without strict mode).
            result = this.extractGeminiJson(cleanedRaw);
        } else {
            // Prompt Engineering: parse compact tags / numbered list / JSON / line split
            result = this.extractGeminiJson(cleanedRaw);
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
        }
        // Update phonetic after any modifications
        if (result.vi) {
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
        return { ...result, duration, reasoningContent };
    }
};

window.GeminiClient = GeminiClient;
