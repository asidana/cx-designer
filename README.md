# Agentic CX Designer

A visual voice agent builder — Flowise-class, but purpose-built for AI voice agents.

![Agentic CX Designer](https://img.shields.io/badge/version-0.1.0-blue)

## Features

- **Visual Canvas** — Drag-and-drop node-based flow builder (React Flow)
- **Voice-Native** — STT, TTS, VAD, barge-in as first-class nodes
- **Agentic Reasoning** — ReAct pattern with hard ceilings (cost, iterations, loop detection)
- **Deterministic + Agentic Blending** — Policy enforced by infrastructure, not model behavior
- **Real-Time Testing** — Talk to your agent while building it
- **Framework Agnostic** — LangGraph, Strands, ADK, LangChain, AutoGen, CrewAI
- **Built-In Evals** — 3-layer evaluation (model, component, outcome)
- **Guardrails SDK** — Custom guardrail apps as nodes or sidecars
- **MCP Gateway** — Expose flows as MCP tools
- **AI-Assisted Building** — Generate flows from plain English
- **Self-Hosted** — Docker + Kubernetes ready

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker + Docker Compose
- PostgreSQL 15+
- Redis 7+

### Docker (Recommended)

```bash
# Clone
git clone https://github.com/your-org/agentic-cx-designer.git
cd agentic-cx-designer

# Configure
cp .env.example .env
# Edit .env with your API keys

# Start
docker-compose up -d

# Open
open http://localhost:3000
```

### Local Development

```bash
# Frontend
cd agentic-cx-designer
pnpm install
pnpm dev

# Backend (separate terminal)
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Database
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d -p 6379:6379 redis:7
```

## Node Types

| Category | Nodes |
|----------|-------|
| **Voice** | Voice Input, Voice Output, Turn Detection, Audio Preprocessing |
| **Agentic** | Intent Classifier, Reasoning Loop, Planning, RAG, Memory, LangGraph, Strands, ADK |
| **Deterministic** | Slot Collector, Business Rules, Compliance Script, Data Request, Human Handoff |
| **Control Flow** | Conditional Router, Parallel Branch, Loop, Wait, Sub-flow |
| **Governance** | Guardrail, Eval Checkpoint, Audit Logger, Cost Tracker |
| **Integration** | HTTP Request, MCP Tool, Database, Webhook, Telephony |
| **Gateway** | MCP Gateway, Custom HTTP Gateway |

## Framework Adapters

| Framework | Adapter | Status |
|-----------|---------|--------|
| LangGraph | `agentic.langgraph` | ✅ |
| AWS Strands | `agentic.strands` | ✅ |
| AWS ADK | `agentic.adk` | ✅ |
| LangChain | `agentic.langchain` | ✅ |
| AutoGen | `agentic.autogen` | ✅ |
| CrewAI | `agentic.crewai` | ✅ |
| PydanticAI | `agentic.pydanticai` | 📋 |
| LlamaIndex | `agentic.llamaindex` | 📋 |

## Custom Nodes

```typescript
import { CustomNodeSDK } from './sdk/CustomNodeSDK';

CustomNodeSDK.register({
  type: 'my.custom_node',
  category: 'integration',
  label: 'My Custom Node',
  description: 'Does something custom',
  icon: '🔧',
  color: '#ff6b6b',
  inputs: [{ id: 'input', type: 'text', label: 'Input' }],
  outputs: [{ id: 'output', type: 'text', label: 'Output' }],
  configSchema: [
    { name: 'apiKey', label: 'API Key', type: 'password', required: true }
  ],
  execute: async (context) => {
    const input = context.variables.get('input');
    // Your custom logic here
    return {
      outputs: { output: `Processed: ${input}` },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  }
});
```

## AI Flow Generator

```typescript
import { FlowGenerator } from './ai/FlowGenerator';

const result = await FlowGenerator.generate({
  description: 'Create a customer support voice agent that handles billing inquiries...',
  channel: 'voice'
});

console.log(result.flow); // Complete flow definition
console.log(result.explanation); // What was built
console.log(result.suggestions); // Improvement suggestions
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

Full reference: [docs/API.md](docs/API.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/API.md](docs/API.md) | Full API reference (flows, builds, deployments, evals, WebSocket, health) |
| [docs/NODES.md](docs/NODES.md) | Node catalog — all built-in node types by category |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variable reference |
| [docs/TESTING.md](docs/TESTING.md) | Testing guide (frontend, backend, CI, budgets) |
| [docs/SIMULATION.md](docs/SIMULATION.md) | Mock multi-turn call simulations on IndexedDB |
| [docs/EXPERIENCE_BOTS.md](docs/EXPERIENCE_BOTS.md) | Live S2S experience bots: keys, probes, mock→live path |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + React Flow)                          │
│  - Canvas, Palette, Config Panel                        │
│  - Test Console, Analytics Overlay                      │
│  - AI Generator, Flow IO                                │
└─────────────────────────────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────────────────────────────────────┐
│  Backend (FastAPI + PostgreSQL + Redis)                 │
│  - Flow CRUD, Build, Deployment                         │
│  - Eval Engine, WebSocket Testing                       │
│  - Auth, Multi-tenant                                   │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  Execution Engine                                       │
│  - DAG Execution, Voice-Aware Loop                      │
│  - Framework Adapters (LangGraph, Strands, ADK)         │
│  - Guardrails, Gateway                                  │
└─────────────────────────────────────────────────────────┘
```

## License

MIT
