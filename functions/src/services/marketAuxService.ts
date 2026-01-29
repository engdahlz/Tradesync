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
            sentiment_score: z.number().nullable().optional(),
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
    error: z.object({
        code: z.string(),
        message: z.string()
    }).optional()
});

export interface MarketAuxArticle {
    id: string;
    title: string;
    description: string;
    url: string;
    imageUrl: string | null;
    publishedAt: string;
    source: string;
    sentimentScore: number;
    relevanceScore: number;
}

function getApiKey(): string {
    // Check .env
    const key = process.env.MARKETAUX_API_TOKEN;
    if (!key) {
        throw new Error('MARKETAUX_API_TOKEN not configured in functions/.env');
    }
    return key;
}

export async function fetchMarketAuxNews(options: {
    symbols?: string[];
    filter_entities?: boolean;
    limit?: number;
    language?: string;
} = {}): Promise<MarketAuxArticle[]> {
    const apiKey = getApiKey();
    const {
        symbols,
        filter_entities = true,
        limit = 5,
        language = 'en',
    } = options;

    let url = `${MARKETAUX_API}/news/all?api_token=${apiKey}&language=${language}&limit=${limit}`;

    if (symbols && symbols.length > 0) {
        url += `&symbols=${symbols.join(',')}`;
    }

    if (filter_entities) {
        url += '&filter_entities=true';
    }

    const response = await fetch(url);

    if (response.status === 429) {
        throw new Error('MarketAux rate limit exceeded (100/day free tier)');
    }

    if (!response.ok) {
        throw new Error(`MarketAux API error: ${response.status}`);
    }

    const rawData: any = await response.json();

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
            source: article.source,
            sentimentScore: avgSentiment,
            relevanceScore: article.relevance_score || 0,
        };
    });
}
