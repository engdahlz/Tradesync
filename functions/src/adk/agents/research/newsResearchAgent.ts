import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { marketNewsTool } from '../../tools/tradingTools.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { NEWS_RESEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const newsResearchAgent = new LlmAgent({
    name: 'news_research_agent',
    model: MODEL_FLASH,
    description: 'Fetches and summarizes recent market news for the asset.',
    instruction: NEWS_RESEARCH_INSTRUCTION,
    tools: [marketNewsTool],
    outputKey: RESEARCH_STATE_KEYS.news,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.3),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
