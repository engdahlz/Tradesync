/**
 * Trade Execution Flows
 * Idempotent order execution and scheduled sells
 */

import type { Request, Response } from 'express';
import { db } from '../config.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function handleExecuteTrade(req: Request, res: Response) {
    const { userId, symbol, side, quantity, price, orderType, idempotencyKey } = req.body;

    if (!userId || !symbol || !side || !quantity || !idempotencyKey) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    // Idempotency check
    const existing = await db.collection('orders')
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
        await db.collection('orders').doc(orderId).set({
            orderId, userId, symbol, side, quantity, price: price || null, orderType,
            idempotencyKey, status: 'executed',
            executedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            orderId,
            message: `${side.toUpperCase()} order executed: ${quantity} ${symbol}`,
            executedAt: new Date().toISOString(),
            status: 'executed',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: String(error), status: 'failed' });
    }
}

export async function handleScheduleSell(req: Request, res: Response) {
    const { userId, orderId, symbol, quantity, sellAfterMinutes } = req.body;

    if (!userId || !orderId || !symbol || !quantity || !sellAfterMinutes) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const executeAt = new Date(Date.now() + sellAfterMinutes * 60 * 1000);
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        await db.collection('scheduledSells').doc(scheduleId).set({
            scheduleId, userId, orderId, symbol, quantity, executeAt, status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            scheduleId,
            executeAt: executeAt.toISOString(),
            message: `Sell scheduled for ${sellAfterMinutes} minutes from now`,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: String(error) });
    }
}
