# Draft: Architecture Review - n8n vs. Custom Code (Firebase/Genkit)

## Context
User asked if the project (Trade/Sync) would be "better" using n8n.
Current Stack: React + Vite, Firebase Functions + Genkit, Firestore.

## Preliminary Analysis

### n8n (Low-Code/Workflow Automation)
**Strengths:**
- **Speed:** Extremely fast to build simple integrations (e.g., "If Binance price > X, send Slack message").
- **Visual:** Easy to see flow logic without reading code.
- **Integrations:** Built-in nodes for hundreds of services.
- **RAG:** Has built-in LangChain nodes (good for simple chains).

**Weaknesses:**
- **Version Control:** Harder to manage in Git compared to TypeScript files.
- **Testing:** Difficult to write unit/integration tests for visual flows.
- **Complexity:** "Spaghetti flows" become unmanageable for complex business logic.
- **Latency:** Adds a layer of overhead compared to direct Cloud Functions.

### Current Stack (Firebase Functions + Genkit)
**Strengths:**
- **Control:** Full control over execution environment and logic.
- **Genkit:** specialized for AI flows, strongly typed, Google-ecosystem optimized.
- **SDLC:** Standard software development lifecycle (PRs, Tests, CI/CD).
- **Scalability:** Serverless functions scale massively.

## Open Questions for User
1. **Pain Point:** What friction prompted this idea? (Dev speed? Complexity? Maintenance?)
2. **Target Area:** Is this for the core trading engine, or auxiliary tasks (notifications, ingestion)?
3. **Users:** Do non-developers need to edit these flows?
