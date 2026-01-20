# Plan: Phase 3 - AI Strategy Engine

## Context
We have a trading platform that can execute trades (Phase 2). Now we need the "Brain" to make decisions automatically. We will use **Gemini Flash** for high-speed news analysis and a **Signal Engine** to combine multiple factors.

## Architecture
- **News Source**: MarketAux API (already integrated).
- **AI Model**: Gemini 1.5 Flash (via Genkit) for sentiment analysis.
- **Signal Engine**: `functions/src/flows/signalEngine.ts` (Weighted scoring).
- **Scheduler**: Cloud Scheduler triggering `marketScanner` every 15-60 min.

## Tasks

### 1. News Analysis Flow
- [x] Create `analyzeNewsSentiment` flow (Updated `analyzeNews.ts` with numeric score)
- [x] Input: Raw news articles (MarketAux)
- [x] Output: Sentiment Score (-1.0 to 1.0) + Summary
- [x] Prompt Engineering: Tuning for financial impact ("Bullish/Bearish")

### 2. Signal Engine
- [x] Create `calculateSignal` flow (`functions/src/flows/signalEngine.ts`)
- [x] Inputs: Sentiment Score, RSI, MACD, Price Trend
- [x] Logic: Weighted average or Rule-based system
- [x] Output: `TradeSignal` (BUY/SELL/HOLD + Confidence)

### 3. Automation Loop
- [x] Update `marketScanner` to call `calculateSignal`
- [x] Implement `autoTrade` logic (In `scheduledScanner.ts`)
- [x] Store signals in Firestore for history (via trade logging and notifications)

### 4. Frontend - Strategy Dashboard
- [ ] Create `StrategyPerformance` widget
- [ ] Visualize "Why did AI buy?" (Explainability)
- [ ] Toggle "Auto-Trading" ON/OFF

## Success Criteria
- [x] System automatically scans market, analyzes news, and generates a signal.
- [x] "Why" explanation is stored and visible (in logs/notifications).
- [x] End-to-end flow: News -> Sentiment -> Signal -> Trade (Paper).

## STATUS: BACKEND COMPLETE
Frontend visualization pending (can be done in Phase 4).
