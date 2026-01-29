import { LlmAgent, FunctionTool } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { z } from 'zod';
import { YoutubeTranscript } from 'youtube-transcript';
import { VIDEO_ANALYSIS_INSTRUCTION } from '../prompts/agentPrompts.js';

const YoutubeTranscriptSchema = z.array(z.object({
    text: z.string(),
    duration: z.number(),
    offset: z.number(),
}));

const thinkingConfig = getThinkingConfig(MODEL_FLASH);

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
    disallowTransferToParent: true,
    instruction: VIDEO_ANALYSIS_INSTRUCTION,
    tools: [fetchTranscriptTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 1.0),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
