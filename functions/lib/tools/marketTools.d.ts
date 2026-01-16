import { z } from 'genkit';
export declare const marketNewsTool: import("genkit").ToolAction<z.ZodObject<{
    tickers: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tickers: string;
}, {
    tickers: string;
}>, z.ZodArray<z.ZodObject<{
    title: z.ZodString;
    summary: z.ZodString;
    sentiment: z.ZodString;
    source: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    summary: string;
    source: string;
    sentiment: string;
}, {
    title: string;
    summary: string;
    source: string;
    sentiment: string;
}>, "many">>;
export declare const strategyTool: import("genkit").ToolAction<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>, z.ZodObject<{
    strategy: z.ZodString;
    analysis: z.ZodString;
    confidence: z.ZodNumber;
    recommendation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    strategy: string;
    analysis: string;
    recommendation: string;
}, {
    confidence: number;
    strategy: string;
    analysis: string;
    recommendation: string;
}>>;
//# sourceMappingURL=marketTools.d.ts.map