import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { getPortfolioPositions } from '../../services/portfolioService.js';
import { BinanceAdapter } from '../../services/binanceAdapter.js';
import { LIVE_TRADING_ENABLED } from '../../config.js';
import { fetchPriceSeries } from '../../services/priceService.js';

export const portfolioTool = new FunctionTool({
    name: 'get_portfolio',
    description: 'Retrieves the user\'s current portfolio holdings, including positions, average price, and performance.',
    parameters: z.object({
        includePrices: z.boolean().optional().describe('If true, fetches current market prices to calculate PnL.'),
        mode: z.enum(['PAPER', 'LIVE']).optional().describe('Portfolio mode to query (defaults to active strategy mode when available).'),
    }),
    execute: async ({ includePrices, mode }, toolContext) => {
        const session = toolContext?.invocationContext?.session;
        const userId = session?.userId || 'demo-user'; // Fallback for testing
        const state = (session?.state as Record<string, unknown>) || {};
        const strategyMode = (state.strategyContext as { mode?: 'PAPER' | 'LIVE' } | undefined)?.mode;
        const resolvedMode = mode || strategyMode;

        try {
            const portfolio = await getPortfolioPositions(userId, { mode: resolvedMode });
            let liveCashBalance: number | null = null;
            let liveBalances: Array<{ currency: string; free: number; used: number; total: number }> | undefined;

            if (resolvedMode === 'LIVE' && LIVE_TRADING_ENABLED) {
                try {
                    const adapter = new BinanceAdapter();
                    liveBalances = await adapter.getBalance();
                    const usdt = liveBalances.find(balance => balance.currency === 'USDT');
                    if (usdt) {
                        liveCashBalance = usdt.free;
                    }
                } catch (error) {
                    console.warn('[portfolioTool] Failed to fetch live balance:', error);
                }
            }

            const effectiveCashBalance = liveCashBalance ?? portfolio.cashBalance;

            if (includePrices) {
                let totalValue = 0;
                
                // Enrich positions with current price data
                const enrichedPositions = await Promise.all(portfolio.positions.map(async (pos) => {
                    try {
                        const series = await fetchPriceSeries(pos.symbol);
                        const currentPrice = series.closes[series.closes.length - 1];
                        const value = pos.amount * currentPrice;
                        const pnl = value - (pos.amount * pos.avgPrice);
                        const pnlPercent = (pnl / (pos.amount * pos.avgPrice)) * 100;

                        totalValue += value;

                        return {
                            ...pos,
                            currentPrice,
                            currentValue: value.toFixed(2),
                            unrealizedPnl: pnl.toFixed(2),
                            unrealizedPnlPercent: pnlPercent.toFixed(2) + '%'
                        };
                    } catch (e) {
                        return { ...pos, error: 'Price unavailable' };
                    }
                }));

                return {
                    summary: {
                        totalValue: totalValue.toFixed(2),
                        cashBalance: effectiveCashBalance.toFixed(2),
                        totalEquity: (totalValue + effectiveCashBalance).toFixed(2),
                        positionCount: enrichedPositions.length
                    },
                    positions: enrichedPositions,
                    balances: liveBalances
                };
            }

            return {
                summary: {
                    cashBalance: effectiveCashBalance.toFixed(2),
                    positionCount: portfolio.positions.length
                },
                positions: portfolio.positions,
                balances: liveBalances
            };

        } catch (error) {
            return {
                error: true,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    },
});
