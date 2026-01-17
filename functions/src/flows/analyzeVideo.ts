
/**
 * YouTube Video Analysis Flow
 * Extracts sentiment and price levels from video transcripts via Genkit
 */

import type { Request, Response } from 'express';
import { MODEL_FLASH, THINKING_BUDGET_MEDIUM } from '../config.js';
import { ai } from '../genkit.js';
import { z } from 'genkit';
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

const InputSchema = z.object({
    videoUrl: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
});

const OutputSchema = z.object({
    transcript: z.string(),
    sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number(),
    tickers: z.array(z.string()),
    priceLevels: z.object({
        targets: z.array(z.number()),
        supports: z.array(z.number()),
        resistances: z.array(z.number()),
    }),
    summary: z.string(),
    keyPoints: z.array(z.string()),
});

// Internal AI output schema (matches what we ask prompt to generate)
const AIOutputSchema = z.object({
    sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number(),
    tickers: z.array(z.string()),
    targets: z.array(z.number()),
    supports: z.array(z.number()),
    resistances: z.array(z.number()),
    summary: z.string(),
    keyPoints: z.array(z.string()),
});

export const analyzeVideoFlow = ai.defineFlow({
    name: 'analyzeVideo',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { videoUrl, title, description } = input;
    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    let transcript = '';
    let transcriptSource = 'transcript';

    try {
        const rawData = await YoutubeTranscript.fetchTranscript(videoId);
        const data = YoutubeTranscriptSchema.parse(rawData);
        transcript = data.map(item => item.text).join(' ').slice(0, 10000);
    } catch (e) {
        // Fallback to metadata if transcript fails
        if (title || description) {
            console.warn(`Transcript failed for ${videoId}, using metadata fallback.`);
            transcript = `Title: ${title || ''}\nDescription: ${description || ''}`;
            transcriptSource = 'metadata';
        } else {
            throw new Error('Transcript unavailable and no metadata provided');
        }
    }

    const prompt = `Analyze this financial video content (Source: ${transcriptSource}) for trading insights:
    
CONTENT: ${transcript}

Return JSON with: 
- sentiment (bullish/bearish/neutral)
- confidence (0-1)
- tickers (array)
- targets (price array)
- supports (array)
- resistances (array)
- summary (2 sentences)
- keyPoints (3-5 items)`;

    try {
        const result = await ai.generate({
            model: MODEL_FLASH,
            prompt: prompt,
            output: { schema: AIOutputSchema },
            config: {
                temperature: 0.3,
                thinkingConfig: {
                    thinkingBudget: THINKING_BUDGET_MEDIUM,
                }
            }
        });

        const data = result.output;
        if (!data) throw new Error('AI generation failed');

        return {
            transcript: transcriptSource === 'metadata' ? '(Transcript Unavailable - Analyzed Summary)' : transcript.slice(0, 500) + '...',
            sentiment: data.sentiment,
            confidence: data.confidence,
            tickers: data.tickers,
            priceLevels: {
                targets: data.targets,
                supports: data.supports,
                resistances: data.resistances,
            },
            summary: data.summary,
            keyPoints: data.keyPoints,
        };
    } catch (e) {
        // Fallback for AI error
        return {
            transcript: transcript.slice(0, 500) + '...',
            sentiment: 'neutral' as const,
            confidence: 0,
            tickers: [] as string[],
            priceLevels: { targets: [] as number[], supports: [] as number[], resistances: [] as number[] },
            summary: 'Analysis failed',
            keyPoints: [] as string[],
        };
    }
});

export async function handleAnalyzeVideo(req: Request, res: Response) {
    try {
        const result = await analyzeVideoFlow(req.body);
        res.json(result);
    } catch (e: unknown) {
        console.error('Video analysis error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Unable to analyze video';
        // Return structured error response even on failure, if possible, or 400
        res.json({
            transcript: 'Unavailable',
            sentiment: 'neutral',
            confidence: 0,
            tickers: [],
            priceLevels: { targets: [], supports: [], resistances: [] },
            summary: errorMessage,
            keyPoints: [],
        });
    }
}
