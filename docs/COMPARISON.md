# Comparison: this canvas vs Langflow vs Flowise

*Verified 2026-11-05 against the official repositories and docs. This project:
v0.2.0. Langflow: 1.13.x docs, active `main`. Flowise: archived 2026-08-13,
EOL 2026-08-31. Star/fork counts are a GitHub API snapshot and will drift.*

## Read this first

This is an **asymmetric comparison**, on purpose. Langflow and Flowise are
full self-hosted platforms: server, database, auth, runtime, and a large
integration library. This repo is one embeddable authoring canvas; the
runtime, auth, and integrations belong to the host product.

So the useful question is not "which has more features?" — Langflow wins that
against a component by construction. The useful questions are:

1. Do you need a **platform** or an **embeddable builder**?
2. If you need a builder, does it speak your **domain** (CX, voice, handoff,
   governance) or is it a general LLM/RAG canvas?
3. What does the host still have to supply?

## TL;DR

| | What it is | Choose it when |
|---|---|---|
| **This canvas** | MIT, client-only React component: palette, 32 nodes, config forms, validation, preflight, history, autosave, run simulation | You are building a CX/voice product and need a high-quality flow builder **inside** it; your platform owns execution, auth, and integrations |
| **Langflow** | MIT, Python/FastAPI platform with React/React Flow UI, hundreds of components, server runtime, REST/OpenAI-compatible/MCP deployment, auth, observability | You need a standalone agent/RAG platform with real execution and a broad ecosystem **today** |
| **Flowise** | Apache-2.0 (with commercial enterprise files) TypeScript/LangChain.js platform; chatflows, agentflows, embedded chat widget | **Only** if you are maintaining an existing deployment. Upstream is archived and EOL; do not start new work on it |

> **Flowise status.** FlowiseAI announced the wind-down on 2026-07-29 (code
> freeze), archived the repository on 2026-08-13, and ended official support
> on 2026-08-31. The source remains Apache-2.0 and forkable, but npm packages
> and Docker images are deprecated and no upstream fixes will arrive. See the
> [Future of Flowise announcement](https://github.com/FlowiseAI/Flowise/discussions/6727).

## At a glance

| Dimension | This canvas | Langflow | Flowise |
|---|---|---|---|
| **Category** | Embeddable authoring component | Full agent/RAG platform | Full LLM app platform (archived) |
| **Status (Nov 2026)** | v0.2.0, active | 1.13.x, active | Archived 2026-08-13; EOL 2026-08-31 |
| **License** | MIT | MIT | Apache-2.0 + commercial enterprise files |
| **Stack** | TypeScript, React 18, React Flow 11, Vite; client-only | Python/FastAPI + React/React Flow | Node/Express + React + LangChain.js |
| **Embed the builder in another app** | ✅ Core purpose — one `<CanvasDesigner />` component | ❌ Not a documented feature; integrate via API/MCP instead | ❌ Builder is not embeddable; chat widget only |
| **Node library** | 32 (29 built-in + 3 framework adapters), CX-focused | Hundreds of components/bundles: models, vector stores, tools, MCP, A2A | Hundreds of LangChain.js integration nodes (≈370 component definition files) |
| **Custom nodes** | TypeScript SDK + four behaviour presets (`http`/`llm`/`transform`/`guardrail`) | Python custom components | TypeScript/LangChain.js components (frozen) |
| **Flow execution** | In-browser DAG **simulation**; mock tools/LLM; voice pipeline stubbed | Server-side Python runtime | Server-side Node/LangChain.js runtime (frozen) |
| **Deploy flows as API/MCP** | ❌ Host builds it; exports JSON and LangGraph Python | ✅ REST, OpenAI-compatible API, MCP server | ✅ REST API; npm/Docker deprecated at EOL |
| **Voice / telephony** | First-class voice nodes (STT/TTS/VAD/barge-in) + telephony and SIP/CCaaS gateway nodes; runtime stubbed | Playground speech input; Voice Mode deprecated in 1.10; legacy voice WebSocket endpoints | STT/TTS components; no first-class voice or telephony channel model |
| **CX primitives** | ✅ Slot collection, human handoff, business rules, page assistant, agent firewall, voice gateway | ❌ General-purpose agent/RAG builder | ⚠️ Approximated with integration nodes |
| **Governance** | ✅ Guardrail + Agent Firewall nodes (PII/PHI, injection, rate limit, rules) in the authoring model | ⚠️ Via components; platform auth/audit | ⚠️ Moderation/analytic nodes |
| **Authoring safeguards** | ✅ Validation + preflight, in-memory version snapshots + visual diff, undo/redo, autosave | Playground, server-persisted flows, concurrent editing | Playground, server-persisted flows |
| **Persistence & collaboration** | Local-first (IndexedDB + localStorage); single canvas instance per page; host can own the document | Server DB (Postgres/SQLite), multi-user, concurrent editing | Server DB (SQLite/Postgres/MySQL/MariaDB), workspaces in the commercial package |
| **Auth / RBAC / multi-tenancy** | ❌ Host responsibility — auth, tenancy, secrets, quotas | Built-in JWT/API-key auth, external OIDC/SSO, RBAC via plugin, audit logging | Commercial enterprise package; upstream frozen |
| **Observability** | Local metrics recorder + in-canvas run trace; no exporter | LangSmith, Langfuse, OpenTelemetry, New Relic, Grafana Loki | Analytics nodes/integrations; no maintained stack |
| **AI-assisted authoring** | ⚠️ Heuristic keyword/template `FlowGenerator`; not LLM-backed | ✅ LLM-backed Langflow Assistant | ⚠️ Templates/marketplace |
| **Works without any server** | ✅ Static build, offline after load | ❌ Needs the Python server | ❌ Needs the Node server |
| **Community snapshot** | New project; 125 tests across 7 files | ~156k stars, ~10.3k forks, active | ~55.5k stars, ~25.1k forks, frozen |
| **Best fit** | Embedding a flow builder in a CX/voice product | Standing up an agent/RAG platform | Existing deployments only |

## The differences that matter

### 1. Packaging: component vs platform

The entire feature is `src/designer/` and one public component:

```tsx
<CanvasDesigner initialFlow={flow} onChange={save} persistence={false} />
```

The host controls the document, storage, auth, and runtime. The component can
run fully client-side, or not persist at all (`persistence={false}`).

Langflow and Flowise are the opposite shape: you run their server, they own
the database and runtime, and you integrate through APIs or their UI. That is
a feature when you want a platform, and a mismatch when you are building one.

This is also why "number of nodes" is misleading: this canvas has 32 node
**authoring contracts**, many executing against local mocks. It does not ship
32 production integrations. Langflow's node library is its product.

### 2. Authoring experience

What this canvas does well:

- **Typed ports and `cx` cards** with three zoom bands, status rings, and a
  normalization funnel that gives every node a resolvable domain type.
- **Schema-driven config forms** with live per-node validation, plus preflight
  linting, Script view, Flow I/O, and version diffs.
- **Pattern composition** — author with composite "Agent Pattern" blocks that
  expand into a plain DAG before execution or export.
- **Embedding ergonomics** — searchable palette, feature toggles, custom
  nodes, MCP tool grouping, theme/density, imperative handle.
- **Local-first durability** — undo/redo with coalescing, autosave to
  IndexedDB plus a localStorage boot cache.

What the platforms still do better:

- **Ecosystem depth** — models, vector stores, loaders, tools, credentials,
  and prebuilt templates.
- **Real playtesting** — Langflow's Playground runs the actual flow and shows
  agent tool use; the platform adds multi-user concurrent editing. Flowise has
  a comparable playground/API workflow.
- **Code-level extensibility** — Python custom components in Langflow,
  TypeScript/LangChain.js components in Flowise — versus this canvas's
  behaviour-preset SDK.

### 3. Execution: simulation vs runtime

This is the most important limitation to understand.

`FlowEngine` executes a DAG in the browser for **simulation and test runs**:
trace events, per-node latency/cost, a run summary, voice-aware loop hooks.
Tool calls resolve against local mocks; the `AudioPipeline` (STT/TTS) is a
stub. There is no network, provider, or telephony call in a run.

Langflow and Flowise execute on a server with real integrations. If you need
"build it and call it in production today", this canvas is not that product —
it is the authoring layer that your product's runtime sits behind.

That separation is deliberate: it keeps the feature embeddable, offline-
capable, and free of credentials. The host decides which providers, models,
and media pipeline are real.

### 4. Voice and CX

This is where the authoring vocabulary is genuinely different:

- Voice Input / Voice Output nodes model cascaded STT→LLM→TTS and
  realtime speech-to-speech modes, VAD, and barge-in.
- Telephony and Voice Gateway nodes model SIP/PSTN/WebRTC and CCaaS
  integration (Connect/Genesys/Five9/Avaya-style), DTMF, transfer, and
  recording pause.
- Slot Collector, Business Rule, Human Handoff, Page Assistant, Self-Help,
  Copilot Action, A2A Skill, Guardrail, and Agent Firewall cover CX flows
  that a general agent canvas rarely models first-class.

But again: **the runtime is stubbed.** The canvas can describe a production
voice agent; it cannot be one. Langflow is not a voice runtime either — its
Playground now offers speech *input* only, its Voice Mode was deprecated in
1.10, and legacy voice WebSocket endpoints remain for old integrations.
Flowise has STT/TTS components and tools but no CX/telephony channel model.

For production telephony, pair the canvas with a real voice/media platform or
your own media layer. Treat any of these tools as the authoring surface, not
the media server.

### 5. Governance

This canvas bakes governance into the graph: Guardrail and Agent Firewall
nodes cover PII/PHI redaction, injection scanning, rate limits, and
deterministic rules; the Sentinel rule engine runs locally during simulation.
That is a strong authoring model for regulated CX flows.

Langflow exposes auth, audit logging, and RBAC (via an authorization plugin)
at the platform level, and guardrail behaviour through components. Flowise
had moderation/analytic nodes and enterprise controls, but no upstream
maintenance now.

The caveat for this canvas: policies are only *enforced* when the host
executes them for real. In simulation they are local logic.

### 6. Operations: persistence, auth, observability

| Concern | This canvas | Langflow | Flowise |
|---|---|---|---|
| Document storage | Host or browser-local | Server DB | Server DB |
| Multi-user | ❌ (single instance/page today) | ✅ auth + concurrent editing | ⚠️ enterprise workspaces |
| Auth/SSO | ❌ host | ✅ built-in + external OIDC/SSO | ⚠️ commercial package |
| Audit/RBAC | ❌ host | ✅ audit logging; RBAC via plugin | ⚠️ enterprise |
| Tracing/metrics | Local recorder + run trace | LangSmith/Langfuse/OTel/New Relic/Grafana | Analytics nodes/integrations |
| Scale-out execution | ❌ browser only | ✅ server/workers | ✅ server (frozen) |

If you need any of the right-hand-column items, you are choosing a platform,
not a component. If you already have them, the canvas avoids rebuilding them.

### 7. AI-assisted authoring

The Builder chat uses a keyword/template `FlowGenerator` — deterministic and
offline, but **not an LLM call**. Langflow's Assistant is LLM-backed and can
build flows/components. Flowise relied on templates and its marketplace.

This canvas's generator is useful for demos and scaffolding; it is not a
substitute for an LLM-backed assistant. A real generator would be a natural
next step, with the host supplying the model and credentials.

### 8. Maturity and licensing

- **This canvas** — v0.2.0, 125 tests, 7 test files, MIT. Young, small surface,
  and honest about stubs.
- **Langflow** — MIT, ~156k stars, years of production use, active daily.
  The default open-source choice for a standalone agent/RAG platform.
- **Flowise** — Apache-2.0 with a commercial enterprise directory, ~55.5k
  stars, now frozen. Forks are permitted; upstream is not coming back.

All three are permissive for embedding/commercial use. Flowise's repository
ships some enterprise files under a separate commercial license; Langflow's
OSS repository is MIT throughout.

## When to choose which

| Situation | Recommendation |
|---|---|
| You are building a CX/contact-centre/copilot product and need a builder inside it | **This canvas** — embed it, keep your runtime/auth |
| You need a standalone agent/RAG platform this quarter | **Langflow** |
| You need a demo/prototype with no backend and no API keys | **This canvas** (simulation only) |
| You need production voice/telephony today | Use a voice/media platform; embed this canvas for authoring |
| You run Flowise in production | Freeze the version, fork if necessary, plan a migration; no upstream fixes |
| You want this canvas's UX but Langflow's runtime | Embed this canvas; call Langflow's REST/MCP API behind HTTP/MCP Tool nodes (host wiring required) |
| You need multi-user concurrent editing and SSO out of the box | **Langflow** |

## Interop and migration

- **Exports from this canvas:** canonical JSON (`FlowGraph`) via Flow I/O, and
  a LangGraph Python export. No Langflow or Flowise importer exists today.
- **Langflow as a runtime:** the clean pattern is to keep this canvas as the
  authoring surface and invoke Langflow through its REST API or MCP server
  from host-owned adapters. Node-level JSON translation would be lossy.
- **Flowise migration:** there is no maintained import path; map constructs
  manually (chatflow → flow, LangChain node → equivalent) and expect config
  loss. Given the archival, migration effort is usually better spent on a
  maintained runtime.
- **Import into this canvas:** JSON passes through `normalizeFlow()`, so
  unknown or legacy node types become repair panels instead of disappearing.

## Candidate roadmap (not commitments)

Gaps worth closing if this canvas is adopted as a product surface:

1. **Compiled package** — ESM + `.d.ts` instead of a TypeScript-source export.
2. **Multi-instance history/persistence** — remove the module singletons that
   limit the canvas to one instance per page.
3. **Real runtime adapters** — provider calls, streaming, telephony/STT/TTS,
   and execution for LangGraph/Strands/ADK nodes.
4. **LLM-backed FlowGenerator** — host-supplied model and credentials.
5. **Importers/exporters** — Langflow JSON, LangGraph, and a Flowise migration
   path if demand justifies it.
6. **Observability/audit hooks** — OpenTelemetry exporters and host audit
   events.
7. **Auth/tenancy and server persistence hooks** — for hosts that do not
   already have them.
8. **Collaboration** — only if the host needs concurrent editing; otherwise
   keep the component simple.

## Sources

- This repo: [README](../README.md), [EMBEDDING](EMBEDDING.md),
  [ARCHITECTURE](../ARCHITECTURE.md), `src/designer/` and `tests/`.
- Langflow: [GitHub](https://github.com/langflow-ai/langflow),
  [voice input](https://docs.langflow.org/concepts-voice-mode),
  [MCP server](https://docs.langflow.org/mcp-server),
  [auth overview](https://docs.langflow.org/authentication-overview),
  [concurrent editing](https://docs.langflow.org/concurrent-editing),
  [custom components](https://docs.langflow.org/components-custom-components).
- Flowise: [GitHub](https://github.com/FlowiseAI/Flowise),
  [Future of Flowise](https://github.com/FlowiseAI/Flowise/discussions/6727),
  [license](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md).
- GitHub API metadata snapshot (stars, forks, archived flag, last push):
  2026-11-05.

*No affiliation with Langflow or Flowise. Feature sets change; re-verify before
a procurement decision.*
