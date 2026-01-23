import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { fetchMarketNews } from '../../flows/getMarketNews.js';
import { latestSignalsTool } from './latestSignalsTool.js';

export { latestSignalsTool };

interface NewsItem {
    title: string;
    summary: string;
    sentiment: string;
    source: string;
    time_published: string;
}

const BinanceKlineSchema = z.array(z.array(z.union([z.number(), z.string()])));

async function fetchBinancePrices(symbol: string): Promise<number[]> {
    const s = symbol.toUpperCase().replace('CRYPTO:', '').replace('USDT', '');
    const pair = `${s}USDT`;
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=30`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance fetch failed for ${pair}`);
    const rawData = await response.json();
    const validation = BinanceKlineSchema.safeParse(rawData);
    if (!validation.success) {
        throw new Error(`Invalid Binance data: ${validation.error.message}`);
    }
    return validation.data.map((d) => parseFloat(d[4] as string));
}

export const marketNewsTool = new FunctionTool({
     name: 'get_market_news',
     description: 'Fetches news for global assets (Stocks, Crypto, Forex). Returns article summaries and sentiment.',
     parameters: z.object({
         tickers: z.string().describe('Comma separated tickers, e.g. "BTC" or "AAPL"'),
     }),
    execute: async ({ tickers }) => {
        const news = await fetchMarketNews(tickers, 5);
        return news.map((n: NewsItem) => ({
            title: `${n.title} (${n.source}) - [${n.time_published}]`,
            summary: n.summary.slice(0, 200) + '...',
            sentiment: n.sentiment,
            source: n.source,
            time_published: n.time_published
        }));
    },
});

export const technicalAnalysisTool = new FunctionTool({
     name: 'technical_analysis',
     description: 'Runs technical analysis on any asset (price trend, volatility). Returns price data for strategy evaluation.',
     parameters: z.object({
         symbol: z.string().describe('Symbol to analyze, e.g. "BTC" or "AAPL"'),
     }),
    execute: async ({ symbol }) => {
        try {
            const prices = await fetchBinancePrices(symbol);
            const currentPrice = prices[prices.length - 1];
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const trend = currentPrice > avgPrice ? 'bullish' : currentPrice < avgPrice ? 'bearish' : 'neutral';
            const volatility = Math.max(...prices) - Math.min(...prices);
            
            return {
                symbol,
                currentPrice,
                avgPrice: avgPrice.toFixed(2),
                trend,
                volatility: volatility.toFixed(2),
                priceCount: prices.length,
                prices: prices.slice(-5),
            };
        } catch (error) {
            return {
                error: true,
                symbol,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

export const signalEngineTool = new FunctionTool({
    name: 'calculate_signal',
    description: 'Calculates trading signal based on technical indicators (RSI, MACD) and sentiment. Returns BUY/SELL/HOLD recommendation.',
    parameters: z.object({
        symbol: z.string(),
        sentimentScore: z.number().min(-1).max(1).describe('Sentiment from -1.0 (bearish) to 1.0 (bullish)'),
        rsi: z.number().min(0).max(100).describe('RSI value 0-100'),
        macdHistogram: z.number().describe('MACD histogram value'),
    }),
    execute: async ({ symbol, sentimentScore, rsi, macdHistogram }) => {
        let score = 0;
        const reasons: string[] = [];

        if (rsi < 30) {
            score += 25;
            reasons.push(`RSI oversold (${rsi.toFixed(1)})`);
        } else if (rsi > 70) {
            score -= 25;
            reasons.push(`RSI overbought (${rsi.toFixed(1)})`);
        }

        if (macdHistogram > 0) {
            score += 25;
            reasons.push('MACD bullish');
        } else if (macdHistogram < 0) {
            score -= 25;
            reasons.push('MACD bearish');
        }

        score += sentimentScore * 50;
        if (sentimentScore > 0.5) reasons.push('Strong positive sentiment');
        else if (sentimentScore < -0.5) reasons.push('Strong negative sentiment');

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;

        if (score >= 50) {
            action = 'BUY';
            confidence = Math.min(score / 100, 1);
        } else if (score <= -50) {
            action = 'SELL';
            confidence = Math.min(Math.abs(score) / 100, 1);
        } else {
            confidence = 1 - (Math.abs(score) / 50);
        }

        return {
            symbol,
            action,
            confidence: confidence.toFixed(2),
            score,
            reasoning: reasons.join('. ') || 'Market conditions are neutral.',
        };
    },
});

export const tradeExecutionTool = new FunctionTool({
    name: 'execute_trade',
    description: 'Places a paper trade order. Records the order for portfolio tracking.',
    parameters: z.object({
        symbol: z.string().describe('Trading pair symbol, e.g. "BTCUSDT"'),
        side: z.enum(['buy', 'sell']),
        quantity: z.number().positive(),
        orderType: z.enum(['market', 'limit']).default('market'),
        price: z.number().optional(),
    }),
    execute: async ({ symbol, side, quantity, orderType, price }) => {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
            success: true,
            orderId,
            symbol,
            side,
            quantity,
            orderType,
            price: price ?? 'market',
            status: 'PAPER_EXECUTED',
            executedAt: new Date().toISOString(),
            message: `Paper ${side.toUpperCase()} order placed: ${quantity} ${symbol}`,
        };
    },
});

export const confirmTradeTool = new FunctionTool({
    name: 'confirm_trade',
    description: 'Confirms a pending trade request. Call this when the user explicitly agrees to a blocked or pending trade.',
    parameters: z.object({}),
    execute: async (_, toolContext) => {
        if (!toolContext?.invocationContext?.session) {
            return "No active session found.";
        }

        const session = toolContext.invocationContext.session;
        const state = session.state as any;
        state.pendingTradeConfirmed = true;

        await (toolContext.invocationContext.sessionService as any).updateSession({
            appName: session.appName,
            userId: session.userId,
            sessionId: session.id,
            state: state
        });

        return "Trade confirmed. Retrying execution...";
    },
});

export const allTools = [
    marketNewsTool,
    technicalAnalysisTool,
    signalEngineTool,
    tradeExecutionTool,
    latestSignalsTool,
    confirmTradeTool,
];
