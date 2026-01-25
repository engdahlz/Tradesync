import { z } from 'zod';
import YahooFinance from 'yahoo-finance2';
import { TtlCache } from './cache.js';

const yahooFinance = new YahooFinance();

const BinanceKlineSchema = z.array(z.array(z.union([z.number(), z.string()])));

export type PriceSeries = {
    symbol: string;
    source: 'binance' | 'yahoo';
    interval: string;
    prices: number[];
    highs: number[];
    lows: number[];
    closes: number[];
};

const priceCacheTtl = Number(process.env.PRICE_CACHE_TTL_SECONDS ?? 120) * 1000;
const priceCacheMax = Number(process.env.PRICE_CACHE_MAX ?? 200);
const priceCache = new TtlCache<PriceSeries>({ maxSize: priceCacheMax, ttlMs: priceCacheTtl });

function normalizeSymbol(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
}

function isLikelyForex(symbol: string): boolean {
    return /^[A-Z]{6}$/.test(symbol);
}

function toYahooSymbol(symbol: string): string {
    const cleaned = normalizeSymbol(symbol).replace('CRYPTO:', '');
    if (cleaned.endsWith('USDT')) {
        return `${cleaned.replace('USDT', '')}-USD`;
    }
    if (['BTC', 'ETH', 'SOL', 'XRP', 'ADA'].includes(cleaned)) {
        return `${cleaned}-USD`;
    }
    if (isLikelyForex(cleaned)) {
        return `${cleaned}=X`;
    }
    return cleaned;
}

function toBinancePair(symbol: string): string {
    const cleaned = normalizeSymbol(symbol).replace('CRYPTO:', '');
    if (cleaned.includes('/')) return cleaned.replace('/', '');
    if (cleaned.endsWith('USDT')) return cleaned;
    return `${cleaned}USDT`;
}

async function fetchBinanceSeries(symbol: string): Promise<PriceSeries> {
    const pair = toBinancePair(symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=60`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance fetch failed for ${pair}`);
    const rawData = await response.json();
    const validation = BinanceKlineSchema.safeParse(rawData);
    if (!validation.success) {
        throw new Error(`Invalid Binance data: ${validation.error.message}`);
    }
    const closes = validation.data.map((d) => parseFloat(d[4] as string));
    const highs = validation.data.map((d) => parseFloat(d[2] as string));
    const lows = validation.data.map((d) => parseFloat(d[3] as string));
    return {
        symbol,
        source: 'binance',
        interval: '1h',
        prices: closes,
        highs,
        lows,
        closes,
    };
}

async function fetchYahooSeries(symbol: string): Promise<PriceSeries> {
    const yahooSymbol = toYahooSymbol(symbol);
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - 90 * 24 * 60 * 60 * 1000);
    const history: any[] = await yahooFinance.historical(yahooSymbol, {
        period1,
        period2,
        interval: '1d',
    });
    const cleaned = history.filter(point => typeof point.close === 'number');
    if (cleaned.length === 0) {
        throw new Error(`Yahoo Finance has no data for ${yahooSymbol}`);
    }
    const closes = cleaned.map(point => point.close as number);
    const highs = cleaned.map(point => (typeof point.high === 'number' ? point.high : point.close) as number);
    const lows = cleaned.map(point => (typeof point.low === 'number' ? point.low : point.close) as number);
    return {
        symbol,
        source: 'yahoo',
        interval: '1d',
        prices: closes,
        highs,
        lows,
        closes,
    };
}

export async function fetchPriceSeries(symbol: string): Promise<PriceSeries> {
    const key = normalizeSymbol(symbol);
    const cached = priceCache.get(key);
    if (cached) return cached;

    const normalized = normalizeSymbol(symbol);
    let series: PriceSeries;
    if (normalized.startsWith('CRYPTO:') || normalized.endsWith('USDT')) {
        try {
            series = await fetchBinanceSeries(symbol);
        } catch {
            series = await fetchYahooSeries(symbol);
        }
    } else {
        try {
            series = await fetchYahooSeries(symbol);
        } catch {
            series = await fetchBinanceSeries(symbol);
        }
    }

    priceCache.set(key, series);
    return series;
}
