# backends/

> **All "no-UI" backends** for Nebutra-Sailor — the TypeScript API gateway and
> the Python microservice fleet. Layout follows
> [vercel/vercel](https://github.com/vercel/vercel) (api/ TS + python/ +
> crates/): **split by language, unified by concern**.

## Structure

```
backends/
├── gateway/                # TypeScript / Hono — BFF, auth, tenancy, rate-limit, routing
└── python/                 # Python / FastAPI fleet
    ├── _shared/            # Cross-service primitives (auth, db, logging, queue client)
    ├── ai/                 # AI gateway — provider abstraction, agents, embeddings
    ├── billing/            # Usage ingestion, invoice generation, settlement
    ├── content/            # Content ingestion, chunking, embeddings, vector indexing
    ├── ecommerce/          # Order lifecycle, inventory, fulfilment
    ├── event-ingest/       # High-throughput event/analytics ingestion (>10k/s)
    ├── recsys/             # Recommendation engine — embeddings + vector search
    ├── third-party/        # Outbound integrations (webhooks, SaaS sync, scrapers)
    └── web3/               # Web3/Blockchain integrations (opt-in)
```

Future-proofed: `backends/go/` and `backends/rust/` reserved for high-concurrency
or ML-inference workloads if the need arises.

## Architecture (BFF separation preserved)

```
Client ─► backends/gateway (TS, Hono) ─► backends/python/* (FastAPI)
              │
              ├─ auth / permissions / rate-limit  (centralized in gateway)
              └─ proxy domain logic to Python services via internal HTTP / queue
```

The TypeScript **gateway** owns auth, tenancy, rate-limiting, and routing.
The **Python services** own heavy domain logic that benefits from Python libs
(PyTorch, Transformers, vLLM, LangChain, web3.py, etc.). This separation is
intentional and load-bearing — do **not** flatten gateway logic into the
Python services or vice-versa.

> Why not a single `backends/all/`? Different languages have different
> toolchains (pnpm vs uv), independent deployment lifecycles, and their own
> Docker base images. Splitting by language at the directory level makes the
> right tool obvious from the path.

## TypeScript-only teams

Safely ignore `backends/python/` — none of `apps/` or `packages/` depend on it
at build time. Each Python service is independently deployable (Dockerfile per
service via the shared `infra/runtime/docker/Dockerfile.python`).

## Running locally

### TypeScript gateway

```bash
pnpm --filter @nebutra/gateway dev   # localhost:3002
```

### Python services

```bash
# Bring up all backends (with Postgres, Redis, Kafka)
docker compose up -d

# Or run a single Python service for development
cd backends/python/ai
uv pip install -e .
uvicorn app.main:app --reload --port 8001
```

## Adding a new Python service

1. Create `backends/python/<name>/` with:
   - `pyproject.toml` (uv)
   - `Dockerfile` (or rely on shared `infra/runtime/docker/Dockerfile.python` via build arg)
   - `app/main.py` — FastAPI entry
   - `README.md` — purpose, endpoints, env vars
2. Add to root `docker-compose.yml` and `docker-compose.prod.yml`
3. If the gateway should route to it, register in `backends/gateway/src/config/services.ts`
4. Add to the Python build matrix in `.github/workflows/docker-build-push.yml`

## Shared primitives (`backends/python/_shared/`)

All Python services import from `_shared/`:
- Database client (async SQLAlchemy/SQLModel)
- Authentication middleware (validates `x-service-token` HMAC from gateway)
- Tenant context propagation (`x-organization-id`)
- Structured logging + OpenTelemetry tracing
- Queue client (QStash/BullMQ compat)
- Error hierarchy

Do NOT duplicate these — always import from `_shared/`.

## Security

- Python services never accept public traffic directly. All requests flow through
  `backends/gateway`, which validates auth and tenancy.
- Inter-service requests use HMAC-signed `x-service-token` (see
  `packages/iam/auth/src/s2s.ts`).
- Database access is RLS-scoped via `app.current_org_id` setting set per-request.

## License

Same as the root project — AGPL-3.0 with Commercial Exception. See root
`LICENSE` and `LICENSE-COMMERCIAL.md`.
