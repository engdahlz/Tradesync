# TradeSync 2.0 Master Roadmap

## Phase 1: Stabilization & Release (Immediate)
**Goal:** Deploy current 17-commit stack to production and verify stability.
- [ ] Git Push & CI/CD check
- [ ] Configure Production Secrets (Firebase/GCP)
- [ ] Deploy Node.js Backend (Genkit flows)
- [ ] Deploy Python Backend (Avanza wrapper)
- [ ] Verify Cross-Service Communication
- [ ] End-to-End Smoke Test (Live Environment)

## Phase 2: Real Trade Execution
**Goal:** Move from "Paper Trading" (Firestore logging) to real Exchange execution.
- [ ] Select Exchange (Binance vs Alpaca)
- [ ] Implement API Keys Management (Secret Manager)
- [ ] Build `ExchangeService` Adapter Pattern
- [ ] Implement `placeOrder`, `cancelOrder`, `getBalance`
- [ ] Create "Kill Switch" (Emergency Stop) mechanism
- [ ] Update Frontend to toggle Paper/Live mode

## Phase 3: AI & Strategy Engine
**Goal:** Active automated reasoning and execution.
- [ ] Connect MarketAux News to Gemini Flash (Real-time Sentiment)
- [ ] Build Signal Engine (RSI + MACD + Sentiment => Action)
- [ ] Implement Automated Trading Loop (Cron/Scheduler)
- [ ] Voice Control Interface (Web Speech API)

## Phase 4: UI/UX & Polish
**Goal:** Consumer-grade finish and mobile support.
- [ ] Audit Mobile Responsiveness (PWA capabilities)
- [ ] Add Loading Skeletons & Transitions (Framer Motion)
- [ ] Implement Toast Notifications for Trade Events
- [ ] Dark/Light Mode toggle (System preference sync)
