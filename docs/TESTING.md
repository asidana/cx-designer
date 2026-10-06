# Testing Guide

## Layout

| File | Scope |
|------|-------|
| `tests/flowEngine.test.ts` | Flow engine unit tests (execution, validation, error handling) |
| `tests/guardrail.test.ts` | Guardrail SDK unit tests (PII, toxicity, injection, validation) |
| `tests/integration.test.ts` | Template loading, framework adapters, guardrail integration |
| `tests/e2e.test.ts` | End-to-end user workflows + performance budgets |

## Frontend Tests

```bash
npm test -- --run        # all tests, single run
npm test -- --run tests/flowEngine.test.ts   # one file
```

Tests use `vitest`. Backend services are mocked — no database or API keys needed.

## Backend Tests

```bash
cd server
pip install -r requirements.txt
pip install pytest pytest-asyncio
pytest tests/ -v
```

Backend tests need PostgreSQL and Redis. With Docker:

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d -p 6379:6379 redis:7
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentic_cx_test \
REDIS_URL=redis://localhost:6379 pytest tests/ -v
```

## CI

`.github/workflows/ci.yml` runs on every push/PR: typecheck + lint + frontend tests, backend tests (with Postgres/Redis services), Docker build, then staged deploy on `main`.

## Performance Budgets (from `tests/e2e.test.ts`)

- Single flow execution completes in < 5s (mock execution).
- 10 concurrent executions complete without errors.
- Production voice target (real providers): end-of-speech → first-audio p95 < 1s.

## Adding Tests

- New node → unit test for `execute` + `validate` (success, failure, edge cases).
- New API endpoint → backend test for 200 + 404 paths.
- New user workflow → case in `tests/e2e.test.ts`.
