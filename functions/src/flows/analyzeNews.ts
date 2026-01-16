
/**
 * News Analysis Flow
 * Analyzes financial news articles for market impact and sentiment via Genkit
 */

import type { Request, Response } from 'express';
import { MODEL_NAME } from '../config.js';
import { ai } from '../genkit.js';
import { z } from 'genkit';

const InputSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    source: z.string().optional(),
});

const OutputSchema = z.object({
    sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number(),
    summary: z.string(),
    tickers: z.array(z.string()),
});

export const analyzeNewsFlow = ai.defineFlow({
    name: 'analyzeNews',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { title, description, content, source } = input;

    const prompt = `Analyze this financial news article for potential market impact.
    
    Article: "${title}"
    Source: ${source || 'Unknown'}
    Summary: ${description || ''}
    Content Snippet: "${content ? content.slice(0, 500) : ''}"

    Return the analysis with these fields:
    - sentiment: "bullish" | "bearish" | "neutral"
    - confidence: number (0-1)
    - summary: One sentence summary of the trading implication
    - tickers: Array of related stock/crypto tickers (e.g. ["BTC", "AAPL"])
    `;

    try {
        const result = await ai.generate({
            model: MODEL_NAME,
            prompt: prompt,
            output: { schema: OutputSchema }
        });

        if (!result.output) {
            throw new Error('No structured output returned');
        }

        return result.output;
    } catch (e) {
        // Fallback or rethrow
        console.error("Genkit generation failed", e);
        return {
            sentiment: 'neutral' as const,
            confidence: 0.5,
            summary: 'Analysis unavailable due to error',
            tickers: [] as string[]
        };
    }
});


export async function handleAnalyzeNews(req: Request, res: Response) {
    try {
        const result = await analyzeNewsFlow(req.body);
        res.json(result);
    } catch (error: unknown) {
        console.error('News analysis error:', error);
        // Fail gracefully
        res.json({
            sentiment: 'neutral',
            confidence: 0,
            summary: 'News analysis unavailable at the moment.',
            tickers: []
        });
    }
}
