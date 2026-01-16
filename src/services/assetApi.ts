
/**
 * Asset API Service
 * Fetches top crypto assets via CoinCap API
 */

import { z } from 'zod';

export interface Asset {
    id: string; // e.g. "bitcoin"
    rank: string; // "1"
    symbol: string; // "BTC"
    name: string; // "Bitcoin"
    priceUsd: string;
    changePercent24Hr: string;
}

const CoinCapAssetSchema = z.object({
    id: z.string(),
    rank: z.string(),
    symbol: z.string(),
    name: z.string(),
    priceUsd: z.string(),
    changePercent24Hr: z.string().optional() // API might omit if 0 change? safe to make optional or default
});

const CoinCapResponseSchema = z.object({
    data: z.array(CoinCapAssetSchema),
    timestamp: z.number().optional()
});

const COINCAP_API = 'https://api.coincap.io/v2';

/**
 * Fetch top N assets by market cap
 */
export async function fetchTopAssets(limit: number = 10): Promise<Asset[]> {
    try {
        const response = await fetch(`${COINCAP_API}/assets?limit=${limit}`);

        if (!response.ok) {
            throw new Error(`CoinCap API error: ${response.status}`);
        }

        const json = await response.json();
        
        const validation = CoinCapResponseSchema.safeParse(json);
        if (!validation.success) {
             console.error('CoinCap Validation Error:', validation.error);
             return [];
        }

        // Map to ensure interface compliance (in case Zod schema allows optional fields that interface doesn't)
        return validation.data.data.map(asset => ({
            id: asset.id,
            rank: asset.rank,
            symbol: asset.symbol,
            name: asset.name,
            priceUsd: asset.priceUsd,
            changePercent24Hr: asset.changePercent24Hr || '0'
        }));
    } catch (error) {
        console.error('Failed to fetch top assets:', error);
        return [];
    }
}

/**
 * Helper to map CoinCap symbol to Binance USDT pair
 */
export function toBinanceSymbol(assetSymbol: string): string {
    return `${assetSymbol.toUpperCase()}USDT`;
}
