/**
 * Firebase Functions entry point
 * Trade/Sync AI-Powered Trading Platform
 * 
 * Migrated from Genkit to Google Agent Development Kit (ADK)
 */

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, ScheduledSellSchema, FieldValue } from './config.js';
import { z } from 'zod';

import {
    handleAdvisorChat,
    handleAdvisorChatStream,
    handleSuggestStrategy,
    handleAnalyzeVideo,
    handleAnalyzeDocument,
    handleAnalyzeNews,
} from './handlers/adkHandlers.js';
import {
    handleExecuteTrade,
    handleScheduleSell,
    handleCancelOrder,
    handleEmergencyStop,
    handleGetBalance,
    handleGetOrders,
} from './flows/tradeExecution.js';
import {
    handleSearchVideos,
} from './flows/searchVideos.js';
import {
    handleIngestKnowledge,
} from './flows/ingestKnowledge.js';
import {
    handleGetMarketNews,
} from './flows/getMarketNews.js';
import {
    runMarketScan,
} from './flows/scheduledScanner.js';

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
        
        // Atomic update to prevent race conditions
        try {
            await db.runTransaction(async (transaction) => {
                const freshDoc = await transaction.get(doc.ref);
                if (freshDoc.data()?.status !== 'pending') {
                    throw new Error('Order already processed');
                }
                transaction.update(doc.ref, { 
                    status: 'executed', 
                    executedAt: FieldValue.serverTimestamp() 
                });
            });
        } catch (e) {
            console.warn(`Skipping processed/locked order ${trade.orderId}:`, (e as Error).message);
        }
    }

    console.log(`Processed ${expiredTrades.size} expired trades`);
});

// Scheduled Market Scanner (Every hour)
export const marketScanner = onSchedule({
    schedule: 'every 60 minutes',
    memory: '1GiB',
    timeoutSeconds: 300,
}, async () => {
    await runMarketScan();
});

// Debug Endpoint for Scanner (Manual Trigger)
export const debugScanner = onRequest({ 
    cors: true, 
    memory: '1GiB', 
    timeoutSeconds: 300 
}, async (req, res) => {
    try {
        const result = await runMarketScan();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
});

// HTTP endpoints (ADK-based)
export const advisorChat = onRequest({ cors: true, memory: '1GiB' }, handleAdvisorChat);
export const advisorChatStream = onRequest({ cors: true, memory: '1GiB', timeoutSeconds: 300 }, handleAdvisorChatStream);
export const suggestStrategy = onRequest({ cors: true }, handleSuggestStrategy);
export const analyzeVideo = onRequest({ cors: true }, handleAnalyzeVideo);
export const analyzeNews = onRequest({ cors: true }, handleAnalyzeNews);
export const analyzeDocument = onRequest({ cors: true, memory: '1GiB' }, handleAnalyzeDocument);
export const executeTrade = onRequest({ cors: true }, handleExecuteTrade);
export const cancelOrder = onRequest({ cors: true }, handleCancelOrder);
export const emergencyStop = onRequest({ cors: true }, handleEmergencyStop);
export const getBalance = onRequest({ cors: true }, handleGetBalance);
export const scheduleSellOrder = onRequest({ cors: true }, handleScheduleSell);
export const getOrders = onRequest({ cors: true }, handleGetOrders);
export const searchVideos = onRequest({ cors: true }, handleSearchVideos);
export const ingestKnowledge = onRequest({ cors: true }, handleIngestKnowledge);
export const getMarketNews = onRequest({ cors: true }, handleGetMarketNews);
