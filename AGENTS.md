# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-18
**Context:** Trade/Sync (AI-Powered Trading Platform)

## OVERVIEW
Trade/Sync is a real-time trading dashboard and strategy engine.
**Stack:** React + Vite + Tailwind (Frontend), Firebase Cloud Functions + Genkit (Backend/AI), Firestore (DB/Vector Store).

## STRUCTURE
```
.
├── src/              # React Frontend (Vite)
├── functions/src/    # Firebase Functions & Genkit Flows
├── rag-ingestion/    # Knowledge Base Ingestion Pipeline
└── rag-sources/      # Raw Data (Books, PDFs, Articles)
```

## WORKFLOW (ISSUE TRACKING)
This project uses **bd** (beads) for issue tracking.
```bash
bd ready              # Find available work
bd update <id> --status in_progress
bd close <id>         # Complete work
bd sync               # Sync with git
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Frontend UI** | `src/pages/`, `src/components/` | Tailwind styled |
| **Business Logic** | `functions/src/flows/` | Genkit AI flows |
| **API Proxy** | `src/services/` | Proxies to Firebase Functions |
| **Data Ingestion** | `rag-ingestion/src/` | CLI tools for RAG |

## CONVENTIONS
- **Type Safety**: STRICT Zod validation for all IO (API, DB, Env). No `any`.
- **Styling**: Tailwind CSS with CSS variables (`index.css`). Google Finance aesthetic.
- **State**: React Context for Auth, local state for UI. `useBinanceWebSocket` for live data.
- **AI Models**: 
  - `gemini-3-pro`: Complex reasoning/strategy.
  - `gemini-3-flash`: High-frequency/news tasks.

## LANDING THE PLANE (SESSION COMPLETION)
1. **Quality Gates**: `npm run lint`, `npm run build`, `npm run test:e2e` (Frontend).
2. **Push**: `git pull --rebase` -> `bd sync` -> `git push`.
3. **Verify**: Ensure remote is up to date.

## COMMANDS
```bash
# Frontend
npm run dev      # Start Vite dev server
npm run test:e2e # Playwright tests

# Backend
cd functions && npm run build
npm run serve    # Emulate functions

# RAG
cd rag-ingestion && npm run ingest
```
