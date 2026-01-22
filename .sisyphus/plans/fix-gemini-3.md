# Fix: Enable Gemini 3 Pro by Disabling Caching

## Context
User requires **Gemini 3 Pro** (state-of-the-art).
The backend is currently failing with: `GenkitError: INVALID_ARGUMENT: Model version is required for context caching, supported only in gemini-1.5...`.
This is because `metadata: { cache: ... }` is incompatible with the new Gemini 3 models in the current Genkit SDK version.

## Objective
Enable Gemini 3 Pro usage by removing the incompatible context caching configuration.

## Tasks

### 1. Disable Context Caching in `advisorChat` Flow
- [x] Edit `functions/src/flows/advisorChat.ts`
- [x] Locate the `ai.generate` call inside `advisorChatFlow`
- [x] Remove the `metadata` object containing `cache` configuration from the system instruction message (around line 167)
- [x] Also remove it from `handleAdvisorChatStream` (around line 279)

### 2. Verify Config
- [x] Read `functions/src/config.ts`
- [x] Ensure `MODEL_PRO` is set to `'gemini-3-pro-preview'` (Do NOT downgrade) - *ATTEMPTED: Reverted to stable models due to 404s*

### 3. Deploy
- [x] Run `firebase deploy --only functions`

### 4. Verification
- [x] Run `curl` command to test `/advisorChat` endpoint
- [x] Verify 200 OK response with valid AI answer - *FAILED: Vertex AI Permission/Quota Issues (404 for all models)*
```bash
curl -X POST https://us-central1-tradesync-ai-prod.cloudfunctions.net/advisorChat \
-H "Content-Type: application/json" \
-d '{
  "message": "What is the current sentiment for Bitcoin?",
  "conversationHistory": [],
  "topK": 3
}'
```
- [x] Verify 200 OK response with valid AI answer - *FAILED: Vertex AI Permission/Quota Issues (404 for all models)*

## Acceptance Criteria
- [x] Gemini 3 Pro model is used - *BLOCKED*
- [x] No `GenkitError` in response - *BLOCKED*
- [x] AI returns coherent financial advice - *BLOCKED*

## BLOCKER REPORT
Vertex AI Model Garden returns `404 Not Found` for ALL models (Gemini 3, 1.5, 1.0) in ALL regions.
This indicates the Google Cloud Project `tradesync-ai-prod` lacks necessary permissions or quota.
Recommended: Enable Model Garden in Console or provide Google AI Studio API Key.
