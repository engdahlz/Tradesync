import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';
import { MODEL_PRO } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { DOCUMENT_ANALYSIS_INSTRUCTION } from '../prompts/agentPrompts.js';

const thinkingConfig = getThinkingConfig(MODEL_PRO);

export const documentAnalysisAgent = new LlmAgent({
    name: 'document_analysis_agent',
    model: MODEL_PRO,
    description: 'Analyzes financial documents (SEC filings, earnings reports) for trading insights.',
    instruction: DOCUMENT_ANALYSIS_INSTRUCTION,
    tools: [GOOGLE_SEARCH],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_PRO, 1.0),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
