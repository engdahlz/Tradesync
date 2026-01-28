import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { knowledgeTool } from '../../tools/knowledgeTool.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';
import { RAG_RESEARCH_INSTRUCTION } from '../../prompts/agentPrompts.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const ragResearchAgent = new LlmAgent({
    name: 'rag_research_agent',
    model: MODEL_FLASH,
    description: 'Pulls relevant knowledge base excerpts.',
    instruction: RAG_RESEARCH_INSTRUCTION,
    tools: [knowledgeTool],
    outputKey: RESEARCH_STATE_KEYS.rag,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
