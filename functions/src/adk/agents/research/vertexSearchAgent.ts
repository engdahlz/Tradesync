import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { vertexSearchTool } from '../../tools/vertexTools.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { VERTEX_SEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';
import { enableVertexSearch } from './researchConfig.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const vertexSearchAgent = new LlmAgent({
    name: 'vertex_search_agent',
    model: MODEL_FLASH,
    description: 'Queries a private Vertex AI Search datastore.',
    instruction: VERTEX_SEARCH_INSTRUCTION,
    tools: enableVertexSearch ? [vertexSearchTool] : [],
    outputKey: RESEARCH_STATE_KEYS.vertexSearch,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
