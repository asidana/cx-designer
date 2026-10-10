# Agent Firewall — Policy Enforcement Gateway

The Agent Firewall is the protective gateway around **agents** — not an
LLM gateway. (Named to avoid confusion with SIEM products: this is
agent policy enforcement, not security-event management.)
The division of ownership is strict:

- **Agents** own business logic and use cases.
- **Agent Firewall** owns protection: policy, PII/PHI, injection defense,
  rate limits, approvals.
- **Voice Gateway** owns transport: SIP/WebSocket/gRPC legs into CCaaS and
  telephony (see `docs/VOICE_GATEWAY.md`).

```
outside world ──▶ Voice Gateway ──▶ Agent Firewall ──▶ agent
  (SIP/WS/gRPC)      (transport)        (policy)       (business logic)
```

Every request passes through the firewall before it reaches the agent,
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
| `Sentinel` class (`src/sentinel/`) | Code | `new Sentinel({...})`, then `.check({phase, content, session, toolName?, identity?})` — internal name predates the Agent Firewall rename |
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
lack preconditions; the firewall enforces them at runtime.
