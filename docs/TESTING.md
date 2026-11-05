# Testing Guide

## Layout

| File | Scope |
|------|-------|
| `tests/flowEngine.test.ts` | Flow engine unit tests (execution, validation, error handling) |
| `tests/normalize.test.ts` | Normalization funnel: migration, all creation paths, no type bypass |
| `tests/patterns.test.ts` | Composite pattern expansion (authoring → flat runtime graph) |
| `tests/canvasNode.test.tsx` | Node card rendering, zoom bands, status rings, tokens |
| `tests/builder.test.ts` | Plain-English builder interpreter ops |
| `tests/customNodes.test.ts` | Custom node authoring contract + registry sync |
| `tests/designerSmoke.test.tsx` | `<CanvasDesigner />` boots, emits changes, imperative handle |

## Running

```bash
npm test                  # all tests, single run (CI mode)
npm run test:watch        # watch mode while developing
npx vitest run tests/flowEngine.test.ts   # one file
```

Tests use `vitest` with jsdom where the DOM is needed. Everything runs against
local mocks — no database, backend or API keys required.

## CI

`.github/workflows/ci.yml` runs typecheck → lint → tests → production build,
then (on `main`) verifies the Docker image builds. Registry push/deploy is
host-specific and intentionally not wired.

The optional FastAPI backend in `server/` has no committed test suite; it is
not exercised by CI.
