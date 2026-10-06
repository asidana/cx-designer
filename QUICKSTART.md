# Quick Start

## Option 1: Docker (Recommended)

```bash
# Clone
git clone https://github.com/your-org/agentic-cx-designer.git
cd agentic-cx-designer

# Configure
cp .env.example .env
# Edit .env with your API keys

# Start
docker-compose up -d

# Open
open http://localhost:3000
```

## Option 2: Local Development

```bash
# Install dependencies
make install

# Start development servers
make dev

# Open
open http://localhost:3000
```

## Option 3: Kubernetes

```bash
# Deploy to Kubernetes
make k8s-deploy

# Check status
make k8s-status
```

## First Steps

1. **Create a flow** — Click "Templates" to start from a template, or "AI Generate" to create from plain English
2. **Add nodes** — Drag nodes from the palette onto the canvas
3. **Connect nodes** — Drag from an output handle to an input handle
4. **Configure** — Click a node to edit its configuration
5. **Test** — Click the 🧪 button to test your flow
6. **Deploy** — Export as JSON or Python code

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key | For LLM nodes |
| `ANTHROPIC_API_KEY` | Anthropic API key | For LLM nodes |
| `DEEPGRAM_API_KEY` | Deepgram API key | For STT nodes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | For TTS nodes |
| `JWT_SECRET` | JWT signing secret | Yes |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/flows` | Create flow |
| `GET` | `/api/flows` | List flows |
| `GET` | `/api/flows/{id}` | Get flow |
| `PUT` | `/api/flows/{id}` | Update flow |
| `DELETE` | `/api/flows/{id}` | Delete flow |
| `POST` | `/api/builds` | Create build |
| `POST` | `/api/deployments` | Deploy build |
| `WS` | `/ws/test/{flow_id}` | Real-time testing |

## Support

- Documentation: `README.md`
- Architecture: `research/docs/agentic-cx-designer-architecture.md`
- Contributing: `CONTRIBUTING.md`
- Security: `SECURITY.md`
