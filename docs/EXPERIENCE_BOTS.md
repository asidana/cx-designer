# Experience Bots Guide

Experience bots are S2S-first demo flows (GPT Live, Gemini Live, Grok Voice)
for building and testing real voice experiences. Until provider keys are
set, everything runs on IndexedDB mocks — the same flows go live later
with no rebuild.

## When Your Keys Arrive

1. Open **Settings (⚙️) → API Keys**.
2. Paste the key: OpenAI for GPT Live, xAI for Grok Voice, Google for
   Gemini Live. Keys stay in this browser only (localStorage); masked in
   the UI; never logged or put in traces.
3. Hit **Test connection** per key. The probe is a cheap list-models call
   (no spend). Green = the key is valid and the provider reachable.
4. Open the **Template Gallery (📚) → Experience Bots**:
   - **Concierge (GPT Live)** — greeting, billing/booking routing, handoff.
   - **Support (Gemini Live)** — guardrail, intent, multilingual-ready.
5. Simulate first (mocks), then flip the flow to live.

## Mock → Live Behavior

| Without key | With valid key |
|-------------|----------------|
| Voice nodes run on mocks; simulations use personas + STT noise | Probes pass; realtime audio sessions wire up next |
| Tool calls resolve from `toolMocks` store | Same shapes — swap `mockToolCall` for the real call site |

## What Still Needs Wiring (after keys land)

Realtime WebSocket sessions per provider (`createRealtimeSession` in
`src/voice/liveAdapters.ts` — currently throws a clear TODO error):
- OpenAI: `wss://api.openai.com/v1/realtime` + `session.update` events.
- Gemini: `BidiGenerateContent` WebSocket.
- xAI: realtime voice endpoint (confirm against xAI docs on arrival).

Guardrails hook into streamed partial transcripts pre-playback (§17.3);
slot-filling runs the parallel cascaded verification pass.

## Troubleshooting

- **Probe 401/403** — key is wrong or lacks model access; repaste.
- **Probe network error** — check connectivity / ad-blockers intercepting
  `api.openai.com`, `api.x.ai`, `generativelanguage.googleapis.com`.
- **Session error about missing key** — the flow's S2S provider has no key
  in the vault; set it in Settings.
