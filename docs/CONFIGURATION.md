# Configuration Reference

All settings come from environment variables (see `.env.example`). Copy it to `.env` and fill in values.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/agentic_cx` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for signing JWTs. Must be changed in production | `your-jwt-secret-key-change-in-production` |

## LLM Providers (at least one for agentic nodes)

| Variable | Used by | Example |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI models, Whisper STT, OpenAI TTS | `sk-...` |
| `ANTHROPIC_API_KEY` | Claude models | `sk-ant-...` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | Bedrock models, Transcribe, Polly, Strands/ADK adapters | `AKIA...` |

## Voice Providers

| Variable | Used by | Example |
|----------|---------|---------|
| `DEEPGRAM_API_KEY` | Deepgram STT (`voice.input`) | `...` |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS (`voice.output`) | `...` |
| `CARTESIA_API_KEY` | Cartesia TTS (`voice.output`) | `...` |
| `XAI_API_KEY` | Grok Voice S2S/TTS (`voice.input`, `voice.output`) | `xai-...` |
| `GOOGLE_API_KEY` | Gemini Live S2S, Google STT/TTS | `...` |
| `NVIDIA_API_KEY` | NVIDIA Riva STT/TTS, NVIDIA Voice S2S pipelines | `nvapi-...` |
| `KYUTAI_API_KEY` | Kyutai Moshi S2S (hosted; omit when self-hosting) | `...` |

## Telephony

| Variable | Used by | Example |
|----------|---------|---------|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio provider (`integration.telephony`) | `...` |
| `TWILIO_PHONE_NUMBER` | Inbound/outbound number | `+1234567890` |

## App

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Frontend port |
| `API_PORT` | `8000` | Backend API port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `LOG_LEVEL` | `debug` | Log verbosity |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (restrict in production) |
| `JWT_EXPIRATION_HOURS` | `24` | JWT lifetime |

## Monitoring

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry error tracking |
| `DATADOG_API_KEY` | Datadog metrics |
| `PROMETHEUS_PORT` / `GRAFANA_PORT` | Metrics stack ports (`9090` / `3001`) |

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_ANALYTICS` | `true` | Analytics overlay |
| `ENABLE_COLLABORATION` | `true` | Multi-user collaboration |
| `ENABLE_AI_GENERATOR` | `true` | AI-assisted flow generation |

## Notes

- Never commit `.env`. Secrets in Kubernetes come from `k8s/secrets.yaml`; in production prefer a secret manager.
- `JWT_SECRET` must be a long random value in production.
- Restrict `CORS_ORIGINS` to the deployed frontend origin in production.
