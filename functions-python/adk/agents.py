"""ADK agent graph for TradeSync (Python)."""

from __future__ import annotations

from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk.tools import google_search
from google.genai import types

from . import config
from .genai_client import get_safety_settings, get_temperature_for_model, get_thinking_config
from .tools import (
    latest_signals_tool,
    market_news_tool,
    technical_analysis_tool,
    calculate_signal_tool,
    knowledge_tool,
    memory_search_tool,
    vertex_search_tool,
    vertex_rag_tool,
    trade_execution_tool,
    confirm_trade_tool,
    chart_tool,
    fetch_transcript_tool,
)

thinking_flash = get_thinking_config(config.MODEL_FLASH)
thinking_pro = get_thinking_config(config.MODEL_PRO)

enable_vertex_search = bool(config.VERTEX_AI_SEARCH_DATASTORE_ID)
enable_vertex_rag = bool(config.VERTEX_RAG_CORPUS_ID)

signals_research_agent = LlmAgent(
    name='signals_research_agent',
    model=config.MODEL_FLASH,
    description='Pulls latest scan signals and highlights the most relevant ones.',
    instruction=(
        'You are a market signal scout.\n\n'
        'Use get_latest_market_signals and summarize only what is relevant to the user request.\n'
        'If the request has a clear symbol, filter to that symbol first.\n'
        'Return a concise bullet list with: symbol, action, confidence, and one-line reasoning.\n'
        'If no signals are available, say "No recent signals available."'
    ),
    tools=[latest_signals_tool],
    output_key=config.RESEARCH_STATE_KEYS['signals'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

technical_research_agent = LlmAgent(
    name='technical_research_agent',
    model=config.MODEL_FLASH,
    description='Runs fast technical diagnostics for the requested asset.',
    instruction=(
        'You are a technical research analyst.\n\n'
        'Extract the primary asset symbol from the user request and call technical_analysis.\n'
        'If you cannot identify a symbol, respond with "No symbol detected for technical analysis."\n'
        'Summarize: trend, current price, RSI, MACD histogram, and key levels.'
    ),
    tools=[technical_analysis_tool],
    output_key=config.RESEARCH_STATE_KEYS['technical'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

news_research_agent = LlmAgent(
    name='news_research_agent',
    model=config.MODEL_FLASH,
    description='Fetches and summarizes recent market news for the asset.',
    instruction=(
        'You are a news analyst.\n\n'
        'Use get_market_news with the most relevant tickers from the user request.\n'
        'Summarize 3-5 headlines, overall sentiment, and the most important risk drivers.\n'
        'If no tickers are given, default to the most likely asset in the request.'
    ),
    tools=[market_news_tool],
    output_key=config.RESEARCH_STATE_KEYS['news'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.3),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

rag_research_agent = LlmAgent(
    name='rag_research_agent',
    model=config.MODEL_FLASH,
    description='Pulls relevant knowledge base excerpts.',
    instruction=(
        'You are a knowledge base analyst.\n\n'
        'Use search_knowledge_base to retrieve relevant excerpts for concepts, strategies, or risk guidance.\n'
        'If the request is purely price-focused with no conceptual angle, reply "No RAG lookup needed."\n'
        'Return bullet points with source titles and short excerpts.'
    ),
    tools=[knowledge_tool],
    output_key=config.RESEARCH_STATE_KEYS['rag'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

memory_research_agent = LlmAgent(
    name='memory_research_agent',
    model=config.MODEL_FLASH,
    description='Retrieves stored preferences and prior decisions.',
    instruction=(
        'You are a memory retriever.\n\n'
        'Call search_memory for user preferences (risk tolerance, time horizon, asset biases, constraints).\n'
        'Summarize any relevant memories in bullet points. If none, say "No stored memory found."'
    ),
    tools=[memory_search_tool],
    output_key=config.RESEARCH_STATE_KEYS['memory'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

search_research_agent = LlmAgent(
    name='search_research_agent',
    model=config.MODEL_FLASH,
    description='Uses Google Search for fresh, real-time context.',
    instruction=(
        'You are a live market researcher.\n\n'
        'Use Google Search to gather recent, credible information that impacts the user request.\n'
        'Summarize key findings with dates and sources where possible.'
    ),
    tools=[google_search] if config.ENABLE_GOOGLE_SEARCH else [],
    output_key=config.RESEARCH_STATE_KEYS['search'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

vertex_search_agent = LlmAgent(
    name='vertex_search_agent',
    model=config.MODEL_FLASH,
    description='Queries a private Vertex AI Search datastore.',
    instruction=(
        'You are a private search specialist.\n\n'
        'If Vertex AI Search is enabled, call vertex_ai_search with the user request.\n'
        'Summarize the most relevant findings with short citations.\n'
        'If unavailable, reply "Vertex AI Search not configured."'
    ),
    tools=[vertex_search_tool] if enable_vertex_search else [],
    output_key=config.RESEARCH_STATE_KEYS['vertexSearch'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

vertex_rag_agent = LlmAgent(
    name='vertex_rag_agent',
    model=config.MODEL_FLASH,
    description='Retrieves grounded chunks from Vertex AI RAG Engine.',
    instruction=(
        'You are a RAG retrieval specialist.\n\n'
        'If Vertex RAG is enabled, call vertex_ai_rag_retrieval with the user request.\n'
        'Summarize the top chunks with citations.\n'
        'If unavailable, reply "Vertex RAG not configured."'
    ),
    tools=[vertex_rag_tool] if enable_vertex_rag else [],
    output_key=config.RESEARCH_STATE_KEYS['vertexRag'],
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.2),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

advisor_synthesis_agent = LlmAgent(
    name='advisor_synthesis_agent',
    model=config.MODEL_PRO,
    description='Synthesizes research signals into a coherent recommendation.',
    instruction=(
        'You are TradeSync\'s Lead Advisor. Use the research outputs to answer the user.\n\n'
        f"Session summary:\n{{{config.SUMMARY_STATE_KEY}?}}\n\n"
        'Research inputs:\n'
        f"- Signals: {{{config.RESEARCH_STATE_KEYS['signals']}?}}\n"
        f"- Technicals: {{{config.RESEARCH_STATE_KEYS['technical']}?}}\n"
        f"- News: {{{config.RESEARCH_STATE_KEYS['news']}?}}\n"
        f"- Knowledge Base: {{{config.RESEARCH_STATE_KEYS['rag']}?}}\n"
        f"- Memory: {{{config.RESEARCH_STATE_KEYS['memory']}?}}\n"
        f"- Web Search: {{{config.RESEARCH_STATE_KEYS['search']}?}}\n"
        f"- Vertex Search: {{{config.RESEARCH_STATE_KEYS['vertexSearch']}?}}\n"
        f"- Vertex RAG: {{{config.RESEARCH_STATE_KEYS['vertexRag']}?}}\n\n"
        'Response format:\n'
        '1) Recommendation (BUY/SELL/HOLD + confidence)\n'
        '2) Technical view (key levels + indicators)\n'
        '3) Fundamental/news view (headlines + sentiment)\n'
        '4) Knowledge base insight (if any)\n'
        '5) User fit (memory alignment)\n'
        '6) Risks & next steps\n\n'
        'Be conservative, avoid absolutes, and always include a risk warning.'
    ),
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_PRO, 0.4),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_pro,
    ),
)

research_agents = [
    signals_research_agent,
    technical_research_agent,
    news_research_agent,
    rag_research_agent,
    memory_research_agent,
    search_research_agent,
]

if enable_vertex_search:
    research_agents.append(vertex_search_agent)
if enable_vertex_rag:
    research_agents.append(vertex_rag_agent)

advisor_research_parallel = ParallelAgent(
    name='advisor_research_parallel',
    description='Runs all research agents in parallel.',
    sub_agents=research_agents,
)

advisor_workflow_agent = SequentialAgent(
    name='advisor_workflow_agent',
    description='Parallel research + synthesis workflow for trading advice.',
    sub_agents=[advisor_research_parallel, advisor_synthesis_agent],
)

strategy_agent = LlmAgent(
    name='strategy_agent',
    model=config.MODEL_PRO,
    description='Analyzes market data and suggests trading strategies based on technical analysis.',
    instruction=(
        'You are a Master Strategy Engine for TradeSync.\n\n'
        'Your role is to analyze global financial markets (Crypto, Stocks, ETFs) and suggest trading actions based on technical analysis. '
        "For Swedish stocks, use '.ST' suffix (e.g., 'VOLV-B.ST').\n\n"
        'When analyzing a stock or crypto, ALWAYS generate a chart first using the get_chart tool. '
        'Analyze the visual pattern (Head & Shoulders, Cup & Handle, Double Top, etc.) before making your recommendation.\n\n'
        'When given a symbol:\n'
        '1. Use the get_chart tool to visualize patterns\n'
        '2. Use the technical_analysis tool to get price data and indicators\n'
        '3. Consider RSI (Overbought > 70, Oversold < 30)\n'
        '4. Consider MACD crossover signals\n'
        '5. Determine trend direction\n\n'
        'After analysis, provide:\n'
        '- action: "BUY" | "SELL" | "HOLD"\n'
        '- confidence: 0-1 score\n'
        '- reasoning: Clear explanation\n'
        '- riskLevel: "LOW" | "MEDIUM" | "HIGH"\n'
        '- stopLoss and takeProfit levels when applicable\n\n'
        'Be conservative. When in doubt, recommend HOLD.'
    ),
    tools=[technical_analysis_tool, calculate_signal_tool, chart_tool],
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_PRO, 0.3),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_pro,
    ),
)

news_analysis_agent = LlmAgent(
    name='news_analysis_agent',
    model=config.MODEL_FLASH,
    description='Analyzes financial news articles for market impact and sentiment.',
    instruction=(
        'You are a financial news analyst specializing in global financial markets.\n\n'
        'Your job is to:\n'
        '1. Analyze news articles for potential market impact\n'
        '2. Determine sentiment (bullish/bearish/neutral)\n'
        '3. Identify affected tickers\n'
        '4. Provide a confidence score\n\n'
        'When given news content, return structured analysis with:\n'
        '- sentiment: "bullish" | "bearish" | "neutral"\n'
        '- sentimentScore: number between -1.0 (Very Bearish) and 1.0 (Very Bullish)\n'
        '- confidence: number (0-1) reflecting how certain you are\n'
        '- summary: One sentence summary of the trading implication\n'
        '- tickers: Array of related tickers\n\n'
        'Use the get_market_news tool to fetch current news when needed.'
    ),
    tools=[market_news_tool],
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.3),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

video_analysis_agent = LlmAgent(
    name='video_analysis_agent',
    model=config.MODEL_FLASH,
    description='Analyzes YouTube trading videos for sentiment and price levels.',
    instruction=(
        'You are a financial video analyst specializing in crypto trading content.\n\n'
        'Your job is to:\n'
        '1. Fetch video transcripts using the fetch_youtube_transcript tool\n'
        '2. Analyze the content for trading insights\n'
        '3. Extract mentioned price targets, support/resistance levels\n'
        '4. Determine overall sentiment\n\n'
        'Provide analysis with:\n'
        '- sentiment: "bullish" | "bearish" | "neutral"\n'
        '- confidence: 0-1\n'
        '- tickers: Array of mentioned crypto tickers\n'
        '- priceLevels: { targets: [], supports: [], resistances: [] }\n'
        '- summary: 2 sentence summary\n'
        '- keyPoints: 3-5 key takeaways\n\n'
        'Be specific about price levels when mentioned.'
    ),
    tools=[fetch_transcript_tool],
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 1.0),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)

document_analysis_agent = LlmAgent(
    name='document_analysis_agent',
    model=config.MODEL_PRO,
    description='Analyzes financial documents (SEC filings, earnings reports) for trading insights.',
    instruction=(
        'You are a financial document analyst specializing in trading and investment research.\n\n'
        'Your role is to analyze documents for actionable trading insights.\n\n'
        'When given a URL or document content:\n'
        '1. Identify the document type (10-K, earnings report, news article, etc.)\n'
        '2. Extract key financial metrics if applicable\n'
        '3. Identify risks and opportunities\n'
        '4. Determine sentiment and trading implications\n\n'
        'Use Google Search to find and analyze documents when given a URL.\n\n'
        'Provide analysis with:\n'
        '- title: Document title\n'
        '- documentType: Type of document\n'
        '- summary: 2-3 sentence executive summary\n'
        '- keyFindings: Array of bullet points\n'
        '- financialMetrics: { revenue, profit, growth, risks } if applicable\n'
        '- sentiment: "bullish" | "bearish" | "neutral"\n'
        '- tradingImplications: Actionable insight\n\n'
        'Be specific and cite exact figures when available.'
    ),
    tools=[google_search] if config.ENABLE_GOOGLE_SEARCH else [],
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_PRO, 1.0),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_pro,
    ),
)

trade_sync_orchestrator = LlmAgent(
    name='tradesync_orchestrator',
    model=config.MODEL_FLASH,
    description='Main TradeSync orchestrator that routes requests to specialized agents.',
    global_instruction=(
        'You are TradeSync AI - a comprehensive trading intelligence platform.\n\n'
        'Be concise, professional, and data-driven. Always prioritize user safety and risk management.'
    ),
    instruction=(
        'You are the TradeSync Orchestrator - the main entry point for all trading queries.\n\n'
        'You route requests to specialized agents:\n'
        '- advisor_workflow_agent: Head of Research. Runs parallel research and delivers the final synthesis.\n'
        '- strategy_agent: Market Strategy Engine. Specialized in technical analysis and chart patterns.\n'
        '- video_analysis_agent: Analyze YouTube trading videos\n'
        '- document_analysis_agent: Analyze financial documents (SEC filings, reports)\n'
        '- execute_trade: Place paper trading orders\n'
        '- confirm_trade: Confirms a pending trade request\n\n'
        'Routing Guidelines:\n'
        '1. General trading questions, analysis requests ("What about BTC?", "Analyze Apple") -> advisor_workflow_agent\n'
        '2. "Analyze this video" -> video_analysis_agent\n'
        '3. "Analyze this document/URL" -> document_analysis_agent\n'
        '4. "Show me a chart of Tesla" or chart requests -> strategy_agent\n'
        '5. "Buy/Sell X" or trade requests -> Always attempt to call execute_trade first.\n'
        '6. If the user says "Yes" or "Confirm" to a pending trade request, call confirm_trade then execute_trade.\n\n'
        'For simple greetings or clarifications, respond directly without delegating.\n\n'
        'Safety Rules:\n'
        '- Never recommend all-in positions\n'
        '- Always mention risk when discussing trades\n'
        '- Encourage paper trading before real trading'
    ),
    sub_agents=[
        advisor_workflow_agent,
        strategy_agent,
        video_analysis_agent,
        document_analysis_agent,
    ],
    tools=[trade_execution_tool, confirm_trade_tool],
    generate_content_config=types.GenerateContentConfig(
        temperature=get_temperature_for_model(config.MODEL_FLASH, 0.7),
        safety_settings=get_safety_settings(),
        thinking_config=thinking_flash,
    ),
)
