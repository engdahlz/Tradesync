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
import { db, MAX_TRADE_AMOUNT_USD } from '../config.js';
import { FieldValue } from 'firebase-admin/firestore';
import { BinanceAdapter } from '../services/binanceAdapter.js';
import { z } from 'zod';

interface TradeParams {
    userId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price?: number;
    orderType: string;
    idempotencyKey: string;
    isDryRun?: boolean;
}

const TradeRequestSchema = z.object({
    userId: z.string().min(1),
    symbol: z.string().min(1),
    side: z.enum(['buy', 'sell']),
    quantity: z.coerce.number().positive(),
    orderType: z.enum(['market', 'limit']).default('market'),
    price: z.coerce.number().optional(),
    idempotencyKey: z.string().min(1),
    isDryRun: z.boolean().optional(),
});

function normalizeSymbol(symbol: string): string {
    const trimmed = symbol.trim().toUpperCase();
    if (trimmed.includes('/')) return trimmed.replace('/', '');
    if (trimmed.endsWith('USDT')) return trimmed;
    return `${trimmed}USDT`;
}

async function fetchPublicBinancePrice(symbol: string): Promise<number | null> {
    try {
        const pair = normalizeSymbol(symbol);
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
        if (!response.ok) return null;
        const data = await response.json() as { price?: string };
        if (!data.price) return null;
        return Number.parseFloat(data.price);
    } catch {
        return null;
    }
}

export async function executeTradeInternal(params: TradeParams) {
    const { userId, symbol, side, quantity, price, orderType, idempotencyKey, isDryRun } = params;
    const normalizedSymbol = normalizeSymbol(symbol);

    // Idempotency check
    const existing = await db.collection('orders')
        .where('idempotencyKey', '==', idempotencyKey).limit(1).get();

    if (!existing.empty) {
        return {
            success: true,
            orderId: existing.docs[0].id,
            message: 'Order already exists (idempotent)',
            status: 'duplicate',
        };
    }

    const liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
    const executeLive = liveTradingEnabled && isDryRun !== true;

    let tradeResult: any;
    let executionStatus = 'executed'; // Default for paper trading
    let executionPrice = price ? Number(price) : null;

    if (executeLive) {
        console.log(`Executing LIVE trade for ${normalizedSymbol}`);
        const adapter = new BinanceAdapter();

        // Safety Check: Max Trade Amount
        let estimatedPrice = executionPrice || 0;
        if (!estimatedPrice) {
            const ticker = await adapter.getTicker(normalizedSymbol);
            estimatedPrice = ticker.price;
        }

        const totalValue = Number(quantity) * estimatedPrice;
        if (totalValue > MAX_TRADE_AMOUNT_USD) {
            throw new Error(`Safety Limit: Trade value $${totalValue.toFixed(2)} exceeds max of $${MAX_TRADE_AMOUNT_USD}`);
        }

        tradeResult = await adapter.placeOrder(
            normalizedSymbol,
            side,
            Number(quantity),
            orderType === 'limit' ? 'limit' : 'market',
            executionPrice ?? undefined
        );
        executionStatus = tradeResult.status;
        executionPrice = tradeResult.price || executionPrice;
    } else if (!executionPrice) {
        executionPrice = await fetchPublicBinancePrice(normalizedSymbol);
    }

    // Store in Firestore (both Live and Paper)
    const orderId = tradeResult?.orderId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.collection('orders').doc(orderId).set({
        orderId,
        userId,
        symbol: normalizedSymbol,
        side,
        quantity: Number(quantity),
        price: executionPrice ?? null,
        orderType,
        idempotencyKey,
        status: executionStatus,
        mode: executeLive ? 'LIVE' : 'PAPER',
        exchange: executeLive ? 'Binance' : 'Simulated',
        executedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        rawResult: tradeResult || null
    });

    return {
        success: true,
        orderId,
        message: `${executeLive ? 'LIVE' : 'PAPER'} ${side.toUpperCase()} order: ${quantity} ${normalizedSymbol}`,
        executedAt: new Date().toISOString(),
        status: executionStatus,
        mode: executeLive ? 'LIVE' : 'PAPER'
    };
}

export async function handleExecuteTrade(req: Request, res: Response) {
    try {
        const parsed = TradeRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid trade payload' });
            return;
        }

        if (parsed.data.orderType === 'limit' && !parsed.data.price) {
            res.status(400).json({ error: 'Limit orders require a price' });
            return;
        }

        const result = await executeTradeInternal({
            ...parsed.data,
        });
        res.json(result);
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
    const normalizedSymbol = normalizeSymbol(symbol);
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        await db.collection('scheduledSells').doc(scheduleId).set({
            scheduleId, userId, orderId, symbol: normalizedSymbol, quantity, executeAt, status: 'pending',
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

export async function handleGetOrders(req: Request, res: Response) {
    try {
        const payload = req.method === 'POST' ? req.body : req.query;
        const parsed = z.object({
            userId: z.string().min(1),
            limit: z.coerce.number().optional(),
        }).safeParse(payload);

        if (!parsed.success) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const { userId, limit = 10 } = parsed.data;

        const snapshot = await db.collection('orders')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(Number(limit))
            .get();

        const orders = snapshot.docs.map(doc => doc.data());
        
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        res.status(500).json({ success: false, message: String(error) });
    }
}
