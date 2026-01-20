/**
 * Signal Engine Flow
 * Combines Technical Analysis (RSI, MACD) with News Sentiment to generate Trade Signals
 */

import { z } from 'zod'; // Use standard zod, not genkit's re-export if possible, but genkit exports it too.
// Actually genkit exports z.
import { ai } from '../genkit.js';

const InputSchema = z.object({
    symbol: z.string(),
    sentimentScore: z.number(), // -1.0 to 1.0
    rsi: z.number(), // 0-100
    macd: z.object({
        macd: z.number(),
        signal: z.number(),
        histogram: z.number()
    }),
    price: z.number()
});

const OutputSchema = z.object({
    action: z.enum(['BUY', 'SELL', 'HOLD']),
    confidence: z.number(), // 0-1
    reasoning: z.string(),
    score: z.number() // -100 to 100
});

export const calculateSignalFlow = ai.defineFlow({
    name: 'calculateSignal',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { symbol, sentimentScore, rsi, macd } = input;
    let score = 0;
    const reasons: string[] = [];

    // 1. RSI Analysis (Counter-trend)
    if (rsi < 30) {
        score += 25;
        reasons.push(`RSI is oversold (${rsi.toFixed(1)})`);
    } else if (rsi > 70) {
        score -= 25;
        reasons.push(`RSI is overbought (${rsi.toFixed(1)})`);
    }

    // 2. MACD Analysis (Trend Following)
    if (macd.histogram > 0 && macd.macd > macd.signal) {
        score += 25;
        reasons.push('MACD is bullish (Histogram positive)');
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
        score -= 25;
        reasons.push('MACD is bearish (Histogram negative)');
    }

    // 3. Sentiment Analysis (Fundamental)
    // Scale sentiment (-1 to 1) to score (-50 to 50)
    const sentimentImpact = sentimentScore * 50;
    score += sentimentImpact;
    
    if (sentimentScore > 0.5) reasons.push('News sentiment is strongly positive');
    else if (sentimentScore < -0.5) reasons.push('News sentiment is strongly negative');

    // 4. Decision Logic
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;

    if (score >= 50) {
        action = 'BUY';
        confidence = Math.min(score / 100, 1);
    } else if (score <= -50) {
        action = 'SELL';
        confidence = Math.min(Math.abs(score) / 100, 1);
    } else {
        confidence = 1 - (Math.abs(score) / 50); // Higher confidence in HOLD if closer to 0
    }

    return {
        action,
        confidence,
        score,
        reasoning: reasons.join('. ') || 'Market conditions are neutral.'
    };
});
