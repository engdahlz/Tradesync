import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { technicalAnalysisTool } from '../../tools/tradingTools.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { TECHNICAL_RESEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const technicalResearchAgent = new LlmAgent({
    name: 'technical_research_agent',
    model: MODEL_FLASH,
    description: 'Runs fast technical diagnostics for the requested asset.',
    instruction: TECHNICAL_RESEARCH_INSTRUCTION,
    tools: [technicalAnalysisTool],
    outputKey: RESEARCH_STATE_KEYS.technical,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
