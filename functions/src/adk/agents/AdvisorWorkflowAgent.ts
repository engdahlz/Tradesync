import { LlmAgent, ParallelAgent, SequentialAgent, GOOGLE_SEARCH } from '@google/adk';
import { MODEL_FLASH, MODEL_PRO } from '../../config.js';
import { getSafetySettings, getTemperatureForModel, getThinkingConfig } from '../../services/genaiClient.js';
import { latestSignalsTool, marketNewsTool, technicalAnalysisTool } from '../tools/tradingTools.js';
import { knowledgeTool } from '../tools/knowledgeTool.js';
import { memorySearchTool } from '../tools/memoryTool.js';
import { vertexSearchTool, vertexRagTool } from '../tools/vertexTools.js';
import { RESEARCH_STATE_KEYS, SUMMARY_STATE_KEY } from './advisorWorkflowState.js';

const thinkingFlash = getThinkingConfig(MODEL_FLASH);
const thinkingPro = getThinkingConfig(MODEL_PRO);

const enableGoogleSearch = process.env.ENABLE_GOOGLE_SEARCH !== 'false';
const enableVertexSearch = !!process.env.VERTEX_AI_SEARCH_DATASTORE_ID;
const enableVertexRag = !!process.env.VERTEX_RAG_CORPUS_ID;

const signalsResearchAgent = new LlmAgent({
    name: 'signals_research_agent',
    model: MODEL_FLASH,
    description: 'Pulls latest scan signals and highlights the most relevant ones.',
    instruction: `You are a market signal scout.

Use get_latest_market_signals and summarize only what is relevant to the user request.
If the request has a clear symbol, filter to that symbol first.
Return a concise bullet list with: symbol, action, confidence, and one-line reasoning.
If no signals are available, say "No recent signals available."`,
    tools: [latestSignalsTool],
    outputKey: RESEARCH_STATE_KEYS.signals,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});

const technicalResearchAgent = new LlmAgent({
    name: 'technical_research_agent',
    model: MODEL_FLASH,
    description: 'Runs fast technical diagnostics for the requested asset.',
    instruction: `You are a technical research analyst.

Extract the primary asset symbol from the user request and call technical_analysis.
If you cannot identify a symbol, respond with "No symbol detected for technical analysis."
Summarize: trend, current price, RSI, MACD histogram, and key levels.`,
    tools: [technicalAnalysisTool],
    outputKey: RESEARCH_STATE_KEYS.technical,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});

const newsResearchAgent = new LlmAgent({
    name: 'news_research_agent',
    model: MODEL_FLASH,
    description: 'Fetches and summarizes recent market news for the asset.',
    instruction: `You are a news analyst.

Use get_market_news with the most relevant tickers from the user request.
Summarize 3-5 headlines, overall sentiment, and the most important risk drivers.
If no tickers are given, default to the most likely asset in the request.`,
    tools: [marketNewsTool],
    outputKey: RESEARCH_STATE_KEYS.news,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.3),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});

const ragResearchAgent = new LlmAgent({
    name: 'rag_research_agent',
    model: MODEL_FLASH,
    description: 'Pulls relevant knowledge base excerpts.',
    instruction: `You are a knowledge base analyst.

Use search_knowledge_base to retrieve relevant excerpts for concepts, strategies, or risk guidance.
If the request is purely price-focused with no conceptual angle, reply "No RAG lookup needed."
Return bullet points with source titles and short excerpts.`,
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

const memoryResearchAgent = new LlmAgent({
    name: 'memory_research_agent',
    model: MODEL_FLASH,
    description: 'Retrieves stored preferences and prior decisions.',
    instruction: `You are a memory retriever.

Call search_memory for user preferences (risk tolerance, time horizon, asset biases, constraints).
Summarize any relevant memories in bullet points. If none, say "No stored memory found."`,
    tools: [memorySearchTool],
    outputKey: RESEARCH_STATE_KEYS.memory,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});

const searchResearchAgent = new LlmAgent({
    name: 'search_research_agent',
    model: MODEL_FLASH,
    description: 'Uses Google Search for fresh, real-time context.',
    instruction: `You are a live market researcher.

Use Google Search to gather recent, credible information that impacts the user request.
Summarize key findings with dates and sources where possible.`,
    tools: enableGoogleSearch ? [GOOGLE_SEARCH] : [],
    outputKey: RESEARCH_STATE_KEYS.search,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        safetySettings: getSafetySettings(),
        ...(thinkingFlash ? { thinkingConfig: thinkingFlash } : {}),
    },
});

const vertexSearchAgent = new LlmAgent({
    name: 'vertex_search_agent',
    model: MODEL_FLASH,
    description: 'Queries a private Vertex AI Search datastore.',
    instruction: `You are a private search specialist.

If Vertex AI Search is enabled, call vertex_ai_search with the user request.
Summarize the most relevant findings with short citations.
If unavailable, reply "Vertex AI Search not configured."`,
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

const vertexRagAgent = new LlmAgent({
    name: 'vertex_rag_agent',
    model: MODEL_FLASH,
    description: 'Retrieves grounded chunks from Vertex AI RAG Engine.',
    instruction: `You are a RAG retrieval specialist.

If Vertex RAG is enabled, call vertex_ai_rag_retrieval with the user request.
Summarize the top chunks with citations.
If unavailable, reply "Vertex RAG not configured."`,
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

const advisorSynthesisAgent = new LlmAgent({
    name: 'advisor_synthesis_agent',
    model: MODEL_PRO,
    description: 'Synthesizes research signals into a coherent recommendation.',
    instruction: `You are TradeSync's Lead Advisor. Use the research outputs to answer the user.

Session summary:
{${SUMMARY_STATE_KEY}?}

Research inputs:
- Signals: {${RESEARCH_STATE_KEYS.signals}?}
- Technicals: {${RESEARCH_STATE_KEYS.technical}?}
- News: {${RESEARCH_STATE_KEYS.news}?}
- Knowledge Base: {${RESEARCH_STATE_KEYS.rag}?}
- Memory: {${RESEARCH_STATE_KEYS.memory}?}
- Web Search: {${RESEARCH_STATE_KEYS.search}?}
- Vertex Search: {${RESEARCH_STATE_KEYS.vertexSearch}?}
- Vertex RAG: {${RESEARCH_STATE_KEYS.vertexRag}?}

Response format:
1) Recommendation (BUY/SELL/HOLD + confidence)
2) Technical view (key levels + indicators)
3) Fundamental/news view (headlines + sentiment)
4) Knowledge base insight (if any)
5) User fit (memory alignment)
6) Risks & next steps

Be conservative, avoid absolutes, and always include a risk warning.`,
    generateContentConfig: {
        temperature: getTemperatureForModel(MODEL_PRO, 0.4),
        safetySettings: getSafetySettings(),
        ...(thinkingPro ? { thinkingConfig: thinkingPro } : {}),
    },
});

const researchAgents = [
    signalsResearchAgent,
    technicalResearchAgent,
    newsResearchAgent,
    ragResearchAgent,
    memoryResearchAgent,
    searchResearchAgent,
    ...(enableVertexSearch ? [vertexSearchAgent] : []),
    ...(enableVertexRag ? [vertexRagAgent] : []),
];

const advisorResearchParallel = new ParallelAgent({
    name: 'advisor_research_parallel',
    description: 'Runs all research agents in parallel.',
    subAgents: researchAgents,
});

export const advisorWorkflowAgent = new SequentialAgent({
    name: 'advisor_workflow_agent',
    description: 'Parallel research + synthesis workflow for trading advice.',
    subAgents: [advisorResearchParallel, advisorSynthesisAgent],
});
