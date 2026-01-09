/**
 * TranslationUtils - Utility functions for translation processing
 * Extracted from index.js for better modularity
 */

const TranslationUtils = {
    /**
     * Check if text is a note/placeholder line (e.g., ♪, …)
     * @param {string} text
     * @returns {boolean}
     */
    isNoteLine(text) {
        const t = String(text || "").trim();
        if (!t) return true;
        return /^[\s♪♩♫♬·•・。.、…~\-]+$/.test(t);
    },

    /**
     * Normalize text for comparison (lowercase, remove punctuation)
     * @param {string} text
     * @returns {string}
     */
    normalizeForComparison(text) {
        if (!text || typeof text !== 'string') return '';
        return text.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Check if two translations are similar (>85% word overlap)
     * @param {string} text1
     * @param {string} text2
     * @returns {boolean}
     */
    areTranslationsSimilar(text1, text2) {
        if (!text1 || !text2) return false;
        const norm1 = this.normalizeForComparison(text1);
        const norm2 = this.normalizeForComparison(text2);
        if (!norm1 || !norm2) return false;
        if (norm1 === norm2) return true;
        const words1 = norm1.split(' ').filter(w => w.length > 2);
        const words2 = norm2.split(' ').filter(w => w.length > 2);
        if (words1.length === 0 || words2.length === 0) return false;
        const commonWords = words1.filter(word => words2.includes(word));
        const similarity = commonWords.length / Math.max(words1.length, words2.length);
        return similarity > 0.85;
    },

    /**
     * Smart optimization for translations - removes duplicates and identical content
     * @param {Array} originalLyrics - Original lyrics
     * @param {Array} mode1 - Translation from Display Mode 1
     * @param {Array} mode2 - Translation from Display Mode 2
     * @returns {Array} Optimized lyrics with smart deduplication
     */
    optimizeTranslations(originalLyrics, mode1, mode2) {
        if (!Array.isArray(originalLyrics)) return originalLyrics;

        // If no translations provided, return original lyrics as-is
        if (!mode1 && !mode2) {
            return originalLyrics;
        }

        // Process each line to determine what to display
        const processedLyrics = originalLyrics.map((line, i) => {
            const originalText = line?.text || '';
            const rawTrans1 = mode1?.[i];
            const rawTrans2 = mode2?.[i];
            
            let translation1 = (typeof rawTrans1 === 'string' ? rawTrans1 : rawTrans1?.text) || '';
            let translation2 = (typeof rawTrans2 === 'string' ? rawTrans2 : rawTrans2?.text) || '';

            // If original is a note/placeholder line, never show sub-lines
            if (this.isNoteLine(originalText)) {
                return { ...line, originalText, text: null, text2: null };
            }

            // Ignore translations that are notes-only
            if (this.isNoteLine(translation1)) translation1 = '';
            if (this.isNoteLine(translation2)) translation2 = '';

            const normalizedOriginal = this.normalizeForComparison(originalText);
            const normalizedTrans1 = this.normalizeForComparison(translation1);
            const normalizedTrans2 = this.normalizeForComparison(translation2);

            const trans1SameAsOriginal = normalizedTrans1 && normalizedTrans1 === normalizedOriginal;
            const trans2SameAsOriginal = normalizedTrans2 && normalizedTrans2 === normalizedOriginal;
            const translationsSame = normalizedTrans1 && normalizedTrans2 &&
                (normalizedTrans1 === normalizedTrans2 || this.areTranslationsSimilar(translation1, translation2));

            let finalText = null;
            let finalText2 = null;

            if (translationsSame) {
                if (!trans1SameAsOriginal) {
                    finalText = translation1 || translation2;
                }
            } else {
                if (!trans1SameAsOriginal && translation1) finalText = translation1;
                if (!trans2SameAsOriginal && translation2) finalText2 = translation2;
                if (!finalText && finalText2) { finalText = finalText2; finalText2 = null; }
            }

            return { ...line, originalText, text: finalText, text2: finalText2 };
        });

        return processedLyrics;
    }
};

// Expose to global scope
window.TranslationUtils = TranslationUtils;
