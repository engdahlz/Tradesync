# BACKEND KNOWLEDGE BASE

**Context:** functions/src/ (Firebase + Google ADK)
**Updated:** Thu Jan 22 2026

## OVERVIEW
Serverless backend hosting **Google ADK Agents** and **Firebase Cloud Functions**. Handles business logic, AI reasoning, and scheduled tasks via an Agentic Architecture.

## STRUCTURE
```
functions/src/
├── adk/
│   ├── agents/       # ADK Agents (LlmAgent, etc.)
│   └── tools/        # ADK Tools (AgentTool, FunctionTool)
├── handlers/         # HTTP Adapters for ADK
├── flows/            # Helper logic & Scheduled tasks
└── index.ts          # Entry point (Exported functions)
```

## KEY AGENTS
- **TradeSyncOrchestrator**: Main entry point. Routes to specialized agents.
- **AdvisorWorkflowAgent**: Parallel research + synthesis pipeline for trading advice.
- **StrategyAgent**: Technical analysis specialist.
- **VideoAnalysisAgent**: YouTube transcript analysis.
- **NewsAnalysisAgent**: Market news impact analysis.

## CONVENTIONS
- **ADK-First**: All AI logic should reside in Agents (`src/adk/agents/`).
- **Tools**: Wrappers for external APIs (`src/adk/tools/`).
- **Schema Validation**: MANDATORY **Zod** schemas for all Tool inputs.
- **Model Selection**: 
  - `gemini-1.5-flash-001`: High-speed, high-volume (News, Video, Routing).
  - `gemini-1.5-pro-001`: Deep reasoning, Strategy, RAG.
- **Statelessness**: Use `Session` state for conversation context, Firestore for persistence.

## ANTI-PATTERNS (DO NOT DO)
- ❌ **Direct LLM Calls**: Do not use `ai.generate` directly in flows. Use an Agent.
- ❌ **Global State**: Functions are stateless.
- ❌ **Unvalidated External Data**: Trust nothing. Zod parse everything.
