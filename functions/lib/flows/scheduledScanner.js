"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMarketScan = runMarketScan;
const suggestStrategy_js_1 = require("./suggestStrategy.js");
const notifications_js_1 = require("../utils/notifications.js");
const zod_1 = require("zod");
const config_js_1 = require("../config.js");
const CoinCapHistoryItemSchema = zod_1.z.object({
    priceUsd: zod_1.z.string(),
    time: zod_1.z.number(),
    date: zod_1.z.string().optional()
});
const CoinCapHistoryResponseSchema = zod_1.z.object({
    data: zod_1.z.array(CoinCapHistoryItemSchema),
    timestamp: zod_1.z.number().optional()
});
const ASSET_MAP = {
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
    }
    catch (e) {
        console.error('[MarketScanner] Connectivity Check FAILED:', e);
        return false;
    }
}
// Helper to fetch prices from CoinCap (Binance often blocks Cloud Functions)
async function fetchCoinCapPrices(symbol) {
    const id = ASSET_MAP[symbol];
    if (!id)
        throw new Error(`Unknown asset id for ${symbol}`);
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
async function runMarketScan() {
    const results = [];
    console.log(`[MarketScanner] Starting scan...`);
    await checkConnectivity();
    const assets = Object.keys(ASSET_MAP);
    for (const asset of assets) {
        try {
            const prices = await fetchCoinCapPrices(asset);
            // Run AI Strategy Logic (Using Flash for high-volume scanner)
            const analysis = await (0, suggestStrategy_js_1.suggestStrategyFlow)({
                symbol: asset,
                prices: prices,
                interval: '1h',
                model: config_js_1.MODEL_FLASH
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
                await (0, notifications_js_1.sendTopicNotification)('signals', {
                    title,
                    body,
                    data: {
                        asset,
                        signal: signalType,
                        confidence: String(confidence)
                    }
                });
            }
        }
        catch (error) {
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
//# sourceMappingURL=scheduledScanner.js.map