# ADK Deep Dive: TypeScript Implementation Reference

This document provides a detailed technical reference for the Agent Development Kit (ADK), focusing on its TypeScript implementation. ADK is designed for building complex, multi-agent systems with structured orchestration, state management, and tool integration.

## 1. Core Concepts

### 1.1. Agent Types
ADK distinguishes between reasoning agents and orchestration agents. All agents extend the `BaseAgent` class.

*   **`LlmAgent`**: The primary reasoning unit. It uses a Large Language Model (e.g., Gemini) to process instructions, use tools, and generate responses.
*   **`WorkflowAgent`**: Specialized agents designed for deterministic orchestration of other agents. They do not perform reasoning themselves.
    *   **`SequentialAgent`**: Executes sub-agents one after another in a fixed order.
    *   **`ParallelAgent`**: Executes sub-agents concurrently.
    *   **`LoopAgent`**: Repeatedly executes sub-agents until a termination condition is met.
*   **`CustomAgent`**: A user-defined agent that implements custom logic by overriding `runAsyncImpl` or `runLiveImpl`.

### 1.2. Primitives
*   **`FunctionTool`**: Wraps a TypeScript function to be called by an agent. It uses Zod schemas for parameter validation and LLM schema generation.
*   **`AgentTool`**: Wraps an agent instance as a tool, allowing one agent to delegate tasks to another.

---

## 2. Architecture & Multi-Agent Systems

### 2.1. Agent Hierarchy
Multi-agent systems in ADK are built as a tree structure. A parent agent (often the "root") contains a list of `subAgents`.
*   **Initialization**: Pass child agents to the `subAgents` property of the parent.
*   **Parent-Child Link**: ADK automatically sets `agent.parentAgent` during initialization.
*   **Finding Agents**: Use `agent.findAgent(name)` to locate a specific agent in the hierarchy.

### 2.2. Delegation & Routing
*   **LLM-Driven Delegation**: An `LlmAgent` can use another agent via an `AgentTool`. The LLM decides when to transfer control based on the tool's description.
*   **Deterministic Orchestration**: `WorkflowAgent` implementations provide fixed paths for task execution, useful for rigid pipelines (e.g., "Extract -> Analyze -> Format").

### 2.3. State Management
*   **Shared Session State**: All agents within the same session share access to `session.state`.
*   **Output Keys**: Agents can be configured with an `outputKey` to automatically save their final response into the session state for subsequent agents to consume.
*   **Template Interpolation**: Instructions can use `{variable_name}` to inject values from the state dynamically.

---

## 3. Components Deep Dive

### 3.1. Session & State
*   **`Session`**: Represents a single conversation thread. It holds the chronological sequence of `Events` and the current `State`.
*   **`State`**: A key-value store within a session. Use `context.state.get('key')` and `context.state.set('key', value)` (in callbacks/tools).

### 3.2. Memory
*   **`MemoryService`**: Manages long-term, searchable knowledge that can span multiple sessions.
*   **Searching**: Accessible via `toolContext.searchMemory(query)`.

### 3.3. Artifacts
*   **Purpose**: Managed binary data (images, PDFs, CSVs) that is too large or complex for the simple key-value state.
*   **Versioning**: Each time an artifact is saved with the same filename, a new version is created.
*   **Operations**:
    *   `saveArtifact(filename, part)`: Saves binary data.
    *   `loadArtifact(filename)`: Retrieves the latest version.
    *   `listArtifacts()`: Lists all available artifact names.

### 3.4. Events
*   **`Event`**: The unit of communication in ADK. Everything (messages, tool calls, state changes) is an event.
*   **Streaming**: ADK supports real-time event streaming via `runAsync`.

---

## 4. Tools & Integration

### 4.1. Creating Custom Function Tools
Function tools are defined using the `FunctionTool` class and Zod for schema definition.

```typescript
import { FunctionTool } from '@google/adk';
import { z } from 'zod';

const getStockPrice = new FunctionTool({
  name: 'get_stock_price',
  description: 'Retrieves the current stock price for a given ticker symbol.',
  parameters: z.object({
    ticker: z.string().describe('The stock ticker symbol (e.g., AAPL).'),
  }),
  execute: async ({ ticker }, toolContext) => {
    // Logic to fetch price
    const price = 150.00; 
    return { status: 'success', price }; // Must return an object
  },
});
```

### 4.2. Tool Context
Tools receive a `ToolContext` which provides:
*   Access to `state` (read/write).
*   Ability to `save_artifact` / `load_artifact`.
*   Access to `search_memory`.
*   Authentication handlers (`requestCredential`).

---

## 5. Runtime & API

### 5.1. API Server
Run your agents as a REST API for testing and programmatic access.
*   **Command**: `npx adk api_server`
*   **Interactive Docs**: Access Swagger UI at `http://localhost:8000/docs`.

### 5.2. Key Endpoints
*   `GET /list-apps`: Lists all discovered agent applications.
*   `POST /apps/{app}/users/{user}/sessions/{session}`: Create/Update session.
*   `POST /run`: Execute agent and get a full list of events.
*   `POST /run_sse`: Execute agent with real-time Server-Sent Events.

---

## 6. TypeScript Cheat Sheet

### Common Classes
| Class | Purpose |
| :--- | :--- |
| `LlmAgent` | Reasoning agent powered by LLM. |
| `SequentialAgent` | Runs sub-agents in order. |
| `ParallelAgent` | Runs sub-agents concurrently. |
| `FunctionTool` | Wraps a function for agent use. |
| `InMemoryRunner` | Executes agents in the local environment. |

### Context Interfaces
| Interface | Provided to | Capabilities |
| :--- | :--- | :--- |
| `ReadonlyContext` | Instruction Providers | Read state. |
| `CallbackContext` | Callbacks | Read/Write state, Artifacts. |
| `ToolContext` | Tool Functions | State, Artifacts, Memory, Auth. |

### Configuration Example
```typescript
const agent = new LlmAgent({
  name: 'my_agent',
  model: 'gemini-2.5-flash',
  instruction: 'Use the {tool_name} to help the user.',
  tools: [myTool],
  subAgents: [childAgent],
  outputKey: 'final_result'
});
```
