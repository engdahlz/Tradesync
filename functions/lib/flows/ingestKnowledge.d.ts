/**
 * Knowledge Base Ingestion Flow
 * Generates embeddings for static knowledge and stores in Firestore
 */
import { z } from 'genkit';
export declare const ingestKnowledgeFlow: import("genkit").Action<z.ZodVoid, z.ZodObject<{
    count: z.ZodNumber;
    status: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    count: number;
}, {
    status: string;
    count: number;
}>, z.ZodTypeAny>;
import type { Request, Response } from 'express';
export declare function handleIngestKnowledge(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=ingestKnowledge.d.ts.map