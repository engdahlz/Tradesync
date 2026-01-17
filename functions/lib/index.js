"use strict";
/**
 * Firebase Functions entry point
 * Trade/Sync AI-Powered Trading Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDocument = exports.getMarketNews = exports.ingestKnowledge = exports.searchVideos = exports.getOrders = exports.scheduleSellOrder = exports.executeTrade = exports.analyzeNews = exports.analyzeVideo = exports.suggestStrategy = exports.advisorChatStream = exports.advisorChat = exports.debugScanner = exports.marketScanner = exports.checkExpiredTrades = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const config_js_1 = require("./config.js");
const zod_1 = require("zod");
const firestore_1 = require("firebase-admin/firestore");
// Schema for scheduled sells in Firestore
const ScheduledSellSchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'executed', 'cancelled']),
    executeAt: zod_1.z.any(), // Timestamp
    executedAt: zod_1.z.any().optional(),
    ticker: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().optional(),
});
// Scheduled function to check expired trades
exports.checkExpiredTrades = (0, scheduler_1.onSchedule)('every 5 minutes', async () => {
    const now = new Date();
    const expiredTrades = await config_js_1.db
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
            await config_js_1.db.runTransaction(async (transaction) => {
                const freshDoc = await transaction.get(doc.ref);
                if (freshDoc.data()?.status !== 'pending') {
                    throw new Error('Order already processed');
                }
                transaction.update(doc.ref, {
                    status: 'executed',
                    executedAt: firestore_1.FieldValue.serverTimestamp()
                });
            });
        }
        catch (e) {
            console.warn(`Skipping processed/locked order ${trade.orderId}:`, e.message);
        }
    }
    console.log(`Processed ${expiredTrades.size} expired trades`);
});
// Import flow handlers
const advisorChat_js_1 = require("./flows/advisorChat.js");
const suggestStrategy_js_1 = require("./flows/suggestStrategy.js");
const analyzeVideo_js_1 = require("./flows/analyzeVideo.js");
const analyzeNews_js_1 = require("./flows/analyzeNews.js");
const tradeExecution_js_1 = require("./flows/tradeExecution.js");
const getOrders_js_1 = require("./flows/getOrders.js");
const searchVideos_js_1 = require("./flows/searchVideos.js");
const ingestKnowledge_js_1 = require("./flows/ingestKnowledge.js");
const scheduledScanner_js_1 = require("./flows/scheduledScanner.js");
const analyzeDocument_js_1 = require("./flows/analyzeDocument.js");
// ... existing imports ...
const getMarketNews_js_1 = require("./flows/getMarketNews.js");
// Scheduled Market Scanner (Every hour)
exports.marketScanner = (0, scheduler_1.onSchedule)({
    schedule: 'every 60 minutes',
    memory: '1GiB', // Genkit needs memory
    timeoutSeconds: 300 // Scanning takes time
}, async () => {
    await (0, scheduledScanner_js_1.runMarketScan)();
});
// Debug Endpoint for Scanner (Manual Trigger)
exports.debugScanner = (0, https_1.onRequest)({ cors: true, memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    try {
        const result = await (0, scheduledScanner_js_1.runMarketScan)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// HTTP endpoints (no secrets injection - key is hardcoded in config)
exports.advisorChat = (0, https_1.onRequest)({ cors: true, memory: '1GiB' }, advisorChat_js_1.handleAdvisorChat);
exports.advisorChatStream = (0, https_1.onRequest)({ cors: true, memory: '1GiB', timeoutSeconds: 300 }, advisorChat_js_1.handleAdvisorChatStream);
exports.suggestStrategy = (0, https_1.onRequest)({ cors: true }, suggestStrategy_js_1.handleSuggestStrategy);
exports.analyzeVideo = (0, https_1.onRequest)({ cors: true }, analyzeVideo_js_1.handleAnalyzeVideo);
exports.analyzeNews = (0, https_1.onRequest)({ cors: true }, analyzeNews_js_1.handleAnalyzeNews);
exports.executeTrade = (0, https_1.onRequest)({ cors: true }, tradeExecution_js_1.handleExecuteTrade);
exports.scheduleSellOrder = (0, https_1.onRequest)({ cors: true }, tradeExecution_js_1.handleScheduleSell);
exports.getOrders = (0, https_1.onRequest)({ cors: true }, getOrders_js_1.handleGetOrders);
exports.searchVideos = (0, https_1.onRequest)({ cors: true }, searchVideos_js_1.handleSearchVideos);
exports.ingestKnowledge = (0, https_1.onRequest)({ cors: true }, ingestKnowledge_js_1.handleIngestKnowledge);
exports.getMarketNews = (0, https_1.onRequest)({ cors: true }, getMarketNews_js_1.handleGetMarketNews);
exports.analyzeDocument = (0, https_1.onRequest)({ cors: true, memory: '1GiB' }, analyzeDocument_js_1.handleAnalyzeDocument);
//# sourceMappingURL=index.js.map