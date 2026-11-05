# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Canvas extraction

The product is refocused on the canvas feature only, made whole and embeddable.

### Added
- `src/designer/` — the entire canvas feature as a single embeddable component
  (`<CanvasDesigner />`), with a public API (`index.ts`) and imperative handle.
- Ported the next-generation canvas from omnichannel-agent-platform: custom
  `cx` node cards (typed ports, 3 zoom bands, status rings), normalization
  funnel, pattern composition, design tokens.
- Feature drawers: Preflight, Script, Validation, Flow I/O, Versions (visual
  diff), Builder chat, Analytics.
- Local metrics recorder (`engine/metrics.ts`) replacing the platform's
  Observability dependency; local mock tool simulator (`mock/seed.ts`).
- Embedding contract documented in docs/EMBEDDING.md.

### Changed
- All flow state extracted from the app-shell monolith into
  `CanvasDesigner.tsx` (palette, config panel, history, autosave, dirty
  tracking, run pipeline).
- Autosave keys renamed to `agentic_cx_designer_*` and the IndexedDB durable
  store to `agentic-cx-designer-config` — earlier platform-era stored sessions
  are not carried over; platform workspace/RBAC/plugins/protocol/consoles
  removed from the feature.

### Removed
- Nine-section shell, navigation, pages, test console, protocol console,
  workspace store, plugin marketplace, collaboration scaffolding.
- Unused dependencies: axios, uuid, zod, zustand.

## [0.1.0] - 2026-10-06

### Added
- Visual canvas with React Flow
- Voice Input/Output nodes with STT/TTS/VAD support
- Agentic nodes: Intent Classifier, Reasoning Loop, RAG, Memory
- Deterministic nodes: Slot Collector, Human Handoff
- Control flow: Conditional Router, Sub-flow, Parallel, Wait
- Governance: Guardrail node with PII redaction
- Integration: HTTP Request, Telephony, Webhook, Database
- Framework adapters: LangGraph, AWS Strands, AWS ADK
- Real-time test console with trace view
- Flow import/export (JSON, YAML, LangGraph Python)
- AI-assisted flow generation from plain English
- Plugin marketplace
- Template gallery
- Version control with diff and rollback
- Real-time collaboration
- Monitoring and observability
- Analytics overlay
- Custom node SDK
- Guardrail app SDK
- MCP Gateway
- Backend API (FastAPI)
- PostgreSQL database schema
- Authentication (JWT)
- WebSocket client for real-time testing
- Auto-save with local storage backup
- Flow validation
- Settings panel
- Help panel with keyboard shortcuts
- Onboarding flow
- Notifications
- Keyboard shortcuts
- Docker setup
- Kubernetes manifests
- Terraform configuration
- CI/CD pipeline
- E2E tests
- Integration tests
- Unit tests
- Security policy
- Makefile for common tasks

### Security
- JWT-based authentication
- Role-based access control
- PII redaction
- Input validation
- CORS configuration
- Rate limiting
