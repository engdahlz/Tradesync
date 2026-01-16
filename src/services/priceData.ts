/**
 * Price Data Service
 * Fetches real historical OHLCV data from Binance public API
 */

import { z } from 'zod';

export interface OHLCV {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const KlineSchema = z.tuple([
    z.number().or(z.string()), // Open time
    z.string(), // Open
    z.string(), // High
    z.string(), // Low
    z.string(), // Close
    z.string(), // Volume
    z.number().or(z.string()), // Close time
    z.string(), // Quote asset volume
    z.number(), // Number of trades
    z.string(), // Taker buy base asset volume
    z.string(), // Taker buy quote asset volume
    z.string()  // Ignore
]).rest(z.unknown());

const BinanceKlinesResponseSchema = z.array(KlineSchema);

const BinancePriceSchema = z.object({
    symbol: z.string(),
    price: z.string()
});

const Binance24hChangeSchema = z.object({
    symbol: z.string(),
    priceChange: z.string(),
    priceChangePercent: z.string(),
    weightedAvgPrice: z.string(),
    prevClosePrice: z.string(),
    lastPrice: z.string(),
    lastQty: z.string(),
    bidPrice: z.string(),
    bidQty: z.string(),
    askPrice: z.string(),
    askQty: z.string(),
    openPrice: z.string(),
    highPrice: z.string(),
    lowPrice: z.string(),
    volume: z.string(),
    quoteVolume: z.string(),
    openTime: z.number(),
    closeTime: z.number(),
    firstId: z.number(),
    lastId: z.number(),
    count: z.number()
});

export interface PriceDataOptions {
    symbol: string;
    interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    limit?: number;
}

const BINANCE_API = 'https://api.binance.com/api/v3';

/**
 * Convert symbol to Binance format (e.g., BTC -> BTCUSDT)
 */
function toBinanceSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith('USDT')) return upper;
    return `${upper}USDT`;
}

/**
 * Fetch historical klines (candlestick data) from Binance
 */
export async function fetchHistoricalData(options: PriceDataOptions): Promise<OHLCV[]> {
    const { symbol, interval = '1h', limit = 100 } = options;
    const binanceSymbol = toBinanceSymbol(symbol);

    const url = `${BINANCE_API}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
    }

    const rawData = await response.json();
    
    const validation = BinanceKlinesResponseSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('Binance Klines Validation Error:', validation.error);
        return [];
    }

    // Binance klines format: [openTime, open, high, low, close, volume, closeTime, ...]
    return validation.data.map((kline) => ({
        time: Number(kline[0]) / 1000, // Convert to seconds for lightweight-charts
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
    }));
}

/**
 * Fetch current price for a symbol
 */
export async function fetchCurrentPrice(symbol: string): Promise<number> {
    const binanceSymbol = toBinanceSymbol(symbol);
    const url = `${BINANCE_API}/ticker/price?symbol=${binanceSymbol}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = BinancePriceSchema.safeParse(rawData);
    if (!validation.success) {
        throw new Error('Invalid Binance Price format');
    }

    return parseFloat(validation.data.price);
}

/**
 * Fetch 24h price change data
 */
export async function fetch24hChange(symbol: string): Promise<{
    priceChange: number;
    priceChangePercent: number;
    high: number;
    low: number;
    volume: number;
}> {
    const binanceSymbol = toBinanceSymbol(symbol);
    const url = `${BINANCE_API}/ticker/24hr?symbol=${binanceSymbol}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = Binance24hChangeSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('Binance 24h Validation Error:', validation.error);
        throw new Error('Invalid Binance 24h format');
    }
    
    const data = validation.data;
    return {
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
    };
}

/**
 * Fetch mini-chart data (24h sparkline)
 */
export async function fetchSparklineData(symbol: string): Promise<number[]> {
    try {
        const data = await fetchHistoricalData({
            symbol,
            interval: '1h',
            limit: 24,
        });
        return data.map(d => d.close);
    } catch {
        return [];
    }
}

/**
 * Calculate technical indicators from OHLCV data
 */
export function calculateIndicators(data: OHLCV[]) {
    const closes = data.map(d => d.close);

    // RSI (14 period)
    const rsi = calculateRSI(closes, 14);

    // MACD (12, 26, 9)
    const macd = calculateMACD(closes);

    // Bollinger Bands (20 period, 2 std dev)
    const bb = calculateBollingerBands(closes, 20);

    return { rsi, macd, bollingerBands: bb };
}

function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change; else losses -= change;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateMACD(prices: number[]) {
    const ema = (data: number[], period: number) => {
        if (data.length < period) return data[data.length - 1] || 0;
        const mult = 2 / (period + 1);
        let e = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < data.length; i++) e = (data[i] - e) * mult + e;
        return e;
    };
    const ema12 = ema(prices, 12);
    const ema26 = ema(prices, 26);
    const macdLine = ema12 - ema26;
    const signal = macdLine * 0.9; // Simplified
    return { value: macdLine, signal, histogram: macdLine - signal };
}

function calculateBollingerBands(prices: number[], period: number = 20) {
    const recent = prices.slice(-period);
    if (recent.length < period) {
        const price = prices[prices.length - 1] || 0;
        return { upper: price * 1.02, middle: price, lower: price * 0.98 };
    }
    const middle = recent.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(recent.map(p => Math.pow(p - middle, 2)).reduce((a, b) => a + b, 0) / period);
    return { upper: middle + stdDev * 2, middle, lower: middle - stdDev * 2 };
}
