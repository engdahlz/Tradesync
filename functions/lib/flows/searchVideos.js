"use strict";
/**
 * Search Videos Flow
 * Proxies requests to YouTube Data API v3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoSchema = void 0;
exports.handleSearchVideos = handleSearchVideos;
const zod_1 = require("zod");
const config_js_1 = require("../config.js");
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search';
// Input Validation
const SearchInputSchema = zod_1.z.object({
    query: zod_1.z.string().min(1, "Query is required"),
});
// External API Validation (YouTube)
const YouTubeVideoSnippetSchema = zod_1.z.object({
    title: zod_1.z.string(),
    channelTitle: zod_1.z.string(),
    description: zod_1.z.string(),
    thumbnails: zod_1.z.object({
        medium: zod_1.z.object({ url: zod_1.z.string() }).optional(),
        default: zod_1.z.object({ url: zod_1.z.string() }).optional(),
    }),
    publishedAt: zod_1.z.string(),
});
const YouTubeVideoIdSchema = zod_1.z.object({
    videoId: zod_1.z.string().optional(), // search endpoint returns id object
});
const YouTubeSearchItemSchema = zod_1.z.object({
    id: YouTubeVideoIdSchema,
    snippet: YouTubeVideoSnippetSchema,
});
const YouTubeSearchResponseSchema = zod_1.z.object({
    items: zod_1.z.array(YouTubeSearchItemSchema).optional().default([]),
    error: zod_1.z.object({ message: zod_1.z.string() }).optional(),
});
// Output Validation
exports.VideoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    query: zod_1.z.string(),
    title: zod_1.z.string(),
    channel: zod_1.z.string(),
    description: zod_1.z.string(),
    thumbnail: zod_1.z.string().optional(),
    publishedAt: zod_1.z.string(),
    youtubeId: zod_1.z.string(),
});
const SearchResponseSchema = zod_1.z.object({
    videos: zod_1.z.array(exports.VideoSchema),
});
async function handleSearchVideos(req, res) {
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
        const url = `${YOUTUBE_API_BASE}?part=snippet&type=video&q=${encodeURIComponent(searchQ)}&maxResults=12&key=${config_js_1.YOUTUBE_API_KEY}`;
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
            id: item.id.videoId,
            query: query,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            publishedAt: item.snippet.publishedAt,
            youtubeId: item.id.videoId
        }));
        const outputResult = SearchResponseSchema.safeParse({ videos });
        if (!outputResult.success) {
            console.error('Output Schema Validation Error:', outputResult.error);
            // In case transformation fails, return empty list
            res.json({ videos: [] });
            return;
        }
        res.json(outputResult.data);
    }
    catch (error) {
        console.error('Search videos error:', error);
        // Fail gracefully - never white screen, return empty list
        res.json({ videos: [] });
    }
}
//# sourceMappingURL=searchVideos.js.map