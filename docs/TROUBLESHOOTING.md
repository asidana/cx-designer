# Troubleshooting

## Frontend Won't Start

**`vite: command not found`** — dependencies not installed. Run `npm install` (or `pnpm install`) in the project root, then `npm run dev`.

**Blank canvas / React Flow errors** — check the browser console. The usual cause is a node type in the flow JSON with no registered definition in `src/nodes/index.ts`.

**Port 3000 in use** — set `PORT` to a free port, or stop the process holding 3000.

## Backend Won't Start

**Database connection errors** — verify Postgres is running and `DATABASE_URL` is correct:
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
```

**`No module named 'fastapi'`** — install backend deps: `cd server && pip install -r requirements.txt`.

**Port 8000 in use** — `uvicorn main:app --port <free-port>` (and point the frontend WebSocket client at it).

## Tests

**Frontend test failures after adding a node** — the new node must be registered in `src/nodes/index.ts`; adapter tests assert registry contents.

**Backend test DB errors** — tests expect Postgres on `5432` and Redis on `6379` (see TESTING.md). CI provides both as services.

**Type errors (`tsc --noEmit`)** — common causes: `NodeDefinition` missing a required field (`type`, `category`, `configSchema`, `execute`, `validate`); `unknown` config values used without narrowing.

## Docker

**Container exits immediately** — check `docker-compose logs`. Typical causes: missing `.env` (copy `.env.example`), wrong `DATABASE_URL` (use service name `db`, not `localhost`, inside Compose), or missing volume mounts.

**Lost flows after restart** — flows live in Postgres; ensure the `postgres_data` volume exists (`docker-compose up` creates it). `SQLite` is not used — don't look for a local db file.

## Voice / Providers

**STT/TTS nodes return mocks** — provider calls are stubbed until API keys are configured. Set `DEEPGRAM_API_KEY` / `ELEVENLABS_API_KEY` (or OpenAI/AWS equivalents) in `.env`.

**Twilio webhooks failing locally** — Twilio needs a public URL. Use a tunnel (e.g. ngrok) and set it as the webhook URL in the Twilio console.

**401s from the API** — the JWT is missing, expired, or `JWT_SECRET` changed. Re-authenticate; in dev check `JWT_SECRET` matches between server restarts.

## Getting Help

- Architecture decisions: `research/docs/agentic-cx-designer-architecture.md` (§17 is normative on conflicts).
- Security issues: see SECURITY.md — do not file public issues for vulnerabilities.
