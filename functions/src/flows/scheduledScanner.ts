
import { suggestStrategyFlow } from './suggestStrategy.js';
import { sendTopicNotification } from '../utils/notifications.js';
import { z } from 'zod';
import { MODEL_FLASH } from '../config.js';
import { ai, vertexAI } from '../genkit.js';

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

            // Run AI Strategy Logic (Using Flash for high-volume scanner)
            const analysis = await suggestStrategyFlow({
                symbol: asset,
                prices: prices,
                interval: '1h',
                model: MODEL_FLASH
            });

            // Log result
            const confidence = analysis.confidence;
            const signalType = analysis.action;
            console.log(`[MarketScanner] ${asset}: ${signalType} (${confidence})`);

            results.push({
                asset,
                signal: signalType,
                confidence,
                summary: analysis.reasoning
            });

            // Check for high confidence signal
            if (confidence >= CONFIDENCE_THRESHOLD) {
                const title = `🚨 ${asset} Signal: ${signalType.toUpperCase()}`;
                const body = `High confidence (${(confidence * 100).toFixed(0)}%) signal detected. ${analysis.reasoning}`;

                await sendTopicNotification('signals', {
                    title,
                    body,
                    data: {
                        asset,
                        signal: signalType,
                        confidence: String(confidence)
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
