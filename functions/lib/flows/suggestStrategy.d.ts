/**
 * Master Strategy Flow
 * Analyzes market data and suggests trading actions
 */
import type { Request, Response } from 'express';
import { z } from 'genkit';
export declare const suggestStrategyFlow: import("genkit").Action<z.ZodObject<{
    symbol: z.ZodString;
    interval: z.ZodDefault<z.ZodString>;
    marketData: z.ZodOptional<z.ZodObject<{
        price: z.ZodNumber;
        rsi: z.ZodNumber;
        macd: z.ZodObject<{
            value: z.ZodNumber;
            signal: z.ZodNumber;
            histogram: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: number;
            signal: number;
            histogram: number;
        }, {
            value: number;
            signal: number;
            histogram: number;
        }>;
        volume: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        price: number;
        rsi: number;
        macd: {
            value: number;
            signal: number;
            histogram: number;
        };
        volume: number;
    }, {
        price: number;
        rsi: number;
        macd: {
            value: number;
            signal: number;
            histogram: number;
        };
        volume: number;
    }>>;
    prices: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    interval: string;
    marketData?: {
        price: number;
        rsi: number;
        macd: {
            value: number;
            signal: number;
            histogram: number;
        };
        volume: number;
    } | undefined;
    prices?: number[] | undefined;
}, {
    symbol: string;
    interval?: string | undefined;
    marketData?: {
        price: number;
        rsi: number;
        macd: {
            value: number;
            signal: number;
            histogram: number;
        };
        volume: number;
    } | undefined;
    prices?: number[] | undefined;
}>, z.ZodObject<{
    action: z.ZodEnum<["BUY", "SELL", "HOLD"]>;
    confidence: z.ZodNumber;
    reasoning: z.ZodString;
    riskLevel: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
    stopLoss: z.ZodOptional<z.ZodNumber>;
    takeProfit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    action: "BUY" | "SELL" | "HOLD";
    confidence: number;
    reasoning: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    stopLoss?: number | undefined;
    takeProfit?: number | undefined;
}, {
    action: "BUY" | "SELL" | "HOLD";
    confidence: number;
    reasoning: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    stopLoss?: number | undefined;
    takeProfit?: number | undefined;
}>, z.ZodTypeAny>;
export declare function handleSuggestStrategy(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=suggestStrategy.d.ts.map