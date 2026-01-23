
import { z } from 'zod';

/**
 * Market News Service
 * Proxies requests to backend Firebase Function (Alpha Vantage)
 */

// Backend Function URL
// In development, we use the local emulator port 5001 with project ID 'tradesync-ai-prod'
const API_URL = 'https://us-central1-tradesync-ai-prod.cloudfunctions.net/getMarketNews';
// ? 'https://us-central1-tradesync-ai-prod.cloudfunctions.net/getMarketNews'
// : 'http://127.0.0.1:5001/tradesync-ai-prod/us-central1/getMarketNews';

export interface Topic {
    topic: string;
    relevance_score: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    url: string;
    summary: string;
    description: string; // Alias for summary
    source: string;
    publishedAt: string;
    relativeTime: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    sentimentScore?: number;
    imageUrl?: string;
    topics?: Topic[];
}

const TopicSchema = z.object({
    topic: z.string(),
    relevance_score: z.string()
});

const NewsArticleSchema = z.object({
    title: z.string(),
    url: z.string(),
    summary: z.string(),
    source: z.string(),
    publishedAt: z.string(),
    sentiment: z.string().optional(),
    sentimentScore: z.number().optional(),
    imageUrl: z.string().nullable().optional(),
    topics: z.array(TopicSchema).optional()
});

const GetMarketNewsResponseSchema = z.object({
    news: z.array(NewsArticleSchema),
    error: z.string().optional()
});

/**
 * Parse Alpha Vantage Date Format "YYYYMMDDTHHMMSS" -> Date object
 */
function parseAVDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // If it looks like an ISO date or already has separators, use standard constructor
    if (dateStr.includes('-') || dateStr.includes(':')) return new Date(dateStr);
    if (dateStr.length < 15) return new Date();
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1; // Months are 0-indexed
    const day = parseInt(dateStr.slice(6, 8));
    const hour = parseInt(dateStr.slice(9, 11));
    const minute = parseInt(dateStr.slice(11, 13));
    const second = parseInt(dateStr.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function getRelativeTime(date: Date): string {
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

export interface NewsResponse {
    articles: NewsArticle[];
    totalResults: number;
}

export async function fetchCryptoNews(options: {
    query?: string;
    pageSize?: number;
} = {}): Promise<NewsResponse> {
    const { query = 'CRYPTO:BTC,CRYPTO:ETH', pageSize = 20 } = options;

    try {
        const tickers = query.includes('crypto') || query.includes('bitcoin')
            ? 'CRYPTO:BTC,CRYPTO:ETH'
            : 'CRYPTO:BTC';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers, limit: pageSize })
        });

        if (!response.ok) {
            // Fallback for dev if backend not running?
            console.warn('Backend news fetch failed, check local functions.');
            throw new Error(`Backend error: ${response.status}`);
        }

        const rawData = await response.json();
        
        const validation = GetMarketNewsResponseSchema.safeParse(rawData);
        if (!validation.success) {
             console.error('GetMarketNews Validation Error:', validation.error);
             return { articles: [], totalResults: 0 };
        }

        const data = validation.data;
        const rawArticles = data.news || [];

        const articles: NewsArticle[] = rawArticles.map((item, index) => {
            const date = parseAVDate(item.publishedAt);
            // Normalize sentiment: "Bullish" -> "bullish"
            let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
            if (item.sentiment) {
                const s = item.sentiment.toLowerCase();
                if (s.includes('bullish')) sentiment = 'bullish';
                else if (s.includes('bearish')) sentiment = 'bearish';
                else sentiment = 'neutral';
            }

            return {
                id: `news-${index}-${date.getTime()}`,
                title: item.title,
                url: item.url,
                summary: item.summary,
                description: item.summary,
                source: item.source || 'Alpha Vantage',
                publishedAt: date.toISOString(),
                relativeTime: getRelativeTime(date),
                sentiment: sentiment,
                sentimentScore: item.sentimentScore,
                imageUrl: item.imageUrl || undefined,
                topics: item.topics
            };
        });

        return {
            articles,
            totalResults: articles.length
        };
    } catch (error) {
        console.error('Failed to fetch market news:', error);
        return { articles: [], totalResults: 0 };
    }
}

export async function fetchTopHeadlines() {
    return fetchCryptoNews({ query: 'CRYPTO:BTC,CRYPTO:ETH', pageSize: 15 });
}
