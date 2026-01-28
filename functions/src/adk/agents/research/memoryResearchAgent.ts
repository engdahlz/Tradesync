import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { memorySearchTool } from '../../tools/memoryTool.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { MEMORY_RESEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const memoryResearchAgent = new LlmAgent({
    name: 'memory_research_agent',
    model: MODEL_FLASH,
    description: 'Retrieves stored preferences and prior decisions.',
    instruction: MEMORY_RESEARCH_INSTRUCTION,
    tools: [memorySearchTool],
    outputKey: RESEARCH_STATE_KEYS.memory,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
