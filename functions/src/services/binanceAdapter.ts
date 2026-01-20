/**
 * Binance Adapter
 * Implementation of ExchangeService using CCXT
 */

import ccxt from 'ccxt';
import type { ExchangeService, Balance, Ticker, TradeResult } from './exchangeService.js';

export class BinanceAdapter implements ExchangeService {
    private exchange: any;

    constructor() {
        const apiKey = process.env.BINANCE_API_KEY;
        const secret = process.env.BINANCE_SECRET;
        const isTestnet = process.env.BINANCE_TESTNET === 'true';

        this.exchange = new ccxt.binance({
            apiKey,
            secret,
            options: {
                defaultType: 'spot',
            },
        });

        if (isTestnet) {
            this.exchange.setSandboxMode(true);
        }
    }

    getName(): string {
        return 'Binance';
    }

    async getBalance(): Promise<Balance[]> {
        const balance = await this.exchange.fetchBalance();
        const result: Balance[] = [];

        for (const [currency, data] of Object.entries(balance.total)) {
            const total = data as number;
            if (total > 0) {
                result.push({
                    currency,
                    free: balance[currency].free as number,
                    used: balance[currency].used as number,
                    total,
                });
            }
        }
        return result;
    }

    async getTicker(symbol: string): Promise<Ticker> {
        const ticker = await this.exchange.fetchTicker(symbol);
        return {
            symbol: ticker.symbol,
            price: ticker.last || 0,
            bid: ticker.bid || 0,
            ask: ticker.ask || 0,
            volume: ticker.baseVolume || 0,
        };
    }

    async placeOrder(
        symbol: string,
        side: 'buy' | 'sell',
        quantity: number,
        type: 'market' | 'limit',
        price?: number
    ): Promise<TradeResult> {
        const order = await this.exchange.createOrder(symbol, type, side, quantity, price);
        
        return {
            orderId: order.id,
            symbol: order.symbol,
            side: order.side as 'buy' | 'sell',
            quantity: order.amount,
            price: order.price || order.average || 0,
            status: order.status === 'closed' ? 'filled' : 'open',
            timestamp: order.timestamp,
            fee: order.fee?.cost,
        };
    }

    async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
        try {
            await this.exchange.cancelOrder(orderId, symbol);
            return true;
        } catch (error) {
            console.error('Failed to cancel order:', error);
            return false;
        }
    }

    async cancelAllOrders(symbol?: string): Promise<string[]> {
        // Binance specific: Cancel all open orders for a symbol
        // CCXT unified method: cancelAllOrders(symbol)
        
        if (!symbol) {
            throw new Error('Binance requires symbol to cancel all orders');
        }

        try {
            const result = await this.exchange.cancelAllOrders(symbol);
            return result.map((order: any) => order.id);
        } catch (error) {
            console.error('Failed to cancel all orders:', error);
            return [];
        }
    }
}
