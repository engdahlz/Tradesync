"use strict";
/**
 * Trade Execution Flows
 * Idempotent order execution and scheduled sells
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExecuteTrade = handleExecuteTrade;
exports.handleScheduleSell = handleScheduleSell;
const config_js_1 = require("../config.js");
const firestore_1 = require("firebase-admin/firestore");
async function handleExecuteTrade(req, res) {
    const { userId, symbol, side, quantity, price, orderType, idempotencyKey } = req.body;
    if (!userId || !symbol || !side || !quantity || !idempotencyKey) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    // Idempotency check
    const existing = await config_js_1.db.collection('orders')
        .where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    if (!existing.empty) {
        res.json({
            success: true,
            orderId: existing.docs[0].id,
            message: 'Order already exists (idempotent)',
            status: 'duplicate',
        });
        return;
    }
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        await config_js_1.db.collection('orders').doc(orderId).set({
            orderId, userId, symbol, side, quantity, price: price || null, orderType,
            idempotencyKey, status: 'executed',
            executedAt: firestore_1.FieldValue.serverTimestamp(),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        res.json({
            success: true,
            orderId,
            message: `${side.toUpperCase()} order executed: ${quantity} ${symbol}`,
            executedAt: new Date().toISOString(),
            status: 'executed',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: String(error), status: 'failed' });
    }
}
async function handleScheduleSell(req, res) {
    const { userId, orderId, symbol, quantity, sellAfterMinutes, idempotencyKey } = req.body;
    if (!userId || !orderId || !symbol || !quantity || !sellAfterMinutes || !idempotencyKey) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    // Idempotency check
    const existing = await config_js_1.db.collection('scheduledSells')
        .where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    if (!existing.empty) {
        res.json({
            success: true,
            scheduleId: existing.docs[0].id,
            message: 'Sell schedule already exists (idempotent)',
            status: 'duplicate',
        });
        return;
    }
    const executeAt = new Date(Date.now() + sellAfterMinutes * 60 * 1000);
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        await config_js_1.db.collection('scheduledSells').doc(scheduleId).set({
            scheduleId, userId, orderId, symbol, quantity, executeAt, status: 'pending',
            idempotencyKey,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        res.json({
            success: true,
            scheduleId,
            executeAt: executeAt.toISOString(),
            message: `Sell scheduled for ${sellAfterMinutes} minutes from now`,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: String(error) });
    }
}
//# sourceMappingURL=tradeExecution.js.map