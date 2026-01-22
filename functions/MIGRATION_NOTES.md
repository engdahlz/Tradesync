# Gemini 3 Model Access Verification Results

**Generated:** 2026-01-22T12:55:55.444Z
**Project:** tradesync-ai-prod

## Summary

- **Total models tested:** 7
- **Accessible models:** 1
- **Blocked models:** 6

## ⚠️ BLOCKER: Gemini 3 models NOT accessible

### Root Cause
The project may need:
1. Pre-GA terms acceptance in Google Cloud Console
2. Billing enablement on the project
3. Vertex AI API enablement
4. Allowlisting for Gemini 3 models

### Next Steps
1. Check https://console.cloud.google.com/vertex-ai/publishers for model access
2. Accept Pre-GA terms if prompted
3. Verify billing is enabled
4. Re-run this verification script

## Vertex AI Results

### ❌ gemini-3-pro-preview

- **Status:** Blocked
- **Error:** [VertexAI.ClientError]: got status: 404 Not Found. {"error":{"code":404,"message":"Publisher Model `projects/tradesync-ai-prod/locations/europe-west4/publishers/google/models/gemini-3-pro-preview` not...

### ❌ gemini-3-flash-preview

- **Status:** Blocked
- **Error:** [VertexAI.ClientError]: got status: 404 Not Found. {"error":{"code":404,"message":"Publisher Model `projects/tradesync-ai-prod/locations/europe-west4/publishers/google/models/gemini-3-flash-preview` n...

### ❌ gemini-2.5-pro-preview

- **Status:** Blocked
- **Error:** [VertexAI.ClientError]: got status: 404 Not Found. {"error":{"code":404,"message":"Publisher Model `projects/tradesync-ai-prod/locations/europe-west4/publishers/google/models/gemini-2.5-pro-preview` n...

### ❌ gemini-2.5-flash-preview

- **Status:** Blocked
- **Error:** [VertexAI.ClientError]: got status: 404 Not Found. {"error":{"code":404,"message":"Publisher Model `projects/tradesync-ai-prod/locations/europe-west4/publishers/google/models/gemini-2.5-flash-preview`...

### ✅ gemini-2.0-flash-exp

- **Status:** Accessible
- **Region:** us-central1
- **Test Response:** "Hello! I am working now."

### ❌ gemini-1.5-pro-latest

- **Status:** Blocked
- **Error:** [VertexAI.ClientError]: got status: 404 Not Found. {"error":{"code":404,"message":"Publisher Model `projects/tradesync-ai-prod/locations/europe-west4/publishers/google/models/gemini-1.5-pro-latest` no...

### ❌ gemini-exp-1206

- **Status:** Blocked
- **Error:** [VertexAI.ClientError]: got status: 404 Not Found. {"error":{"code":404,"message":"Publisher Model `projects/tradesync-ai-prod/locations/europe-west4/publishers/google/models/gemini-exp-1206` not foun...

## Google AI Studio Results

### ❌ gemini-3-pro-preview

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent: [401 Unauthorized] API keys are not supported by this API....

### ❌ gemini-3-flash-preview

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent: [401 Unauthorized] API keys are not supported by this AP...

### ❌ gemini-2.5-pro-preview

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview:generateContent: [401 Unauthorized] API keys are not supported by this AP...

### ❌ gemini-2.5-flash-preview

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent: [401 Unauthorized] API keys are not supported by this ...

### ❌ gemini-2.0-flash-exp

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent: [401 Unauthorized] API keys are not supported by this API....

### ❌ gemini-1.5-pro-latest

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent: [401 Unauthorized] API keys are not supported by this API...

### ❌ gemini-exp-1206

- **Status:** Blocked
- **Error:** [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-exp-1206:generateContent: [401 Unauthorized] API keys are not supported by this API. Expe...

## Alternative Models (Accessible)

While Gemini 3 is not available, the following models work:

- gemini-2.0-flash-exp (Vertex AI - us-central1)

**Recommended configuration:**
```typescript
export const MODEL_FLASH = 'gemini-2.5-flash-preview'; // For high-frequency, low-latency
export const MODEL_PRO = 'gemini-2.5-pro-preview'; // For deep reasoning, strategy, RAG
```

## Full Test Results

### Models Tested

**Gemini 3 Models:**
- gemini-3-pro-preview
- gemini-3-flash-preview

**Gemini 2.5 Models:**
- gemini-2.5-pro-preview
- gemini-2.5-flash-preview

**Alternative Models:**
- gemini-exp-1206

**Regions Tested:** us-central1, us-east4, europe-west4

