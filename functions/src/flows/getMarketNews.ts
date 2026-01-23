
import type { Request, Response } from 'express';
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';

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

export async function fetchMarketNews(tickers: string, limit: number = 50, sort: string = 'LATEST'): Promise<NewsItem[]> {
    // Default to major crypto if no tickers provided
    if (!tickers || tickers.trim() === '') {
        tickers = 'BTC,ETH';
    }

    console.log(`Fetching market news for: ${tickers}`);
    const tickerList = tickers.split(',').map(t => t.trim());
    let allNews: NewsItem[] = [];

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

    // Sort by time_published descending (latest first) if sort is 'LATEST'
    if (sort === 'LATEST') {
        allNews.sort((a, b) => new Date(b.time_published).getTime() - new Date(a.time_published).getTime());
    }

    return allNews.slice(0, limit);
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
