import type { Request, Response } from 'express';
export declare function fetchMarketNews(tickers: string, limit?: number, sort?: string): Promise<any[]>;
export declare function handleGetMarketNews(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=getMarketNews.d.ts.map