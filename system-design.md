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

## UI/UX Changes (across tasks)

- Toolbar: channel switcher (T8), environment banner (existing pattern).
- Palette: per-category icons already exist; add channel badges on nodes.
- Config panel: progressive disclosure per channel (voice: VAD/barge-in;
  chat: cards/typing; copilot: actions/approval).
- Overlays: trace shows channel + protocol events (AG-UI/A2UI lines).
- Accessibility: script view already covers canvas; extend it per channel.

## Sentinel × Channels

- Per-channel policies: e.g. copilot `pre_tool` always requires approval;
  webchat PII redaction before logs; S2S audio rules unchanged.
- A2UI/AG-UI payloads pass `post_llm` gate before render (no prompt
  injection into UI directives).

## Task Order

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8. One task per build; each task
lands tested, documented, and pushed before the next starts.

## Status

- [x] T1. Channel model + router
- [x] T2. Chat + webchat runtime
- [ ] T3. AG-UI protocol
- [ ] T4. A2UI protocol
- [ ] T5. Multimodal copilot pane
- [ ] T6. Self-help assistance
- [ ] T7. Web MCP agents
- [ ] T8. Channel-aware UX
