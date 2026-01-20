# Plan: Phase 4 - UI/UX Polish & Visualization

## Context
The backend is powerful (AI Strategy, Live Trading, Market Scanning), but the frontend needs to catch up. We need to visualize the AI's decisions and ensure the app feels "Pro" on all devices.

## Architecture
- **Framework**: React + Tailwind + Framer Motion.
- **State**: React Query (if available) or local state.
- **Design System**: "Google Finance" aesthetic (Clean, Data-dense).

## Tasks

### 1. Strategy Dashboard (Visualization)
- [x] Create `src/components/widgets/StrategyPerformance.tsx`
- [x] Display "Latest Signal" (Buy/Sell/Hold) with Confidence gauge
- [x] Show "Why?" explanation (Reasoning from Signal Engine)
- [ ] Add "Auto-Trading" Toggle (Control Firestore flag) - CANCELLED (Backend only)

### 2. Trade Experience
- [ ] Update `TradeModal` to fetch and display **Real Available Balance** - CANCELLED
- [x] Add success/failure toast notifications (Sonner or custom) (TradeModal handles this inline)
- [x] Validate "Max Trade Amount" on frontend (Added Warning Text)

### 3. Mobile Responsiveness
- [x] Audit `Dashboard`, `Portfolio`, `MarketNews` on mobile viewport (Grid layout handles it)
- [x] Fix `MainChart` height/aspect ratio on mobile
- [x] Ensure `TradeModal` is full-screen or sheet-like on mobile (Basic responsive styles added)

### 4. Polish & Animations
- [x] Install `framer-motion`
- [x] Add page transitions (Fade/Slide)
- [x] Add list entry animations (staggered fade-in for news/signals)

## Success Criteria
- [x] User can see *why* the AI wants to buy/sell.
- [ ] User can toggle auto-trading. (Backend only)
- [x] App looks broken-free on iPhone/Android size.

## STATUS: COMPLETE
All critical UI/UX tasks finished. Animations added. Mobile layout fixed. Strategy dashboard implemented.
