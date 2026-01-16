"use strict";
/**
 * Firebase Functions entry point
 * Trade/Sync AI-Powered Trading Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketNews = exports.ingestKnowledge = exports.searchVideos = exports.getOrders = exports.scheduleSellOrder = exports.executeTrade = exports.analyzeNews = exports.analyzeVideo = exports.suggestStrategy = exports.advisorChat = exports.debugScanner = exports.marketScanner = exports.checkExpiredTrades = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const config_js_1 = require("./config.js");
// Scheduled function to check expired trades
exports.checkExpiredTrades = (0, scheduler_1.onSchedule)('every 5 minutes', async () => {
    const now = new Date();
    const expiredTrades = await config_js_1.db
        .collection('scheduledSells')
        .where('status', '==', 'pending')
        .where('executeAt', '<=', now)
        .get();
    for (const doc of expiredTrades.docs) {
        const trade = doc.data();
        console.log(`Executing scheduled sell for order ${trade.orderId}`);
        await doc.ref.update({ status: 'executed', executedAt: now });
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
exports.suggestStrategy = (0, https_1.onRequest)({ cors: true }, suggestStrategy_js_1.handleSuggestStrategy);
exports.analyzeVideo = (0, https_1.onRequest)({ cors: true }, analyzeVideo_js_1.handleAnalyzeVideo);
exports.analyzeNews = (0, https_1.onRequest)({ cors: true }, analyzeNews_js_1.handleAnalyzeNews);
exports.executeTrade = (0, https_1.onRequest)({ cors: true }, tradeExecution_js_1.handleExecuteTrade);
exports.scheduleSellOrder = (0, https_1.onRequest)({ cors: true }, tradeExecution_js_1.handleScheduleSell);
exports.getOrders = (0, https_1.onRequest)({ cors: true }, getOrders_js_1.handleGetOrders);
exports.searchVideos = (0, https_1.onRequest)({ cors: true }, searchVideos_js_1.handleSearchVideos);
exports.ingestKnowledge = (0, https_1.onRequest)({ cors: true }, ingestKnowledge_js_1.handleIngestKnowledge);
exports.getMarketNews = (0, https_1.onRequest)({ cors: true }, getMarketNews_js_1.handleGetMarketNews);
//# sourceMappingURL=index.js.map