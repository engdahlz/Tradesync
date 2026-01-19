import { z } from 'zod';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const CoinMarketDataSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    image: z.string().optional(),
    current_price: z.number().nullable(),
    market_cap: z.number().nullable(),
    market_cap_rank: z.number().nullable(),
    fully_diluted_valuation: z.number().nullable().optional(),
    total_volume: z.number().nullable(),
    high_24h: z.number().nullable(),
    low_24h: z.number().nullable(),
    price_change_24h: z.number().nullable(),
    price_change_percentage_24h: z.number().nullable(),
    market_cap_change_24h: z.number().nullable().optional(),
    market_cap_change_percentage_24h: z.number().nullable().optional(),
    circulating_supply: z.number().nullable().optional(),
    total_supply: z.number().nullable().optional(),
    max_supply: z.number().nullable().optional(),
    ath: z.number().nullable().optional(),
    ath_change_percentage: z.number().nullable().optional(),
    ath_date: z.string().nullable().optional(),
    atl: z.number().nullable().optional(),
    atl_change_percentage: z.number().nullable().optional(),
    atl_date: z.string().nullable().optional(),
    last_updated: z.string().nullable().optional(),
});

const CoinMarketsResponseSchema = z.array(CoinMarketDataSchema);

const SimplePriceSchema = z.record(
    z.string(),
    z.record(z.string(), z.number())
);

export interface CryptoMarketData {
    id: string;
    symbol: string;
    name: string;
    image?: string;
    currentPrice: number;
    marketCap: number;
    marketCapRank: number | null;
    volume24h: number;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    lastUpdated: string | null;
}

export interface SimplePrice {
    [coinId: string]: {
        [currency: string]: number;
    };
}

const SYMBOL_TO_ID: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    XRP: 'ripple',
    ADA: 'cardano',
    DOGE: 'dogecoin',
    DOT: 'polkadot',
    LINK: 'chainlink',
    AVAX: 'avalanche-2',
    MATIC: 'matic-network',
    UNI: 'uniswap',
    ATOM: 'cosmos',
    LTC: 'litecoin',
};

export function symbolToCoinGeckoId(symbol: string): string {
    const upper = symbol.toUpperCase().replace('USDT', '');
    return SYMBOL_TO_ID[upper] || upper.toLowerCase();
}

export async function fetchCryptoMarkets(
    vsCurrency: string = 'usd',
    ids?: string[],
    perPage: number = 50
): Promise<CryptoMarketData[]> {
    let url = `${COINGECKO_API}/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=false`;

    if (ids && ids.length > 0) {
        url += `&ids=${ids.join(',')}`;
    }

    const response = await fetch(url);

    if (response.status === 429) {
        throw new Error('CoinGecko rate limit exceeded. Try again in 1 minute.');
    }

    if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = CoinMarketsResponseSchema.safeParse(rawData);

    if (!validation.success) {
        console.error('CoinGecko validation error:', validation.error);
        return [];
    }

    return validation.data.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price ?? 0,
        marketCap: coin.market_cap ?? 0,
        marketCapRank: coin.market_cap_rank,
        volume24h: coin.total_volume ?? 0,
        high24h: coin.high_24h ?? 0,
        low24h: coin.low_24h ?? 0,
        priceChange24h: coin.price_change_24h ?? 0,
        priceChangePercent24h: coin.price_change_percentage_24h ?? 0,
        lastUpdated: coin.last_updated ?? null,
    }));
}

export async function fetchSimplePrice(
    ids: string[],
    vsCurrencies: string[] = ['usd']
): Promise<SimplePrice> {
    const url = `${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=${vsCurrencies.join(',')}`;

    const response = await fetch(url);

    if (response.status === 429) {
        throw new Error('CoinGecko rate limit exceeded');
    }

    if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = SimplePriceSchema.safeParse(rawData);

    if (!validation.success) {
        throw new Error('Invalid CoinGecko simple price format');
    }

    return validation.data;
}

export async function fetchCryptoPriceBySymbol(symbol: string): Promise<number> {
    const coinId = symbolToCoinGeckoId(symbol);
    const prices = await fetchSimplePrice([coinId], ['usd']);

    if (!prices[coinId] || prices[coinId].usd === undefined) {
        throw new Error(`Price not found for ${symbol}`);
    }

    return prices[coinId].usd;
}

export async function fetchTopCryptos(limit: number = 20): Promise<CryptoMarketData[]> {
    return fetchCryptoMarkets('usd', undefined, limit);
}
