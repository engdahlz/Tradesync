/**
 * News Analysis Flow
 * Analyzes financial news articles for market impact and sentiment via Genkit
 */
import type { Request, Response } from 'express';
import { z } from 'genkit';
export declare const analyzeNewsFlow: import("genkit").Action<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    source?: string | undefined;
    content?: string | undefined;
    description?: string | undefined;
}, {
    title: string;
    source?: string | undefined;
    content?: string | undefined;
    description?: string | undefined;
}>, z.ZodObject<{
    sentiment: z.ZodEnum<["bullish", "bearish", "neutral"]>;
    confidence: z.ZodNumber;
    summary: z.ZodString;
    tickers: z.ZodArray<z.ZodString, "many">;
    groundingSources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    tickers: string[];
    confidence: number;
    sentiment: "bullish" | "bearish" | "neutral";
    groundingSources?: string[] | undefined;
}, {
    summary: string;
    tickers: string[];
    confidence: number;
    sentiment: "bullish" | "bearish" | "neutral";
    groundingSources?: string[] | undefined;
}>, z.ZodTypeAny>;
export declare function handleAnalyzeNews(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=analyzeNews.d.ts.map