import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { latestSignalsTool } from '../../tools/tradingTools.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { SIGNALS_RESEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const signalsResearchAgent = new LlmAgent({
    name: 'signals_research_agent',
    model: MODEL_FLASH,
    description: 'Pulls latest scan signals and highlights the most relevant ones.',
    instruction: SIGNALS_RESEARCH_INSTRUCTION,
    tools: [latestSignalsTool],
    outputKey: RESEARCH_STATE_KEYS.signals,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
