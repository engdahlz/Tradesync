import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { advisorWorkflowAgent } from './AdvisorWorkflowAgent.js';
import { strategyAgent } from './StrategyAgent.js';
import { videoAnalysisAgent } from './VideoAnalysisAgent.js';
import { documentAnalysisAgent } from './DocumentAnalysisAgent.js';
import { autoTraderAgent } from './AutoTraderAgent.js';
import { tradeExecutionTool, confirmTradeTool, portfolioTool } from '../tools/tradingTools.js';
import { ORCHESTRATOR_GLOBAL_INSTRUCTION, ORCHESTRATOR_INSTRUCTION } from '../prompts/agentPrompts.js';

const thinkingConfig = getThinkingConfig(MODEL_FLASH);

export const tradeSyncOrchestrator = new LlmAgent({
    name: 'tradesync_orchestrator',
    model: MODEL_FLASH,
    description: 'Main TradeSync orchestrator that routes requests to specialized agents.',
    globalInstruction: ORCHESTRATOR_GLOBAL_INSTRUCTION,
    instruction: ORCHESTRATOR_INSTRUCTION,
    subAgents: [
        advisorWorkflowAgent,
        strategyAgent,
        videoAnalysisAgent,
        documentAnalysisAgent,
        autoTraderAgent,
    ],
    tools: [tradeExecutionTool, confirmTradeTool, portfolioTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.7),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
