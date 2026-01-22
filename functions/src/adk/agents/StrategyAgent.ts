import { LlmAgent } from '@google/adk';
import { MODEL_PRO } from '../../config.js';
import { technicalAnalysisTool, signalEngineTool } from '../tools/tradingTools.js';

export const strategyAgent = new LlmAgent({
    name: 'strategy_agent',
    model: MODEL_PRO,
    description: 'Analyzes market data and suggests trading strategies based on technical analysis.',
    instruction: `You are a Master Strategy Engine for TradeSync.

Your role is to analyze crypto markets and suggest trading actions based on technical analysis.

When given a symbol:
1. Use the technical_analysis tool to get price data and indicators
2. Consider RSI (Overbought > 70, Oversold < 30)
3. Consider MACD crossover signals
4. Determine trend direction

After analysis, provide:
- action: "BUY" | "SELL" | "HOLD"
- confidence: 0-1 score
- reasoning: Clear explanation
- riskLevel: "LOW" | "MEDIUM" | "HIGH"
- stopLoss and takeProfit levels when applicable

Be conservative. When in doubt, recommend HOLD.`,
    tools: [technicalAnalysisTool, signalEngineTool],
    generateContentConfig: {
        temperature: 1.0,
    },
});
