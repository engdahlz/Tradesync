/**
 * YouTube Video Analysis Flow
 * Extracts sentiment and price levels from video transcripts via Genkit
 */
import type { Request, Response } from 'express';
import { z } from 'genkit';
export declare const analyzeVideoFlow: import("genkit").Action<z.ZodObject<{
    videoUrl: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    videoUrl: string;
    title?: string | undefined;
    description?: string | undefined;
}, {
    videoUrl: string;
    title?: string | undefined;
    description?: string | undefined;
}>, z.ZodObject<{
    transcript: z.ZodString;
    sentiment: z.ZodEnum<["bullish", "bearish", "neutral"]>;
    confidence: z.ZodNumber;
    tickers: z.ZodArray<z.ZodString, "many">;
    priceLevels: z.ZodObject<{
        targets: z.ZodArray<z.ZodNumber, "many">;
        supports: z.ZodArray<z.ZodNumber, "many">;
        resistances: z.ZodArray<z.ZodNumber, "many">;
    }, "strip", z.ZodTypeAny, {
        targets: number[];
        supports: number[];
        resistances: number[];
    }, {
        targets: number[];
        supports: number[];
        resistances: number[];
    }>;
    summary: z.ZodString;
    keyPoints: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    summary: string;
    tickers: string[];
    confidence: number;
    sentiment: "bullish" | "bearish" | "neutral";
    transcript: string;
    priceLevels: {
        targets: number[];
        supports: number[];
        resistances: number[];
    };
    keyPoints: string[];
}, {
    summary: string;
    tickers: string[];
    confidence: number;
    sentiment: "bullish" | "bearish" | "neutral";
    transcript: string;
    priceLevels: {
        targets: number[];
        supports: number[];
        resistances: number[];
    };
    keyPoints: string[];
}>, z.ZodTypeAny>;
export declare function handleAnalyzeVideo(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=analyzeVideo.d.ts.map