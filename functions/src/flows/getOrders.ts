/**
 * Get Orders Flow
 * Fetches orders from Firestore for a user
 */

import type { Request, Response } from 'express';
import { db } from '../config.js';

export async function handleGetOrders(req: Request, res: Response) {
    const { userId } = req.body;

    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }

    try {
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const orders = ordersSnapshot.docs.map(doc => ({
            orderId: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
            executedAt: doc.data().executedAt?.toDate?.()?.toISOString() || null,
        }));

        res.json({ orders, count: orders.length });
    } catch (error) {
        console.error('[getOrders] Error:', error);
        // Fail gracefully
        res.json({ orders: [], error: String(error) });
    }
}
