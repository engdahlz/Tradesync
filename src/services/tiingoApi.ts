import { z } from 'zod';

const TIINGO_API = 'https://api.tiingo.com';

const TiingoPriceSchema = z.object({
    ticker: z.string(),
    timestamp: z.string().nullable(),
    quoteTimestamp: z.string().nullable(),
    lastSaleTimestamp: z.string().nullable(),
    last: z.number().nullable(),
    lastSize: z.number().nullable().optional(),
    tngoLast: z.number(),
    prevClose: z.number(),
    open: z.number().nullable(),
    high: z.number().nullable(),
    low: z.number().nullable(),
    mid: z.number().nullable(),
    volume: z.number().nullable(),
    bidSize: z.number().nullable().optional(),
    bidPrice: z.number().nullable().optional(),
    askSize: z.number().nullable().optional(),
    askPrice: z.number().nullable().optional(),
});

const TiingoEODSchema = z.object({
    date: z.string(),
    close: z.number(),
    high: z.number(),
    low: z.number(),
    open: z.number(),
    volume: z.number(),
    adjClose: z.number(),
    adjHigh: z.number(),
    adjLow: z.number(),
    adjOpen: z.number(),
    adjVolume: z.number(),
    divCash: z.number(),
    splitFactor: z.number(),
});

const TiingoMetaSchema = z.object({
    ticker: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    exchangeCode: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
});

export interface TiingoPrice {
    ticker: string;
    price: number;
    prevClose: number;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    change: number;
    changePercent: number;
    timestamp: string | null;
}

export interface TiingoEOD {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjClose: number;
}

export interface TiingoMeta {
    ticker: string;
    name: string;
    description: string | null;
    exchange: string;
    startDate: string | null;
    endDate: string | null;
}

function getApiKey(): string {
    const key = import.meta.env.VITE_TIINGO_API_KEY;
    if (!key) {
        throw new Error('VITE_TIINGO_API_KEY not configured');
    }
    return key;
}

export async function fetchTiingoPrice(ticker: string): Promise<TiingoPrice> {
    const apiKey = getApiKey();
    const url = `${TIINGO_API}/iex/${ticker}?token=${apiKey}`;

    const response = await fetch(url);

    if (response.status === 429) {
        throw new Error('Tiingo rate limit exceeded (50/hour, 1000/day)');
    }

    if (!response.ok) {
        throw new Error(`Tiingo API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error(`No data found for ${ticker}`);
    }

    const validation = TiingoPriceSchema.safeParse(rawData[0]);
    if (!validation.success) {
        console.error('Tiingo validation error:', validation.error);
        throw new Error('Invalid Tiingo price format');
    }

    const data = validation.data;
    const price = data.tngoLast;
    const change = price - data.prevClose;
    const changePercent = (change / data.prevClose) * 100;

    return {
        ticker: data.ticker,
        price,
        prevClose: data.prevClose,
        open: data.open,
        high: data.high,
        low: data.low,
        volume: data.volume,
        change,
        changePercent,
        timestamp: data.timestamp,
    };
}

export async function fetchTiingoEOD(
    ticker: string,
    startDate?: string,
    endDate?: string
): Promise<TiingoEOD[]> {
    const apiKey = getApiKey();
    let url = `${TIINGO_API}/tiingo/daily/${ticker}/prices?token=${apiKey}`;

    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Tiingo API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = z.array(TiingoEODSchema).safeParse(rawData);

    if (!validation.success) {
        console.error('Tiingo EOD validation error:', validation.error);
        return [];
    }

    return validation.data.map((d) => ({
        date: d.date,
        open: d.adjOpen,
        high: d.adjHigh,
        low: d.adjLow,
        close: d.adjClose,
        volume: d.adjVolume,
        adjClose: d.adjClose,
    }));
}

export async function fetchTiingoMeta(ticker: string): Promise<TiingoMeta> {
    const apiKey = getApiKey();
    const url = `${TIINGO_API}/tiingo/daily/${ticker}?token=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Tiingo API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = TiingoMetaSchema.safeParse(rawData);

    if (!validation.success) {
        throw new Error('Invalid Tiingo meta format');
    }

    const data = validation.data;
    return {
        ticker: data.ticker,
        name: data.name,
        description: data.description,
        exchange: data.exchangeCode,
        startDate: data.startDate,
        endDate: data.endDate,
    };
}

export async function fetchTiingoBatchPrices(tickers: string[]): Promise<TiingoPrice[]> {
    const results: TiingoPrice[] = [];

    for (const ticker of tickers) {
        try {
            const price = await fetchTiingoPrice(ticker);
            results.push(price);
        } catch (error) {
            console.error(`Failed to fetch ${ticker}:`, error);
        }
    }

    return results;
}
