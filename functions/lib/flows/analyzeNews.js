"use strict";
/**
 * News Analysis Flow
 * Analyzes financial news articles for market impact and sentiment via Genkit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeNewsFlow = void 0;
exports.handleAnalyzeNews = handleAnalyzeNews;
const config_js_1 = require("../config.js");
const genkit_js_1 = require("../genkit.js");
const genkit_1 = require("genkit");
const InputSchema = genkit_1.z.object({
    title: genkit_1.z.string(),
    description: genkit_1.z.string().optional(),
    content: genkit_1.z.string().optional(),
    source: genkit_1.z.string().optional(),
});
const OutputSchema = genkit_1.z.object({
    sentiment: genkit_1.z.enum(['bullish', 'bearish', 'neutral']),
    confidence: genkit_1.z.number(),
    summary: genkit_1.z.string(),
    tickers: genkit_1.z.array(genkit_1.z.string()),
});
exports.analyzeNewsFlow = genkit_js_1.ai.defineFlow({
    name: 'analyzeNews',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { title, description, content, source } = input;
    const prompt = `Analyze this financial news article for potential market impact.
    
    Article: "${title}"
    Source: ${source || 'Unknown'}
    Summary: ${description || ''}
    Content Snippet: "${content ? content.slice(0, 500) : ''}"

    Return the analysis with these fields:
    - sentiment: "bullish" | "bearish" | "neutral"
    - confidence: number (0-1)
    - summary: One sentence summary of the trading implication
    - tickers: Array of related stock/crypto tickers (e.g. ["BTC", "AAPL"])
    `;
    try {
        const result = await genkit_js_1.ai.generate({
            model: config_js_1.MODEL_NAME,
            prompt: prompt,
            output: { schema: OutputSchema }
        });
        if (!result.output) {
            throw new Error('No structured output returned');
        }
        return result.output;
    }
    catch (e) {
        // Fallback or rethrow
        console.error("Genkit generation failed", e);
        return {
            sentiment: 'neutral',
            confidence: 0.5,
            summary: 'Analysis unavailable due to error',
            tickers: []
        };
    }
});
async function handleAnalyzeNews(req, res) {
    try {
        const result = await (0, exports.analyzeNewsFlow)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('News analysis error:', error);
        // Fail gracefully
        res.json({
            sentiment: 'neutral',
            confidence: 0,
            summary: 'News analysis unavailable at the moment.',
            tickers: []
        });
    }
}
//# sourceMappingURL=analyzeNews.js.map