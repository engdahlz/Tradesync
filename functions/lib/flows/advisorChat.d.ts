/**
 * Financial Advisor RAG Chat Flow
 */
import type { Request, Response } from 'express';
import { z } from 'genkit';
export declare const advisorChatFlow: import("genkit").Action<z.ZodObject<{
    message: z.ZodString;
    conversationHistory: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: string;
        content: string;
    }, {
        role: string;
        content: string;
    }>, "many">>>;
    topK: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    topK: number;
    conversationHistory: {
        role: string;
        content: string;
    }[];
}, {
    message: string;
    topK?: number | undefined;
    conversationHistory?: {
        role: string;
        content: string;
    }[] | undefined;
}>, z.ZodObject<{
    response: z.ZodString;
    sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        sourceType: z.ZodString;
        excerpt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        sourceType: string;
        excerpt: string;
    }, {
        title: string;
        sourceType: string;
        excerpt: string;
    }>, "many">>;
    groundingSources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
    thinkingUsed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    response: string;
    sources?: {
        title: string;
        sourceType: string;
        excerpt: string;
    }[] | undefined;
    groundingSources?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    thinkingUsed?: boolean | undefined;
}, {
    response: string;
    sources?: {
        title: string;
        sourceType: string;
        excerpt: string;
    }[] | undefined;
    groundingSources?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    thinkingUsed?: boolean | undefined;
}>, z.ZodTypeAny>;
export declare function handleAdvisorChat(req: Request, res: Response): Promise<void>;
export declare function handleAdvisorChatStream(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=advisorChat.d.ts.map