import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { SEARCH_RESEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';
import { enableGoogleSearch } from './researchConfig.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const searchResearchAgent = new LlmAgent({
    name: 'search_research_agent',
    model: MODEL_FLASH,
    description: 'Uses Google Search for fresh, real-time context.',
    instruction: SEARCH_RESEARCH_INSTRUCTION,
    tools: enableGoogleSearch ? [GOOGLE_SEARCH] : [],
    outputKey: RESEARCH_STATE_KEYS.search,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
