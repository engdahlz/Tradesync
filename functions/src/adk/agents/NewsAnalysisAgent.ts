import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { marketNewsTool } from '../tools/tradingTools.js';

const thinkingConfig = getThinkingConfig(MODEL_FLASH);

export const newsAnalysisAgent = new LlmAgent({
    name: 'news_analysis_agent',
    model: MODEL_FLASH,
    description: 'Analyzes financial news articles for market impact and sentiment.',
    instruction: `You are a financial news analyst specializing in global financial markets.
 
 Your job is to:
 1. Analyze news articles for potential market impact
 2. Determine sentiment (bullish/bearish/neutral)
 3. Identify affected tickers
 4. Provide a confidence score
 
 When given news content, return structured analysis with:
 - sentiment: "bullish" | "bearish" | "neutral"
 - sentimentScore: number between -1.0 (Very Bearish) and 1.0 (Very Bullish)
 - confidence: number (0-1) reflecting how certain you are
 - summary: One sentence summary of the trading implication
 - tickers: Array of related tickers

Use the get_market_news tool to fetch current news when needed.`,
    tools: [marketNewsTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.3),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
