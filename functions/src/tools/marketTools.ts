
import { ai } from '../genkit.js';
import { z } from 'genkit';
import { fetchMarketNews } from '../flows/getMarketNews.js';
import { suggestStrategyFlow } from '../flows/suggestStrategy.js';

const BinanceKlineSchema = z.array(z.array(z.union([z.number(), z.string()])));

// Tool 1: Market News
// Allows Advisor to look up latest news and sentiment for a specific ticker
export const marketNewsTool = ai.defineTool({
    name: 'marketNewsTool',
    description: 'Fetches latest financial news and sentiment for specific crypto tickers (e.g. "CRYPTO:BTC"). Returns article summaries and sentiment labels.',
    inputSchema: z.object({
        tickers: z.string().describe('Comma separated tickers, prefer Alpha Vantage format e.g. "CRYPTO:BTC" or "COIN:COIN"'),
    }),
    outputSchema: z.array(z.object({
        title: z.string(),
        summary: z.string(),
        sentiment: z.string(),
        source: z.string()
    })),
}, async (input) => {
    const news = await fetchMarketNews(input.tickers, 5); // Limit 5 for context window efficiency
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

async function fetchBinancePrices(symbol: string): Promise<number[]> {
    // Symbol: "BTC" -> "BTCUSDT"
    // Clean symbol
    const s = symbol.toUpperCase().replace('CRYPTO:', '').replace('USDT', '');
    const pair = `${s}USDT`;

    // Binance API
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=30`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance fetch failed for ${pair}`);
    const rawData = await response.json();
    
    const validation = BinanceKlineSchema.safeParse(rawData);
    if (!validation.success) {
        throw new Error(`Invalid Binance data: ${validation.error.message}`);
    }
    
    // data format: [ [time, open, high, low, close, vol...], ... ]
    // we need closes (index 4)
    return validation.data.map((d) => parseFloat(d[4] as string));
}

export const strategyTool = ai.defineTool({
    name: 'strategyTool',
    description: 'Runs technical analysis (RSI, MACD, Bollinger Bands) on a crypto asset to generate a trading strategy suggestion.',
    inputSchema: z.object({
        symbol: z.string().describe('The crypto symbol to analyze, e.g. "BTC" or "ETH"'),
    }),
    outputSchema: z.object({
        strategy: z.string(),
        analysis: z.string(),
        confidence: z.number(),
        recommendation: z.string()
    }),
}, async (input) => {
    try {
        const prices = await fetchBinancePrices(input.symbol);

        // Call the Flow directly
        const result = await suggestStrategyFlow({
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
    } catch (error: any) {
        return {
            strategy: 'error',
            analysis: `Failed to analyze ${input.symbol}: ${error.message}`,
            confidence: 0,
            recommendation: 'Check symbol validity.'
        };
    }
});
