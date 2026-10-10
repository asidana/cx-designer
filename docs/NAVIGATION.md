# Navigation — the shell

The app is nine sections. Each section owns its own pages. Everything the
designer does is reachable from the side menu, and `Ctrl+K` reaches the same
things from the keyboard.

## Layout

```
┌──────┬──────────────┬──────────────────────────────────────────┐
│ 9    │ Section      │ Page body                                │
│ sec- │ pages        │  • workspace page → the canvas           │
│ tions│ (collapsible)│  • framed page    → Guardrails, Gateway, │
│ rail │              │    Observability, Insights, Settings,    │
│ 68px │    216px     │    Admin, Super Admin, Help              │
└──────┴──────────────┴──────────────────────────────────────────┘
```

- **Section rail** — always visible. Switching area is one click. A badge on
  a section means that section has something to act on (today: preflight
  findings on CX Designer).
- **Page column** — the active section's pages. Collapse it with `«` to give
  the canvas the width.
- **Page body** — a workspace page owns the whole area (the canvas); a framed
  page renders with title, hint and content.

## Sections

### 🎛️ CX Designer — build, configure, test and ship

| Page | Shortcut | What it does |
| --- | --- | --- |
| Canvas | — | The builder: palette, nodes, config panel, run |
| Templates | `T` | Market-standard agent templates |
| Builder Chat | `B` | Plain-English build and change |
| Script View | `S` | Linear conversation outline |
| Preflight Lint | `L` | Config-level lint before a run or a release |
| Flow Validation | `V` | Structural checks — wiring, orphans, dead ends |
| Node Analytics | `A` | Latency, cost and error rate per node |
| Version History | `H` | Timeline, restore, visual diff |
| Test Console | `Shift+Y` | Talk to the agent, watch the trace, save eval cases |
| Import / Export | `E` | JSON round-trip, LangGraph Python |

### 🛡️ Guardrails — the Agent Firewall

| Page | What it does |
| --- | --- |
| Policy Rules | Ordered rules per phase; first match wins; a match can also set configuration |
| PII / PHI Redaction | Live redaction playground over the real pattern sets |
| Test Bench | Dry-run text + session state through the live rule set |
| Agent Router | Registered agents and the tools each may call |

### 📞 Voice Gateway — telephony

| Page | What it does |
| --- | --- |
| Endpoints | Media endpoints (SIP / WebSocket / gRPC), codecs, DTMF |
| CCaaS Targets | Genesys, Five9, Avaya, Amazon Connect, custom SBC |
| Live Sessions | Calls in flight — state, agent binding, hangup |
| Transports | What each transport needs before it carries audio |

### 📈 Observability — is it healthy?

| Page | What it does |
| --- | --- |
| Health | Status, p95, success rate, cost from real executions |
| Alerts | Threshold rules evaluated against live metrics |
| Metrics | Latency / cost / success explorer + Prometheus scrape |
| Audit Trail | Every configuration change, filterable by area |

### 🔍 Insights — what is the agent doing?

| Page | What it does |
| --- | --- |
| Performance | Per-node latency and error rate from real runs |
| Eval Suites | Saved test cases and expectation matching |
| Channels | Capability matrix and how nodes degrade per channel |
| Scenarios | Personas and call scenarios used by simulations |

### ⚙️ Settings

| Page | What it does |
| --- | --- |
| Providers & Keys | STT / TTS / S2S providers; keys stay in the browser |
| Agent Defaults | Model, STT, TTS, language baseline for new nodes |
| Appearance | Dark / light workspace theme |
| Autosave & Storage | Autosave interval and what is stored locally |

### 🛠️ Admin

| Page | What it does |
| --- | --- |
| Team & Roles | Members, roles and the permission matrix |
| Plugins | Install node packs and adapters |
| Deployments | Ship a flow — it snapshots into version history first |
| Secrets | Which provider credentials this workspace can use |

### 🔐 Super Admin

| Page | What it does |
| --- | --- |
| Organizations | Tenants, plans and regions |
| Quotas & Limits | Spend, concurrency and seat ceilings |
| Feature Flags | Rollout gating (S2S, A2UI, web MCP) |
| Compliance | Residency, retention, attestations |

### ❓ Help

| Page | What it does |
| --- | --- |
| Getting Started | The eight-step path, each step a button |
| Shortcuts | Every keyboard shortcut in the app |
| Node Catalog | Every node type, its ports and what it does |
| Glossary | The vocabulary, and why it matches the market |

## Keyboard

| Keys | Goes to / does |
| --- | --- |
| `Ctrl+K` | Command palette — pages, canvas actions, node types |
| `P` | Toggle the node palette (canvas) |
| `T` `B` `S` `V` `L` `A` `H` `E` `Shift+Y` `?` | The page listed above |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo (canvas) |
| `Ctrl+S` | Save flow |
| `Ctrl+D` | Duplicate node |
| `Delete` | Delete selected node |
| `Ctrl+A` | Select all |
| `Ctrl++` / `Ctrl+-` / `Ctrl+0` | Zoom in / out / fit |
| `Esc` | Close the palette or any panel |

Single-key shortcuts are ignored while you are typing in a field.

## How it is wired

- `src/navigation/navModel.ts` — the model. Sections, pages, hints, keywords,
  shortcuts. The menu, the command palette, the shortcut handler and
  Help → Shortcuts all read it. Adding a page is a model edit.
- `src/navigation/search.ts` — ranking for the command palette
  (subsequence match with word-boundary bonuses).
- `src/components/SideMenu.tsx` — the two-level rail.
- `src/components/CommandPalette.tsx` — the palette, grouped and keyboard-driven.
- `src/pages/*` — one file per section; `src/pages/registry.ts` maps page id to
  component. Designer pages render inside `App.tsx` because they close over the
  engine callbacks.
- `src/workspace/store.ts` — local-first persistence for guardrail rules,
  gateway records, team, deployments, orgs, quotas, flags and the audit trail.
  Swap the adapter for a backend without touching a page.

## Rules

1. No dead buttons — every page reads or writes a real module.
2. Nothing pretends: SIP says it needs a media stack, realtime S2S says it
   needs a live provider session, deployments say what they actually snapshot.
3. Status is always visible: unsaved dot in the page column, last-run summary
   on the canvas, health and alert state on the Ops pages.