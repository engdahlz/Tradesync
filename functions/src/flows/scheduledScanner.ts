
import { analyzeNewsFlow } from './analyzeNews.js';
import { calculateSignalFlow } from './signalEngine.js';
import { executeTradeInternal } from './tradeExecution.js';
import { fetchMarketAuxNews } from '../services/marketAuxService.js';
import { sendTopicNotification } from '../utils/notifications.js';
import { z } from 'zod';
import { RSI, MACD } from 'technicalindicators';

const CoinCapHistoryItemSchema = z.object({
    priceUsd: z.string(),
    time: z.number(),
    date: z.string().optional()
});

const CoinCapHistoryResponseSchema = z.object({
    data: z.array(CoinCapHistoryItemSchema),
    timestamp: z.number().optional()
});

const ASSET_MAP: { [key: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'XRP': 'xrp',
    'ADA': 'cardano'
};

const CONFIDENCE_THRESHOLD = 0.8;

// Helper to check basic connectivity
async function checkConnectivity() {
    try {
        await fetch('https://www.google.com');
        console.log('[MarketScanner] Connectivity Check: OK');
        return true;
    } catch (e: unknown) {
        console.error('[MarketScanner] Connectivity Check FAILED:', e);
        return false;
    }
}

// Helper to fetch prices from CoinCap (Binance often blocks Cloud Functions)
async function fetchCoinCapPrices(symbol: string): Promise<number[]> {
    const id = ASSET_MAP[symbol];
    if (!id) throw new Error(`Unknown asset id for ${symbol}`);

    // Fetch last 24 hours of 1h candles
    const url = `https://api.coincap.io/v2/assets/${id}/history?interval=h1`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'TradeSync/1.0',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`CoinCap fetch failed for ${id}: ${txt}`);
    }

    const json = await response.json();
    
    // Validate with Zod
    const validation = CoinCapHistoryResponseSchema.safeParse(json);
    if (!validation.success) {
        console.error(`CoinCap Schema Validation Error for ${id}:`, validation.error);
        throw new Error('Invalid data format from CoinCap');
    }

    const data = validation.data.data;
    
    // CoinCap returns { priceUsd, time, ... } - Take last 30 points
    return data.slice(-30).map((d) => parseFloat(d.priceUsd));
}

export async function runMarketScan() {
    const results = [];
    console.log(`[MarketScanner] Starting scan...`);

    await checkConnectivity();

    const assets = Object.keys(ASSET_MAP);
    for (const asset of assets) {
        try {
            const prices = await fetchCoinCapPrices(asset);

            // 1. Technical Analysis
            const rsiValues = RSI.calculate({values: prices, period: 14});
            const currentRsi = rsiValues[rsiValues.length - 1] || 50;

            const macdValues = MACD.calculate({
                values: prices,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false
            });
            const currentMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };

            // 2. News Sentiment (Restricted to major assets to save API quota)
            let sentimentScore = 0;
            if (['BTC', 'ETH'].includes(asset)) {
                try {
                    const news = await fetchMarketAuxNews({ symbols: [asset], limit: 3 });
                    if (news.length > 0) {
                        const content = news.map(n => `${n.title} (${n.source})`).join('. ');
                        const analysis = await analyzeNewsFlow({
                            title: `Latest News for ${asset}`,
                            content: content,
                            source: 'MarketAux'
                        });
                        sentimentScore = analysis.sentimentScore;
                    }
                } catch (e) {
                    console.warn(`[MarketScanner] News fetch failed for ${asset}:`, e);
                }
            }

            // 3. Run Signal Engine
            const signal = await calculateSignalFlow({
                symbol: asset,
                sentimentScore,
                rsi: currentRsi,
                macd: {
                    macd: currentMacd.MACD || 0,
                    signal: currentMacd.signal || 0,
                    histogram: currentMacd.histogram || 0
                },
                price: prices[prices.length - 1]
            });

            console.log(`[MarketScanner] ${asset}: ${signal.action} (${signal.confidence.toFixed(2)}) - Score: ${signal.score}`);

            results.push({
                asset,
                signal: signal.action,
                confidence: signal.confidence,
                summary: signal.reasoning,
                score: signal.score
            });

            // 4. Auto-Trade & Notify
            if (signal.action !== 'HOLD' && signal.confidence >= CONFIDENCE_THRESHOLD) {
                // Execute Trade (Paper/Live based on env)
                try {
                    const trade = await executeTradeInternal({
                        userId: 'auto-trader',
                        symbol: `${asset}USDT`, // Assuming Binance symbol format
                        side: signal.action === 'BUY' ? 'buy' : 'sell',
                        quantity: 0.0001, // Safety: Very small fixed amount
                        orderType: 'market',
                        idempotencyKey: `auto_${asset}_${Date.now()}`
                    });
                    console.log(`[MarketScanner] Auto-Trade executed:`, trade);
                } catch (e) {
                    console.error(`[MarketScanner] Auto-Trade failed:`, e);
                }

                const title = `🚨 ${asset} Signal: ${signal.action}`;
                const body = `High confidence (${(signal.confidence * 100).toFixed(0)}%) signal. ${signal.reasoning}`;

                await sendTopicNotification('signals', {
                    title,
                    body,
                    data: {
                        asset,
                        signal: signal.action,
                        confidence: String(signal.confidence)
                    }
                });
            }

        } catch (error) {
            console.error(`[MarketScanner] Error analyzing ${asset}:`, error);
            results.push({
                asset,
                error: String(error)
            });
        }
    }

    return {
        timestamp: new Date().toISOString(),
        scanned: assets.length,
        results
    };
}
