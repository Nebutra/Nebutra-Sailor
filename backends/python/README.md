# Nebutra Python origin

FastAPI service plus the Celery worker that drains its task envelope. One image, two roles.

**Status: active.** It is the only Python backend in this repo (ADR 2026-05-10 keeps new backend
work in TypeScript unless batch, ML, or a Python-only library justifies otherwise). It exists for
the generation pipeline: `para.generate` calls image models and persists their output, which is
long-running work that does not belong in an edge runtime.

## Layout

```
_shared/    auth (service-token verification), task store, queue, contracts — imported by ai/
ai/         the service: app/ (API, tasks, workers, uploads) and providers/ (LLM + image)
Dockerfile  build context is THIS directory, not ai/ — the service imports _shared from beside it
```

## Running it

```bash
cd ai && uv sync && uv run uvicorn app.main:app --reload --port 8000
cd ai && uv run pytest
```

`TASK_STORE_PROVIDER=memory` and no `CELERY_BROKER_URL` is enough for tests; both fail closed in
production rather than silently degrading.

## Deployment

`nebutra-ai` on Fly in `sin`, two process groups from one image (`infra/fly/ai.toml`):

| Process | Command | Role |
|---|---|---|
| `app` | `uvicorn app.main:app --host :: --port 8000` | the API the gateway calls |
| `worker` | `celery -A app.workers.celery_app worker` | drains the task envelope |

Ship it with `.github/workflows/deploy-ai-origin-fly.yml`, which also stages the R2 credentials that
live in GitHub secrets. The older `deploy-origin-ecs.yml` expects an image in GHCR that nothing has
published since `docker-build-push.yml` was retired; this workflow builds from source instead.

**The origin has no public IP.** The gateway reaches it at `http://nebutra-ai.internal:8000` over
Fly private networking, and both sides hold `GATEWAY_SHARED_SECRET`, so the private network is not
the only thing between it and a caller.

### Three things that will bite you

- **Bind `::`, not `0.0.0.0`.** Fly's private network is IPv6. An IPv4-only bind leaves the machine
  healthy from inside itself and unreachable at `.internal`.
- **A `rediss://` broker URL needs `ssl_cert_reqs`.** Celery refuses to start without it. Set
  `required`; do not disable verification to move on.
- **`sslmode=verify-full` needs a CA bundle.** The image installs `ca-certificates` and points
  `PGSSLROOTCERT` at it; without that, libpq looks for `~/.postgresql/root.crt` and refuses to
  connect rather than falling back.

### Configuration

| Variable | Why |
|---|---|
| `DATABASE_URL` | Postgres task store. Memory is refused in production. |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | The worker's queue. |
| `SERVICE_SECRET` | Verifies the gateway's short-lived service token. |
| `GATEWAY_SHARED_SECRET` | Rejects traffic that did not come through the gateway. |
| `IMAGE_PROVIDER`, `DASHSCOPE_API_KEY` | The image seat. Unset fails closed — no toy fallback. |
| `UPLOAD_STORAGE_PROVIDER` | `r2` reads `R2_*`; `s3` reads `AWS_*`. Naming the wrong one fails at persist time, after the image is already paid for. |
| `UPLOAD_PUBLIC_BASE_URL` | Where a persisted asset is served from. Unset fails closed: a provider's temporary URL is not an asset. |
