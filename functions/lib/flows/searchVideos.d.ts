/**
 * Search Videos Flow
 * Proxies requests to YouTube Data API v3
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
export declare const VideoSchema: z.ZodObject<{
    id: z.ZodString;
    query: z.ZodString;
    title: z.ZodString;
    channel: z.ZodString;
    description: z.ZodString;
    thumbnail: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodString;
    youtubeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    query: string;
    publishedAt: string;
    id: string;
    channel: string;
    youtubeId: string;
    thumbnail?: string | undefined;
}, {
    title: string;
    description: string;
    query: string;
    publishedAt: string;
    id: string;
    channel: string;
    youtubeId: string;
    thumbnail?: string | undefined;
}>;
export declare function handleSearchVideos(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=searchVideos.d.ts.map