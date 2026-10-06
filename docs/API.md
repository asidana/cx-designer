# API Reference

Base URL (local): `http://localhost:8000`. Interactive docs: `/docs` (FastAPI Swagger UI).

All request/response bodies are JSON unless noted. Auth: JWT bearer token (see `server/auth.py`).

## Flows

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flows` | Create a flow |
| GET | `/api/flows?skip=0&limit=100` | List flows (paginated) |
| GET | `/api/flows/{flow_id}` | Get a flow by ID |
| PUT | `/api/flows/{flow_id}` | Update a flow (bumps minor version) |
| DELETE | `/api/flows/{flow_id}` | Delete a flow |

`POST /api/flows` body: `{ "name": string, "description"?: string, "flow_json": object }`.
`PUT /api/flows/{flow_id}` body: any subset of `{ "name", "description", "flow_json" }`.
Errors: `404` if the flow does not exist.

## Builds

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/builds` | Create an immutable build from a flow |
| GET | `/api/builds/{build_id}` | Get build status (`building` \| `testing` \| `ready` \| `failed`) |

`POST /api/builds` body: `{ "flow_id": string, "version": string }`.

## Deployments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deployments` | Deploy a build (`staging` \| `production`) |
| POST | `/api/deployments/{deployment_id}/rollback` | Roll back a deployment |

`POST /api/deployments` body: `{ "flow_id": string, "build_id": string, "environment": string, "region": string }`.

## Evals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/eval-suites` | Create an eval suite |
| GET | `/api/eval-suites/{suite_id}` | Get an eval suite |

`POST /api/eval-suites` body: `{ "name": string, "flow_id": string, "test_cases": array, "evaluators": array }`.

## Real-Time Testing

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws/test/{flow_id}` | Live test session (trace events, audio, metrics) |

Message types: `test.start`, `test.text`, `test.audio` (client → server); `test.trace`, `test.metrics`, `test.audio` (server → client). See `src/api/websocket.ts` for the client.

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (`{ "status": "healthy", "version": "0.1.0" }`) |

## Error Format

Errors use FastAPI defaults: `{ "detail": string }` with the HTTP status code (`404` for missing resources).
