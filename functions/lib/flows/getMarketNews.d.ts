import type { Request, Response } from 'express';
interface NewsItem {
    title: string;
    url: string;
    summary: string;
    source: string;
    publishedAt: string;
    sentiment: string;
    sentimentScore: number | string;
    imageUrl?: string | null;
    topics?: {
        topic: string;
        relevance_score: string;
    }[];
}
export declare function fetchMarketNews(tickers: string, limit?: number, sort?: string): Promise<NewsItem[]>;
export declare function handleGetMarketNews(req: Request, res: Response): Promise<void>;
export {};
//# sourceMappingURL=getMarketNews.d.ts.map