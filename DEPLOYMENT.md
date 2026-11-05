# Deployment Guide

The canvas is a **static client-side app**. Deployment = build `dist/` and
serve it.

## Docker (recommended)

```bash
docker compose up -d --build
# → http://localhost:3000
```

`Dockerfile` is a two-stage build: `npm ci && npm run build`, then nginx
serving `dist/`. No backend, database or environment variables are required.

## Static hosting

```bash
npm ci
npm run build
# serve dist/ with any static host (nginx, CloudFront, Vercel, GitHub Pages…)
```

Point all routes at `index.html` (single-page app).

## Embedding into a larger product

Import the component directly instead of hosting the standalone demo:

```tsx
import { CanvasDesigner } from 'agentic-cx-designer';
<CanvasDesigner onChange={persistFlow} />
```

See [docs/EMBEDDING.md](docs/EMBEDDING.md).

## Optional backend

`server/` holds an early FastAPI + PostgreSQL persistence API. Run it
independently if the host needs server-side flow storage:

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Legacy infrastructure

`k8s/` and `terraform/` describe the old platform deployment (backend +
database + Redis). They are kept for reference while the feature is folded
back into `omnichannel-agent-platform` and are **not** part of this release's
deployment path.
