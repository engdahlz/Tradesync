/**
 * Trade Execution Flows
 * 
 * Paper trading / order logging system. Orders are stored in Firestore.
 * 
 * NOTE: This is NOT connected to a real exchange (Binance/Alpaca).
 * Orders are recorded for portfolio tracking, not executed on markets.
 * 
 * For real trading integration, implement exchange APIs in a separate module.
 */

import type { Request, Response } from 'express';
import { db } from '../config.js';
import { FieldValue } from 'firebase-admin/firestore';
import { BinanceAdapter } from '../services/binanceAdapter.js';

export async function handleExecuteTrade(req: Request, res: Response) {
    const { userId, symbol, side, quantity, price, orderType, idempotencyKey, isDryRun } = req.body;

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

    const liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
    const executeLive = liveTradingEnabled && isDryRun !== true;

    try {
        let tradeResult;
        let executionStatus = 'executed'; // Default for paper trading

        if (executeLive) {
            console.log(`Executing LIVE trade for ${symbol}`);
            const adapter = new BinanceAdapter();
            tradeResult = await adapter.placeOrder(
                symbol,
                side as 'buy' | 'sell',
                Number(quantity),
                orderType === 'limit' ? 'limit' : 'market',
                price ? Number(price) : undefined
            );
            executionStatus = tradeResult.status;
        }

        // Store in Firestore (both Live and Paper)
        const orderId = tradeResult?.orderId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await db.collection('orders').doc(orderId).set({
            orderId,
            userId,
            symbol,
            side,
            quantity: Number(quantity),
            price: price ? Number(price) : null,
            orderType,
            idempotencyKey,
            status: executionStatus,
            mode: executeLive ? 'LIVE' : 'PAPER',
            exchange: executeLive ? 'Binance' : 'Simulated',
            executedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            rawResult: tradeResult || null
        });

        res.json({
            success: true,
            orderId,
            message: `${executeLive ? 'LIVE' : 'PAPER'} ${side.toUpperCase()} order: ${quantity} ${symbol}`,
            executedAt: new Date().toISOString(),
            status: executionStatus,
            mode: executeLive ? 'LIVE' : 'PAPER'
        });
    } catch (error) {
        console.error('Trade execution failed:', error);
        res.status(500).json({ success: false, message: String(error), status: 'failed' });
    }
}

export async function handleScheduleSell(req: Request, res: Response) {
    const { userId, orderId, symbol, quantity, sellAfterMinutes, idempotencyKey } = req.body;

    if (!userId || !orderId || !symbol || !quantity || !sellAfterMinutes || !idempotencyKey) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const existing = await db.collection('scheduledSells')
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
        await db.collection('scheduledSells').doc(scheduleId).set({
            scheduleId, userId, orderId, symbol, quantity, executeAt, status: 'pending',
            idempotencyKey,
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

export async function handleCancelOrder(req: Request, res: Response) {
    const { orderId } = req.body;

    if (!orderId) {
        res.status(400).json({ error: 'Missing orderId' });
        return;
    }

    try {
        const orderRef = db.collection('orders').doc(orderId);
        const doc = await orderRef.get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const orderData = doc.data();
        
        let cancelResult = true;

        if (orderData?.mode === 'LIVE' && orderData?.exchange === 'Binance') {
            console.log(`Cancelling LIVE order ${orderId} on Binance`);
            const adapter = new BinanceAdapter();
            cancelResult = await adapter.cancelOrder(orderId, orderData.symbol);
        }

        if (cancelResult) {
            await orderRef.update({
                status: 'cancelled',
                cancelledAt: FieldValue.serverTimestamp()
            });
            res.json({ success: true, message: 'Order cancelled', orderId });
        } else {
            res.status(500).json({ success: false, message: 'Failed to cancel order on exchange' });
        }

    } catch (error) {
        console.error('Cancel failed:', error);
        res.status(500).json({ success: false, message: String(error) });
    }
}

export async function handleEmergencyStop(req: Request, res: Response) {
    try {
        console.log('🚨 EMERGENCY STOP TRIGGERED');
        
        const openOrders = await db.collection('orders')
            .where('status', '==', 'open')
            .get();

        if (openOrders.empty) {
            res.json({ success: true, message: 'No open orders to cancel' });
            return;
        }

        const results = [];
        const adapter = new BinanceAdapter();

        for (const doc of openOrders.docs) {
            const order = doc.data();
            let success = true;

            if (order.mode === 'LIVE' && order.exchange === 'Binance') {
                success = await adapter.cancelOrder(order.orderId, order.symbol);
            }

            if (success) {
                await doc.ref.update({
                    status: 'cancelled',
                    cancelledAt: FieldValue.serverTimestamp(),
                    note: 'Emergency Stop'
                });
                results.push({ orderId: order.orderId, status: 'cancelled' });
            } else {
                results.push({ orderId: order.orderId, status: 'failed_to_cancel_on_exchange' });
            }
        }

        res.json({ 
            success: true, 
            message: `Emergency Stop Executed. Processed ${openOrders.size} orders.`,
            results 
        });

    } catch (error) {
        console.error('Emergency stop failed:', error);
        res.status(500).json({ success: false, message: String(error) });
    }
}

export async function handleGetBalance(req: Request, res: Response) {
    try {
        if (process.env.LIVE_TRADING_ENABLED !== 'true') {
            // Mock balance for paper trading
            res.json({
                mode: 'PAPER',
                balances: [
                    { currency: 'USDT', free: 10000, used: 0, total: 10000 },
                    { currency: 'BTC', free: 0.5, used: 0, total: 0.5 }
                ]
            });
            return;
        }

        const adapter = new BinanceAdapter();
        const balances = await adapter.getBalance();
        
        res.json({
            mode: 'LIVE',
            balances
        });
    } catch (error) {
        console.error('Failed to fetch balance:', error);
        res.status(500).json({ success: false, message: String(error) });
    }
}
