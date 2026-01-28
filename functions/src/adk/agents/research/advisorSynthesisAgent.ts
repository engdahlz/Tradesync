import { LlmAgent } from '@google/adk';
import { MODEL_PRO } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { RESEARCH_STATE_KEYS, SUMMARY_STATE_KEY } from '../advisorWorkflowState.js';
import { buildAdvisorSynthesisInstruction } from '../../prompts/agentPrompts.js';

const thinkingPro = getThinkingConfig(MODEL_PRO);

export const advisorSynthesisAgent = new LlmAgent({
    name: 'advisor_synthesis_agent',
    model: MODEL_PRO,
    description: 'Synthesizes research signals into a coherent recommendation.',
    instruction: buildAdvisorSynthesisInstruction({
        summaryKey: SUMMARY_STATE_KEY,
        signalsKey: RESEARCH_STATE_KEYS.signals,
        technicalKey: RESEARCH_STATE_KEYS.technical,
        newsKey: RESEARCH_STATE_KEYS.news,
        ragKey: RESEARCH_STATE_KEYS.rag,
        memoryKey: RESEARCH_STATE_KEYS.memory,
        searchKey: RESEARCH_STATE_KEYS.search,
        vertexSearchKey: RESEARCH_STATE_KEYS.vertexSearch,
        vertexRagKey: RESEARCH_STATE_KEYS.vertexRag,
    }),
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_PRO, 0.4),
        safetySettings: getSafetySettings(),
        ...(thinkingPro ? { thinkingConfig: thinkingPro } : {}),
    },
});
