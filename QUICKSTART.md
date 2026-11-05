# Quick Start

The canvas is a client-side React app — no database, backend or API keys needed.

```bash
npm ci
npm run dev        # → http://localhost:5173
```

Other useful commands:

```bash
npm test           # 125 tests, non-watch
npm run build      # tsc + vite production build (dist/)
npm run lint       # ESLint
```

## Docker

```bash
docker compose up -d --build
# → http://localhost:3000
```

The image is the static Vite build served by nginx; no backend is included.

## Embedding

To plug the canvas into a larger product:

```tsx
import { CanvasDesigner } from 'agentic-cx-designer';
<CanvasDesigner initialFlow={flow} onChange={save} />
```

See [docs/EMBEDDING.md](docs/EMBEDDING.md) for props, the imperative handle,
feature toggles and persistence behavior.

## Optional backend

`server/` contains an early FastAPI/PostgreSQL persistence API (flows,
builds, deployments, eval suites). It is not required by the canvas and is
deployed separately; see [docs/API.md](docs/API.md).
