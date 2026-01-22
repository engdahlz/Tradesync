import { LlmAgent, FunctionTool } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { z } from 'zod';
import { YoutubeTranscript } from 'youtube-transcript';

const YoutubeTranscriptSchema = z.array(z.object({
    text: z.string(),
    duration: z.number(),
    offset: z.number(),
}));

function extractVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

const fetchTranscriptTool = new FunctionTool({
    name: 'fetch_youtube_transcript',
    description: 'Fetches the transcript of a YouTube video for analysis.',
    parameters: z.object({
        videoUrl: z.string().describe('Full YouTube video URL'),
    }),
    execute: async ({ videoUrl }) => {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return { error: true, message: 'Invalid YouTube URL' };
        }

        try {
            const rawData = await YoutubeTranscript.fetchTranscript(videoId);
            const data = YoutubeTranscriptSchema.parse(rawData);
            const transcript = data.map(item => item.text).join(' ').slice(0, 10000);
            return { 
                success: true, 
                transcript,
                videoId,
                length: transcript.length,
            };
        } catch {
            return { 
                error: true, 
                message: 'Transcript unavailable for this video',
                videoId,
            };
        }
    },
});

export const videoAnalysisAgent = new LlmAgent({
    name: 'video_analysis_agent',
    model: MODEL_FLASH,
    description: 'Analyzes YouTube trading videos for sentiment and price levels.',
    instruction: `You are a financial video analyst specializing in crypto trading content.

Your job is to:
1. Fetch video transcripts using the fetch_youtube_transcript tool
2. Analyze the content for trading insights
3. Extract mentioned price targets, support/resistance levels
4. Determine overall sentiment

Provide analysis with:
- sentiment: "bullish" | "bearish" | "neutral"
- confidence: 0-1
- tickers: Array of mentioned crypto tickers
- priceLevels: { targets: [], supports: [], resistances: [] }
- summary: 2 sentence summary
- keyPoints: 3-5 key takeaways

Be specific about price levels when mentioned.`,
    tools: [fetchTranscriptTool],
    generateContentConfig: {
        temperature: 1.0,
    },
});
