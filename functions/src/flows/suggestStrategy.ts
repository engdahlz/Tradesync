/**
 * Master Strategy Flow
 * Analyzes market data and suggests trading actions
 */

import type { Request, Response } from 'express';
import { ai } from '../genkit.js';
import { z } from 'genkit';
import { MODEL_PRO, MODEL_FLASH, THINKING_BUDGET_HIGH } from '../config.js';

const InputSchema = z.object({
    symbol: z.string(),
    interval: z.string().default('4h'),
    model: z.string().optional(),
    marketData: z.object({
        price: z.number(),
        rsi: z.number(),
        macd: z.object({
            value: z.number(),
            signal: z.number(),
            histogram: z.number()
        }),
        volume: z.number()
    }).optional(),
    prices: z.array(z.number()).optional()
});

const OutputSchema = z.object({
    action: z.enum(['BUY', 'SELL', 'HOLD']),
    confidence: z.number(),
    reasoning: z.string(),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
    technicalIndicators: z.object({
        rsi: z.number().optional(),
        macdSignal: z.string().optional(),
        trend: z.string().optional()
    }).optional()
});

export const suggestStrategyFlow = ai.defineFlow({
    name: 'suggestStrategy',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { symbol, interval, marketData, prices, model } = input;

    // Construct prompt for the "Master Strategy" engine
    let prompt = `You are the Master Strategy Engine for TradeSync. 
    Analyze the following for ${symbol} on the ${interval} timeframe.`;

    if (marketData) {
        prompt += `
        Market Data:
        Price: ${marketData.price}
        RSI: ${marketData.rsi}
        MACD: Value ${marketData.macd.value}, Signal ${marketData.macd.signal}, Hist ${marketData.macd.histogram}
        `;
    } else if (prices && prices.length > 0) {
        prompt += `
        Price History (last ${prices.length} points):
        ${prices.join(', ')}
        
        Calculate simplified technical indicators (trend, volatility) from these prices internally.
        `;
    } else {
        throw new Error("Insufficient data provided for analysis (need marketData or prices)");
    }

    prompt += `
    Determine the optimal trading action (BUY, SELL, HOLD) based on technical analysis principles.
    
    If you have price history, calculate these indicators:
    - RSI (14-period): Overbought > 70, Oversold < 30
    - MACD crossover signal
    - Overall trend direction
    
    Explain your reasoning clearly.
    Assess the risk level (LOW, MEDIUM, HIGH).
    Suggest stop-loss and take-profit levels based on support/resistance.
    `;

    const result = await ai.generate({
        model: model || MODEL_PRO,
        prompt: prompt,
        output: { schema: OutputSchema },
        config: {
            temperature: 0.2,
            thinkingConfig: {
                thinkingBudget: THINKING_BUDGET_HIGH,
            },
            tools: [
                { codeExecution: {} }
            ]
        }
    });

    if (!result.output) {
        throw new Error('Strategy generation failed - no structured output');
    }
    
    return result.output; 
});

export async function handleSuggestStrategy(req: Request, res: Response) {
    try {
        const result = await suggestStrategyFlow(req.body);
        res.json(result);
    } catch (error: unknown) {
        console.error('[suggestStrategy] Error:', error);
        res.status(500).json({ error: String(error) });
    }
}
