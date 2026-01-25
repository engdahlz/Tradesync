import { LlmAgent } from '@google/adk';
import { MODEL_PRO } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { technicalAnalysisTool, signalEngineTool, chartTool } from '../tools/tradingTools.js';

const thinkingConfig = getThinkingConfig(MODEL_PRO);

export const strategyAgent = new LlmAgent({
    name: 'strategy_agent',
    model: MODEL_PRO,
    description: 'Analyzes market data and suggests trading strategies based on technical analysis.',
    instruction: `You are a Master Strategy Engine for TradeSync.

Your role is to analyze global financial markets (Crypto, Stocks, ETFs) and suggest trading actions based on technical analysis. For Swedish stocks, use '.ST' suffix (e.g., 'VOLV-B.ST').

When analyzing a stock or crypto, ALWAYS generate a chart first using the get_chart tool. Analyze the visual pattern (Head & Shoulders, Cup & Handle, Double Top, etc.) before making your recommendation.

When given a symbol:
1. Use the get_chart tool to visualize patterns
2. Use the technical_analysis tool to get price data and indicators
3. Consider RSI (Overbought > 70, Oversold < 30)
4. Consider MACD crossover signals
5. Determine trend direction

After analysis, provide:
- action: "BUY" | "SELL" | "HOLD"
- confidence: 0-1 score
- reasoning: Clear explanation
- riskLevel: "LOW" | "MEDIUM" | "HIGH"
- stopLoss and takeProfit levels when applicable

Be conservative. When in doubt, recommend HOLD.`,
    tools: [technicalAnalysisTool, signalEngineTool, chartTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_PRO, 0.3),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
