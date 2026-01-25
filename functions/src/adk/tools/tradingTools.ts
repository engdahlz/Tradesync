import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { RSI, MACD } from 'technicalindicators';
import { fetchMarketNews } from '../../flows/getMarketNews.js';
import { executeTradeInternal } from '../../flows/tradeExecution.js';
import { latestSignalsTool } from './latestSignalsTool.js';
import { fetchPriceSeries } from '../../services/priceService.js';

export { latestSignalsTool };

interface NewsItem {
    title: string;
    summary: string;
    sentiment: string;
    source: string;
    time_published: string;
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
     description: 'Runs technical analysis on any asset (price trend, volatility, RSI, MACD). Returns price data for strategy evaluation.',
     parameters: z.object({
         symbol: z.string().describe('Symbol to analyze, e.g. "BTC" or "AAPL"'),
     }),
    execute: async ({ symbol }) => {
        try {
            const series = await fetchPriceSeries(symbol);
            const closes = series.closes;
            const currentPrice = closes[closes.length - 1];
            const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
            const trend = currentPrice > avgPrice ? 'bullish' : currentPrice < avgPrice ? 'bearish' : 'neutral';
            const volatility = Math.max(...closes) - Math.min(...closes);

            const rsiSeries = RSI.calculate({ values: closes, period: 14 });
            const rsi = rsiSeries[rsiSeries.length - 1] ?? 50;

            const macdSeries = MACD.calculate({
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false,
            });
            const macd = macdSeries[macdSeries.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
            
            return {
                symbol,
                source: series.source,
                interval: series.interval,
                currentPrice,
                avgPrice: avgPrice.toFixed(2),
                trend,
                volatility: volatility.toFixed(2),
                priceCount: closes.length,
                prices: closes.slice(-10),
                highs: series.highs.slice(-10),
                lows: series.lows.slice(-10),
                closes: closes.slice(-10),
                rsi,
                macd,
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
    description: 'Places a trade order. Defaults to paper trading unless isDryRun is false and live trading is enabled.',
    parameters: z.object({
        symbol: z.string().describe('Trading pair symbol, e.g. "BTCUSDT"'),
        side: z.enum(['buy', 'sell']),
        quantity: z.number().positive(),
        orderType: z.enum(['market', 'limit']).default('market'),
        price: z.number().optional(),
        isDryRun: z.boolean().optional().describe('When true (default), executes paper trades even if live trading is enabled.'),
    }),
    execute: async ({ symbol, side, quantity, orderType, price, isDryRun }, toolContext) => {
        const shouldDryRun = isDryRun ?? true;
        if (orderType === 'limit' && !price) {
            return {
                success: false,
                status: 'failed',
                message: 'Limit orders require a price.',
            };
        }

        const session = toolContext?.invocationContext?.session;
        const sessionService = toolContext?.invocationContext?.sessionService as {
            updateSession: (request: { appName: string; userId: string; sessionId: string; state: any }) => Promise<void>;
        } | undefined;
        const state = (session?.state as Record<string, unknown>) || {};

        const liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
        const executeLive = liveTradingEnabled && shouldDryRun === false;

        if (executeLive && !state.pendingTradeConfirmed) {
            const pendingTrade = {
                symbol,
                side,
                quantity,
                orderType,
                price,
                isDryRun: shouldDryRun,
                createdAt: new Date().toISOString(),
            };

            if (session && sessionService) {
                await sessionService.updateSession({
                    appName: session.appName,
                    userId: session.userId,
                    sessionId: session.id,
                    state: {
                        ...state,
                        pendingTrade,
                        pendingTradeConfirmed: false,
                    },
                });
            }

            return {
                success: false,
                status: 'pending_confirmation',
                message: 'Live trade requested. Ask the user to confirm to proceed.',
                pendingTrade,
            };
        }

        if (executeLive && state.pendingTradeConfirmed && session && sessionService) {
            await sessionService.updateSession({
                appName: session.appName,
                userId: session.userId,
                sessionId: session.id,
                state: {
                    ...state,
                    pendingTradeConfirmed: false,
                    pendingTrade: null,
                },
            });
        }

        const userId = session?.userId || 'anonymous';
        const idempotencyKey = `adk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        try {
            return await executeTradeInternal({
                userId,
                symbol,
                side,
                quantity,
                orderType,
                price,
                idempotencyKey,
                isDryRun: shouldDryRun,
            });
        } catch (error) {
            return {
                success: false,
                status: 'failed',
                message: error instanceof Error ? error.message : String(error),
            };
        }
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

export const chartTool = new FunctionTool({
    name: 'get_chart',
    description: 'Generates a visual price chart (candlesticks) for any asset. Returns an image the agent can analyze for patterns.',
    parameters: z.object({
        symbol: z.string().describe('Ticker symbol (e.g., AAPL, VOLV-B.ST, BTC-USD)'),
        period: z.string().optional().describe('Time period: 1mo, 3mo, 6mo, 1y (default: 3mo)'),
    }),
    execute: async ({ symbol, period = '3mo' }) => {
        // Call Python service
        const response = await fetch('https://us-central1-tradesync-ai-prod.cloudfunctions.net/generate_chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, period, interval: '1d' }),
        });
        const data = await response.json() as { imageUrl?: string };
        
        if (!data.imageUrl) {
            return { error: 'Failed to generate chart' };
        }
        
        // Return media part for multimodal analysis
        return {
            media: {
                url: data.imageUrl,
                contentType: 'image/png',
            }
        };
    },
});

export const allTools = [
    marketNewsTool,
    technicalAnalysisTool,
    signalEngineTool,
    tradeExecutionTool,
    latestSignalsTool,
    confirmTradeTool,
    chartTool,
];
