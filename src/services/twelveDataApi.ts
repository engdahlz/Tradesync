import { z } from 'zod';

const TWELVE_DATA_API = 'https://api.twelvedata.com';

const TDPriceSchema = z.object({
    symbol: z.string(),
    name: z.string().optional(),
    exchange: z.string().optional(),
    mic_code: z.string().optional(),
    currency: z.string().optional(),
    datetime: z.string(),
    timestamp: z.number().optional(),
    open: z.string(),
    high: z.string(),
    low: z.string(),
    close: z.string(),
    volume: z.string().optional(),
    previous_close: z.string().optional(),
    change: z.string().optional(),
    percent_change: z.string().optional(),
    is_market_open: z.boolean().optional(),
});

const TDTimeSeriesSchema = z.object({
    meta: z.object({
        symbol: z.string(),
        interval: z.string(),
        currency: z.string().optional(),
        exchange_timezone: z.string().optional(),
        exchange: z.string().optional(),
        mic_code: z.string().optional(),
        type: z.string().optional(),
    }),
    values: z.array(
        z.object({
            datetime: z.string(),
            open: z.string(),
            high: z.string(),
            low: z.string(),
            close: z.string(),
            volume: z.string().optional(),
        })
    ),
    status: z.string().optional(),
});

const TDIndicatorSchema = z.object({
    meta: z.object({
        symbol: z.string(),
        interval: z.string(),
        indicator: z.object({
            name: z.string(),
            series_type: z.string().optional(),
            time_period: z.number().optional(),
        }).optional(),
    }).optional(),
    values: z.array(z.record(z.string(), z.string().nullable())),
    status: z.string().optional(),
});

export interface TwelveDataPrice {
    symbol: string;
    price: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    previousClose: number;
    change: number;
    changePercent: number;
    datetime: string;
    isMarketOpen: boolean;
}

export interface TwelveDataCandle {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface TechnicalIndicator {
    datetime: string;
    value: number;
    [key: string]: string | number;
}

function getApiKey(): string {
    const key = import.meta.env.VITE_TWELVE_DATA_API_KEY;
    if (!key) {
        throw new Error('VITE_TWELVE_DATA_API_KEY not configured');
    }
    return key;
}

export async function fetchTwelveDataQuote(symbol: string): Promise<TwelveDataPrice> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/quote?symbol=${symbol}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (response.status === 429) {
        throw new Error('Twelve Data rate limit exceeded (8 credits/min)');
    }

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.code === 400 || rawData.status === 'error') {
        throw new Error(rawData.message || 'Twelve Data error');
    }

    const validation = TDPriceSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('Twelve Data validation error:', validation.error);
        throw new Error('Invalid Twelve Data quote format');
    }

    const data = validation.data;
    return {
        symbol: data.symbol,
        price: parseFloat(data.close),
        open: parseFloat(data.open),
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        volume: data.volume ? parseFloat(data.volume) : 0,
        previousClose: data.previous_close ? parseFloat(data.previous_close) : parseFloat(data.open),
        change: data.change ? parseFloat(data.change) : 0,
        changePercent: data.percent_change ? parseFloat(data.percent_change) : 0,
        datetime: data.datetime,
        isMarketOpen: data.is_market_open ?? false,
    };
}

export async function fetchTwelveDataTimeSeries(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '1h' | '4h' | '1day' | '1week' = '1day',
    outputSize: number = 30
): Promise<TwelveDataCandle[]> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputSize}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.code === 400 || rawData.status === 'error') {
        throw new Error(rawData.message || 'Twelve Data error');
    }

    const validation = TDTimeSeriesSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('Twelve Data time series validation error:', validation.error);
        return [];
    }

    return validation.data.values.map((v) => ({
        datetime: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: v.volume ? parseFloat(v.volume) : 0,
    }));
}

export async function fetchRSI(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 14,
    outputSize: number = 30
): Promise<TechnicalIndicator[]> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/rsi?symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&outputsize=${outputSize}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.status === 'error') {
        throw new Error(rawData.message || 'RSI fetch error');
    }

    const validation = TDIndicatorSchema.safeParse(rawData);
    if (!validation.success) {
        return [];
    }

    return validation.data.values.map((v) => ({
        datetime: v.datetime || '',
        value: v.rsi ? parseFloat(v.rsi) : 0,
    }));
}

export async function fetchMACD(
    symbol: string,
    interval: string = '1day',
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    outputSize: number = 30
): Promise<Array<{ datetime: string; macd: number; signal: number; histogram: number }>> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/macd?symbol=${symbol}&interval=${interval}&fast_period=${fastPeriod}&slow_period=${slowPeriod}&signal_period=${signalPeriod}&outputsize=${outputSize}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.status === 'error') {
        throw new Error(rawData.message || 'MACD fetch error');
    }

    const validation = TDIndicatorSchema.safeParse(rawData);
    if (!validation.success) {
        return [];
    }

    return validation.data.values.map((v) => ({
        datetime: v.datetime || '',
        macd: v.macd ? parseFloat(v.macd) : 0,
        signal: v.macd_signal ? parseFloat(v.macd_signal) : 0,
        histogram: v.macd_hist ? parseFloat(v.macd_hist) : 0,
    }));
}

export async function fetchBollingerBands(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    stdDev: number = 2,
    outputSize: number = 30
): Promise<Array<{ datetime: string; upper: number; middle: number; lower: number }>> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/bbands?symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&sd=${stdDev}&outputsize=${outputSize}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.status === 'error') {
        throw new Error(rawData.message || 'Bollinger Bands fetch error');
    }

    const validation = TDIndicatorSchema.safeParse(rawData);
    if (!validation.success) {
        return [];
    }

    return validation.data.values.map((v) => ({
        datetime: v.datetime || '',
        upper: v.upper_band ? parseFloat(v.upper_band) : 0,
        middle: v.middle_band ? parseFloat(v.middle_band) : 0,
        lower: v.lower_band ? parseFloat(v.lower_band) : 0,
    }));
}

export async function fetchSMA(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    outputSize: number = 30
): Promise<TechnicalIndicator[]> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/sma?symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&outputsize=${outputSize}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.status === 'error') {
        throw new Error(rawData.message || 'SMA fetch error');
    }

    const validation = TDIndicatorSchema.safeParse(rawData);
    if (!validation.success) {
        return [];
    }

    return validation.data.values.map((v) => ({
        datetime: v.datetime || '',
        value: v.sma ? parseFloat(v.sma) : 0,
    }));
}

export async function fetchEMA(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    outputSize: number = 30
): Promise<TechnicalIndicator[]> {
    const apiKey = getApiKey();
    const url = `${TWELVE_DATA_API}/ema?symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&outputsize=${outputSize}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.status === 'error') {
        throw new Error(rawData.message || 'EMA fetch error');
    }

    const validation = TDIndicatorSchema.safeParse(rawData);
    if (!validation.success) {
        return [];
    }

    return validation.data.values.map((v) => ({
        datetime: v.datetime || '',
        value: v.ema ? parseFloat(v.ema) : 0,
    }));
}
