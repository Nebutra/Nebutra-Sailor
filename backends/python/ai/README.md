# AI Service

FastAPI-based AI service for **batch / specialized AI workloads** that are
better in Python than in the TypeScript edge runtime.

## When to use this service vs the TS-side AI stack

Sailor has **two AI surfaces**. They are not interchangeable — pick the right
one for the workload:

| Need | Use | Why |
|------|-----|-----|
| Interactive chat / streaming completion | `packages/ai/agents` (Vercel AI SDK) | Edge-deployable, sub-100ms cold start, native streaming, runs inside the Next.js process |
| Single-shot embeddings on hot path | `packages/ai/agents` | Same — no need to cross a service boundary |
| Provider abstraction in app code | `packages/ai/ai-providers` | TS types end-to-end, Vercel AI Gateway integration |
| **Batch i18n / translation pipelines** | **this service** (`/api/v1/translate`) | Long-running, queued via Inngest/QStash, benefits from Python's mature i18n libs |
| **Heavy embedding jobs (>1k docs)** | **this service** (`/api/v1/embed`) | Long-running, queued, can chunk + parallelize without blocking edge functions |
| **Custom inference / fine-tuning / vLLM / RAG with large indices** | **this service** (future) | Python ecosystem (transformers, vLLM, langchain Python pieces) |

**Rule of thumb:** if a request is interactive (user is waiting on the response),
use the TS-side stack. If it's a job (queued, can take >5s), use this service.

> The provider abstractions in `providers/` (openai, openrouter, siliconflow)
> mirror `packages/ai/ai-providers` on purpose — Python jobs need their own
> SDKs. Keep them in lock-step on supported provider list, but do not try to
> share types across the language boundary; use OpenAPI-generated clients
> instead.

## Quick Start

```bash
# Navigate to service directory
cd backends/python/ai

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Run development server
uvicorn app.main:app --reload --port 8001
```

## API Endpoints

| Method | Endpoint            | Description       | Status |
| ------ | ------------------- | ----------------- | ------ |
| `GET`  | `/`                 | Service info      | stable |
| `GET`  | `/health`           | Health check      | stable |
| `POST` | `/api/v1/generate`  | Text generation   | **legacy** — prefer `packages/ai/agents` for interactive use |
| `POST` | `/api/v1/embed`     | Create embeddings | batch only — interactive callers should use Vercel AI SDK |
| `POST` | `/api/v1/translate` | Translate text    | **canonical** — this is the workload Python is best at |

## Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SILICONFLOW_API_KEY=sf-...

# Default provider
DEFAULT_LLM_PROVIDER=openai
DEFAULT_EMBED_PROVIDER=openai

# Service config
AI_SERVICE_PORT=8001
```

## Docker

```bash
# Build image
docker build -t nebutra-ai .

# Run container
docker run -p 8001:8001 --env-file .env nebutra-ai
```

## Project Structure

```
backends/python/ai/
├── app/
│   ├── main.py              # FastAPI entry point
│   └── api/v1/
│       ├── routes_generate.py
│       ├── routes_embed.py
│       └── routes_translate.py
├── providers/               # AI provider implementations
├── services/                # Business logic
├── utils/                   # Helpers
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Integration

Called by the BFF layer (`backends/gateway`) via internal HTTP — never
exposed to clients directly:

```typescript
// In backends/gateway/src/routes/ai
const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/translate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
    // s2s HMAC token added by gateway middleware
  },
  body: JSON.stringify({ text, targetLocales: ["zh-CN", "ja"] }),
});
```

Auth: requests carry an HMAC-signed `x-service-token` validated by
`_shared/auth/`. Tenant context is propagated via `X-Tenant-ID` and used by
`_shared/db/` for RLS. Never trust headers from clients — only from the
gateway.
