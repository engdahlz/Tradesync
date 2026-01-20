# Plan: Phase 4 - UI/UX Polish & Visualization

## Context
The backend is powerful (AI Strategy, Live Trading, Market Scanning), but the frontend needs to catch up. We need to visualize the AI's decisions and ensure the app feels "Pro" on all devices.

## Architecture
- **Framework**: React + Tailwind + Framer Motion.
- **State**: React Query (if available) or local state.
- **Design System**: "Google Finance" aesthetic (Clean, Data-dense).

## Tasks

### 1. Strategy Dashboard (Visualization)
- [ ] Create `src/components/widgets/StrategyPerformance.tsx`
- [ ] Display "Latest Signal" (Buy/Sell/Hold) with Confidence gauge
- [ ] Show "Why?" explanation (Reasoning from Signal Engine)
- [ ] Add "Auto-Trading" Toggle (Control Firestore flag)

### 2. Trade Experience
- [ ] Update `TradeModal` to fetch and display **Real Available Balance**
- [ ] Add success/failure toast notifications (Sonner or custom)
- [ ] Validate "Max Trade Amount" on frontend (pre-check)

### 3. Mobile Responsiveness
- [ ] Audit `Dashboard`, `Portfolio`, `MarketNews` on mobile viewport
- [ ] Fix `MainChart` height/aspect ratio on mobile
- [ ] Ensure `TradeModal` is full-screen or sheet-like on mobile

### 4. Polish & Animations
- [ ] Install `framer-motion`
- [ ] Add page transitions (Fade/Slide)
- [ ] Add list entry animations (staggered fade-in for news/signals)

## Success Criteria
- User can see *why* the AI wants to buy/sell.
- User can toggle auto-trading.
- App looks broken-free on iPhone/Android size.
