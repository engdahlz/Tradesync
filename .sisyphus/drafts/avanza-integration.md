# Draft: Avanza Wrapper Integration

## Context
Integration of Avanza Wrappers based on "Avanza Wrappers_ Prestandaoptimering och Implementering.docx".
Current backend is TypeScript (Firebase Functions). We need to add a Python backend for the `avanza-api` wrapper.

## Architecture
- **Frontend**: React (hybridDataService.ts) -> calls Python Cloud Function
- **Backend**: Python Cloud Function (Gen 2) -> runs `avanza-api` + `pyotp`
- **Auth**: Zero-touch TOTP (Secret stored in Env/Secret Manager)
- **Performance**: Adaptive Polling (Jitter), Session Persistence, hosted in `eu-north-1` (Stockholm).

## Integration Points
- `src/services/hybridDataService.ts`: Update `fetchSwedishStockQuote` to call the new endpoint.
- `functions/`: Add Python codebase configuration.

## Risks
- **Legal**: "Grey zone". Strictly for personal use.
- **Blocking**: Aggressive polling leads to bans. Implement "Jitter".

## Scope
- IN: Integration of Avanza Wrapper for real-time Swedish stock data.
- IN: Setup Python environment in Firebase.
- OUT: Commercial distribution.
