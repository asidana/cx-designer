# Sentinel — Agent Gateway

Sentinel is the protective gateway around **agents** — not an LLM gateway.
The division of ownership is strict:

- **Agents** own business logic and use cases.
- **Sentinel** owns protection: policy, PII/PHI, injection defense, rate
  limits, approvals.
- **StreamLink** owns transport: SIP/WebSocket/gRPC legs into CCaaS and
  telephony (see `docs/STREAMLINK.md`).

```
outside world ──▶ StreamLink ──▶ Sentinel ──▶ agent
  (SIP/WS/gRPC)    (transport)    (policy)    (business logic)
```

Every request passes through Sentinel before it reaches the agent,
tools, or caller. One pipeline, four phases:

```
rate limit → rule engine → PII redaction → injection scan
```

## Phases

| Phase | When | Guards |
|-------|------|--------|
| `pre_llm` | Caller speech → model | Injection, PII, rate limit |
| `post_llm` | Model output → caller/tools | PII, policy rules |
| `pre_tool` | Before any side effect | Preconditions, approval, injection |
| `post_tool` | Tool result → model | PII, policy rules |

The `pre_tool` gate reads the **tool definition** (preconditions,
`requiresApproval`) — never the tool result. Approval always precedes
execution.

## Rule Engine

Rules are JSON data, ordered, first match wins (`src/sentinel/ruleEngine.ts`):

```json
[
  {
    "id": "refund-requires-identity",
    "phase": "pre_tool",
    "when": [{ "field": "identity_verified", "op": "neq", "value": true }],
    "then": "block",
    "message": "Identity must be verified before any money movement."
  },
  {
    "id": "refund-auto-limit",
    "phase": "pre_tool",
    "when": [{ "field": "amount", "op": "gt", "value": 50 }],
    "then": "escalate",
    "message": "Amounts over $50 need human approval."
  }
]
```

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `exists`, `contains`.
Fields are dot-paths into session state. Actions: `allow`, `block`,
`redact`, `escalate`. No match = allow. Default ruleset
(`DEFAULT_MONEY_RULES`) ships the two rules above.

## Three Faces

| Face | Where | Use |
|------|-------|-----|
| `governance.sentinel` node | Canvas | Visible trust boundary at a chosen phase |
| `deterministic.business_rule` node | Canvas | Pure policy check, no scanning overhead |
| `Sentinel` class | Code | `new Sentinel({rules, piiRedaction, injectionScan, rateLimit, failClosed})`, then `.check({phase, content, session, toolName?, identity?})` |
| `MCPGateway.setSentinel()` | Gateway | Every MCP tool call gated `pre_tool` before execution |

## PII & Injection

- PII (SSN, cards, emails) is redacted **before** logs, audit trails, and
  third-party LLM calls — redaction after the fact is not PCI-safe.
- Caller speech is untrusted: injection phrases are scanned `pre_llm` and
  `pre_tool`; tool arguments are validated independently of the LLM.
- Payment data should use DTMF capture with recording pause, never STT.

## Fail-Open vs Fail-Closed

`failClosed: true` (default) denies on internal error. Use `false` only
for non-mutating read phases. Preflight flags agentic nodes whose tools
lack preconditions; Sentinel enforces them at runtime.
