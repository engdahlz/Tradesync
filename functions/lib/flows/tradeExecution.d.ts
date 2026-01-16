/**
 * Trade Execution Flows
 * Idempotent order execution and scheduled sells
 */
import type { Request, Response } from 'express';
export declare function handleExecuteTrade(req: Request, res: Response): Promise<void>;
export declare function handleScheduleSell(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=tradeExecution.d.ts.map