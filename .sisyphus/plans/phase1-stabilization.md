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
- [ ] Git Push all local changes to GitHub

### 2. Secret Configuration
- [x] Create template `.env.production` files (Configured .env.local)
- [x] Define required keys checklist:
  - `AVANZA_USERNAME` (Missing - blocked)
  - `TIINGO_API_TOKEN` (Configured)
  - `MARKETAUX_API_TOKEN` (Configured)
  - `TWELVE_DATA_API_KEY` (Configured)

### 3. Deployment
- [ ] Deploy Cloud Functions (Node.js - `default`)
- [ ] Deploy Cloud Functions (Python - `python-backend`)
- [ ] Deploy Frontend (Hosting)

### 4. Verification (Smoke Tests)
- [ ] Verify Frontend loads without white-screen
- [ ] Test Python Backend (Avanza) availability (Health check)
- [ ] Test Node Backend (Genkit) availability
- [ ] Verify HybridDataService failover logic in console logs

## Success Criteria
- All 3 services (Frontend, Node, Python) running in Firebase Console
- Frontend accessible via public URL
- No CORS errors in browser console
