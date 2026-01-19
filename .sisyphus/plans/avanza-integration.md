# Plan: Avanza Wrapper Integration (Python Backend)

## Context
We are integrating the unofficial Avanza Wrapper (Python) to provide real-time data for Swedish stocks (.ST), which is otherwise expensive or unavailable.
The current backend is Node.js/TypeScript. We will add a Python Cloud Function environment alongside it.

## Architecture
- **Frontend**: `src/services/hybridDataService.ts` calls the Python endpoint.
- **Backend**: `functions-python/` (New Python Cloud Function Gen 2).
- **Library**: `avanza-api` (Python wrapper) + `pyotp` (2FA).
- **Hosting**: Firebase Cloud Functions (Python runtime).

## Phase 1: Python Environment Setup
- [x] 1. Create `functions-python/` directory structure
  - `main.py` (entry point)
  - `requirements.txt` (dependencies)
  - `.gitignore`
- [x] 2. Update `firebase.json` to support multiple codebases
  - Codebase 1: "default" -> `functions/` (Node.js)
  - Codebase 2: "python-backend" -> `functions-python/` (Python 3.11)
- [x] 3. Install Python dependencies
  - `functions-framework`
  - `avanza-api`
  - `pyotp`
  - `google-cloud-firestore` (if needed later)

## Phase 2: Implementation (Avanza Service)
- [x] 4. Implement `AvanzaService` class in `functions-python/avanza_service.py`
  - Zero-touch authentication (TOTP)
  - Session persistence (reuse connection)
  - Helper to clean ticker symbols
- [x] 5. Implement `get_stock_quote` endpoint in `functions-python/main.py`
  - Input: `{"symbol": "ERIC-B"}`
  - Output: JSON matching `UnifiedQuote` interface
  - Logic: Authenticate -> Get Quote -> Format -> Return
- [x] 6. Implement `Jitter/Rate Limiting` logic
  - Ensure we don't spam Avanza (basic implementation first)

## Phase 3: Frontend Integration
- [x] 7. Update `src/services/hybridDataService.ts`
  - Locate `fetchSwedishStockQuote`
  - Replace error throw with `fetch()` call to the new Python function URL
  - Handle authentication/token headers if needed (for our backend)

## Phase 4: Testing & Verification
- [x] 8. Verify Python environment build (`npm run build` equivalent)
- [x] 9. Manual test of the endpoint (using `curl` or Postman) [PARTIAL - structure verified, auth blocked on credentials]
- [ ] 10. End-to-end test from React frontend (Dashboard with Swedish stock) [BLOCKED - awaiting TOTP secret, ETA: few days]

## Notes
- **TOTP Secret**: The user will need to provide their Avanza TOTP secret in `.env` (backend).
- **Safety**: The implementation will start in "read-only" mode (no trading, only data fetching).
- **STATUS**: 9/10 complete. Task 10 blocked on user credentials. Resume when TOTP available.
