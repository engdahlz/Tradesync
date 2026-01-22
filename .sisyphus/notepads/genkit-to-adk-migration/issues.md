# Issues: Genkit to ADK Migration

## 2026-01-22: BLOCKER - Gemini 3 Models Not Accessible

### Status
**BLOCKER DOCUMENTED** - Proceeding with available models as fallback.

### Problem
Project `tradesync-ai-prod` does not have access to Gemini 3 models:
- `gemini-3-pro-preview` → 404 Not Found
- `gemini-3-flash-preview` → 404 Not Found
- `gemini-2.5-pro-preview` → 404 Not Found
- `gemini-2.5-flash-preview` → 404 Not Found

### Only Working Model
- `gemini-2.0-flash-exp` (Vertex AI, us-central1) ✅

### Root Cause
- Pre-GA terms not accepted
- Project not allowlisted for Gemini 3 preview
- Or billing/organization restrictions

### Decision
**Proceeding with `gemini-2.0-flash-exp`** as the only available model.
- Migration will use this model for BOTH Flash and Pro use cases
- User can upgrade to Gemini 3 when access is granted
- Migration architecture will support easy model swap via config

### To Unblock Gemini 3 Later
1. Visit https://console.cloud.google.com/vertex-ai/publishers/google/models
2. Search for `gemini-3-pro-preview`
3. Accept Pre-GA terms
4. Re-run: `npx tsx functions/src/scripts/verifyGemini3Access.ts`

### Impact on Migration
- Task 0 completed (verification done)
- Tasks 1-10 proceed with `gemini-2.0-flash-exp`
- Config will be parameterized for easy model swap
