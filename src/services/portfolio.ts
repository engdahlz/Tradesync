/**
 * Portfolio Service
 * Fetches orders and positions from Firestore + live prices
 */

import { fetchCurrentPrice } from './priceData';
import { API_BASE } from './apiBase';

export interface Position {
    symbol: string;
    name: string;
    amount: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    allocation: number;
    orders: Order[];
}

export interface Order {
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number | null;
    status: string;
    executedAt: string;
}

export interface PortfolioStats {
    totalValue: number;
    totalCost: number;
    totalPnl: number;
    totalPnlPercent: number;
    positionCount: number;
}

// Mapping of symbols to full names
const SYMBOL_NAMES: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    LINK: 'Chainlink',
    DOGE: 'Dogecoin',
    XRP: 'Ripple',
    ADA: 'Cardano',
    AVAX: 'Avalanche',
    DOT: 'Polkadot',
    MATIC: 'Polygon',
};

/**
 * Fetch orders from Firestore via API
 * Note: In production, this would require authentication
 */
export async function fetchOrders(userId: string): Promise<Order[]> {
    try {
        console.log('[Portfolio] Fetching orders for user:', userId);

        const response = await fetch(`${API_BASE}/getOrders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.orders || [];
    } catch (error) {
        console.error('[Portfolio] Failed to fetch orders:', error);
        return [];
    }
}

/**
 * Calculate positions from orders with live prices
 */
export async function calculatePositions(orders: Order[]): Promise<Position[]> {
    // Group orders by symbol
    const ordersBySymbol = orders.reduce((acc, order) => {
        const symbol = order.symbol.replace('USDT', '');
        if (!acc[symbol]) acc[symbol] = [];
        acc[symbol].push(order);
        return acc;
    }, {} as Record<string, Order[]>);

    const positions: Position[] = [];

    for (const [symbol, symbolOrders] of Object.entries(ordersBySymbol)) {
        // Calculate net position
        let totalAmount = 0;
        let totalCost = 0;
        let missingCostUnits = 0;

        for (const order of symbolOrders) {
            if (order.side === 'buy') {
                totalAmount += order.quantity;
                if (order.price === null) {
                    missingCostUnits += order.quantity;
                } else {
                    totalCost += order.quantity * order.price;
                }
            } else {
                totalAmount -= order.quantity;
                if (order.price === null) {
                    missingCostUnits -= order.quantity;
                } else {
                    totalCost -= order.quantity * order.price;
                }
            }
        }

        if (totalAmount <= 0) continue;

        // Fetch current price
        let currentPrice = 0;
        try {
            currentPrice = await fetchCurrentPrice(symbol);
        } catch (e) {
            console.error(`Failed to fetch price for ${symbol}:`, e);
            continue;
        }

        if (missingCostUnits !== 0) {
            totalCost += missingCostUnits * currentPrice;
        }

        const avgPrice = totalAmount > 0 ? totalCost / totalAmount : 0;
        const value = totalAmount * currentPrice;
        const pnl = value - totalCost;
        const pnlPercent = (pnl / totalCost) * 100;

        positions.push({
            symbol,
            name: SYMBOL_NAMES[symbol] || symbol,
            amount: totalAmount,
            avgPrice,
            currentPrice,
            value,
            pnl,
            pnlPercent,
            allocation: 0, // Calculated after all positions
            orders: symbolOrders,
        });
    }

    // Calculate allocations
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    positions.forEach(p => {
        p.allocation = totalValue > 0 ? (p.value / totalValue) * 100 : 0;
    });

    return positions.sort((a, b) => b.value - a.value);
}

/**
 * Calculate portfolio statistics
 */
export function calculateStats(positions: Position[]): PortfolioStats {
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    const totalCost = positions.reduce((sum, p) => sum + (p.amount * p.avgPrice), 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
        totalValue,
        totalCost,
        totalPnl,
        totalPnlPercent,
        positionCount: positions.length,
    };
}

/**
 * Execute a trade via the API
 */
