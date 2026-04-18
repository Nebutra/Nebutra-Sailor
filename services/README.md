# services/

> **Python microservices** for AI/ML, ingestion, and domain-specific heavy workloads.

Nebutra-Sailor is a **polyglot monorepo**:
- `apps/` — TypeScript apps (Next.js, Hono, Fumadocs, Storybook)
- `packages/` — shared TypeScript libraries
- **`services/`** — **Python microservices** (this directory)

## Why Python services?

Some workloads are not well-suited to Node.js:
- **AI/ML pipelines** — Python has the richest ecosystem (PyTorch, Transformers, vLLM)
- **Event ingestion at scale** — Python + uvicorn/FastAPI handles high-throughput better than Node when GIL doesn't bite
- **Domain libraries** — recommendation, content parsing, fraud detection tooling is Python-native

TypeScript-only teams can **safely ignore this directory** — none of `apps/` or `packages/` depend on `services/` at build time. Services are independently deployable (Dockerfile per service).

## Services overview

| Service | Purpose | Tech stack |
|---------|---------|------------|
| `_shared/` | Cross-service primitives: auth, config, db client, logging, telemetry, queue client | FastAPI + SQLModel |
| `ai/` | AI gateway — provider abstraction, generation, embedding, agent orchestration | FastAPI + litellm |
| `billing/` | Usage ingestion, invoice generation, settlement (complements `@nebutra/billing`) | FastAPI + SQLModel |
| `content/` | Content ingestion, chunking, embeddings, vector indexing | FastAPI + LangChain |
| `ecommerce/` | Order lifecycle, inventory, fulfilment | FastAPI + SQLModel |
| `event-ingest/` | High-throughput event / analytics ingestion (>10k/s) | FastAPI + Kafka/Redpanda |
| `recsys/` | Recommendation engine — embeddings + vector search + scoring | FastAPI + Faiss |
| `third-party/` | Outbound integrations (webhooks, SaaS sync, scrapers) | FastAPI + httpx |
| `web3/` | Web3/Blockchain integrations (opt-in) | FastAPI + web3.py |

**9 services** (8 domain services + `_shared`).

## Relationship to `apps/api-gateway`

```
Client ─► apps/api-gateway (TypeScript, Hono) ─► services/* (Python, FastAPI)
                    │
                    ├─ auth / permissions / rate-limit  (done in gateway)
                    └─ proxy business logic to Python services via internal HTTP or queue
```

The TypeScript **api-gateway** handles auth, tenancy, rate-limiting, and routes.
The **Python services** own heavy business logic that benefits from Python libs.

## Running locally

Each service has its own `Dockerfile` and `pyproject.toml`. From the repo root:

```bash
# Bring up all services (with Postgres, Redis, Kafka)
docker-compose up -d

# Or run a single service for development
cd services/ai
pip install -e .
uvicorn app.main:app --reload --port 8001
```

## Adding a new service

1. Create `services/<name>/` with:
   - `pyproject.toml` (poetry or uv)
   - `Dockerfile`
   - `app/main.py` — FastAPI entry
   - `README.md` — purpose, endpoints, env vars
2. Add to root `docker-compose.yml` and `docker-compose.prod.yml`
3. If the gateway should route to it, register in `apps/api-gateway/src/config/services.ts`
4. Add CI workflow under `.github/workflows/` if separate deployment is needed

## Shared primitives (`_shared/`)

All services import from `_shared/`:
- Database client (async SQLAlchemy/SQLModel)
- Authentication middleware (validates `x-service-token` HMAC from gateway)
- Tenant context propagation (`x-organization-id`)
- Structured logging + OpenTelemetry tracing
- Queue client (QStash/BullMQ compat)
- Error hierarchy

Do NOT duplicate these — always import from `_shared/`.

## Security

- Services never accept public traffic directly. All requests flow through `apps/api-gateway`, which validates auth and tenancy.
- Inter-service requests use HMAC-signed `x-service-token` (see `packages/auth/src/s2s.ts` in the TS side).
- Database access is RLS-scoped via `app.current_org_id` setting set per-request.

## License

Same as the root project — AGPL-3.0 with Commercial Exception. See root `LICENSE` and `LICENSE-COMMERCIAL.md`.

---

_Last updated: 2026-04-18_
