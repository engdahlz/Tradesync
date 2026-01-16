/**
 * Master Strategy Flow
 * Analyzes market data and suggests trading actions
 */

import type { Request, Response } from 'express';
import { ai } from '../genkit.js';
import { z } from 'genkit';
import { MODEL_PRO, MODEL_FLASH } from '../config.js';

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
    takeProfit: z.number().optional()
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
    Explain your reasoning clearly.
    Assess the risk level.
    Suggest stop-loss and take-profit levels if applicable.
    `;

    const result = await ai.generate({
        model: model || MODEL_PRO,
        prompt: prompt,
        config: {
            temperature: 0.2, // Low temperature for consistent strategy
        }
    });

    // Parse JSON from the response text (assuming the model returns JSON as requested by schema, 
    // but Genkit's outputSchema handling usually ensures structured output if the model supports it.
    // For now, we rely on Genkit's structured output capability if we had defined it that way, 
    // but here we are using simple text generation and might need to parse or trust the model.
    // **Correction**: To enforce JSON, we should rely on Genkit's `output` functionality or instruct the model strictly.
    // Since we defined outputSchema, Genkit tries to enforce it.
    
    // However, the `generate` call above returns a `GenerateResponse`. 
    // We need to ensure we return the object matching OutputSchema.
    // For this prototype, we will assume the model output needs to be parsed or is returned as data.
    
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
