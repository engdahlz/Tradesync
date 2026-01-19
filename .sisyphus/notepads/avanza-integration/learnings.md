# Avanza Integration - Learnings

## 2026-01-19: Initial Implementation

### What Worked
- Python 3.13 compatible with avanza-api 16.0.0
- functions-framework runs locally without issues
- Health endpoint responds correctly: `{"service":"avanza-backend","status":"ok"}`
- get_stock_quote endpoint reachable, properly attempts Avanza auth

### Authentication Flow
- Avanza API uses `https://www.avanza.se/_api/authentication/sessions/usercredentials`
- Requires: username, password, TOTP code
- Without credentials, returns 400 Bad Request (expected)

### Dependencies Installed
```
avanza-api==16.0.0
pydantic==2.12.5
pyotp (for TOTP generation)
functions-framework (for local testing)
flask (HTTP handling)
```

### Local Testing Commands
```bash
cd functions-python
source .venv/bin/activate

# Test health
functions-framework --target=health --port=8081
curl http://localhost:8081/

# Test quote (requires env vars)
export AVANZA_USERNAME=...
export AVANZA_PASSWORD=...
export AVANZA_TOTP_SECRET=...
functions-framework --target=get_stock_quote --port=8082
curl -X POST http://localhost:8082/ -H "Content-Type: application/json" -d '{"symbol": "ERIC-B"}'
```

### Blockers for Full Testing
- **Task 9**: Manual curl test - BLOCKED: Requires user's Avanza credentials
- **Task 10**: E2E test - BLOCKED: Requires deployed backend + credentials

### Next Steps for User
1. Add credentials to `.env` in functions-python/
2. Test locally with real credentials
3. Deploy to Firebase: `firebase deploy --only functions:python-backend`
4. Set VITE_AVANZA_BACKEND_URL in frontend
