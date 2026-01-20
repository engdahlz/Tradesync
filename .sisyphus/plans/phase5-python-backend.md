# Plan: Phase 5 - Python Backend Deployment (Firebase)

## Context
We reverted the Heroku migration strategy to keep everything on Firebase.
However, Firebase requires Python 3.11/3.12, and the local environment is 3.13.

## Tasks

### 1. Revert Heroku Config
- [x] Remove Procfile, runtime.txt
- [x] Restore main.py to Cloud Functions format
- [x] Restore requirements.txt

### 2. Prepare for User Deployment
- [x] Create `functions-python/DEPLOY_INSTRUCTIONS.md`
- [ ] User installs Python 3.11
- [ ] User runs deploy

## Success Criteria
- Codebase is clean (no Heroku artifacts).
- Clear instructions provided for the user to finish the deploy.
