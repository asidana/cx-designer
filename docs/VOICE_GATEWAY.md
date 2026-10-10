# Voice Gateway — Telephony Gateway Service

The Voice Gateway connects agents with CCaaS environments and telephony
over **SIP, WebSocket, or gRPC**, and exposes agents to outside systems
for telephony integrations. It is a *SIP-gateway-style service*: the far
end sees trunks/endpoints (SIP trunking à la Vapi/Retell BYO); inside,
calls route to agents.

```
 Genesys / Five9 / Avaya / Connect / PSTN
            │ SIP trunk / WS / gRPC
            ▼
      Voice Gateway endpoints ──▶ Agent Firewall ──▶ bound agent
            │                          (policy)       (business logic)
            ├── audio bridging (RTP/Opus frames)
            ├── DTMF (RFC2833 — never STT audio)
            ├── warm / blind transfer
            └── recording pause (PCI payment capture)
```

## Transports (`src/streamlink/transports.ts`)

| Transport | Production stack (bring your own) | Status here |
|-----------|-----------------------------------|-------------|
| SIP | Kamailio/FreeSWITCH or drachtio + RTP engine | Contract + `SipTransport` stub; `LoopbackTransport` for simulations |
| WebSocket | PCMU/Opus frames (Twilio Media Streams shape) | Loopback mock |
| gRPC | Bidirectional audio streaming | Loopback mock |

SIP contract notes live on `SipTransport`: INVITE/SDP, early media,
RFC2833 telephone-events, re-INVITE hold, REFER blind / INVITE-replaces
warm transfer, recorder fork pause.

## Service (`src/streamlink/streamLink.ts`)

- `addEndpoint()` — expose a trunk/URL/address to outside systems.
- `bindAgent()` — register an agent with audio/DTMF/hangup handlers.
- `inboundCall()` — telephony → firewall `pre_llm` gate → agent.
- `outboundCall()` — agent-initiated, firewall `pre_tool` gate as
  `streamlink:outbound-call` (callbacks, reminders need policy approval).
- `warmTransfer()` / `blindTransfer()`, `pauseRecording()` /
  `resumeRecording()`, `hangup()` with disposition callback for
  summary + CRM write-back.

## Canvas Node (`integration.streamlink`)

Binds the flow's agent to an endpoint: transport, CCaaS target, endpoint
ID, DID, DTMF mode (RFC2833 recommended — digits must never flow through
STT), recording toggle, and PCI auto-pause on payment.

## PCI Rule

Card capture uses DTMF with recording paused. Redaction after the fact
is not PCI-safe — the gateway pauses the media fork; the firewall redacts
anything that still leaks before logs and models.

## Simulations

`LoopbackTransport` pairs both call legs in-process: the mock personas
and scenarios in `docs/SIMULATION.md` run through the gateway with zero
credentials. Swap the transport for a real stack at deploy time —
flow JSON does not change.
