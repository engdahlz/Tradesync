"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyTool = exports.marketNewsTool = void 0;
const genkit_js_1 = require("../genkit.js");
const genkit_1 = require("genkit");
const getMarketNews_js_1 = require("../flows/getMarketNews.js");
const suggestStrategy_js_1 = require("../flows/suggestStrategy.js");
const BinanceKlineSchema = genkit_1.z.array(genkit_1.z.array(genkit_1.z.union([genkit_1.z.number(), genkit_1.z.string()])));
// Tool 1: Market News
// Allows Advisor to look up latest news and sentiment for a specific ticker
exports.marketNewsTool = genkit_js_1.ai.defineTool({
    name: 'marketNewsTool',
    description: 'Fetches latest financial news and sentiment for specific crypto tickers (e.g. "CRYPTO:BTC"). Returns article summaries and sentiment labels.',
    inputSchema: genkit_1.z.object({
        tickers: genkit_1.z.string().describe('Comma separated tickers, prefer Alpha Vantage format e.g. "CRYPTO:BTC" or "COIN:COIN"'),
    }),
    outputSchema: genkit_1.z.array(genkit_1.z.object({
        title: genkit_1.z.string(),
        summary: genkit_1.z.string(),
        sentiment: genkit_1.z.string(),
        source: genkit_1.z.string()
    })),
}, async (input) => {
    const news = await (0, getMarketNews_js_1.fetchMarketNews)(input.tickers, 5); // Limit 5 for context window efficiency
    return news.map(n => ({
        title: n.title,
        summary: n.summary.slice(0, 200) + '...', // Truncate for LLM
        sentiment: n.sentiment,
        source: n.source
    }));
});
// Tool 2: Strategy Analysis
// Allows Advisor to run technical analysis on a coin
// This creates a dependency: Advisor -> Strategy Flow
// We need to fetch PRICES first because suggestStrategyFlow takes PRICES, not SYMBOL alone (it's pure logic mostly).
// But suggestStrategyFlow expects 'prices' array.
// Who fetches prices? The Tool should!
async function fetchBinancePrices(symbol) {
    // Symbol: "BTC" -> "BTCUSDT"
    // Clean symbol
    const s = symbol.toUpperCase().replace('CRYPTO:', '').replace('USDT', '');
    const pair = `${s}USDT`;
    // Binance API
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=30`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Binance fetch failed for ${pair}`);
    const rawData = await response.json();
    const validation = BinanceKlineSchema.safeParse(rawData);
    if (!validation.success) {
        throw new Error(`Invalid Binance data: ${validation.error.message}`);
    }
    // data format: [ [time, open, high, low, close, vol...], ... ]
    // we need closes (index 4)
    return validation.data.map((d) => parseFloat(d[4]));
}
exports.strategyTool = genkit_js_1.ai.defineTool({
    name: 'strategyTool',
    description: 'Runs technical analysis (RSI, MACD, Bollinger Bands) on a crypto asset to generate a trading strategy suggestion.',
    inputSchema: genkit_1.z.object({
        symbol: genkit_1.z.string().describe('The crypto symbol to analyze, e.g. "BTC" or "ETH"'),
    }),
    outputSchema: genkit_1.z.object({
        strategy: genkit_1.z.string(),
        analysis: genkit_1.z.string(),
        confidence: genkit_1.z.number(),
        recommendation: genkit_1.z.string()
    }),
}, async (input) => {
    try {
        const prices = await fetchBinancePrices(input.symbol);
        // Call the Flow directly
        const result = await (0, suggestStrategy_js_1.suggestStrategyFlow)({
            symbol: input.symbol,
            prices: prices,
            interval: '1h'
        });
        // Map output to simplify for LLM consumption
        return {
            strategy: result.action,
            analysis: result.reasoning,
            confidence: result.confidence,
            recommendation: `Strategy says: ${result.action} with ${result.confidence} confidence.`
        };
    }
    catch (error) {
        return {
            strategy: 'error',
            analysis: `Failed to analyze ${input.symbol}: ${error.message}`,
            confidence: 0,
            recommendation: 'Check symbol validity.'
        };
    }
});
//# sourceMappingURL=marketTools.js.map