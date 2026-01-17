
/**
 * News Analysis Flow
 * Analyzes financial news articles for market impact and sentiment via Genkit
 */

import type { Request, Response } from 'express';
import { MODEL_FLASH, THINKING_BUDGET_LOW } from '../config.js';
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
    groundingSources: z.array(z.string()).optional(),
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
            model: MODEL_FLASH,
            prompt: prompt,
            output: { schema: OutputSchema },
            config: {
                temperature: 0.3,
                thinkingConfig: {
                    thinkingBudget: THINKING_BUDGET_LOW,
                },
                tools: [
                    { googleSearch: {} }
                ]
            }
        });

        if (!result.output) {
            throw new Error('No structured output returned');
        }

        const groundingSources: string[] = [];
        const candidates = (result as unknown as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> } }> }).candidates;
        if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
            for (const chunk of candidates[0].groundingMetadata.groundingChunks) {
                if (chunk.web?.uri) {
                    groundingSources.push(chunk.web.uri);
                }
            }
        }

        return {
            ...result.output,
            groundingSources: groundingSources.length > 0 ? groundingSources : undefined
        };
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
