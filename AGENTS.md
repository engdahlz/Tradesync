# PROJECT KNOWLEDGE BASE

**Generated:** Thu Jan 22 2026
**Context:** Root

## OVERVIEW
Trading platform monorepo combining **React+Vite** frontend, **Firebase+ADK** backend, **Python** services, and **RAG** data pipeline.

## STRUCTURE
```
.
├── src/               # Frontend (React, Vite, Tailwind)
├── functions/src/     # Backend (TypeScript, ADK, Firebase)
│   └── adk/           # Multi-agent system
│       ├── agents/    # Specialized AI agents
│       └── tools/     # Agent tools
├── functions-python/  # Backend (Python services, Avanza)
├── rag-ingestion/     # Data Pipeline (CLI, Vector Store)
└── firebase.json      # Firebase configuration
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **UI/Components** | `src/components/` | Tailwind styled |
| **AI Agents** | `functions/src/adk/agents/` | ADK multi-agent system |
| **Agent Tools** | `functions/src/adk/tools/` | Knowledge, signals, trading |
| **Trading Logic** | `functions-python/` | Python/Avanza integration |
| **Data Ingestion** | `rag-ingestion/src/` | Book/Article parsing |

## AGENTS
- **TradeSyncOrchestrator** - Routes to specialized agents
- **AdvisorAgent** - Financial advice with RAG + SOP
- **StrategyAgent** - Technical analysis
- **NewsAnalysisAgent** - Sentiment analysis
- **VideoAnalysisAgent** - YouTube content analysis
- **DocumentAnalysisAgent** - Document parsing

## CONVENTIONS
- **Monorepo**: Distinct languages/runtimes per directory.
- **Infrastructure**: Firebase-first (Firestore, Functions, Hosting).
- **AI**: Gemini 1.5 Pro/Flash via Vertex AI + ADK.

## COMMANDS
```bash
# Frontend
npm run dev

# Backend (TS)
npm run build --prefix functions

# RAG Ingestion
npm run ingest --prefix rag-ingestion

# Deployment
firebase deploy
```
