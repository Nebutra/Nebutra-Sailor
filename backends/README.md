# backends/

> **All "no-UI" backends** for Nebutra-Sailor. Split by language, unified by concern.
> Each language is used for what it's genuinely best at — not by habit.

## Language assignment

| Language | Why | Services |
|----------|-----|----------|
| **TypeScript** | Default — full-stack cohesion, shared types with `apps/` | `gateway/` |
| **Python** | ML/AI ecosystem (Transformers, vLLM, E2B, LangGraph) | `python/ai/` |
| **Go** | High-throughput I/O (goroutine fan-out, ClickHouse batching) | `go/event-ingest/` |
| **Rust** | Safety-critical isolation (Wasm sandbox, crypto paths) | `rust/sandbox/` |

Decision rule (saves every future debate):
```
Needs PyTorch / HuggingFace / LangGraph?  → Python
Needs >1k concurrent connections or >10k QPS?  → Go
Touches user code execution or encryption?  → Rust
Everything else?  → TypeScript
```

## Structure

```
backends/
├── gateway/               # TypeScript / Hono — BFF, auth, tenancy, rate-limit, routing
│
├── python/
│   ├── _shared/           # Cross-service primitives (auth, contracts, usage, health, otel…)
│   └── ai/                # FastAPI — provider abstraction, streaming, E2B sandbox, agents
│
├── go/
│   ├── _shared/auth/      # service_token.go — mirrors packages/iam/auth/src/s2s.ts
│   └── event-ingest/      # chi — receives UsageEvent batches → ClickHouse (phase 2)
│
└── rust/
    └── sandbox/           # axum — Wasmtime/Firecracker code isolation (phase 2)
```

## Data flow

```
User request
  → gateway (TS/Hono)   — auth, tenant context, rate-limit
  → python/ai           — LLM, embedding, E2B, agents
  → [fire-and-forget]
      → go/event-ingest — batch insert UsageEvent → ClickHouse
```

## Service registry

| Service | Language | Default port | Status |
|---------|----------|-------------|--------|
| `gateway` | TypeScript | 3002 | Active |
| `python/ai` | Python | 8001 | Active |
| `go/event-ingest` | Go | 8010 | Stub (ClickHouse phase 2) |
| `rust/sandbox` | Rust | 8020 | Stub (Wasmtime phase 2) |

## Running locally

```bash
# TypeScript gateway
pnpm --filter @nebutra/gateway dev

# Python AI service
cd backends/python/ai
uv sync                              # install deps into .venv
uv run uvicorn app.main:app --reload --port 8001

# Go event-ingest
cd backends/go/event-ingest
go run . &                           # listens :8010

# Rust sandbox (phase 2 — only needed when replacing E2B)
cd backends/rust/sandbox
cargo run                            # listens :8020
```

## Shared primitives

### Python (`backends/python/_shared/`)

| Module | Purpose |
|--------|---------|
| `auth.py` | `get_tenant()` — HMAC service-token validation, `TenantContext` FastAPI dep |
| `contracts.py` | `UsageEvent` — cross-language event contract (Python ↔ Go ↔ TS) |
| `usage.py` | `dispatch_usage()` — fire-and-forget asyncio queue → go/event-ingest |
| `middleware.py` | Request logging, request-id propagation |
| `health.py` | `/health`, `/ready`, `/livez`, `/readyz` probes |
| `resilience.py` | `retry()`, `CircuitBreaker`, `timeout()` decorators |
| `queue.py` | QStash / arq / memory queue provider |
| `otel.py` | OpenTelemetry instrumentation bootstrap |
| `env.py` | Required env-var validation |
| `errors.py` | Standard error response shape |

### Go (`backends/go/_shared/`)

| Module | Purpose |
|--------|---------|
| `auth/service_token.go` | `VerifyServiceToken()` — mirrors `s2s.ts` exactly |

## Service authentication

All inter-service traffic uses HMAC-signed `x-service-token` (see `packages/iam/auth/src/s2s.ts`).
Secret: `SERVICE_SECRET` env var — must be identical across all services.

```
canonical = "{userId}:{orgId}:{role}:{plan}"
token     = HMAC-SHA256(canonical, SERVICE_SECRET).hexdigest()
```

Python services validate this via `Depends(get_tenant)` on route handlers.
Go services validate via `auth.VerifyServiceToken(...)`.

## Adding a new Python service

1. Create `backends/python/<name>/` from the `python/ai/` template
2. Copy `pyproject.toml`, `Dockerfile`, `app/main.py` — adjust service name
3. Import `_shared.*` (already on sys.path via `main.py` bootstrap)
4. Register in `backends/gateway/src/config/services.ts`
5. Add `pyrightconfig.json` with `"extraPaths": [".."]`

## Lifecycle tiers (per CLAUDE.md ADR 2026-05-10)

```
active     — has real callers; in CI
stub       — HTTP harness only; no real logic; 501 on business routes
incubator  — excluded from workspaces and CI
```

`go/event-ingest` and `rust/sandbox` are both **stubs**.
Promote to active by landing a real ClickHouse/Wasmtime implementation
in the same PR as the first real caller.
