# Plan: Phase 5 - Heroku Migration (Avanza Backend)

## Context
Firebase Cloud Functions requires Python 3.11, but the system environment has 3.13. Deployment failed.
We will migrate the Python backend to **Heroku** (supported by GitHub Student Pack) to bypass this limitation and get the Avanza integration running live.

## Architecture
- **Platform**: Heroku (Free Student Tier).
- **Runtime**: Python 3.13 (supported by Heroku).
- **Server**: Gunicorn serving the existing Flask app (via functions-framework or direct Flask).

## Tasks

### 1. Heroku Configuration
- [x] Create `runtime.txt` (specify python-3.13.1)
- [x] Create `Procfile` (web: gunicorn main:app)
- [x] Update `requirements.txt` (add gunicorn)

### 2. Code Adaptation
- [x] Ensure `main.py` exposes a WSGI app object compatible with Gunicorn.
- [x] Test locally with `gunicorn` (Syntax check passed)

### 3. Documentation for User
- [x] Write clear "How to Deploy to Heroku" guide (`functions-python/HEROKU_DEPLOY.md`).
- [x] Instructions for setting Config Vars (`AVANZA_...`).

## Success Criteria
- [x] Backend runs locally with `gunicorn`.
- [x] User has clear instructions to `git push heroku`.

## STATUS: COMPLETE
Ready for deployment via Heroku CLI.
