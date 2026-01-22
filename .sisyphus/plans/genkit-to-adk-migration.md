# Genkit → ADK Migration Plan

## Context

### Original Request
User wants to migrate from Genkit to ADK (Agent Development Kit) to gain access to Gemini 3 Pro and Gemini 3 Flash models. Previous session encountered 404 errors with Vertex AI when trying to access Gemini 3, leading to a workaround with Google AI Studio API Key. User specified "allt" (everything) should be migrated, with quality as top priority.

### Interview Summary
**Key Discussions**:
- **Gemini 3 Requirement**: MANDATORY - `gemini-3-pro-preview` and `gemini-3-flash-preview`
- **Migration Scope**: User approved "kör på med det du rekomenderar" (go with my recommendations)
- **Quality Focus**: "Ta din tid, kvalité är viktigast" (take your time, quality is most important)
- **No Mock Code**: Full implementation and verification required

**User Decisions**:
- **Deployment**: Continue with Firebase (Cloud Run + Firebase Function proxy pattern)
- **RAG**: Keep Firestore with custom ADK tool (avoid Vertex AI RAG Engine migration)
- **Embeddings**: Keep `text-embedding-004` initially (avoid re-embedding all chunks)
- **Migration Strategy**: Big Bang → ADJUSTED by Metis to Bottom-Up approach

### Research Findings

**Librarian (ADK Research)**:
- ✅ ADK supports `gemini-3-pro-preview` and `gemini-3-flash-preview` via Vertex AI
- ✅ Installation: `pip install google-adk`
- ✅ Deployment: `adk deploy cloud_run --project=X --region=Y --with_ui ./agent`
- ✅ Native RAG: `VertexAiRagRetrieval` tool (uses Vertex AI RAG Engine, not Firestore)
- ✅ Multi-language support: Python (GA), TypeScript (GA), Go (GA), Java (GA)
- ⚠️ Firebase Functions: NOT directly supported, requires Cloud Run + proxy pattern
- ⚠️ text-embedding-004: Unconfirmed, may need to use `gemini-embedding-001`

**Explorer (Current Genkit Architecture)**:
- **Files to migrate**: 5 files in `functions/src/`
  1. `genkit.ts` - Initialization (uses `@genkit-ai/googleai` plugin)
  2. `flows/advisorChat.ts` - RAG chat with streaming, grounding, manual Firestore vector search
  3. `flows/suggestStrategy.ts` - Structured output with "Thinking" config
  4. `flows/ingestKnowledge.ts` - Embedding generation + Firestore writes
  5. `tools/marketTools.ts` - External API wrappers (Binance, Alpha Vantage)
- **Dependencies**: advisorChat → marketTools → suggestStrategy (bottom-up migration needed)
- **Test Infrastructure**: NONE (manual verification only)

### Metis Review
**Identified Gaps** (addressed):

1. **"ADK" Tooling Ambiguity**:
   - Metis noted that `adk deploy` command is not publicly documented
   - **Resolution**: Task 0 will verify ADK installation; librarian research confirmed `google-adk` package exists
   - **Guardrail**: If tooling doesn't work, pivot to Vertex AI SDK approach

2. **Model Version Confusion**:
   - Metis noted "Gemini 3" is not public (latest is Gemini 2.0)
   - Librarian found GitHub evidence of `gemini-3-*-preview` models
   - **Resolution**: Task 0 will verify exact model IDs via API call

3. **Big Bang Risk**:
   - Metis flagged dependency chain: advisorChat depends on marketTools depends on suggestStrategy
   - **Resolution**: CHANGED to **Bottom-Up migration order** (tools first → orchestrator last)

4. **Missing Infrastructure Details**:
   - **Added**: Dockerfile requirement for Cloud Run
   - **Added**: Firebase Proxy Function explicit implementation
   - **Added**: Keep Genkit files side-by-side during migration (`.adk.ts` suffix)

5. **Ambiguous Acceptance Criteria**:
   - **Added**: Model ID verification command
   - **Added**: curl-based endpoint testing
   - **Added**: Evidence collection (terminal output, screenshots)

---

## Work Objectives

### Core Objective
Migrate from Genkit to ADK to unlock Gemini 3 Pro/Flash access while maintaining current functionality (RAG chat, strategy suggestions, knowledge ingestion, market tools).

### Concrete Deliverables
1. **ADK Agents** (replacing Genkit flows):
   - `functions/src/agents/strategy_agent.adk.ts` (from `suggestStrategy.ts`)
   - `functions/src/agents/advisor_agent.adk.ts` (from `advisorChat.ts`)
2. **ADK Tools** (replacing Genkit tools):
   - `functions/src/tools/market_tools.adk.ts` (from `marketTools.ts`)
   - `functions/src/tools/firestore_rag_tool.adk.ts` (NEW - custom RAG retriever)
   - `functions/src/tools/knowledge_ingest_tool.adk.ts` (from `ingestKnowledge.ts`)
3. **Infrastructure**:
   - `functions/Dockerfile` - Cloud Run container image
   - `functions/src/index.ts` - Updated Firebase Function proxies
4. **Deployment**:
   - Cloud Run service running ADK agents
   - Firebase Functions forwarding requests to Cloud Run

### Definition of Done
- [ ] Gemini 3 Pro/Flash models verified accessible via Vertex AI
- [ ] All 5 Genkit files replaced with ADK equivalents (side-by-side first, then delete)
- [ ] Firestore RAG continues to work with custom ADK tool
- [ ] Cloud Run service deployed and responding to requests
- [ ] Firebase Function proxies successfully forward to Cloud Run
- [ ] Manual verification of all endpoints (advisor chat, strategy, knowledge ingest, market tools)
- [ ] Evidence collected (curl outputs, screenshots)

### Must Have
- **Gemini 3 Models**: `gemini-3-pro-preview` (for strategy) and `gemini-3-flash-preview` (for chat)
- **Firestore RAG**: Continue using existing vector search (no data migration)
- **Streaming**: Chat responses must stream (like current Genkit implementation)
- **Grounding**: Extract and return grounding metadata (sources)
- **Thinking**: Strategy agent uses high reasoning budget
- **Tools**: Market tools (Binance, Alpha Vantage) integrated into agents

### Must NOT Have (Guardrails)
- ❌ **No Data Migration**: Do NOT migrate Firestore chunks to Vertex AI RAG Engine
- ❌ **No Re-embedding**: Do NOT re-embed RAG chunks (keep text-embedding-004)
- ❌ **No Genkit Deletion (Initially)**: Keep `.ts` files alongside `.adk.ts` until verified working
- ❌ **No Frontend Changes**: Frontend code untouched (still calls Firebase Functions)
- ❌ **No Python Migration**: `functions-python/` stays as-is (out of scope)
- ❌ **No Test Infrastructure Setup**: Manual QA only (no Jest/Vitest/Pytest installation)
- ❌ **No AI Slop**: 
  - No premature abstraction ("extracted to utility" without reason)
  - No over-validation (15 error checks for 3 inputs)
  - No documentation bloat (JSDoc everywhere)
  - Minimal error handling unless critical

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual-only
- **Framework**: None
- **QA Approach**: Exhaustive manual verification with curl/browser

### Manual QA Procedures

Each TODO includes detailed verification:

**For API Endpoints** (advisor chat, strategy, market tools):
```bash
# Test Cloud Run endpoint directly
curl -X POST https://adk-service-HASH-uc.a.run.app/run \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message", "conversationHistory": []}'

# Expected: {"response": "...", "sources": [...]}
```

**For Firebase Function Proxies**:
```bash
# Test via Firebase callable function
curl -X POST https://us-central1-tradesync-ai-prod.cloudfunctions.net/advisorChat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data": {"message": "Test", "conversationHistory": []}}'

# Expected: {"result": {"response": "...", "sources": [...]}}
```

**For Knowledge Ingestion**:
```bash
# Test embedding generation + Firestore write
curl -X POST https://adk-service-HASH-uc.a.run.app/ingest \
  -H "Content-Type: application/json" \
  -d '{"text": "Test content", "metadata": {"source": "test"}}'

# Expected: {"success": true, "chunkCount": N}

# Verify in Firestore
gcloud firestore documents list rag_chunks --limit=1 --format=json
```

**Evidence Required**:
- [ ] Terminal output captured (copy-paste actual responses)
- [ ] Error messages (if any) fully logged
- [ ] Firestore verification (for knowledge ingest)
- [ ] Screenshot of web UI (if using `--with_ui` flag)

---

## Task Flow

```
Task 0 (Verify Gemini 3 Access)
   ↓
Task 1 (Setup ADK + Dockerfile)
   ↓
Task 2 (Migrate Tools) → Task 3 (Firestore RAG Tool) [PARALLEL]
   ↓                          ↓
   ↓                    Task 4 (Knowledge Ingest Tool)
   ↓                          ↓
   └──────── Task 5 (Strategy Agent) ──────┘
                 ↓
         Task 6 (Advisor Agent)
                 ↓
         Task 7 (Cloud Run Deployment)
                 ↓
         Task 8 (Firebase Proxies)
                 ↓
         Task 9 (End-to-End Testing)
                 ↓
         Task 10 (Cleanup Genkit Files)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Independent (market tools vs RAG tool) |
| B | 5 (after 2, 3, 4) | Depends on all tools being ready |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Needs ADK installed |
| 3 | 1 | Needs ADK installed |
| 4 | 1, 3 | Needs ADK + Firestore RAG tool pattern |
| 5 | 2 | Uses market tools |
| 6 | 2, 3, 4, 5 | Uses all tools + agents |
| 7 | 6 | Needs all agents implemented |
| 8 | 7 | Needs Cloud Run URL |
| 9 | 8 | Needs full stack running |
| 10 | 9 | Needs verification passed |

---

## TODOs

- [x] 0. **BLOCKER: Verify Vertex AI Access to Gemini 3 Models** ⚠️ BLOCKED - Using gemini-2.0-flash-exp fallback

  **What to do**:
  - Write Node.js script to test Vertex AI access
  - List available models in `us-central1` region
  - Attempt to generate text with `gemini-3-pro-preview` and `gemini-3-flash-preview`
  - If 404 errors → investigate project billing/terms/quotas
  - Document exact model ID strings for subsequent tasks

  **Must NOT do**:
  - Proceed with any migration code if this fails
  - Assume model IDs without verification

  **Parallelizable**: NO (blocks all tasks)

  **References**:
  - `functions/src/config.ts:26-27` - Current model configuration
  - Previous session history - 404 errors with `tradesync-ai-prod` project
  - Vertex AI docs: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini
  - Librarian research: Confirmed `gemini-3-*-preview` exists in GitHub examples

  **Acceptance Criteria**:
  - [ ] Script created: `functions/src/scripts/verifyGemini3Access.ts`
  - [ ] Command run: `npx tsx functions/src/scripts/verifyGemini3Access.ts`
  - [ ] Output contains: `✅ gemini-3-pro-preview: ACCESSIBLE`
  - [ ] Output contains: `✅ gemini-3-flash-preview: ACCESSIBLE`
  - [ ] If 404: Output contains root cause (billing/terms/quota) and remediation steps
  - [ ] Exact model IDs documented in `functions/MIGRATION_NOTES.md`

  **Evidence Required**:
  - [ ] Terminal output showing successful model access OR detailed error diagnosis
  - [ ] If successful: Sample generation output from each model
  - [ ] If failed: Clear next steps for fixing access issue

  **Commit**: NO (verification only)

---

- [ ] 1. **Setup ADK Infrastructure**

  **What to do**:
  - Install ADK: `cd functions && npm install google-adk` (if TypeScript) OR `pip install google-adk` (if Python)
  - Create `functions/Dockerfile` for Cloud Run deployment
  - Create `functions/.dockerignore`
  - Create `functions/src/adk_config.ts` - ADK initialization (replace `genkit.ts` pattern)
  - Verify installation: `adk --version` or equivalent

  **Must NOT do**:
  - Delete existing Genkit files
  - Change Firebase Functions configuration yet

  **Parallelizable**: NO (required for 2, 3, 4)

  **References**:
  - `functions/src/genkit.ts` - Current initialization pattern (use as structural guide)
  - `functions/package.json` - Add `google-adk` dependency here
  - Librarian research: `adk deploy cloud_run` command exists
  - Dockerfile example: Node.js 20 base image, copy src/, install deps, expose port

  **Acceptance Criteria**:
  - [ ] `functions/package.json` updated with `google-adk` dependency
  - [ ] `npm install` runs successfully in `functions/`
  - [ ] `functions/Dockerfile` created with Node.js 20 base image
  - [ ] `functions/.dockerignore` created (excludes node_modules, .env, etc.)
  - [ ] `functions/src/adk_config.ts` created (initializes ADK with Vertex AI credentials)
  - [ ] Test build: `cd functions && docker build -t test-adk .` → SUCCESS
  - [ ] Verification: `docker run test-adk node -e "console.log(require('google-adk'))"` → no errors

  **Evidence Required**:
  - [ ] Terminal output of `npm install`
  - [ ] Terminal output of `docker build`
  - [ ] Contents of `Dockerfile` (cat Dockerfile)
  - [ ] Confirmation that `google-adk` is importable

  **Commit**: YES
  - Message: `feat(adk): setup ADK infrastructure (Dockerfile, config, dependencies)`
  - Files: `functions/package.json`, `functions/Dockerfile`, `functions/.dockerignore`, `functions/src/adk_config.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 2. **Migrate Market Tools to ADK**

  **What to do**:
  - Create `functions/src/tools/market_tools.adk.ts`
  - Port all tools from `marketTools.ts` to ADK `FunctionTool` pattern:
    - `getBinancePriceTool`
    - `getAlphaVantageNewsTool`
    - `fetchMarketNewsTool` (generic wrapper)
  - Keep Zod schemas intact (reuse from original file)
  - Test each tool individually with ADK test runner

  **Must NOT do**:
  - Delete `marketTools.ts` yet (keep side-by-side)
  - Change tool functionality (keep logic identical)
  - Add new features (scope creep)

  **Parallelizable**: YES (with Task 3)

  **References**:
  - `functions/src/tools/marketTools.ts` - Source implementation
  - Librarian research: ADK uses `FunctionTool` decorator
  - Example pattern from ADK docs:
    ```python
    from google.adk.tools import FunctionTool
    
    @FunctionTool
    def get_price(symbol: str) -> dict:
        # Tool logic here
        return {"price": 123.45}
    ```
  - TypeScript equivalent should use similar decorator pattern

  **Acceptance Criteria**:
  - [ ] File created: `functions/src/tools/market_tools.adk.ts`
  - [ ] All 3 tools ported: `getBinancePrice`, `getAlphaVantageNews`, `fetchMarketNews`
  - [ ] Zod schemas preserved (imported from original or duplicated)
  - [ ] Test script: `functions/src/scripts/testMarketTools.ts` calls each tool
  - [ ] Verification: `npx tsx functions/src/scripts/testMarketTools.ts`
  - [ ] Output shows successful API calls (real Binance/AlphaVantage data)

  **Evidence Required**:
  - [ ] Terminal output of test script showing:
    - Binance BTC/USDT price
    - Alpha Vantage news articles (at least 1)
  - [ ] No errors or exceptions

  **Commit**: YES
  - Message: `feat(adk): migrate market tools to ADK`
  - Files: `functions/src/tools/market_tools.adk.ts`, `functions/src/scripts/testMarketTools.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 3. **Build Custom Firestore RAG Retrieval Tool**

  **What to do**:
  - Create `functions/src/tools/firestore_rag_tool.adk.ts`
  - Implement ADK `FunctionTool` that wraps Firestore vector search:
    - Generate query embedding using `text-embedding-004` (Vertex AI)
    - Perform `findNearest` on `rag_chunks` collection
    - Return top K results with metadata
  - Make embedding model configurable (easy swap to `gemini-embedding-001` later)
  - Replicate logic from `advisorChat.ts:retrieveContext()` function

  **Must NOT do**:
  - Change embedding model yet (keep `text-embedding-004`)
  - Migrate Firestore data to Vertex AI RAG Engine
  - Add extra features beyond current RAG functionality

  **Parallelizable**: YES (with Task 2)

  **References**:
  - `functions/src/flows/advisorChat.ts:retrieveContext()` - Current Firestore vector search logic
  - Firestore collection: `rag_chunks` (existing data)
  - Embedding generation pattern:
    ```typescript
    import { embed } from '@genkit-ai/ai/embedder';
    const embedding = await embed({
      embedder: vertexAI.textEmbedding004,
      content: query
    });
    ```
  - ADK equivalent needs similar approach
  - Librarian research: ADK has `VertexAiRagRetrieval` but uses Vertex AI RAG Engine (not Firestore)

  **Acceptance Criteria**:
  - [ ] File created: `functions/src/tools/firestore_rag_tool.adk.ts`
  - [ ] Function signature: `retrieveContext(query: string, topK: number = 5): Promise<Array<{text: string, metadata: object}>>`
  - [ ] Embedding model configurable via environment variable: `EMBEDDING_MODEL` (default: `text-embedding-004`)
  - [ ] Test script: `functions/src/scripts/testFirestoreRAG.ts`
  - [ ] Verification: `npx tsx functions/src/scripts/testFirestoreRAG.ts`
  - [ ] Output shows retrieved chunks from Firestore with relevance scores

  **Evidence Required**:
  - [ ] Terminal output showing:
    - Query: "What is technical analysis?"
    - Retrieved chunks: At least 3 relevant results
    - Cosine similarity scores
  - [ ] Firestore verification: `gcloud firestore documents list rag_chunks --limit=1` confirms data exists

  **Commit**: YES
  - Message: `feat(adk): build custom Firestore RAG retrieval tool`
  - Files: `functions/src/tools/firestore_rag_tool.adk.ts`, `functions/src/scripts/testFirestoreRAG.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 4. **Migrate Knowledge Ingestion Tool**

  **What to do**:
  - Create `functions/src/tools/knowledge_ingest_tool.adk.ts`
  - Port logic from `ingestKnowledge.ts`:
    - Generate embedding using `text-embedding-004`
    - Write to Firestore `rag_chunks` collection
    - Return success status + chunk count
  - Reuse Firestore RAG tool's embedding logic (DRY)

  **Must NOT do**:
  - Delete `ingestKnowledge.ts` yet
  - Change embedding model
  - Modify Firestore schema

  **Parallelizable**: NO (depends on Task 3 for embedding pattern)

  **References**:
  - `functions/src/flows/ingestKnowledge.ts` - Source implementation
  - `functions/src/tools/firestore_rag_tool.adk.ts` - Reuse embedding logic
  - Firestore collection: `rag_chunks` (schema: `{embedding: vector, text: string, metadata: object}`)

  **Acceptance Criteria**:
  - [ ] File created: `functions/src/tools/knowledge_ingest_tool.adk.ts`
  - [ ] Function signature: `ingestText(text: string, metadata: object): Promise<{success: boolean, chunkCount: number}>`
  - [ ] Test script: `functions/src/scripts/testKnowledgeIngest.ts`
  - [ ] Verification: `npx tsx functions/src/scripts/testKnowledgeIngest.ts`
  - [ ] Output shows successful ingestion
  - [ ] Firestore verification: New document created in `rag_chunks`

  **Evidence Required**:
  - [ ] Terminal output showing:
    - Ingested text: "Test trading strategy content"
    - Chunk count: 1
    - Success: true
  - [ ] Firestore query showing new document:
    ```bash
    gcloud firestore documents describe rag_chunks/[GENERATED_ID] --format=json
    ```
  - [ ] Embedding field populated with 768-dimensional vector (text-embedding-004)

  **Commit**: YES
  - Message: `feat(adk): migrate knowledge ingestion tool`
  - Files: `functions/src/tools/knowledge_ingest_tool.adk.ts`, `functions/src/scripts/testKnowledgeIngest.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 5. **Migrate Strategy Suggestion Agent**

  **What to do**:
  - Create `functions/src/agents/strategy_agent.adk.ts`
  - Port `suggestStrategy.ts` to ADK Agent pattern
  - Use `gemini-3-pro-preview` model (from Task 0 verification)
  - Enable "Thinking" config (high reasoning budget)
  - Integrate market tools from Task 2
  - Preserve Zod schemas for structured output

  **Must NOT do**:
  - Delete `suggestStrategy.ts` yet
  - Remove or simplify thinking config
  - Change output schema

  **Parallelizable**: NO (depends on Task 2 for market tools)

  **References**:
  - `functions/src/flows/suggestStrategy.ts` - Source implementation
  - `functions/src/tools/market_tools.adk.ts` - Tools to integrate
  - Genkit pattern:
    ```typescript
    const result = await ai.generate({
      model: vertexAI.model(MODEL_PRO),
      config: { thinkingConfig: { budget: 'HIGH' } },
      output: { schema: OutputSchema }
    });
    ```
  - ADK equivalent: Agent with high reasoning model + structured output

  **Acceptance Criteria**:
  - [ ] File created: `functions/src/agents/strategy_agent.adk.ts`
  - [ ] Model configured: `gemini-3-pro-preview`
  - [ ] Thinking budget: HIGH (or equivalent ADK config)
  - [ ] Market tools integrated: `getBinancePrice`, `getAlphaVantageNews`
  - [ ] Output schema preserved (Zod validation)
  - [ ] Test script: `functions/src/scripts/testStrategyAgent.ts`
  - [ ] Verification: `npx tsx functions/src/scripts/testStrategyAgent.ts`
  - [ ] Output shows strategy suggestion with reasoning

  **Evidence Required**:
  - [ ] Terminal output showing:
    - Input: "Suggest a BTC swing trading strategy"
    - Output: Structured strategy object (entry, exit, risk, reasoning)
    - Model used: gemini-3-pro-preview
  - [ ] Confirmation that market tools were called (logs show price/news fetches)

  **Commit**: YES
  - Message: `feat(adk): migrate strategy suggestion agent`
  - Files: `functions/src/agents/strategy_agent.adk.ts`, `functions/src/scripts/testStrategyAgent.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 6. **Migrate Advisor Chat Agent**

  **What to do**:
  - Create `functions/src/agents/advisor_agent.adk.ts`
  - Port `advisorChat.ts` to ADK Agent pattern
  - Use `gemini-3-flash-preview` model (from Task 0 verification)
  - Integrate ALL tools: Firestore RAG, market tools, strategy agent (as sub-agent)
  - Implement streaming responses
  - Parse and return grounding metadata (sources)
  - Handle conversation history (stateless, passed in request)

  **Must NOT do**:
  - Delete `advisorChat.ts` yet
  - Remove streaming capability
  - Change conversation history format

  **Parallelizable**: NO (depends on Tasks 2, 3, 4, 5)

  **References**:
  - `functions/src/flows/advisorChat.ts` - Source implementation (most complex)
  - `functions/src/agents/strategy_agent.adk.ts` - Sub-agent to call
  - `functions/src/tools/firestore_rag_tool.adk.ts` - RAG retrieval
  - `functions/src/tools/market_tools.adk.ts` - Market tools
  - Genkit streaming pattern:
    ```typescript
    const { stream } = await ai.generateStream({
      model: MODEL_FLASH,
      prompt: constructedPrompt
    });
    for await (const chunk of stream) {
      // Stream to client
    }
    ```
  - ADK equivalent should support similar streaming

  **Acceptance Criteria**:
  - [ ] File created: `functions/src/agents/advisor_agent.adk.ts`
  - [ ] Model configured: `gemini-3-flash-preview`
  - [ ] Tools integrated: RAG retrieval, market tools, strategy agent
  - [ ] Streaming enabled: Response chunks emitted progressively
  - [ ] Grounding metadata: Extracted from response and included in output
  - [ ] Conversation history: Accepted as input, formatted into prompt
  - [ ] Test script: `functions/src/scripts/testAdvisorAgent.ts`
  - [ ] Verification: `npx tsx functions/src/scripts/testAdvisorAgent.ts`
  - [ ] Output shows streaming chat response with sources

  **Evidence Required**:
  - [ ] Terminal output showing:
    - Input: "What is technical analysis?" with conversation history
    - Streaming chunks (progressive text output)
    - Final response with sources from RAG
    - Grounding metadata (if available from Gemini 3)
  - [ ] Confirmation that RAG tool was called (logs show Firestore query)

  **Commit**: YES
  - Message: `feat(adk): migrate advisor chat agent with streaming and RAG`
  - Files: `functions/src/agents/advisor_agent.adk.ts`, `functions/src/scripts/testAdvisorAgent.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 7. **Deploy to Cloud Run**

  **What to do**:
  - Create `functions/src/server.ts` - Express/Fastify server exposing ADK agents as HTTP endpoints
  - Build Docker image: `docker build -t gcr.io/tradesync-ai-prod/adk-service:v1 functions/`
  - Push to Container Registry: `docker push gcr.io/tradesync-ai-prod/adk-service:v1`
  - Deploy to Cloud Run: 
    ```bash
    gcloud run deploy adk-service \
      --image=gcr.io/tradesync-ai-prod/adk-service:v1 \
      --region=us-central1 \
      --platform=managed \
      --allow-unauthenticated \
      --set-env-vars="PROJECT_ID=tradesync-ai-prod,EMBEDDING_MODEL=text-embedding-004"
    ```
  - Note Cloud Run URL for Task 8

  **Must NOT do**:
  - Make service publicly accessible without auth in production (use `--no-allow-unauthenticated` later)
  - Deploy before Tasks 2-6 are verified working

  **Parallelizable**: NO (depends on all agent/tool implementations)

  **References**:
  - `functions/Dockerfile` (from Task 1)
  - `functions/src/agents/*.adk.ts` - Agents to expose
  - Express server pattern:
    ```typescript
    import express from 'express';
    const app = express();
    app.post('/advisor', async (req, res) => {
      const response = await advisorAgent.run(req.body);
      res.json(response);
    });
    app.listen(8080);
    ```
  - Librarian research: ADK supports `adk deploy cloud_run` (use if available, otherwise manual gcloud)

  **Acceptance Criteria**:
  - [ ] File created: `functions/src/server.ts` (HTTP server exposing agents)
  - [ ] Dockerfile updated: `CMD ["node", "src/server.js"]` (or equivalent)
  - [ ] Docker image built: `docker build -t gcr.io/tradesync-ai-prod/adk-service:v1 functions/`
  - [ ] Image pushed: `docker push gcr.io/tradesync-ai-prod/adk-service:v1`
  - [ ] Cloud Run deployed: Service URL obtained
  - [ ] Verification: `curl https://adk-service-HASH-uc.a.run.app/health` → `{"status": "ok"}`
  - [ ] Test advisor endpoint: 
    ```bash
    curl -X POST https://adk-service-HASH-uc.a.run.app/advisor \
      -H "Content-Type: application/json" \
      -d '{"message": "Hello", "conversationHistory": []}'
    ```
  - [ ] Response contains: `{"response": "...", "sources": [...]}`

  **Evidence Required**:
  - [ ] Terminal output of `gcloud run deploy` showing service URL
  - [ ] Terminal output of health check: `curl .../health`
  - [ ] Terminal output of advisor endpoint test
  - [ ] Confirmation that Gemini 3 Flash was used (check Cloud Run logs)

  **Commit**: YES
  - Message: `feat(adk): deploy ADK service to Cloud Run`
  - Files: `functions/src/server.ts`, `functions/Dockerfile` (updated CMD)
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 8. **Create Firebase Function Proxies**

  **What to do**:
  - Update `functions/src/index.ts` to export proxy functions:
    - `advisorChatProxy` → forwards to Cloud Run `/advisor`
    - `suggestStrategyProxy` → forwards to Cloud Run `/strategy`
    - `ingestKnowledgeProxy` → forwards to Cloud Run `/ingest`
  - Forward `context.auth.uid` to Cloud Run (preserve authentication)
  - Handle errors and timeouts gracefully
  - Keep old Genkit functions temporarily (`.legacy` suffix)

  **Must NOT do**:
  - Delete original Genkit function exports yet
  - Remove authentication checks
  - Add extra latency (minimize overhead)

  **Parallelizable**: NO (depends on Task 7 for Cloud Run URL)

  **References**:
  - `functions/src/index.ts` - Current exports (Genkit flows)
  - Cloud Run URL from Task 7
  - Firebase Callable Function pattern:
    ```typescript
    export const advisorChatProxy = functions.https.onCall(async (data, context) => {
      const response = await fetch(CLOUD_RUN_URL + '/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': context.auth?.uid || 'anonymous'
        },
        body: JSON.stringify(data)
      });
      return response.json();
    });
    ```

  **Acceptance Criteria**:
  - [ ] File updated: `functions/src/index.ts`
  - [ ] Proxy functions created: `advisorChatProxy`, `suggestStrategyProxy`, `ingestKnowledgeProxy`
  - [ ] Old functions renamed: `advisorChat` → `advisorChatLegacy` (keep temporarily)
  - [ ] User ID forwarded: `context.auth.uid` passed in header `X-User-ID`
  - [ ] Deploy functions: `firebase deploy --only functions`
  - [ ] Verification: 
    ```bash
    curl -X POST https://us-central1-tradesync-ai-prod.cloudfunctions.net/advisorChatProxy \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"data": {"message": "Test", "conversationHistory": []}}'
    ```
  - [ ] Response matches Cloud Run response format

  **Evidence Required**:
  - [ ] Terminal output of `firebase deploy --only functions`
  - [ ] Terminal output of proxy function test (via Firebase)
  - [ ] Confirmation that request was forwarded to Cloud Run (check Cloud Run logs)
  - [ ] Response time logged (should be < 2 seconds for simple query)

  **Commit**: YES
  - Message: `feat(adk): add Firebase Function proxies to Cloud Run ADK service`
  - Files: `functions/src/index.ts`
  - Pre-commit: `cd functions && npm run build`

---

- [ ] 9. **End-to-End Verification**

  **What to do**:
  - Test complete flow: Frontend → Firebase Function Proxy → Cloud Run → Gemini 3
  - Verify all endpoints:
    1. Advisor Chat (streaming, RAG, grounding)
    2. Strategy Suggestion (thinking, tools)
    3. Knowledge Ingestion (embedding, Firestore)
  - Collect evidence for each endpoint
  - Document any issues or deviations from expected behavior

  **Must NOT do**:
  - Proceed to Task 10 (cleanup) if ANY endpoint fails
  - Skip streaming verification
  - Skip source citation verification

  **Parallelizable**: NO (final verification before cleanup)

  **References**:
  - All previous tasks (agents, tools, deployment)
  - Original Genkit behavior as baseline

  **Acceptance Criteria**:
  
  **Advisor Chat Endpoint**:
  - [ ] Request via Firebase Function: `advisorChatProxy`
  - [ ] Input: "Explain support and resistance levels"
  - [ ] Verify: Streaming response (multiple chunks received)
  - [ ] Verify: RAG sources included (Firestore chunks cited)
  - [ ] Verify: Grounding metadata present (if Gemini 3 supports)
  - [ ] Verify: Model used is `gemini-3-flash-preview` (check logs)
  - [ ] Response time: < 5 seconds for first chunk
  
  **Strategy Suggestion Endpoint**:
  - [ ] Request via Firebase Function: `suggestStrategyProxy`
  - [ ] Input: "BTC day trading strategy for volatile markets"
  - [ ] Verify: Structured output (entry, exit, risk)
  - [ ] Verify: Market tools called (Binance price, Alpha Vantage news)
  - [ ] Verify: Reasoning included (thinking budget used)
  - [ ] Verify: Model used is `gemini-3-pro-preview` (check logs)
  - [ ] Response time: < 10 seconds (thinking adds latency)
  
  **Knowledge Ingestion Endpoint**:
  - [ ] Request via Firebase Function: `ingestKnowledgeProxy`
  - [ ] Input: "Fibonacci retracements are technical analysis tools..."
  - [ ] Verify: Success response with chunk count
  - [ ] Verify: New document in Firestore `rag_chunks` collection
  - [ ] Verify: Embedding vector present (768 dimensions)
  - [ ] Response time: < 3 seconds

  **Evidence Required**:
  - [ ] Terminal output (curl) for all 3 endpoints
  - [ ] Screenshot of web UI chat (if frontend tested)
  - [ ] Cloud Run logs showing Gemini 3 model usage
  - [ ] Firebase Function logs showing proxy forwards
  - [ ] Firestore screenshot showing new ingested chunk

  **Commit**: NO (verification only)

---

- [ ] 10. **Cleanup Genkit Files and Finalize Migration**

  **What to do**:
  - Delete old Genkit files (now that ADK is verified working):
    - `functions/src/genkit.ts`
    - `functions/src/flows/advisorChat.ts`
    - `functions/src/flows/suggestStrategy.ts`
    - `functions/src/flows/ingestKnowledge.ts`
    - `functions/src/tools/marketTools.ts`
  - Remove Genkit dependencies from `functions/package.json`:
    - `@genkit-ai/googleai`
    - `@genkit-ai/vertexai`
    - `@genkit-ai/firebase`
    - `genkit`
  - Remove legacy function exports from `functions/src/index.ts`
  - Update `README.md` or create `functions/MIGRATION_NOTES.md` documenting the change
  - Run final build and deploy

  **Must NOT do**:
  - Delete files if Task 9 found any failing endpoints
  - Remove `.adk.ts` suffix from new files (keep for clarity)

  **Parallelizable**: NO (final cleanup task)

  **References**:
  - All previous tasks (verification passed)
  - `functions/package.json` - Remove Genkit deps
  - `functions/src/index.ts` - Remove legacy exports

  **Acceptance Criteria**:
  - [ ] Genkit files deleted (5 files total)
  - [ ] Genkit dependencies removed from `package.json`
  - [ ] Legacy function exports removed from `index.ts`
  - [ ] Documentation created: `functions/MIGRATION_NOTES.md` explaining:
    - What changed (Genkit → ADK)
    - Why (Gemini 3 access)
    - New architecture (Cloud Run + Firebase proxies)
    - Model IDs used (gemini-3-pro-preview, gemini-3-flash-preview)
    - Any deviations from original behavior
  - [ ] Final build: `cd functions && npm run build` → SUCCESS
  - [ ] Final deploy: `firebase deploy --only functions` → SUCCESS
  - [ ] Post-deploy verification: `curl` test advisor endpoint → SUCCESS

  **Evidence Required**:
  - [ ] Terminal output of `git status` showing deleted files
  - [ ] Terminal output of `npm run build` (clean build)
  - [ ] Terminal output of `firebase deploy`
  - [ ] Post-deploy curl test confirming service still works

  **Commit**: YES
  - Message: `feat(adk): finalize migration, remove Genkit dependencies`
  - Files: All deletions, `functions/package.json`, `functions/src/index.ts`, `functions/MIGRATION_NOTES.md`
  - Pre-commit: `cd functions && npm run build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(adk): setup ADK infrastructure (Dockerfile, config, dependencies)` | package.json, Dockerfile, .dockerignore, adk_config.ts | npm run build |
| 2 | `feat(adk): migrate market tools to ADK` | market_tools.adk.ts, scripts/testMarketTools.ts | npm run build |
| 3 | `feat(adk): build custom Firestore RAG retrieval tool` | firestore_rag_tool.adk.ts, scripts/testFirestoreRAG.ts | npm run build |
| 4 | `feat(adk): migrate knowledge ingestion tool` | knowledge_ingest_tool.adk.ts, scripts/testKnowledgeIngest.ts | npm run build |
| 5 | `feat(adk): migrate strategy suggestion agent` | strategy_agent.adk.ts, scripts/testStrategyAgent.ts | npm run build |
| 6 | `feat(adk): migrate advisor chat agent with streaming and RAG` | advisor_agent.adk.ts, scripts/testAdvisorAgent.ts | npm run build |
| 7 | `feat(adk): deploy ADK service to Cloud Run` | server.ts, Dockerfile | npm run build |
| 8 | `feat(adk): add Firebase Function proxies to Cloud Run ADK service` | index.ts | npm run build |
| 10 | `feat(adk): finalize migration, remove Genkit dependencies` | deletions, package.json, index.ts, MIGRATION_NOTES.md | npm run build && firebase deploy |

---

## Success Criteria

### Verification Commands
```bash
# 1. Verify Gemini 3 access
npx tsx functions/src/scripts/verifyGemini3Access.ts
# Expected: ✅ gemini-3-pro-preview: ACCESSIBLE, ✅ gemini-3-flash-preview: ACCESSIBLE

# 2. Test Cloud Run service
curl https://adk-service-HASH-uc.a.run.app/health
# Expected: {"status": "ok"}

curl -X POST https://adk-service-HASH-uc.a.run.app/advisor \
  -H "Content-Type: application/json" \
  -d '{"message": "What is technical analysis?", "conversationHistory": []}'
# Expected: {"response": "...", "sources": [...]}

# 3. Test Firebase proxy
curl -X POST https://us-central1-tradesync-ai-prod.cloudfunctions.net/advisorChatProxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"data": {"message": "Test", "conversationHistory": []}}'
# Expected: {"result": {"response": "...", "sources": [...]}}

# 4. Verify Firestore RAG
gcloud firestore documents list rag_chunks --limit=1 --format=json
# Expected: At least 1 document with embedding field

# 5. Check Cloud Run logs for Gemini 3 usage
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=adk-service" --limit=10 --format=json | grep "gemini-3"
# Expected: Log entries showing gemini-3-pro-preview or gemini-3-flash-preview
```

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] Gemini 3 Pro and Flash accessible and in use
  - [ ] Firestore RAG working (no data migration)
  - [ ] Streaming responses functional
  - [ ] Grounding metadata extracted
  - [ ] Thinking budget applied to strategy agent
  - [ ] Market tools integrated
- [ ] All "Must NOT Have" absent:
  - [ ] No Firestore data migration occurred
  - [ ] No re-embedding of chunks
  - [ ] No frontend changes made
  - [ ] No Python functions modified
  - [ ] No test infrastructure added
  - [ ] No AI slop patterns detected
- [ ] All Genkit files deleted (only after verification passed)
- [ ] Documentation complete (`MIGRATION_NOTES.md`)
- [ ] Deployment successful (Cloud Run + Firebase Functions)
- [ ] End-to-end tests passed (Task 9)
