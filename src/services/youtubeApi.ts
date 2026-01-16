/**
 * YouTube API Service
 * Interacts with backend to search videos
 */

import { z } from 'zod';

const API_BASE = 'https://us-central1-tradesync-ai-prod.cloudfunctions.net';

export interface Video {
    id: string;
    query: string;
    title: string;
    channel: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
    youtubeId: string;
    analysis?: {
        sentiment: 'bullish' | 'bearish' | 'neutral';
        tickers: string[];
        targets: number[];
        supports: number[];
        summary: string;
        keyPoints: string[];
        confidence: number;
    };
}

const VideoSchema = z.object({
    id: z.string(),
    query: z.string(),
    title: z.string(),
    channel: z.string(),
    description: z.string(),
    thumbnail: z.string(),
    publishedAt: z.string(),
    youtubeId: z.string(),
    analysis: z.object({
        sentiment: z.enum(['bullish', 'bearish', 'neutral']),
        tickers: z.array(z.string()),
        targets: z.array(z.number()),
        supports: z.array(z.number()),
        summary: z.string(),
        keyPoints: z.array(z.string()),
        confidence: z.number()
    }).optional()
});

const SearchVideosResponseSchema = z.object({
    videos: z.array(VideoSchema)
});

export async function searchVideos(query: string): Promise<Video[]> {
    try {
        const response = await fetch(`${API_BASE}/searchVideos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const rawData = await response.json();
        
        const validation = SearchVideosResponseSchema.safeParse(rawData);
        if (!validation.success) {
            console.error('SearchVideos Validation Error:', validation.error);
            // Fail gracefully
            return [];
        }

        return validation.data.videos;
    } catch (error) {
        console.error('Failed to search videos:', error);
        throw error;
    }
}
