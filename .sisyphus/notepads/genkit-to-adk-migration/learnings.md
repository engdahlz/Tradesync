# Learnings: Genkit to ADK Migration

**Last Updated:** 2026-01-22

## Task 0: BLOCKER - Verify Vertex AI Access to Gemini 3 Models

### Summary

**STATUS: BLOCKER CONFIRMED - Gemini 3 models are NOT accessible**

Comprehensive verification of Gemini model access revealed that the project `tradesync-ai-prod` cannot access:
- gemini-3-pro-preview
- gemini-3-flash-preview
- gemini-2.5-pro-preview
- gemini-2.5-flash-preview
- gemini-1.5-pro-latest
- gemini-exp-1206

Only one model is accessible: `gemini-2.0-flash-exp` (via Vertex AI)

### Testing Approach

Created `functions/src/scripts/verifyGemini3Access.ts` which tests:
- **7 model IDs** across gemini-3, gemini-2.5, current, and alternative models
- **3 regions:** us-central1, us-east4, europe-west4
- **2 authentication methods:** Vertex AI (Application Default Credentials) and Google AI Studio (API Key)

### Key Findings

#### 1. Vertex AI (GCP) - Partial Access
```
✅ gemini-2.0-flash-exp (us-central1) - WORKING
❌ All other models - 404 Not Found
```

**Error Pattern:**
```
[VertexAI.ClientError]: got status: 404 Not Found
"Publisher Model `projects/tradesync-ai-prod/locations/us-central1/publishers/google/models/gemini-3-pro-preview`
was not found or your project does not have access to it."
```

**Analysis:**
- The project has Vertex AI access (gemini-2.0-flash-exp works)
- Newer/pre-GA models (gemini-3, gemini-2.5, gemini-exp-1206) are not available
- The model gemini-1.5-pro-latest (from config.ts) is also blocked, suggesting it may be deprecated

#### 2. Google AI Studio (API Key) - No Access
```
❌ All models - 401 Unauthorized
```

**Error Pattern:**
```
[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent
[401 Unauthorized] API keys are not supported by this API. Expected OAuth2 access token or other authentication
credentials that assert a principal.
```

**Analysis:**
- The current GOOGLE_AI_API_KEY is insufficient for newer models
- These models require OAuth2 authentication (Application Default Credentials)
- API keys may still work for older models, but none of the tested models work with the current API key

### Root Cause Analysis

The blockers have two distinct root causes:

**1. Vertex AI Model Access (404 Errors):**
- Project `tradesync-ai-prod` does not have access to Gemini 3 models
- Possible reasons:
  - Pre-GA terms not accepted in Google Cloud Console
  - Project not allowlisted for Gemini 3 preview access
  - Billing or organization-level restrictions
  - Models are region-specific and available in different locations

**2. Google AI Studio Authentication (401 Errors):**
- API key authentication is not supported for newer models
- OAuth2 authentication required (which Genkit's @googleai plugin already uses via GOOGLE_AI_API_KEY environment variable)
- The discrepancy suggests the model endpoints are completely different for newer models

### Recommendations for Unblocking

#### Immediate Options

**Option 1: Request Access to Gemini 3 Models**
1. Visit https://console.cloud.google.com/vertex-ai/publishers/google/models
2. Search for "gemini-3-pro-preview" or "gemini-3-flash-preview"
3. Request access or accept Pre-GA terms if prompted
4. Re-run verification script

**Option 2: Use Available Models**
- Configure the application to use `gemini-2.0-flash-exp` for both Flash and Pro use cases
- Accept reduced capabilities (no true Pro model available)
- This allows migration to ADK to proceed with current model

**Option 3: Use Google AI Studio with OAuth2**
- Modify authentication to use OAuth2 instead of API keys for Google AI Studio
- Research ADK's OAuth2 support (ADK uses Vertex AI by default)
- This may not be applicable for ADK migration path

#### Verification Process

The verification script (`functions/src/scripts/verifyGemini3Access.ts`) can be re-run after any changes:

```bash
export $(grep -v '^#' /home/engdahlz/Work/Tradesync/functions/.env | xargs)
npx tsx functions/src/scripts/verifyGemini3Access.ts
```

### Technical Patterns

#### Model Access Pattern

Working Model:
```typescript
const vertexAI = new VertexAI({
  project: 'tradesync-ai-prod',
  location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp', // ✅ Works
});

const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
});
```

Non-Working Model:
```typescript
const model = vertexAI.getGenerativeModel({
  model: 'gemini-3-pro-preview', // ❌ 404 Not Found
});
```

#### SDK Import Pattern

```typescript
import { VertexAI } from '@google-cloud/vertexai'; // For Vertex AI
import { GoogleGenerativeAI } from '@google/generative-ai'; // For Google AI Studio
```

### Questions for Future Investigation

1. **Model Availability:** Are there other Gemini 2.0 Pro variants that might work?
   - `gemini-2.0-pro-preview`
   - `gemini-2.0-pro-exp`

2. **Region Availability:** Are Gemini 3 models available in other regions?
   - Tested: us-central1, us-east4, europe-west4
   - Could try: us-east1, asia-northeast1

3. **Authentication:** How to use OAuth2 with Google AI Studio for newer models?
   - ADK uses Vertex AI by default, so this may not be relevant
   - May need to switch to Vertex AI path exclusively

4. **Project Configuration:** What project-level settings enable access to newer models?
   - Pre-GA terms acceptance location
   - Organization allowlists
   - Billing requirements

### Files Created/Modified

- `functions/src/scripts/verifyGemini3Access.ts` - Comprehensive model access verification script
- `functions/MIGRATION_NOTES.md` - Detailed test results and recommendations

### Related Documentation

- Google Cloud: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI Publishers: https://console.cloud.google.com/vertex-ai/publishers
- ADK Documentation: [Link to be added when available]

### Next Steps (Dependent on Unblock)

1. **If Gemini 3 access is obtained:**
   - Re-run verification to confirm access
   - Update config.ts with gemini-3 model IDs
   - Proceed with ADK migration

2. **If using alternative models:**
   - Update config.ts to use gemini-2.0-flash-exp for all use cases
   - Document limitation in code comments
   - Consider implementing model selection logic based on availability

3. **If neither works:**
   - Investigate Google Cloud project configuration
   - Contact Google Cloud support for model access
   - Consider alternative AI providers or migration paths
