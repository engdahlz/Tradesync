import { db } from '../config.js';

export interface Position {
    symbol: string;
    amount: number;
    avgPrice: number;
    currentValue?: number;
    unrealizedPnl?: number;
    unrealizedPnlPercent?: number;
}

export interface PortfolioSummary {
    userId: string;
    positions: Position[];
    totalValue?: number;
    totalCost: number;
    cashBalance: number; // For paper trading simulation
    mode?: 'PAPER' | 'LIVE';
}

/**
 * Calculates the current portfolio positions based on order history.
 * This aggregates BUY and SELL orders to determine net quantity and average entry price.
 */
export async function getPortfolioPositions(
    userId: string,
    options: { mode?: 'PAPER' | 'LIVE' } = {}
): Promise<PortfolioSummary> {
    let query = db.collection('orders')
        .where('userId', '==', userId)
        .where('status', 'in', ['filled', 'executed'])
        .orderBy('createdAt', 'asc');

    if (options.mode) {
        query = query.where('mode', '==', options.mode);
    }

    const ordersSnapshot = await query.get();

    const positionsMap = new Map<string, { amount: number; totalCost: number }>();
    let cashBalance = options.mode === 'LIVE' ? 0 : 100000; // Default starting paper cash

    ordersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const symbol = data.symbol;
        const side = data.side;
        const quantity = Number(data.quantity);
        const price = Number(data.price);
        const total = quantity * price;

        if (!positionsMap.has(symbol)) {
            positionsMap.set(symbol, { amount: 0, totalCost: 0 });
        }

        const position = positionsMap.get(symbol)!;

        if (side === 'buy') {
            position.amount += quantity;
            position.totalCost += total;
            cashBalance -= total;
        } else if (side === 'sell') {
            // When selling, we reduce the cost basis proportionally
            if (position.amount > 0) {
                const costPerUnit = position.totalCost / position.amount;
                position.totalCost -= (quantity * costPerUnit);
            }
            position.amount -= quantity;
            cashBalance += total;
        }
    });

    const positions: Position[] = [];
    let totalPortfolioCost = 0;

    for (const [symbol, data] of positionsMap.entries()) {
        // Filter out closed positions (negligible dust amounts)
        if (data.amount > 0.000001) {
            const avgPrice = data.totalCost / data.amount;
            positions.push({
                symbol,
                amount: data.amount,
                avgPrice: avgPrice
            });
            totalPortfolioCost += data.totalCost;
        }
    }

    return {
        userId,
        positions,
        totalCost: totalPortfolioCost,
        cashBalance,
        mode: options.mode
    };
}
