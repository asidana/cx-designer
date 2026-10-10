# Node Catalog

All built-in node types, grouped by palette category. Node definitions live in `src/nodes/`, registered in `src/nodes/index.ts`.

## Voice

| Type | Label | Inputs → Outputs | Purpose |
|------|-------|------------------|---------|
| `voice.input` | Voice Input | — → `audio`, `transcript` | Capture caller audio. Modes: `cascaded` (STT → LLM → TTS) or `realtime-s2s`. STT: Deepgram, Whisper, Transcribe, Google, NVIDIA Riva. S2S: GPT Live, Gemini Live, Grok Voice, NVIDIA Voice, Kyutai Moshi. Silero/WebRTC VAD, barge-in toggle |
| `voice.output` | Voice Output | `text` → `audio` | Synthesize speech: ElevenLabs, OpenAI, Polly, Google, Cartesia, Grok Voice (xAI), NVIDIA Riva; emotion-adaptive prosody, pace, interruptible flag. In S2S mode the S2S model voices the reply |

## Agentic

| Type | Label | Inputs → Outputs | Purpose |
|------|-------|------------------|---------|
| `agentic.intent_classifier` | Intent Classifier | `input` → `intent`, `confidence`, `entities` | LLM intent routing with per-intent output handles and confidence threshold + fallback |
| `agentic.reasoning_loop` | Reasoning Loop | `input` → `response`, `toolCalls`, `cost` | ReAct loop with max iterations, cost ceiling, wall-clock deadline (`deadlineMs`, default 12s), loop detection, tool preconditions, and pre-execution approval |
| `agentic.rag` | Knowledge Retrieval | `input` → `context`, `sources` | Vector retrieval with top-K, score threshold, embedding model, optional reranker |
| `agentic.memory` | Memory | `input` → `history`, `summary` | Short/long-term conversation memory with max-history trim and summarization, Redis/Postgres backing |

Framework adapters (`agentic.langgraph`, `agentic.strands`, `agentic.adk`) are registered from `src/adapters/`. Per the architecture (§17.5), prefer the native runtime; use the generic `external.agent` pattern for third-party frameworks.

## Deterministic

| Type | Label | Inputs → Outputs | Purpose |
|------|-------|------------------|---------|
| `deterministic.slot_collector` | Slot Collector | `input` → `complete`, `slots` | Typed slot collection (string/number/date/email/phone/alphanumeric/currency/boolean) with regex validation, retries, and escalation path |
| `deterministic.business_rule` | Business Rule | `input` → `allowed`, `action`, `violations` | Deterministic JSON policy rules evaluated against session state; the canvas face of the Sentinel rule engine |
| `deterministic.human_handoff` | Human Handoff | `input` → `handoffId`, `queue`, `estimatedWait` | Escalate with queue, priority, context summary, transcript, and callback options |

## Control Flow

| Type | Label | Inputs → Outputs | Purpose |
|------|-------|------------------|---------|
| `control.conditional_router` | Conditional Router | `input` → `route` | Priority-ordered condition routing with a default route |
| `control.subflow` | Sub-flow | `input` → `output` | Execute a nested flow with timeout |
| `control.parallel` | Parallel | `input` → `output` | Concurrent branches with `all` / `first` / `vote` merge strategies and timeout |
| `control.wait` | Wait | `input` → `output` | Pause on duration, event, or condition with timeout |

## Governance

| Type | Label | Inputs → Outputs | Purpose |
|------|-------|------------------|---------|
| `governance.guardrail` | Guardrail | `input` → `allowed`, `redacted`, `violations` | Built-in PII redaction + toxicity filter, or a custom guardrail app (`block` \| `warn` \| `redact` \| `escalate`) |
| `governance.sentinel` | Sentinel | `input` → `allowed`, `action`, `content`, `violations` | Full agent gateway at a phase (`pre_llm`/`post_llm`/`pre_tool`/`post_tool`): rate limit → rule engine → PII redaction → injection scan |

See `src/guardrails/GuardrailSDK.ts` for the custom guardrail app contract.
See `docs/SENTINEL.md` for the Sentinel gateway, rule engine, and phase model.

## Integration

| Type | Label | Inputs → Outputs | Purpose |
|------|-------|------------------|---------|
| `integration.http` | HTTP Request | `input` → `response`, `status` | REST calls with `{{variable}}` substitution, bearer/API-key auth, timeout, retries |
| `integration.telephony` | Telephony | `input` → `callId`, `status` | SIP/PSTN/WebRTC via Twilio/Plivo/Vonage/custom, inbound/outbound, recording, IVR |
| `integration.webhook` | Webhook | `input` → `response` | Incoming or outgoing webhooks with secret verification |
| `integration.database` | Database | `input` → `result` | PostgreSQL/DynamoDB/Redis/MySQL query/insert/update/delete |

## Adding a Node

Implement `NodeDefinition` (`src/types/node.ts`), register it in `src/nodes/index.ts`, and cover it in `tests/`. See CONTRIBUTING.md.
