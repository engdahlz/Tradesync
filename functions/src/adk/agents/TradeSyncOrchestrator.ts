import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { advisorWorkflowAgent } from './AdvisorWorkflowAgent.js';
import { strategyAgent } from './StrategyAgent.js';
import { videoAnalysisAgent } from './VideoAnalysisAgent.js';
import { documentAnalysisAgent } from './DocumentAnalysisAgent.js';
import { tradeExecutionTool, confirmTradeTool } from '../tools/tradingTools.js';

const thinkingConfig = getThinkingConfig(MODEL_FLASH);

export const tradeSyncOrchestrator = new LlmAgent({
    name: 'tradesync_orchestrator',
    model: MODEL_FLASH,
    description: 'Main TradeSync orchestrator that routes requests to specialized agents.',
    globalInstruction: `You are TradeSync AI - a comprehensive trading intelligence platform.

Be concise, professional, and data-driven. Always prioritize user safety and risk management.`,
    instruction: `You are the TradeSync Orchestrator - the main entry point for all trading queries.

You route requests to specialized agents:
- advisor_workflow_agent: Head of Research. Runs parallel research and delivers the final synthesis.
- strategy_agent: Market Strategy Engine. Specialized in technical analysis and chart patterns.
- video_analysis_agent: Analyze YouTube trading videos
- document_analysis_agent: Analyze financial documents (SEC filings, reports)
- execute_trade: Place paper trading orders
- confirm_trade: Confirms a pending trade request

Routing Guidelines:
 1. General trading questions, analysis requests ("What about BTC?", "Analyze Apple") → advisor_workflow_agent
2. "Analyze this video" → video_analysis_agent
3. "Analyze this document/URL" → document_analysis_agent
4. "Show me a chart of Tesla" or chart requests → strategy_agent
5. "Buy/Sell X" or trade requests → Always attempt to call execute_trade first. The system will handle blocking and confirmation if needed.
6. If the user says 'Yes' or 'Confirm' to a pending trade request, call the confirm_trade tool first, and then immediately call execute_trade to complete the transaction.

For simple greetings or clarifications, respond directly without delegating.

Safety Rules:
- Never recommend all-in positions
- Always mention risk when discussing trades
- Encourage paper trading before real trading`,
    subAgents: [
        advisorWorkflowAgent,
        strategyAgent,
        videoAnalysisAgent,
        documentAnalysisAgent,
    ],
    tools: [tradeExecutionTool, confirmTradeTool],
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.7),
        safetySettings: getSafetySettings(),
        ...(thinkingConfig ? { thinkingConfig } : {}),
    },
});
