import { z } from 'zod';

const MARKETAUX_API = 'https://api.marketaux.com/v1';

const MarketAuxArticleSchema = z.object({
    uuid: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    snippet: z.string().nullable(),
    url: z.string(),
    image_url: z.string().nullable(),
    published_at: z.string(),
    source: z.string(),
    relevance_score: z.number().nullable().optional(),
    entities: z.array(
        z.object({
            symbol: z.string(),
            name: z.string(),
            exchange: z.string().nullable().optional(),
            exchange_long: z.string().nullable().optional(),
            country: z.string().nullable().optional(),
            type: z.string().nullable().optional(),
            industry: z.string().nullable().optional(),
            match_score: z.number().nullable().optional(),
            sentiment_score: z.number().nullable().optional(),
            highlights: z.array(
                z.object({
                    highlight: z.string(),
                    sentiment: z.number().nullable().optional(),
                    highlighted_in: z.string().nullable().optional(),
                })
            ).optional(),
        })
    ).optional(),
});

const MarketAuxResponseSchema = z.object({
    meta: z.object({
        found: z.number(),
        returned: z.number(),
        limit: z.number(),
        page: z.number(),
    }),
    data: z.array(MarketAuxArticleSchema),
});

export interface MarketAuxArticle {
    id: string;
    title: string;
    description: string;
    url: string;
    imageUrl: string | null;
    publishedAt: string;
    relativeTime: string;
    source: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    sentimentScore: number;
    relevanceScore: number;
    entities: Array<{
        symbol: string;
        name: string;
        sentimentScore: number;
    }>;
}

function getApiKey(): string {
    const key = import.meta.env.VITE_MARKETAUX_API_KEY;
    if (!key) {
        throw new Error('VITE_MARKETAUX_API_KEY not configured');
    }
    return key;
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function scoresToSentiment(score: number): 'bullish' | 'bearish' | 'neutral' {
    if (score > 0.15) return 'bullish';
    if (score < -0.15) return 'bearish';
    return 'neutral';
}

export async function fetchMarketAuxNews(options: {
    symbols?: string[];
    filter_entities?: boolean;
    limit?: number;
    language?: string;
    countries?: string[];
} = {}): Promise<MarketAuxArticle[]> {
    const apiKey = getApiKey();
    const {
        symbols,
        filter_entities = true,
        limit = 10,
        language = 'en',
        countries,
    } = options;

    let url = `${MARKETAUX_API}/news/all?api_token=${apiKey}&language=${language}&limit=${limit}`;

    if (symbols && symbols.length > 0) {
        url += `&symbols=${symbols.join(',')}`;
    }

    if (filter_entities) {
        url += '&filter_entities=true';
    }

    if (countries && countries.length > 0) {
        url += `&countries=${countries.join(',')}`;
    }

    const response = await fetch(url);

    if (response.status === 429) {
        throw new Error('MarketAux rate limit exceeded (100/day free tier)');
    }

    if (!response.ok) {
        throw new Error(`MarketAux API error: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.error) {
        throw new Error(rawData.error.message || 'MarketAux error');
    }

    const validation = MarketAuxResponseSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('MarketAux validation error:', validation.error);
        return [];
    }

    return validation.data.data.map((article) => {
        const entities = article.entities || [];
        const avgSentiment = entities.length > 0
            ? entities.reduce((sum, e) => sum + (e.sentiment_score || 0), 0) / entities.length
            : 0;

        return {
            id: article.uuid,
            title: article.title,
            description: article.description || article.snippet || '',
            url: article.url,
            imageUrl: article.image_url,
            publishedAt: article.published_at,
            relativeTime: getRelativeTime(article.published_at),
            source: article.source,
            sentiment: scoresToSentiment(avgSentiment),
            sentimentScore: avgSentiment,
            relevanceScore: article.relevance_score || 0,
            entities: entities.map((e) => ({
                symbol: e.symbol,
                name: e.name,
                sentimentScore: e.sentiment_score || 0,
            })),
        };
    });
}

export async function fetchNewsForSymbol(symbol: string, limit: number = 5): Promise<MarketAuxArticle[]> {
    return fetchMarketAuxNews({
        symbols: [symbol],
        limit,
        filter_entities: true,
    });
}

export async function fetchSwedishNews(limit: number = 10): Promise<MarketAuxArticle[]> {
    return fetchMarketAuxNews({
        countries: ['se'],
        limit,
        filter_entities: true,
    });
}

export async function fetchCryptoNews(limit: number = 10): Promise<MarketAuxArticle[]> {
    return fetchMarketAuxNews({
        symbols: ['BTCUSD', 'ETHUSD'],
        limit,
        filter_entities: true,
    });
}
