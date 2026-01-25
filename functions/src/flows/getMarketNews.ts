
import type { Request, Response } from 'express';
import { z } from 'zod';
import YahooFinance from 'yahoo-finance2';
import { fetchMarketAuxNews } from '../services/marketAuxService.js';
import { TtlCache } from '../services/cache.js';
const yahooFinance = new YahooFinance();

export interface NewsItem {
    title: string;
    url: string;
    summary: string;
    source: string;
    time_published: string;
    publishedAt: string; // Alias for frontend compatibility
    authors?: string[];
    sentiment: string;
    sentiment_score: number;
    sentimentScore: number; // Alias for frontend compatibility
    imageUrl?: string | null;
}

const newsCacheTtl = Number(process.env.NEWS_CACHE_TTL_SECONDS ?? 120) * 1000;
const newsCacheMax = Number(process.env.NEWS_CACHE_MAX ?? 200);
const newsCache = new TtlCache<NewsItem[]>({ maxSize: newsCacheMax, ttlMs: newsCacheTtl });

function sentimentLabel(score: number): string {
    if (score >= 0.25) return 'Bullish';
    if (score <= -0.25) return 'Bearish';
    return 'Neutral';
}

function normalizeTickers(tickers: string): string[] {
    if (!tickers || tickers.trim() === '') return ['BTC', 'ETH'];
    return tickers
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
}

export async function fetchMarketNews(tickers: string, limit: number = 50, sort: string = 'LATEST'): Promise<NewsItem[]> {
    // Default to major crypto if no tickers provided
    const tickerList = normalizeTickers(tickers);
    const cacheKey = `${tickerList.join(',')}:${limit}:${sort}`;
    const cached = newsCache.get(cacheKey);
    if (cached) return cached;

    console.log(`Fetching market news for: ${tickerList.join(',')}`);
    let allNews: NewsItem[] = [];
    const provider = (process.env.MARKET_NEWS_PROVIDER || 'yahoo').toLowerCase();

    if (provider === 'marketaux' && process.env.MARKETAUX_API_TOKEN) {
        try {
            const marketAux = await fetchMarketAuxNews({ symbols: tickerList, limit });
            allNews = marketAux.map(item => ({
                title: item.title,
                url: item.url,
                summary: item.description || item.title,
                source: item.source,
                time_published: item.publishedAt,
                publishedAt: item.publishedAt,
                authors: [],
                sentiment: sentimentLabel(item.sentimentScore),
                sentiment_score: item.sentimentScore,
                sentimentScore: item.sentimentScore,
                imageUrl: item.imageUrl,
            }));
        } catch (error) {
            console.warn('MarketAux fetch failed, falling back to Yahoo:', error);
        }
    }

    if (allNews.length === 0) {
        for (const ticker of tickerList) {
            // Yahoo Finance expects clean symbols like "BTC-USD" or just "BTC"
            const cleanTicker = ticker.replace('CRYPTO:', '');
            
            try {
                const results: any = await yahooFinance.search(cleanTicker, { newsCount: 10 });
                if (results.news && Array.isArray(results.news)) {
                    const mapped: NewsItem[] = results.news.map((item: any) => {
                        const publishTime = item.providerPublishTime ? new Date(item.providerPublishTime).toISOString() : new Date().toISOString();
                        return {
                            title: item.title,
                            url: item.link,
                            summary: item.title, // Yahoo search news often lacks summary, use title
                            source: 'Yahoo Finance',
                            time_published: publishTime,
                            publishedAt: publishTime, // Alias for compatibility
                            authors: item.publisher ? [item.publisher] : [],
                            sentiment: 'Neutral',
                            sentiment_score: 0,
                            sentimentScore: 0, // Alias for compatibility
                            imageUrl: null
                        };
                    });
                    allNews = [...allNews, ...mapped];
                }
            } catch (error) {
                console.error(`Yahoo Finance search error for ${ticker}:`, error);
            }
        }
    }

    // Sort by time_published descending (latest first) if sort is 'LATEST'
    if (sort === 'LATEST') {
        allNews.sort((a, b) => new Date(b.time_published).getTime() - new Date(a.time_published).getTime());
    }

    const sliced = allNews.slice(0, limit);
    newsCache.set(cacheKey, sliced);
    return sliced;
}

const GetMarketNewsInputSchema = z.object({
    tickers: z.string().optional(),
    limit: z.number().optional(),
    sort: z.string().optional(),
});

export async function handleGetMarketNews(req: Request, res: Response) {
    try {
        const inputResult = GetMarketNewsInputSchema.safeParse(req.body);

        if (!inputResult.success) {
            console.error('getMarketNews input validation error:', inputResult.error);
            res.status(400).json({ news: [], error: 'Invalid input parameters' });
            return;
        }

        const { tickers, limit, sort } = inputResult.data;

        const news = await fetchMarketNews(tickers || '', limit, sort);
        res.json({ news });
    } catch (error: unknown) {
        console.error('getMarketNews error:', error);
        // Fail gracefully with empty list instead of 500
        res.json({ news: [], error: String(error) });
    }
}
