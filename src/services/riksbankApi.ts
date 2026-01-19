import { z } from 'zod';

const RIKSBANK_API = 'https://api.riksbank.se/swea/v1';

const ObservationSchema = z.object({
    date: z.string(),
    value: z.string(),
});

const SeriesSchema = z.object({
    seriesId: z.string(),
    seriesName: z.string().optional(),
    observations: z.array(ObservationSchema),
});

const RiksbankResponseSchema = z.array(SeriesSchema);

export interface RiksbankObservation {
    date: string;
    value: number;
}

export interface RiksbankSeries {
    seriesId: string;
    name: string;
    observations: RiksbankObservation[];
}

export const RIKSBANK_SERIES = {
    POLICY_RATE: 'SECBREPOEFF',
    USD_SEK: 'SEKUSDPMI',
    EUR_SEK: 'SEKEURPMI',
    GBP_SEK: 'SEKGBPPMI',
    CPIF: 'KPIF',
    CPIF_EXCL_ENERGY: 'KPIFXE',
} as const;

export async function fetchRiksbankSeries(
    seriesIds: string[],
    fromDate?: string,
    toDate?: string
): Promise<RiksbankSeries[]> {
    const params = new URLSearchParams();
    seriesIds.forEach((id) => params.append('seriesId', id));

    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);

    const url = `${RIKSBANK_API}/observations?${params.toString()}`;

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Riksbank API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = RiksbankResponseSchema.safeParse(rawData);

    if (!validation.success) {
        console.error('Riksbank validation error:', validation.error);
        return [];
    }

    return validation.data.map((series) => ({
        seriesId: series.seriesId,
        name: series.seriesName || series.seriesId,
        observations: series.observations
            .filter((obs) => obs.value !== null && obs.value !== '')
            .map((obs) => ({
                date: obs.date,
                value: parseFloat(obs.value),
            })),
    }));
}

export async function fetchPolicyRate(): Promise<RiksbankObservation | null> {
    const series = await fetchRiksbankSeries([RIKSBANK_SERIES.POLICY_RATE]);

    if (series.length === 0 || series[0].observations.length === 0) {
        return null;
    }

    const observations = series[0].observations;
    return observations[observations.length - 1];
}

export async function fetchSEKExchangeRates(): Promise<{
    USD_SEK: number | null;
    EUR_SEK: number | null;
    GBP_SEK: number | null;
    date: string | null;
}> {
    const series = await fetchRiksbankSeries([
        RIKSBANK_SERIES.USD_SEK,
        RIKSBANK_SERIES.EUR_SEK,
        RIKSBANK_SERIES.GBP_SEK,
    ]);

    const getLatestValue = (seriesId: string): number | null => {
        const s = series.find((x) => x.seriesId === seriesId);
        if (!s || s.observations.length === 0) return null;
        return s.observations[s.observations.length - 1].value;
    };

    const getLatestDate = (): string | null => {
        for (const s of series) {
            if (s.observations.length > 0) {
                return s.observations[s.observations.length - 1].date;
            }
        }
        return null;
    };

    return {
        USD_SEK: getLatestValue(RIKSBANK_SERIES.USD_SEK),
        EUR_SEK: getLatestValue(RIKSBANK_SERIES.EUR_SEK),
        GBP_SEK: getLatestValue(RIKSBANK_SERIES.GBP_SEK),
        date: getLatestDate(),
    };
}

export async function fetchInflation(): Promise<{
    cpif: number | null;
    cpifExclEnergy: number | null;
    date: string | null;
}> {
    const series = await fetchRiksbankSeries([
        RIKSBANK_SERIES.CPIF,
        RIKSBANK_SERIES.CPIF_EXCL_ENERGY,
    ]);

    const getLatestValue = (seriesId: string): number | null => {
        const s = series.find((x) => x.seriesId === seriesId);
        if (!s || s.observations.length === 0) return null;
        return s.observations[s.observations.length - 1].value;
    };

    const getLatestDate = (): string | null => {
        for (const s of series) {
            if (s.observations.length > 0) {
                return s.observations[s.observations.length - 1].date;
            }
        }
        return null;
    };

    return {
        cpif: getLatestValue(RIKSBANK_SERIES.CPIF),
        cpifExclEnergy: getLatestValue(RIKSBANK_SERIES.CPIF_EXCL_ENERGY),
        date: getLatestDate(),
    };
}

export async function fetchMacroOverview(): Promise<{
    policyRate: number | null;
    usdSek: number | null;
    eurSek: number | null;
    cpif: number | null;
    lastUpdated: string | null;
}> {
    const [rateData, fxData, inflationData] = await Promise.all([
        fetchPolicyRate().catch(() => null),
        fetchSEKExchangeRates().catch(() => ({ USD_SEK: null, EUR_SEK: null, GBP_SEK: null, date: null })),
        fetchInflation().catch(() => ({ cpif: null, cpifExclEnergy: null, date: null })),
    ]);

    return {
        policyRate: rateData?.value ?? null,
        usdSek: fxData.USD_SEK,
        eurSek: fxData.EUR_SEK,
        cpif: inflationData.cpif,
        lastUpdated: rateData?.date ?? fxData.date ?? inflationData.date ?? null,
    };
}
