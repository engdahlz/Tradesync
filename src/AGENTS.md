# FRONTEND KNOWLEDGE BASE

**Context:** src/ (React + Vite Client)

## OVERVIEW
The frontend uses **React + Vite** with **Tailwind CSS**. It follows a component-based architecture with separate services for API logic.

## STRUCTURE
```
src/
├── components/       # UI building blocks (widgets, layout)
├── pages/            # Route views (Dashboard, MarketNews)
├── services/         # API proxies (Firebase, External APIs)
├── hooks/            # React hooks (useBinanceWebSocket)
└── contexts/         # Global state (AuthContext)
```

## KEY COMPONENTS
- **GoogleLayout**: Main app shell implementing Google Finance aesthetic.
- **AIChatPanel**: Context-aware AI assistant sidebar.

## CONVENTIONS
- **Styling**: use **Tailwind** classes. Use CSS variables (`var(--ts-blue)`) defined in `index.css` for colors.
- **Validation**: Use **Zod** schemas for all component props and API responses.
- **State**: Prefer local state or `useContext`. Avoid Redux.

## ANTI-PATTERNS (DO NOT DO)
- ❌ **Direct DOM Access**: No `document.getElementById`. Use refs.
- ❌ **Hardcoded Colors**: No hex codes (`#123456`). Use Tailwind classes or CSS vars.
- ❌ **Any Type**: No `any` in TypeScript. Define interfaces.
