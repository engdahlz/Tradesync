import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { vertexRagTool } from '../../tools/vertexTools.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { VERTEX_RAG_INSTRUCTION } from '../../prompts/agentPrompts.js';
import { enableVertexRag } from './researchConfig.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const vertexRagAgent = new LlmAgent({
    name: 'vertex_rag_agent',
    model: MODEL_FLASH,
    description: 'Retrieves grounded chunks from Vertex AI RAG Engine.',
    instruction: VERTEX_RAG_INSTRUCTION,
    tools: enableVertexRag ? [vertexRagTool] : [],
    outputKey: RESEARCH_STATE_KEYS.vertexRag,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
