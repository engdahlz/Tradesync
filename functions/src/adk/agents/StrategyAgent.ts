import { LlmAgent } from '@google/adk';
import { MODEL_PRO } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { technicalAnalysisTool, signalEngineTool, chartTool, portfolioTool } from '../tools/tradingTools.js';
import { STRATEGY_AGENT_INSTRUCTION } from '../prompts/agentPrompts.js';

const thinkingConfig = getThinkingConfig(MODEL_PRO);

export const strategyAgent = new LlmAgent({
    name: 'strategy_agent',
    model: MODEL_PRO,
    description: 'Analyzes market data and suggests trading strategies based on technical analysis.',
    disallowTransferToParent: true,
    instruction: STRATEGY_AGENT_INSTRUCTION,
    tools: [technicalAnalysisTool, signalEngineTool, chartTool, portfolioTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_PRO, 0.3),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
