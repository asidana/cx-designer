# Architecture

The product is a single embeddable feature: the **canvas** in
`src/designer/`. Everything the former application shell did (navigation,
admin, observability, protocol consoles) is out of scope and lives in
`omnichannel-agent-platform`.

## Module map

```
src/designer/
├── CanvasDesigner.tsx     Public component: canvas + palette + config panel + drawers
├── index.ts               Public API (component, types, registry, engine, storage)
├── canvas/
│   ├── domain.ts          Normalization funnel — the only type-resolution path
│   ├── patterns.ts        Composite "Agent Pattern" expansion (pure, idempotent)
│   ├── CxNode.tsx         Custom node card: typed ports, zoom bands, status rings
│   ├── status.ts / summary.ts / canvas.css
├── nodes/                 Node registry + 32 node definitions + custom-node SDK
├── adapters/              LangGraph · Strands · ADK framework nodes
├── engine/flowEngine.ts   Client-side DAG executor (voice-aware loop)
├── engine/metrics.ts      Local metrics recorder (Observability plug point)
├── components/            ConfigForm, FlowIO, Validation, Preflight, Script,
│                          Versions, BuilderChat, Analytics, UI primitives
├── builder/ + ai/         Plain-English → builder ops → FlowGenerator
├── validation/            FlowValidator (graph + config checks)
├── history/ + autosave/   Undo/redo (coalescing) + local-first persistence
├── versioning/            In-memory version snapshots + visual diffs
├── sentinel/              Rule engine + PII/PHI redaction used by node executors
├── channels/types.ts      Channel model (authoring stays channel-agnostic)
└── mock/ + mcp/           Local simulator & MCP tool catalogue
```

## Data flow

```
Palette drag / click
        │
        ▼
React Flow nodes ──► normalizeFlow() ──► FlowGraph (canonical)
        │                                 │
        │                                 ├─► onChange (host, debounced)
        │                                 ├─► historyManager (undo/redo)
        │                                 ├─► autoSave (IndexedDB + cache)
        │                                 └─► FlowEngine.execute()
        │                                          │
        ▼                                          ▼
CxNode cards + status rings ◄── trace callbacks (pulse / stats)
```

Key invariant: every ingress (`initialFlow`, `flow` prop, `importFlow`, JSON
import, version restore, undo/redo, autosave recovery) passes through
`canvas/domain.ts`, so the canvas never holds an unresolvable node type. Node
types are always read through `domainTypeOf()`, never from `data.type`
directly (enforced by a structural test).

Composition: patterns/custom nodes are authored as composite blocks and
flattened by `expandPatterns()` before execution/export, so the runtime graph
is always a plain DAG.

## Host boundary

`CanvasDesigner` takes the document (`initialFlow`/`flow`), emits canonical
changes (`onChange`), and accepts host plug points (`customNodes`,
`mcpSystems`, `features`, `persistence`). See
[docs/EMBEDDING.md](docs/EMBEDDING.md).
