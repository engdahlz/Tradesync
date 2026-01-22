import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { db } from '../../config.js';

export const latestSignalsTool = new FunctionTool({
    name: 'get_latest_market_signals',
    description: 'Retrieves the 10 most recent market scan signals including buy/sell recommendations, confidence levels, and technical indicators.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const snapshot = await db.collection('signals')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            if (snapshot.empty) {
                return { message: "No recent market signals found." };
            }

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    symbol: data.symbol,
                    action: data.action,
                    confidence: data.confidence,
                    score: data.score,
                    reasoning: data.reasoning,
                    price: data.price,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    rsi: data.rsi,
                    macd: data.macd,
                    sentimentScore: data.sentimentScore
                };
            });
        } catch (error) {
            return {
                error: true,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    },
});
