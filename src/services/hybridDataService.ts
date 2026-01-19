import { fetchCurrentPrice, fetch24hChange, fetchHistoricalData } from './priceData';
import { fetchCryptoMarkets, fetchCryptoPriceBySymbol } from './coingeckoApi';
import { fetchTiingoPrice, fetchTiingoEOD } from './tiingoApi';
import { fetchTwelveDataQuote, fetchTwelveDataTimeSeries } from './twelveDataApi';
import { fetchLatestRates } from './frankfurterApi';

export type AssetType = 'crypto' | 'us_stock' | 'swedish_stock' | 'forex';

export interface UnifiedQuote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    source: string;
    assetType: AssetType;
    timestamp: Date;
}

export interface UnifiedCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

function detectAssetType(symbol: string): AssetType {
    const upper = symbol.toUpperCase();

    if (upper.endsWith('.ST') || upper.endsWith(':STO')) {
        return 'swedish_stock';
    }

    if (upper.endsWith('USDT') || upper.endsWith('USD') || upper.endsWith('BTC')) {
        const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC'];
        const base = upper.replace(/USDT$|USD$|BTC$/, '');
        if (cryptoSymbols.includes(base)) {
            return 'crypto';
        }
    }

    const forexPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'DKK'];
    if (forexPairs.some((fx) => upper.includes(fx) && upper.includes('USD'))) {
        return 'forex';
    }

    return 'us_stock';
}

async function fetchCryptoQuote(symbol: string): Promise<UnifiedQuote> {
    const cleanSymbol = symbol.toUpperCase().replace('USDT', '');

    try {
        const [price, change24h] = await Promise.all([
            fetchCurrentPrice(cleanSymbol),
            fetch24hChange(cleanSymbol),
        ]);

        return {
            symbol: cleanSymbol,
            price,
            change: change24h.priceChange,
            changePercent: change24h.priceChangePercent,
            open: null,
            high: change24h.high,
            low: change24h.low,
            volume: change24h.volume,
            source: 'binance',
            assetType: 'crypto',
            timestamp: new Date(),
        };
    } catch (binanceError) {
        console.warn(`Binance failed for ${symbol}, trying CoinGecko:`, binanceError);

        const cgPrice = await fetchCryptoPriceBySymbol(cleanSymbol);
        const markets = await fetchCryptoMarkets('usd', undefined, 100);
        const market = markets.find((m) => m.symbol === cleanSymbol);

        return {
            symbol: cleanSymbol,
            price: cgPrice,
            change: market?.priceChange24h ?? 0,
            changePercent: market?.priceChangePercent24h ?? 0,
            open: null,
            high: market?.high24h ?? null,
            low: market?.low24h ?? null,
            volume: market?.volume24h ?? null,
            source: 'coingecko',
            assetType: 'crypto',
            timestamp: new Date(),
        };
    }
}

async function fetchUSStockQuote(symbol: string): Promise<UnifiedQuote> {
    try {
        const tiingoData = await fetchTiingoPrice(symbol);

        return {
            symbol: tiingoData.ticker,
            price: tiingoData.price,
            change: tiingoData.change,
            changePercent: tiingoData.changePercent,
            open: tiingoData.open,
            high: tiingoData.high,
            low: tiingoData.low,
            volume: tiingoData.volume,
            source: 'tiingo',
            assetType: 'us_stock',
            timestamp: tiingoData.timestamp ? new Date(tiingoData.timestamp) : new Date(),
        };
    } catch (tiingoError) {
        console.warn(`Tiingo failed for ${symbol}, trying Twelve Data:`, tiingoError);

        const tdData = await fetchTwelveDataQuote(symbol);

        return {
            symbol: tdData.symbol,
            price: tdData.price,
            change: tdData.change,
            changePercent: tdData.changePercent,
            open: tdData.open,
            high: tdData.high,
            low: tdData.low,
            volume: tdData.volume,
            source: 'twelvedata',
            assetType: 'us_stock',
            timestamp: new Date(tdData.datetime),
        };
    }
}

async function fetchSwedishStockQuote(symbol: string): Promise<UnifiedQuote> {
    const cleanSymbol = symbol.replace('.ST', '').replace(':STO', '');

    // Try Avanza Python backend first (for real-time Swedish data)
    try {
        const avanzaUrl = import.meta.env.VITE_AVANZA_BACKEND_URL;
        if (avanzaUrl) {
            const response = await fetch(`${avanzaUrl}/get_stock_quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: cleanSymbol }),
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    symbol: data.symbol,
                    price: data.price,
                    change: data.change,
                    changePercent: data.changePercent,
                    open: data.open,
                    high: data.high,
                    low: data.low,
                    volume: data.volume,
                    source: 'avanza',
                    assetType: 'swedish_stock',
                    timestamp: new Date(data.timestamp),
                };
            }
        }
    } catch (avanzaError) {
        console.warn(`Avanza backend failed for ${symbol}, trying Twelve Data:`, avanzaError);
    }

    // Fallback to Twelve Data
    try {
        const tdData = await fetchTwelveDataQuote(`${cleanSymbol}:XSTO`);

        return {
            symbol: cleanSymbol,
            price: tdData.price,
            change: tdData.change,
            changePercent: tdData.changePercent,
            open: tdData.open,
            high: tdData.high,
            low: tdData.low,
            volume: tdData.volume,
            source: 'twelvedata',
            assetType: 'swedish_stock',
            timestamp: new Date(tdData.datetime),
        };
    } catch {
        throw new Error(`Swedish stock data unavailable. Configure VITE_AVANZA_BACKEND_URL or Twelve Data API key. Symbol: ${symbol}`);
    }
}

async function fetchForexQuote(base: string, quote: string): Promise<UnifiedQuote> {
    const rates = await fetchLatestRates(base, [quote]);
    const rate = rates.find((r) => r.quote === quote);

    if (!rate) {
        throw new Error(`Forex pair ${base}/${quote} not found`);
    }

    return {
        symbol: `${base}/${quote}`,
        price: rate.rate,
        change: 0,
        changePercent: 0,
        open: null,
        high: null,
        low: null,
        volume: null,
        source: 'frankfurter',
        assetType: 'forex',
        timestamp: new Date(rate.date),
    };
}

export async function fetchUnifiedQuote(symbol: string): Promise<UnifiedQuote> {
    const assetType = detectAssetType(symbol);

    switch (assetType) {
        case 'crypto':
            return fetchCryptoQuote(symbol);
        case 'us_stock':
            return fetchUSStockQuote(symbol);
        case 'swedish_stock':
            return fetchSwedishStockQuote(symbol);
        case 'forex': {
            const parts = symbol.replace('/', '').match(/([A-Z]{3})([A-Z]{3})/);
            if (parts) {
                return fetchForexQuote(parts[1], parts[2]);
            }
            throw new Error(`Invalid forex symbol: ${symbol}`);
        }
        default:
            throw new Error(`Unknown asset type for symbol: ${symbol}`);
    }
}

export async function fetchUnifiedHistory(
    symbol: string,
    days: number = 30
): Promise<UnifiedCandle[]> {
    const assetType = detectAssetType(symbol);

    switch (assetType) {
        case 'crypto': {
            const data = await fetchHistoricalData({
                symbol,
                interval: '1d',
                limit: days,
            });
            return data.map((d) => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume,
            }));
        }
        case 'us_stock': {
            try {
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const data = await fetchTiingoEOD(symbol, startDate, endDate);
                return data.map((d) => ({
                    time: new Date(d.date).getTime() / 1000,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume,
                }));
            } catch {
                const data = await fetchTwelveDataTimeSeries(symbol, '1day', days);
                return data.map((d) => ({
                    time: new Date(d.datetime).getTime() / 1000,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume,
                }));
            }
        }
        case 'swedish_stock': {
            const cleanSymbol = symbol.replace('.ST', '').replace(':STO', '');
            const data = await fetchTwelveDataTimeSeries(`${cleanSymbol}:XSTO`, '1day', days);
            return data.map((d) => ({
                time: new Date(d.datetime).getTime() / 1000,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume,
            }));
        }
        default:
            return [];
    }
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Map<string, UnifiedQuote>> {
    const results = new Map<string, UnifiedQuote>();

    const promises = symbols.map(async (symbol) => {
        try {
            const quote = await fetchUnifiedQuote(symbol);
            results.set(symbol, quote);
        } catch (error) {
            console.error(`Failed to fetch ${symbol}:`, error);
        }
    });

    await Promise.allSettled(promises);
    return results;
}

export { detectAssetType };
