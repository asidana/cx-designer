# Embedding the CX Designer canvas

The whole canvas feature lives in **`src/designer/`** and is one React component.
This repo is the standalone host; a larger product embeds the same component.

> **Packaging note:** `package.json` resolves the package root (`.`) to the
> TypeScript entry (`src/designer/index.ts`) — a source-level export. Hosts
> that bundle TS sources (Vite, Next.js with transpilePackages, monorepo
> aliases like `agentic-cx-designer: ./agentic-cx-designer`) can consume it
> directly. If the host cannot transpile TS, add a build step (e.g.
> `tsup`) before publishing.

## Quick start

```tsx
import { CanvasDesigner, type CanvasDesignerHandle } from 'agentic-cx-designer';

export function AgentEditor() {
  const designer = useRef<CanvasDesignerHandle>(null);

  return (
    <div style={{ width: '100%', height: 720 }}>
      <CanvasDesigner
        ref={designer}
        theme="dark"
        onChange={(flow) => save(flow)}                 // canonical FlowGraph, debounced ~250 ms
        customNodes={myCustomNodes}                     // host-authored node types
        mcpSystems={mySystems}                          // MCP tool grouping (optional)
      />
    </div>
  );
}
```

The component ships its own:
- **Node palette** (searchable, grouped by category; drag to canvas or click to place)
- **27 node types** across voice · chat · agentic · deterministic · control ·
  governance · integration · gateway
- **Custom `cx` node cards** — typed input/output ports, three zoom levels,
  status rings (validation / trace / diff)
- **Config panel** — schema-driven forms generated from each node's
  `configSchema`, with live per-node validation
- **Run** — client-side `FlowEngine` simulation with live trace pulses and a
  run-summary card
- **History** (undo/redo with drag/config coalescing), **autosave** (IndexedDB
  durable + localStorage boot cache), dirty fingerprinting
- **Feature drawers** — Preflight lint · Script view · Validation · Flow I/O
  (JSON + LangGraph export) · Versions (visual diff) · Builder chat
  (plain-English → ops) · Analytics

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `initialFlow` | `FlowGraph` | – | Seeds the canvas. Uncontrolled. |
| `onChange` | `(flow: FlowGraph) => void` | – | Canonical (normalized) flow after every edit, debounced ~250 ms. |
| `flow` | `FlowGraph \| null` | – | Optional controlled echo: pass an externally-replaced flow to adopt. |
| `features` | `CanvasDesignerFeatures` | all on | Toggle `palette`, `preflight`, `script`, `validation`, `flowIO`, `versions`, `builderChat`, `analytics`. |
| `customNodes` | `CustomNodeRecord[]` | – | Synced into the node registry (namespaced `custom.`). |
| `mcpSystems` | `{ name, tools, enabled }[]` | – | Regroups the MCP Tool picker by owning system. |
| `persistence` | `boolean` | `true` | Local autosave + boot restore. `false` for fully host-managed documents. |
| `theme` | `'dark' \| 'light'` | persisted | Ads to the token-driven theme runtime. |
| `density` | `'compact' \| 'comfortable'` | persisted | Density of the design system. |

## Imperative handle

```ts
interface CanvasDesignerHandle {
  getFlow(): FlowGraph;
  run(input?: string, sessionId?: string): Promise<void>;
  undo(): void;
  redo(): void;
  save(): void;
  importFlow(flow: FlowGraph): void;  // authoritative replace (normalizes)
  clear(): void;
  addNode(type: NodeType): void;
  focusNode(nodeId: string): void;
}
```

## Invariants the canvas guarantees

- **One migration path**: every document entering the canvas — `initialFlow`,
  `importFlow`, JSON import, version restore, undo/redo, autosave recovery —
  passes through `normalizeFlow()` (`src/designer/canvas/domain.ts`), so every
  node always carries a resolvable domain type.
- **Registry is the truth**: the palette, engine, config panel and minimap all
  read `nodeRegistry`. Unknown node types get a repair panel instead of
  silently vanishing.
- **Channel-agnostic authoring**: nodes are authored once; per-channel
  behavior is metadata, not separate flows.

## Host persistence

With `persistence={false}` the canvas calls no storage: hold the document in
your state via `onChange`, hand authoritative replacements back via the
`flow` prop or `ref.importFlow()`.

With `persistence` on, the feature stores under these localStorage/IndexedDB
keys (same module it always used): `agentic_cx_designer_autosave`,
`agentic_cx_designer_backups`.

## Limitations (by design, for now)

- Single canvas instance per page — `historyManager` and `autoSave` are module
  singletons. Multi-doc hosts should disable persistence and route history
  through the host.
- Run is a local simulation (mock tool calls / LLM responses); wire real
  providers via `src/designer/mcp/webMcp.ts`, `mock/seed.ts`, or engine adapters.
- Voice transcription/TTS are stubs (`AudioPipeline` in `flowEngine.ts`).
