import { z } from 'zod';

const FRANKFURTER_API = 'https://api.frankfurter.dev';

const RatesSchema = z.record(z.string(), z.number());

const LatestRatesResponseSchema = z.object({
    amount: z.number(),
    base: z.string(),
    date: z.string(),
    rates: RatesSchema,
});

const HistoricalRatesResponseSchema = z.object({
    amount: z.number(),
    base: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    rates: z.record(z.string(), RatesSchema),
});

const CurrenciesResponseSchema = z.record(z.string(), z.string());

export interface ForexRate {
    currency: string;
    rate: number;
    change24h?: number;
    changePercent24h?: number;
}

export interface ForexPair {
    base: string;
    quote: string;
    rate: number;
    date: string;
}

export async function fetchLatestRates(
    base: string = 'USD',
    symbols?: string[]
): Promise<ForexPair[]> {
    let url = `${FRANKFURTER_API}/v1/latest?base=${base}`;
    if (symbols && symbols.length > 0) {
        url += `&symbols=${symbols.join(',')}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = LatestRatesResponseSchema.safeParse(rawData);

    if (!validation.success) {
        throw new Error('Invalid Frankfurter response format');
    }

    const data = validation.data;
    return Object.entries(data.rates).map(([currency, rate]) => ({
        base: data.base,
        quote: currency,
        rate,
        date: data.date,
    }));
}

export async function fetchHistoricalRates(
    base: string,
    startDate: string,
    endDate: string,
    symbols?: string[]
): Promise<Record<string, ForexPair[]>> {
    let url = `${FRANKFURTER_API}/v1/${startDate}..${endDate}?base=${base}`;
    if (symbols && symbols.length > 0) {
        url += `&symbols=${symbols.join(',')}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = HistoricalRatesResponseSchema.safeParse(rawData);

    if (!validation.success) {
        throw new Error('Invalid Frankfurter historical response format');
    }

    const data = validation.data;
    const result: Record<string, ForexPair[]> = {};

    for (const [date, rates] of Object.entries(data.rates)) {
        result[date] = Object.entries(rates).map(([currency, rate]) => ({
            base: data.base,
            quote: currency,
            rate,
            date,
        }));
    }

    return result;
}

export async function fetchAvailableCurrencies(): Promise<Record<string, string>> {
    const response = await fetch(`${FRANKFURTER_API}/v1/currencies`);
    if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = CurrenciesResponseSchema.safeParse(rawData);

    if (!validation.success) {
        throw new Error('Invalid currencies response format');
    }

    return validation.data;
}

export async function convertCurrency(
    amount: number,
    from: string,
    to: string
): Promise<{ amount: number; rate: number; date: string }> {
    const url = `${FRANKFURTER_API}/v1/latest?base=${from}&symbols=${to}&amount=${amount}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = LatestRatesResponseSchema.safeParse(rawData);

    if (!validation.success) {
        throw new Error('Invalid conversion response format');
    }

    const data = validation.data;
    const rate = data.rates[to];

    if (rate === undefined) {
        throw new Error(`Currency ${to} not found in response`);
    }

    return {
        amount: data.amount * rate,
        rate,
        date: data.date,
    };
}
