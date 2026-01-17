import type { Request, Response } from 'express';
import { z } from 'genkit';
export declare const analyzeDocumentFlow: import("genkit").Action<z.ZodObject<{
    url: z.ZodString;
    analysisType: z.ZodDefault<z.ZodEnum<["summary", "financial", "risk", "comparison"]>>;
    additionalContext: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    analysisType: "summary" | "financial" | "risk" | "comparison";
    additionalContext?: string | undefined;
}, {
    url: string;
    analysisType?: "summary" | "financial" | "risk" | "comparison" | undefined;
    additionalContext?: string | undefined;
}>, z.ZodObject<{
    title: z.ZodString;
    documentType: z.ZodString;
    summary: z.ZodString;
    keyFindings: z.ZodArray<z.ZodString, "many">;
    financialMetrics: z.ZodOptional<z.ZodObject<{
        revenue: z.ZodOptional<z.ZodString>;
        profit: z.ZodOptional<z.ZodString>;
        growth: z.ZodOptional<z.ZodString>;
        risks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        revenue?: string | undefined;
        profit?: string | undefined;
        growth?: string | undefined;
        risks?: string[] | undefined;
    }, {
        revenue?: string | undefined;
        profit?: string | undefined;
        growth?: string | undefined;
        risks?: string[] | undefined;
    }>>;
    sentiment: z.ZodOptional<z.ZodEnum<["bullish", "bearish", "neutral"]>>;
    tradingImplications: z.ZodOptional<z.ZodString>;
    sourceUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    summary: string;
    documentType: string;
    keyFindings: string[];
    sourceUrl: string;
    sentiment?: "bullish" | "bearish" | "neutral" | undefined;
    financialMetrics?: {
        revenue?: string | undefined;
        profit?: string | undefined;
        growth?: string | undefined;
        risks?: string[] | undefined;
    } | undefined;
    tradingImplications?: string | undefined;
}, {
    title: string;
    summary: string;
    documentType: string;
    keyFindings: string[];
    sourceUrl: string;
    sentiment?: "bullish" | "bearish" | "neutral" | undefined;
    financialMetrics?: {
        revenue?: string | undefined;
        profit?: string | undefined;
        growth?: string | undefined;
        risks?: string[] | undefined;
    } | undefined;
    tradingImplications?: string | undefined;
}>, z.ZodTypeAny>;
export declare function handleAnalyzeDocument(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=analyzeDocument.d.ts.map