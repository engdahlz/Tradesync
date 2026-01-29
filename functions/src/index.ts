/**
 * Firebase Functions entry point
 * Trade/Sync AI-Powered Trading Platform
 * 
 * Migrated from Genkit to Google Agent Development Kit (ADK)
 */

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// FIX: Ensure ADK can find the project ID (Firebase sets GCLOUD_PROJECT, Vertex SDK needs GOOGLE_CLOUD_PROJECT)
if (!process.env.GOOGLE_CLOUD_PROJECT && process.env.GCLOUD_PROJECT) {
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GCLOUD_PROJECT;
}

import { db, ScheduledSellSchema, FieldValue } from './config.js';

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
    handleIngestRagFromGcs,
} from './flows/ingestRagFromGcs.js';
import {
    handleGetMarketNews,
} from './flows/getMarketNews.js';
import {
    handleCreateLiveToken,
} from './flows/createLiveToken.js';
import {
    handleCleanupRagCaches,
} from './flows/cleanupRagCaches.js';
import {
    runMarketScan,
} from './flows/scheduledScanner.js';
import {
    handleCreateStrategy,
    handleGetStrategies,
    handleUpdateStrategy,
    handleDeleteStrategy,
    handleGetStrategyLogs,
} from './flows/strategyManagement.js';

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

// Keep Avanza session warm (optional)
export const avanzaKeepAlive = onSchedule({
    schedule: 'every 8 minutes',
    memory: '256MiB',
    timeoutSeconds: 60,
}, async () => {
    const explicitUrl = process.env.AVANZA_KEEP_ALIVE_URL;
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const region =
        process.env.AVANZA_KEEP_ALIVE_REGION ||
        process.env.GCLOUD_REGION ||
        process.env.FUNCTION_REGION ||
        'us-central1';
    const functionName = process.env.AVANZA_KEEP_ALIVE_FUNCTION || 'keep_avanza_alive';
    const url = explicitUrl || (project ? `https://${region}-${project}.cloudfunctions.net/${functionName}` : '');
    if (!url) {
        console.log('[avanzaKeepAlive] Missing keep-alive URL and project ID, skipping');
        return;
    }

    const jitterMs = Math.floor(Math.random() * 30000);
    if (jitterMs > 0) {
        await new Promise(resolve => setTimeout(resolve, jitterMs));
    }

    try {
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            console.warn(`[avanzaKeepAlive] Non-200 response: ${response.status}`);
        } else {
            console.log('[avanzaKeepAlive] Success');
        }
    } catch (error) {
        console.error('[avanzaKeepAlive] Failed:', error);
    }
});

const ragCacheCleanupSchedule = process.env.RAG_CONTEXT_CACHE_CLEANUP_SCHEDULE || 'every 24 hours';
export const ragCacheCleanup = onSchedule({
    schedule: ragCacheCleanupSchedule,
    memory: '256MiB',
    timeoutSeconds: 60,
}, handleCleanupRagCaches);

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
export const advisorChat = onRequest({ cors: true, memory: '1GiB', timeoutSeconds: 300 }, handleAdvisorChat);
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
export const ingestRagFromGcs = onRequest({ cors: true, memory: '1GiB', timeoutSeconds: 300 }, handleIngestRagFromGcs);
export const getMarketNews = onRequest({ cors: true }, handleGetMarketNews);
export const createLiveToken = onRequest({ cors: true }, handleCreateLiveToken);

// Strategy Management Endpoints
export const createStrategy = onRequest({ cors: true }, handleCreateStrategy);
export const getStrategies = onRequest({ cors: true }, handleGetStrategies);
export const updateStrategy = onRequest({ cors: true }, handleUpdateStrategy);
export const deleteStrategy = onRequest({ cors: true }, handleDeleteStrategy);
export const getStrategyLogs = onRequest({ cors: true }, handleGetStrategyLogs);
