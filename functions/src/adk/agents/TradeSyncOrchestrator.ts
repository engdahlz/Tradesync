import { LlmAgent, AgentTool } from '@google/adk';
import { MODEL_FLASH } from '../../config.js';
import { advisorAgent } from './AdvisorAgent.js';
import { videoAnalysisAgent } from './VideoAnalysisAgent.js';
import { documentAnalysisAgent } from './DocumentAnalysisAgent.js';
import { tradeExecutionTool, confirmTradeTool } from '../tools/tradingTools.js';

const advisorTool = new AgentTool({ agent: advisorAgent });
const videoTool = new AgentTool({ agent: videoAnalysisAgent });
const documentTool = new AgentTool({ agent: documentAnalysisAgent });

export const tradeSyncOrchestrator = new LlmAgent({
    name: 'tradesync_orchestrator',
    model: MODEL_FLASH,
    description: 'Main TradeSync orchestrator that routes requests to specialized agents.',
    globalInstruction: `You are TradeSync AI - a comprehensive trading intelligence platform.

Be concise, professional, and data-driven. Always prioritize user safety and risk management.`,
    instruction: `You are the TradeSync Orchestrator - the main entry point for all trading queries.

You route requests to specialized agents:
- advisor_agent: Head of Research. Handles detailed analysis, strategy synthesis, and Q&A.
- video_analysis_agent: Analyze YouTube trading videos
- document_analysis_agent: Analyze financial documents (SEC filings, reports)
- execute_trade: Place paper trading orders
- confirm_trade: Confirms a pending trade request

Routing Guidelines:
1. General trading questions, analysis requests ("What about BTC?") → advisor_agent
2. "Analyze this video" → video_analysis_agent
3. "Analyze this document/URL" → document_analysis_agent
4. "Buy/Sell X" or trade requests → Confirm with user, then execute_trade
5. If the user says 'Yes' or 'Confirm' to a pending trade request, call the confirm_trade tool first, then retry the trade execution.

For simple greetings or clarifications, respond directly without delegating.

Safety Rules:
- Never recommend all-in positions
- Always mention risk when discussing trades
- Encourage paper trading before real trading`,
    tools: [
        advisorTool,
        videoTool,
        documentTool,
        tradeExecutionTool,
        confirmTradeTool,
    ],
    generateContentConfig: {
        temperature: 0.7,
    },
});
