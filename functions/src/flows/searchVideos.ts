/**
 * Search Videos Flow
 * Proxies requests to YouTube Data API v3
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { YOUTUBE_API_KEY } from '../config.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search';

// Input Validation
const SearchInputSchema = z.object({
    query: z.string().min(1, "Query is required"),
});

// External API Validation (YouTube)
const YouTubeVideoSnippetSchema = z.object({
    title: z.string(),
    channelTitle: z.string(),
    description: z.string(),
    thumbnails: z.object({
        medium: z.object({ url: z.string() }).optional(),
        default: z.object({ url: z.string() }).optional(),
    }),
    publishedAt: z.string(),
});

const YouTubeVideoIdSchema = z.object({
    videoId: z.string().optional(), // search endpoint returns id object
});

const YouTubeSearchItemSchema = z.object({
    id: YouTubeVideoIdSchema,
    snippet: YouTubeVideoSnippetSchema,
});

const YouTubeSearchResponseSchema = z.object({
    items: z.array(YouTubeSearchItemSchema).optional().default([]),
    error: z.object({ message: z.string() }).optional(),
});

// Output Validation
export const VideoSchema = z.object({
    id: z.string(),
    query: z.string(),
    title: z.string(),
    channel: z.string(),
    description: z.string(),
    thumbnail: z.string().optional(),
    publishedAt: z.string(),
    youtubeId: z.string(),
});

const SearchResponseSchema = z.object({
    videos: z.array(VideoSchema),
});

export async function handleSearchVideos(req: Request, res: Response) {
    // 1. Validate Input
    const inputResult = SearchInputSchema.safeParse(req.body);

    if (!inputResult.success) {
        res.status(400).json({ error: inputResult.error.issues[0].message });
        return;
    }

    const { query } = inputResult.data;

    try {
        // Search for videos related to the query + technical analysis
        // type=video, part=snippet, maxResults=12
        const searchQ = `${query} technical analysis trading`;
        const url = `${YOUTUBE_API_BASE}?part=snippet&type=video&q=${encodeURIComponent(searchQ)}&maxResults=12&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(url);
        const rawData = await response.json();

        // 2. Validate External API Response
        const apiResult = YouTubeSearchResponseSchema.safeParse(rawData);

        if (!apiResult.success) {
            console.error('YouTube API Schema Validation Error:', apiResult.error);
            // Fail gracefully - return empty list instead of erroring
            res.json({ videos: [] });
            return;
        }

        const data = apiResult.data;

        if (data.error) {
            console.error('YouTube API Error:', data.error);
            // Fail gracefully
            res.json({ videos: [] });
            return;
        }

        // 3. Transform and Validate Output
        const videos = data.items
            .filter(item => item.id.videoId) // Ensure videoId exists
            .map((item) => ({
                id: item.id.videoId!,
                query: query,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                publishedAt: item.snippet.publishedAt,
                youtubeId: item.id.videoId!
            }));

        const outputResult = SearchResponseSchema.safeParse({ videos });

        if (!outputResult.success) {
            console.error('Output Schema Validation Error:', outputResult.error);
            // In case transformation fails, return empty list
             res.json({ videos: [] });
             return;
        }

        res.json(outputResult.data);
    } catch (error: unknown) {
        console.error('Search videos error:', error);
        // Fail gracefully - never white screen, return empty list
        res.json({ videos: [] });
    }
}
