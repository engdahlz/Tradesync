
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ALPHA_VANTAGE_API_KEY } from '../config.js';

const AlphaVantageNewsItemSchema = z.object({
    title: z.string(),
    url: z.string(),
    summary: z.string().optional(),
    source: z.string(),
    time_published: z.string(),
    overall_sentiment_label: z.string(),
    overall_sentiment_score: z.number().or(z.string().transform(val => parseFloat(val))),
    banner_image: z.string().optional().nullable(),
    topics: z.array(z.object({
        topic: z.string(),
        relevance_score: z.string()
    })).optional()
});

const AlphaVantageResponseSchema = z.object({
    feed: z.array(AlphaVantageNewsItemSchema).optional(),
    Information: z.string().optional(),
    Note: z.string().optional(),
    "Error Message": z.string().optional()
});

interface NewsItem {
    title: string;
    url: string;
    summary: string;
    source: string;
    publishedAt: string;
    sentiment: string;
    sentimentScore: number | string;
    imageUrl?: string | null;
    topics?: { topic: string; relevance_score: string }[];
}

export async function fetchMarketNews(tickers: string, limit: number = 50, sort: string = 'LATEST'): Promise<NewsItem[]> {
    // Default to major crypto if no tickers provided for "general" news
    if (!tickers || tickers.trim() === '') {
        tickers = 'CRYPTO:BTC,CRYPTO:ETH';
    }

    console.log(`Fetching market news for: ${tickers}`);
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickers}&limit=${limit}&sort=${sort}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    const response = await fetch(url);
    const rawData = await response.json();

    const validation = AlphaVantageResponseSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('Alpha Vantage Schema Validation Error:', validation.error);
        return [];
    }

    const data = validation.data;

    if (data.Information) {
        console.warn('Alpha Vantage API Information:', data.Information);
        return [];
    }

    if (data.Note) {
        console.warn('Alpha Vantage API Note:', data.Note);
        throw new Error(`API Limit: ${data.Note}`);
    }

    if (data["Error Message"]) {
         console.warn('Alpha Vantage API Error:', data["Error Message"]);
         return [];
    }

    let newsItems: NewsItem[] = [];
    if (data.feed && Array.isArray(data.feed)) {
        newsItems = data.feed.map((item) => ({
            title: item.title,
            url: item.url,
            summary: item.summary || '',
            source: item.source,
            publishedAt: item.time_published,
            sentiment: item.overall_sentiment_label,
            sentimentScore: item.overall_sentiment_score,
            imageUrl: item.banner_image,
            topics: item.topics
        }));
    } else {
        console.warn('Unexpected API response structure:', JSON.stringify(data));
    }
    return newsItems;
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
