import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { marketNewsTool } from '../tools/tradingTools.js';
import { NEWS_ANALYSIS_INSTRUCTION } from '../prompts/agentPrompts.js';

const thinkingConfig = getThinkingConfig(MODEL_FLASH);

export const newsAnalysisAgent = new LlmAgent({
    name: 'news_analysis_agent',
    model: MODEL_FLASH,
    description: 'Analyzes financial news articles for market impact and sentiment.',
    instruction: NEWS_ANALYSIS_INSTRUCTION,
    tools: [marketNewsTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.3),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
