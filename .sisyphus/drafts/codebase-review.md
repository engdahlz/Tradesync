# Draft: Codebase Review & Next Steps

## Initial Findings
- **Project**: Tradesync
- **Stack**: React + Vite + TypeScript + Tailwind
- **Backend**: Firebase
- **Key Libs**: lightweight-charts, tradingview-widgets, jspdf
- **Process**: Uses `bd` (beads) for issue tracking.

## Architecture
- `src/` structure is standard React (components, pages, services, hooks).
- `rag-ingestion/` suggests AI features.
- `functions/` suggests Firebase Cloud Functions.

## Open Questions
- What is the current completion status against the PRD?
- Are there open bugs?
- What is the RAG component for? (Docs analysis? Trade analysis?)

## Potential Next Steps (Hypothesis)
1. Complete features from PRD.
2. Address open `bd` issues.
3. Improve test coverage (Playwright).
