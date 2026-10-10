# Simulation Guide

Run full multi-turn mock calls with zero credentials. Personas, scenarios,
tool mocks, and call logs all live in IndexedDB (`cx-designer-mocks`).

## Quick Start

1. Open the test console (🧪).
2. Pick a **caller persona** and a **scenario** in the simulation bar.
3. Hit **▶ Simulate**. Each turn streams through the flow engine with live
   trace events on the canvas; the run is logged to IndexedDB.

## Personas (`personas` store)

| Persona | Behavior |
|---------|----------|
| Patient Priya | Clear speech, full sentences, waits |
| Impatient Ivan | Short replies, barges in, fast pace |
| Noisy Nia | Heavy deterministic STT degradation (reproducible per turn) |
| Confused Carlos | Vague answers, slow pace, needs reprompts |

Personas set inter-turn pace, barge-in flags, and STT noise level (0–2).
Noise uses a seeded PRNG, so noisy runs replay identically.

## Scenarios (`scenarios` store)

| Scenario | Turns |
|----------|-------|
| Billing refund request | Double charge → account ID → refund |
| Order status check | Where's my order → order ID |
| Billing over a bad line | Refund flow with heavy STT noise |

Each turn carries an utterance plus optional session-state merges, so
scenarios skip preamble (e.g. start `identity_verified: true`).

## Tool Mocks (`toolMocks` store)

Scripted responses matched by argument substring with simulated latency:
`get_account_balance`, `issue_refund`, `track_order`, `schedule_appointment`.
Use `mockToolCall(name, args)` from `src/mock/seed.ts` to resolve them.

## Call Logs (`callLogs` store)

Every simulation persists turns, per-turn latency/cost, and totals.
Read them back with `idbGetAll('callLogs')` or from DevTools →
Application → IndexedDB.

## Extending

Add personas/scenarios/tools by inserting rows into the stores (or edit
`DEFAULT_*` in `src/mock/seed.ts` and clear the stores to reseed).
To graduate a mock to a real provider, replace the `mockToolCall`
call site — the response shape stays the same.
