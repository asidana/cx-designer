# CX Designer — Multimodal System Design

## Vision

One canvas builds **voice agents, chat agents, webchats, self-help
assistants, multimodal copilots, and web MCP agents**. The designer stays
channel-agnostic: flows describe *behavior*; channels describe *transport*.
AG-UI (CopilotKit) and A2UI (Google) are first-class render protocols so
agents can drive UI, not just text.

```
                ┌─────────────────────────────────┐
                │        Flow (behavior)          │
                │  voice · chat · copilot nodes   │
                └──────────────┬──────────────────┘
                               ▼
                ┌─────────────────────────────────┐
                │     Channel layer (transport)   │
                │  voice │ chat │ webchat │ copilot│
                │  self-help │ web-mcp             │
                └──────────────┬──────────────────┘
                               ▼
                ┌─────────────────────────────────┐
                │   Render protocols (UI driving) │
                │  AG-UI events │ A2UI directives │
                └─────────────────────────────────┘
```

## Design Principles

1. **Agents own business logic; channels own transport; Sentinel owns
   protection; StreamLink owns telephony.** No layer reaches into another.
2. **One message envelope** for every channel — text, audio, UI actions,
   and tool calls are envelope parts, not separate systems.
3. **Progressive channel support**: a flow runs on any channel; channel-only
   nodes (e.g. DTMF, copilot actions) degrade to explicit fallbacks.
4. **Protocols, not SDKs**: AG-UI event streams and A2UI directives are
   plain JSON over SSE/WebSocket — any frontend can render them.
5. **One shell, nine sections**: every capability lives in the side menu with
   its own page. No feature is reachable only from a crowded toolbar, and no
   page is decorative — each one reads or writes a real module.
6. **Configuration is the product**: a flow is not finished when it runs, it
   is finished when it is configured, linted, tested and observable. Those
   are first-class pages, not console output.

## Architecture Additions

### T1. Channel model + router (foundation) ✅ next
- `src/channels/types.ts`: `ChannelId`, `ChannelMessage` envelope
  (parts: `text` | `audio` | `ui` | `tool` | `handoff`), capabilities map.
- `src/channels/router.ts`: inbound routing to engine, outbound fan-out,
  per-channel fallbacks for unsupported node kinds.
- Extend `ExecutionContext.channel` union: `webchat | copilot | selfhelp | webmcp`.
- Unit tests. Acceptance: route one envelope per channel through mocks.

### T2. Chat + webchat runtime
- `chat.input` / `chat.output` nodes (typing indicators, quick replies,
  carousel cards), WebChat widget embed (`<cx-webchat>` snippet calling
  the gateway over WebSocket), markdown + citation rendering.
- Acceptance: scripted webchat turn runs in TestConsole chat tab.

### T3. AG-UI protocol (CopilotKit interop)
- `src/protocols/agui.ts`: AG-UI event stream emitter
  (`TEXT_MESSAGE_*`, `TOOL_CALL_*`, `STATE_SNAPSHOT`) from engine traces;
  CopilotKit-compatible endpoint on the gateway.
- `copilot.action` node: frontend-executed actions with approval.
- Acceptance: CopilotKit chat renders a flow run (text + one tool call).

### T4. A2UI protocol (Google interop)
- `src/protocols/a2ui.ts`: A2UI directive emitter (render cards, forms,
  maps, markdown into host app); `a2ui.render` node.
- Acceptance: host page renders an agent-driven card + form round-trip.

### T5. Multimodal copilot pane
- Side-pane UI: chat + live UI directives + approval buttons; screen
  context (URL, selected text) as session context.
- Acceptance: copilot answers with a UI card and an approved action.

### T6. Self-help assistance
- KB-grounded RAG flow template + search widget; escalate-to-agent with
  transcript handoff; `selfhelp.search` node reusing `agentic.rag`.
- Acceptance: question answered from KB with citations or clean handoff.

### T7. Web MCP agents
- `webmcp.tool` node: call MCP servers from flows (tool allowlist via
  Sentinel); record/replay for evals.
- Acceptance: flow calls a mock MCP tool through the Sentinel pre_tool gate.

### T8. Channel-aware UX
- Channel switcher in canvas toolbar; palette filters per channel;
  TestConsole tabs per channel (voice audio vs chat bubbles);
  preflight rules per channel (e.g. copilot actions need approval,
  webchat needs fallback for voice-only nodes).
- Acceptance: switching channel re-filters palette + preflight.

## Application Shell & Navigation (N-series)

The builder is one product, not a canvas with bolted-on dialogs. Everything a
designer does is reachable from a **nine-section side menu**, and each section
owns its own pages.

### Shell layout

```
┌──────┬──────────────┬───────────────────────────────────────────┐
│ 9    │ Section      │ Page body                                 │
│ sec- │ pages        │  • workspace page  → the canvas           │
│ tions│ (collapsible)│  • framed page     → Guardrails, Gateway, │
│ rail │              │    Observability, Insights, Admin, Help   │
└──────┴──────────────┴───────────────────────────────────────────┘
```

- **Level 1 — section rail (68px, always visible).** Nine sections. Switching
  area is one click; badges surface issues (e.g. preflight findings) on the
  section that owns them.
- **Level 2 — page column (216px, collapsible).** The active section's pages.
  Collapsing it hands the width back to the canvas.
- **Page bodies.** `kind: 'workspace'` (canvas) owns the full area;
  `kind: 'page'` renders in the standard frame (title, hint, actions, body).

### Sections and pages

| Section | Pages |
| --- | --- |
| 🎛️ **CX Designer** | Canvas (workspace) · Templates · Builder Chat · Script View · Preflight Lint · Flow Validation · Node Analytics · Version History · Test Console · Import / Export |
| 🛡️ **Guardrails** | Policy Rules · PII / PHI Redaction · Test Bench · Agent Router |
| 📞 **Voice Gateway** | Endpoints · CCaaS Targets · Live Sessions · Transports |
| 📈 **Observability** | Health · Alerts · Metrics · Audit Trail |
| 🔍 **Insights** | Performance · Eval Suites · Channels · Scenarios |
| ⚙️ **Settings** | Providers & Keys · Agent Defaults · Appearance · Autosave & Storage |
| 🛠️ **Admin** | Team & Roles · Plugins · Deployments · Secrets |
| 🔐 **Super Admin** | Organizations · Quotas & Limits · Feature Flags · Compliance |
| ❓ **Help** | Getting Started · Shortcuts · Node Catalog · Glossary |

Naming follows the market (Retell / Vapi / Botpress / Microsoft /
GCP): **Guardrails** for the Agent Firewall, **Voice Gateway** for the SIP
gateway, **Observability** and **Insights** kept distinct — Ops answers "is it
healthy?", Insights answers "what is the agent doing and what does it cost?".

### Rules

1. **One source of truth.** `src/navigation/navModel.ts` declares sections,
   pages, hints, keywords and shortcuts. The menu, the command palette, the
   shortcut handler and the Help → Shortcuts page all read it. Adding a page
   is a model edit, not a wiring change.
2. **No dead buttons.** Every page reads or writes a real module — guardrail
   rules through `sentinel/ruleEngine`, gateway records through
   `streamlink/types`, health/metrics through `monitoring/Monitoring`, evals
   through `evals/TestCaseStore`, keys through `voice/keyVault`. Anything
   that needs a live credential says so instead of pretending.
3. **Command palette (Ctrl+K)** ranks menu pages, canvas actions and node
   types from one list (`navigation/search.ts`, subsequence match with
   word-boundary bonuses).
4. **Keyboard parity.** Single-key page shortcuts (`T`, `B`, `L`, `Shift+Y`,
   `?`) route through `PAGE_SHORTCUTS`; `designer.canvas` keeps the editing
   shortcuts (undo/redo/save/duplicate/delete/zoom).
5. **Local-first state.** `src/workspace/store.ts` persists operational
   config (rules, endpoints, targets, sessions, members, deployments, orgs,
   quotas, flags) to localStorage behind a subscribe/notify contract and
   writes an audit entry on every change — the seed for the backend adapter.
6. **Designer pages are not a second app.** Every Guardrails/Gateway/Ops page
   links back to the flow it governs (which node uses this rule, which
   endpoint serves which flow) so configuration and canvas stay one loop.

### End-to-end flow the shell has to express

```
Templates → Canvas → Configure (node panel) → Preflight → Test Console → Deploy
   📚          🗺️          ⚙️                        ✈️           🧪          🚀
```

Every step is one page in **CX Designer**; **Guardrails** and **Voice
Gateway** are consulted while configuring, **Observability**/**Insights**
after it runs, **Admin**/**Super Admin** when it ships.

### N-series tasks

- **N1. Shell + navigation model** ✅ `navModel.ts`, two-level `SideMenu`,
  command palette, shortcut routing, workspace store.
- **N2. Guardrails + Voice Gateway pages** — rules CRUD, redaction
  playground, test bench, agent router; endpoints, CCaaS targets, live
  sessions, transports.
- **N3. Observability + Insights pages** — engine metrics recording, health,
  alert thresholds, metrics explorer, audit trail; per-node performance, eval
  suite pass rate, channel capabilities, personas/scenarios.
- **N4. Settings + Admin + Super Admin + Help pages** — provider keys, agent
  defaults, appearance, autosave; team/roles, plugins, deployments, secrets;
  orgs, quotas, flags, compliance; guided start, shortcuts, node catalog,
  glossary.

## UI/UX Changes (across tasks)

- Shell: two-level side menu (§ Application Shell), collapsible page column,
  section badges, command palette — replaces the crowded toolbar as the
  primary navigation; the toolbar keeps only flow identity, save/run and the
  two highest-frequency toggles.
- Toolbar: channel switcher (T8), environment banner (existing pattern).
- Palette: per-category icons already exist; add channel badges on nodes.
- Config panel: progressive disclosure per channel (voice: VAD/barge-in;
  chat: cards/typing; copilot: actions/approval); live per-node validation
  and "reset to defaults".
- Overlays: trace shows channel + protocol events (AG-UI/A2UI lines).
- Accessibility: script view already covers canvas; extend it per channel.
- Status is always visible: unsaved-changes dot in the designer page column,
  last-run summary bar on the canvas, health/alert state on Ops pages.

## Sentinel × Channels

- Per-channel policies: e.g. copilot `pre_tool` always requires approval;
  webchat PII redaction before logs; S2S audio rules unchanged.
- A2UI/AG-UI payloads pass `post_llm` gate before render (no prompt
  injection into UI directives).

## Task Order

T1 → T2 → N1 → N2 → N3 → N4 → T3 → T4 → T5 → T6 → T7 → T8. One task per
build; each task lands tested, documented, and pushed before the next
starts. N-series lands first because the shell is what every later task
renders into (channel switcher lands in the canvas page, copilot pane as a
designer dock, protocol traces in Observability).

## Status

- [x] T1. Channel model + router
- [x] T2. Chat + webchat runtime
- [x] N1. Shell + navigation model (9 sections, pages, palette, shortcuts, store)
- [ ] N2. Guardrails + Voice Gateway pages
- [ ] N3. Observability + Insights pages
- [ ] N4. Settings + Admin + Super Admin + Help pages
- [ ] T3. AG-UI protocol
- [ ] T4. A2UI protocol
- [ ] T5. Multimodal copilot pane
- [ ] T6. Self-help assistance
- [ ] T7. Web MCP agents
- [ ] T8. Channel-aware UX
