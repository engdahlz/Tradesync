# BACKEND KNOWLEDGE BASE

**Context:** functions/src/ (Firebase + Genkit AI)

## OVERVIEW
Serverless backend hosting **Genkit AI flows** and **Firebase Cloud Functions**. Handles business logic, AI reasoning, and scheduled tasks.

## STRUCTURE
```
functions/src/
├── flows/            # Genkit AI Flows (Business Logic)
├── tools/            # Function tools for Agents
├── scripts/          # Testing & Utilities
└── index.ts          # Entry point (Exported functions)
```

## KEY FLOWS
- **advisorChat**: RAG-enabled Q&A using `MODEL_PRO`.
- **suggestStrategy**: Technical analysis engine.
- **analyzeVideo**: YouTube transcript analysis using `MODEL_FLASH`.

## CONVENTIONS
- **Schema Validation**: MANDATORY **Zod** schemas for all Flow inputs/outputs.
- **Model Selection**: 
  - `MODEL_PRO` (Gemini Pro): Complex reasoning, Strategy, RAG.
  - `MODEL_FLASH` (Gemini Flash): High-volume, simple tasks (News, Video).
- **Idempotency**: Use `idempotencyKey` for trade execution.

## ANTI-PATTERNS (DO NOT DO)
- ❌ **Global State**: Functions are stateless. Use Firestore.
- ❌ **Long Sync Tasks**: Offload >60s tasks to Cloud Tasks or async flows.
- ❌ **Unvalidated External Data**: Trust nothing. Zod parse everything.
