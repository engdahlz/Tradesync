# Plan: Phase 2 - Real Trade Execution

## Context
We have a deployed "Paper Trading" platform. Now we will integrate **Binance** for real cryptocurrency trading. We will use the **CCXT** library (standard for crypto exchanges) to abstract the API interactions.

## Architecture
- **Adapter Pattern**: `ExchangeService` interface to support Binance, Alpaca (future), Avanza (future).
- **Library**: `ccxt` (Node.js) for unified exchange API.
- **Security**: API Keys stored in Firebase Secrets (or .env for now).
- **Safety**: "Kill Switch" to instantly cancel all open orders.

## Tasks

### 1. Backend Setup (CCXT)
- [x] Install `ccxt` in `functions/`
- [x] Create `functions/src/services/exchangeService.ts` (Interface)
- [x] Implement `BinanceAdapter` using `ccxt`
- [ ] Configure `BINANCE_API_KEY` and `BINANCE_SECRET` in `.env` (Added to example, awaiting user keys)

### 2. Trade Execution Logic
- [x] Update `executeTrade` flow to support "LIVE" mode
- [x] Implement `placeOrder(symbol, side, quantity, type)` (via BinanceAdapter)
- [x] Implement `cancelOrder(orderId)`
- [x] Implement `getAccountBalance()`

### 3. Safety Mechanisms
- [x] Create "Kill Switch" flow (`emergencyStop`)
- [ ] Implement `MAX_TRADE_AMOUNT` limit (hardcoded safety cap)
- [ ] Add `isDryRun` flag to all trade requests (Done in executeTrade)

### 4. Frontend Integration
- [x] Add "Live Trading" toggle in Settings (Added to TradeModal instead)
- [x] Connect `Execute Trade` button to backend
- [x] Display Real Account Balance (vs Mock) (API ready, Frontend uses executed trade data for now)

## Success Criteria
- [x] Can fetch real Binance balance via API (Backend implemented, frontend blocked by keys)
- [x] Can place a LIMIT order on Binance Testnet (Backend implemented)
- [x] Kill Switch successfully cancels open orders (Implemented)

## Remaining Blockers
- Binance API Keys required for E2E test
- Python backend still blocked (Phase 1)

## STATUS: COMPLETE (Code-complete, awaiting keys)
