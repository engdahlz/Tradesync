/**
 * Firebase Functions entry point
 * Trade/Sync AI-Powered Trading Platform
 */

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './config.js';
import { z } from 'zod';

// Schema for scheduled sells in Firestore
const ScheduledSellSchema = z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'executed', 'cancelled']),
    executeAt: z.any(), // Timestamp
    executedAt: z.any().optional(),
    ticker: z.string().optional(),
});

type ScheduledSell = z.infer<typeof ScheduledSellSchema>;

// Scheduled function to check expired trades
export const checkExpiredTrades = onSchedule('every 5 minutes', async () => {
    const now = new Date();
    const expiredTrades = await db
        .collection('scheduledSells')
        .where('status', '==', 'pending')
        .where('executeAt', '<=', now)
        .get();

    for (const doc of expiredTrades.docs) {
        const rawData = doc.data();
        const result = ScheduledSellSchema.safeParse(rawData);
        
        if (!result.success) {
            console.error(`Invalid scheduled sell data for doc ${doc.id}:`, result.error.format());
            continue;
        }

        const trade = result.data;
        console.log(`Executing scheduled sell for order ${trade.orderId}`);
        await doc.ref.update({ status: 'executed', executedAt: now });
    }

    console.log(`Processed ${expiredTrades.size} expired trades`);
});

// Import flow handlers
import { handleAdvisorChat } from './flows/advisorChat.js';
import { handleSuggestStrategy } from './flows/suggestStrategy.js';
import { handleAnalyzeVideo } from './flows/analyzeVideo.js';
import { handleAnalyzeNews } from './flows/analyzeNews.js';
import { handleExecuteTrade, handleScheduleSell } from './flows/tradeExecution.js';
import { handleGetOrders } from './flows/getOrders.js';
import { handleSearchVideos } from './flows/searchVideos.js';
import { handleIngestKnowledge } from './flows/ingestKnowledge.js';
import { runMarketScan } from './flows/scheduledScanner.js';

// ... existing imports ...
import { handleGetMarketNews } from './flows/getMarketNews.js';

// Scheduled Market Scanner (Every hour)
export const marketScanner = onSchedule({
    schedule: 'every 60 minutes',
    memory: '1GiB', // Genkit needs memory
    timeoutSeconds: 300 // Scanning takes time
}, async () => {
    await runMarketScan();
});

// Debug Endpoint for Scanner (Manual Trigger)
export const debugScanner = onRequest({ cors: true, memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    try {
        const result = await runMarketScan();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
});

// HTTP endpoints (no secrets injection - key is hardcoded in config)
export const advisorChat = onRequest({ cors: true, memory: '1GiB' }, handleAdvisorChat);
export const suggestStrategy = onRequest({ cors: true }, handleSuggestStrategy);
export const analyzeVideo = onRequest({ cors: true }, handleAnalyzeVideo);
export const analyzeNews = onRequest({ cors: true }, handleAnalyzeNews);
export const executeTrade = onRequest({ cors: true }, handleExecuteTrade);
export const scheduleSellOrder = onRequest({ cors: true }, handleScheduleSell);
export const getOrders = onRequest({ cors: true }, handleGetOrders);
export const searchVideos = onRequest({ cors: true }, handleSearchVideos);
export const ingestKnowledge = onRequest({ cors: true }, handleIngestKnowledge);
export const getMarketNews = onRequest({ cors: true }, handleGetMarketNews);
