# Agentic CX Designer

A self-contained, **embeddable drag-and-drop agent flow canvas** — the builder feature from the omnichannel agent platform, extracted to stand alone (and drop back into a larger product later).

![Agentic CX Designer](https://img.shields.io/badge/version-0.2.0-blue)

## What this is (post-restructure)

One React component — **[`<CanvasDesigner />`](src/designer)** — is the entire product:

- **n8n / AWS Connect-style canvas** — drag nodes from a searchable palette, wire typed ports, configure in schema-driven panel
- **27 node types** — voice, chat, agentic (LangGraph / Strands / ADK), deterministic, control, governance, integration, gateway (MCP)
- **Run & test in place** — client-side flow engine simulation with live trace pulses
- **Preflight · Script · Validation · Flow I/O · Versions · Builder chat · Analytics** as toggle-in drawers
- **Undo/redo, autosave, local-first storage** — works offline

It is deliberately *focused*: no admin/observability/platform sections. That work stays in
`omnichannel-agent-platform`, which this canvas will be embedded into
(see [docs/EMBEDDING.md](docs/EMBEDDING.md) for the contract).

## Features

- **Visual Canvas** — drag-and-drop node-based flow builder (React Flow + custom `cx` node cards)
- **Voice-Native** — STT, TTS, VAD, barge-in as first-class nodes
- **Agentic Reasoning** — ReAct pattern with hard ceilings (cost, iterations, loop detection)
- **Deterministic + Agentic Blending** — Policy enforced by infrastructure, not model behavior
- **Framework Agnostic** — LangGraph, Strands, ADK adapters as nodes
- **Pattern composition** — author with composite "Agent Pattern" blocks that expand to a subgraph
- **AI-Assisted Building** — generate flows from plain English (Builder chat drawer)
- **MCP** — tool catalog nodes; expose flows via MCP gateway

## Layout

```
src/designer/      ← THE feature (embeddable component + engine + nodes)
src/App.tsx        ← thin standalone demo host
tests/             ← engine, normalization, node card, patterns, builder, custom nodes, smoke tests
server/            ← optional FastAPI persistence backend (not required by the canvas)
```

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:5173
npm test           # 125 tests
npm run build      # tsc + vite production build
```

No database or backend required — the canvas runs entirely in the browser
(local-first storage: IndexedDB + localStorage). The optional FastAPI backend
in `server/` (Python, Docker) is kept for later platform integration and is
not needed by the canvas.

## Node Types (27 registered)

| Category | Nodes |
|----------|-------|
| **Voice** | Voice Input, Voice Output |
| **Chat** | Chat Input, Chat Output, Page Assistant |
| **Agentic** | Intent Classifier, Reasoning Loop, Website Sync, Knowledge Retrieval, Memory, Copilot Action, Self-Help Answer, A2A Skill, LangGraph Agent, Strands Agent, ADK Agent |
| **Deterministic** | Slot Collector, Business Rule, Human Handoff |
| **Control** | Conditional Router, Sub-flow, Agent Pattern (composite), Parallel, Wait |
| **Governance** | Guardrail, Agent Firewall |
| **Integration** | HTTP Request, Telephony, Webhook, Database, Voice Gateway |
| **Gateway** | MCP Tool |

## Framework Adapters

| Framework | Type | Status |
|-----------|------|--------|
| LangGraph | `agentic.langgraph` | ✅ registered node + Python export |
| AWS Strands | `agentic.strands` | ✅ registered node |
| AWS ADK | `agentic.adk` | ✅ registered node |
| LangChain / AutoGen / CrewAI | — | 📋 planned (roadmap) |

## Custom Nodes

Author custom nodes with a behaviour preset (`http` / `llm` / `transform` /
`guardrail`) from `nodes/custom.ts`, then hand them to the canvas via the
`customNodes` prop (they are namespaced `custom.` so they can never shadow a
built-in):

```tsx
import { CanvasDesigner } from 'agentic-cx-designer';
import { BEHAVIOR_PRESETS, customNodeDefinition } from 'agentic-cx-designer';
// see src/designer/nodes/custom.ts for the CustomNodeRecord shape

const myNode = {
  id: 'record_1',
  type: 'custom.weather_lookup',
  label: 'Weather Lookup',
  description: 'Fetch weather for the caller’s city',
  category: 'integration',
  icon: '🌤️',
  color: '#6366f1',
  behavior: 'http',                    // ← preset drives I/O + execution
  inputs: BEHAVIOR_PRESETS.find(p => p.id === 'http')!.inputs,
  outputs: BEHAVIOR_PRESETS.find(p => p.id === 'http')!.outputs,
  config: { url: 'https://api.weather.example/current' },
  configSchema: [
    { name: 'city', label: 'City field', type: 'string', required: true }
  ],
  version: 1
};

<CanvasDesigner customNodes={[myNode]} />
```

## AI Flow Generator (Builder chat)

```typescript
import { FlowGenerator } from 'agentic-cx-designer';

const result = await FlowGenerator.generate({
  description: 'Create a customer support voice agent that handles billing inquiries…',
  channel: 'voice'
});

result.flow;          // Complete FlowGraph definition
result.explanation;   // What was built
result.suggestions;   // Improvement suggestions
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flows` | Create flow |
| GET | `/api/flows` | List flows |
| GET | `/api/flows/{id}` | Get flow |
| PUT | `/api/flows/{id}` | Update flow |
| DELETE | `/api/flows/{id}` | Delete flow |
| POST | `/api/builds` | Create build |
| GET | `/api/builds/{build_id}` | Get build status |
| POST | `/api/deployments` | Deploy build |
| POST | `/api/deployments/{id}/rollback` | Rollback deployment |
| POST | `/api/eval-suites` | Create eval suite |
| GET | `/api/eval-suites/{suite_id}` | Get eval suite |
| WS | `/ws/test/{flow_id}` | Real-time testing |
| GET | `/health` | Health check |

Full reference for the optional backend: [docs/API.md](docs/API.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/EMBEDDING.md](docs/EMBEDDING.md) | **Start here** — the embedding contract for the `<CanvasDesigner />` component |
| [docs/NODES.md](docs/NODES.md) | Node catalog — built-in node types by category |
| [docs/API.md](docs/API.md) | Optional FastAPI backend reference |
| [docs/TESTING.md](docs/TESTING.md) | Testing guide |
| [docs/SIMULATION.md](docs/SIMULATION.md) | Mock multi-turn simulations on IndexedDB |
| [docs/AGENT_FIREWALL.md](docs/AGENT_FIREWALL.md) | Agent Firewall node: policy gateway, rule engine, PII/PHI |

Other docs in `docs/` (NAVIGATION, EXPERIENCE_BOTS, VOICE_GATEWAY,
CONFIGURATION, TROUBLESHOOTING) are platform-era documents kept for
reference; they describe features that now live in
`omnichannel-agent-platform`.

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│  <CanvasDesigner /> (React + React Flow, all client-side) │
│  ─ Canvas (cx node cards) · Palette · Config panel        │
│  ─ FlowEngine simulation · trace pulses · run summary     │
│  ─ Validation · Preflight · Script · Flow I/O             │
│  ─ Versions · Builder chat · History · Autosave           │
└───────────────────────────────────────────────────────────┘
              │ optional REST + WebSocket (host chooses)
┌───────────────────────────────────────────────────────────┐
│  server/ (optional FastAPI + PostgreSQL)                  │
│  ─ Flow CRUD, Build, Deployment, eval suites              │
└───────────────────────────────────────────────────────────┘
```

## License

MIT
