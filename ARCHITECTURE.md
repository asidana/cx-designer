# Architecture

## Overview

Agentic CX Designer is a visual voice agent builder with a microservices architecture.

## Components

### Frontend (React + React Flow)

- **Canvas** — Node-based flow editor
- **Palette** — Draggable node types
- **Config Panel** — Node configuration
- **Test Console** — Real-time testing
- **Analytics Overlay** — Performance metrics
- **AI Generator** — Plain English to flow
- **Plugin Marketplace** — Community plugins
- **Template Gallery** — Pre-built flows
- **Version Control** — Diff and rollback
- **Collaboration** — Multi-user editing
- **Monitoring** — Production metrics

### Backend (FastAPI)

- **Flow API** — CRUD operations
- **Build API** — Immutable builds
- **Deployment API** — Deploy and rollback
- **Eval API** — Test suites
- **WebSocket** — Real-time testing
- **Auth** — JWT-based authentication

### Execution Engine

- **DAG Executor** — Flow execution
- **Voice Pipeline** — STT/LLM/TTS
- **Framework Adapters** — LangGraph, Strands, ADK
- **Guardrails** — PII, compliance, safety
- **Gateway** — MCP, HTTP

### Infrastructure

- **PostgreSQL** — Flow definitions, audit logs
- **Redis** — Session state, caching
- **S3** — Flow exports, recordings
- **Kubernetes** — Container orchestration
- **Prometheus** — Metrics
- **Grafana** — Dashboards

## Data Flow

```
User → Canvas → Flow JSON → Backend → PostgreSQL
                     ↓
              Execution Engine
                     ↓
         Voice Pipeline (STT/LLM/TTS)
                     ↓
              Response → User
```

## Security

- JWT authentication
- Role-based access control
- Input validation (Pydantic)
- SQL injection prevention (SQLAlchemy)
- CORS configuration
- Rate limiting
- PII redaction

## Scalability

- Horizontal pod autoscaling
- Database read replicas
- Redis cluster mode
- CDN for static assets
- Multi-region deployment
