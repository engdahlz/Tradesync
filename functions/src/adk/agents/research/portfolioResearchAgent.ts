import { LlmAgent } from '@google/adk';
import { MODEL_FLASH } from '../../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../../services/genaiClient.js';
import { portfolioTool } from '../../tools/portfolioTool.js';
import { RESEARCH_STATE_KEYS } from '../advisorWorkflowState.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);

export const PORTFOLIO_RESEARCH_INSTRUCTION = `You are a portfolio analyst.

Call get_portfolio to retrieve the user's current holdings.
Summarize the portfolio status:
- Total value and cash balance
- Largest positions
- Overall performance (if price data is available)
- Any concentration risks (e.g. "50% of portfolio is in BTC")

If the portfolio is empty, state that clearly.`;

export const portfolioResearchAgent = new LlmAgent({
    name: 'portfolio_research_agent',
    model: MODEL_FLASH,
    description: 'Analyzes the user\'s current portfolio holdings and exposure.',
    instruction: PORTFOLIO_RESEARCH_INSTRUCTION,
    tools: [portfolioTool],
    outputKey: RESEARCH_STATE_KEYS.portfolio,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});
