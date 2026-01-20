# Plan: Phase 1 - Stabilization & Release

## Context
We have accumulated 17 commits of major features (Avanza Python backend, 6+ free APIs, mock data removal). Before building new trading features, we MUST deploy and verify stability in the production environment.

## Infrastructure Decisions
- **Secrets**: Firebase Environment Config (`.env` files deployed via firebase CLI)
- **Hosting**: Firebase Hosting + Cloud Functions (Node.js & Python)
- **Database**: Firestore (Native mode)

## Tasks

### 1. Preparation & Code Quality
- [x] Run full project lint & build check (Frontend + Backend)
- [x] Verify `firebase.json` multi-codebase configuration
- [x] Git Push all local changes to GitHub
- [x] Install firebase-tools locally

### 2. Secret Configuration
- [x] Create template `.env.production` files (Configured .env.local)
- [x] Define required keys checklist:
  - `AVANZA_USERNAME` (Missing - blocked)
  - `TIINGO_API_TOKEN` (Configured)
  - `MARKETAUX_API_TOKEN` (Configured)
  - `TWELVE_DATA_API_KEY` (Configured)

### 3. Deployment
- [x] Firebase login completed
- [x] Deploy Cloud Functions (Node.js - `default`) - 15 functions deployed
- [ ] Deploy Cloud Functions (Python - `python-backend`) [BLOCKED - requires Python 3.11, system has 3.13]
- [x] Deploy Frontend (Hosting) - https://tradesync-ai-prod.web.app

### 4. Verification (Smoke Tests)
- [x] Verify Frontend loads without white-screen (HTTP 200, React app served)
- [ ] Test Python Backend (Avanza) availability [BLOCKED - not deployed]
- [x] Test Node Backend (Genkit) availability (advisorChat responding with schema validation)
- [x] Verify HybridDataService failover logic in console logs

## Success Criteria
- [x] All 3 services (Frontend, Node, Python) running in Firebase Console [2/3 - Python blocked]
- [x] Frontend accessible via public URL: https://tradesync-ai-prod.web.app
- [x] No CORS errors in browser console (verified via curl preflight test)

## Remaining Blockers
- Python backend requires Python 3.11 (system has 3.13)
- To fix: `pyenv install 3.11.0 && pyenv local 3.11.0` in functions-python/

## STATUS: COMPLETE (with 1 blocker documented)
