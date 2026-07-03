# ADR: Production Runtime Closure and Deploy Target Switchability

- **Date**: 2026-06-04
- **Status**: Accepted
- **Owner**: tseka_luk
- **Related**:
  - `docs/plans/2026-06-04-deployment-responsibility-split-design.md`
  - `packages/ops/preset/src/deploy-target.ts`
  - `tests/architecture/deployment-runtime-closure.test.ts`

---

## Decision

Nebutra's production runtime defaults to:

```text
apps/web + apps/landing-page
  -> Vercel frontend
  -> api.nebutra.com
  -> Cloudflare Workers gateway
  -> Cloud VM Origin (ECS Origin legacy target)
     -> backends/python/ai FastAPI
     -> Celery worker / beat
  -> Supabase Postgres
  -> Upstash Redis / QStash
  -> R2 or OSS object storage
```

This is the default topology, not a provider lock-in. Deployment DX is
provider-switchable through per-service selector keys:

| Service | Default | Allowed targets |
| --- | --- | --- |
| `web` | `vercel` | `vercel`, `standalone`, `cloudflare-pages`, `railway` |
| `landing-page` | `vercel` | `vercel`, `standalone`, `cloudflare-pages`, `railway` |
| `design-docs` | `vercel` | `vercel`, `standalone`, `cloudflare-pages`, `railway` |
| `sailor-docs` | `vercel` | `vercel`, `standalone`, `cloudflare-pages`, `railway` |
| `gateway` | `cloudflare-workers` | `cloudflare-workers`, `vercel-functions`, `vm-docker`, `ecs-docker`, `k8s`, `aws`, `railway` |
| `python-ai` | `ecs-docker` | `ecs-docker`, `k8s`, `aws`, `railway` |

Selector env keys are service-specific:

```env
DEPLOY_TARGET_WEB=vercel
DEPLOY_TARGET_LANDING_PAGE=vercel
DEPLOY_TARGET_GATEWAY=cloudflare-workers
DEPLOY_TARGET_PYTHON_AI=ecs-docker
```

The governance rule is:

> One service, one environment, one active deploy target.

Adapters may coexist in the repo, but only one target may be active for a
service in an environment. Switching a provider changes `DEPLOY_TARGET_*`; it
does not fork application code or make two substrates deploy the same service.

---

## Runtime Responsibilities

### Frontends

`apps/web` and `apps/landing-page` default to Vercel. They call
`NEXT_PUBLIC_API_BASE_URL=https://api.nebutra.com` and must not call the VM
origin directly.

`standalone` remains a dormant target for self-hosting or China-reachable
frontend overlays. `cloudflare-pages` and `railway` preserve create-sailor's
existing provider DX while the default stays Vercel.

### Gateway

`backends/gateway` is the edge/API entry point. Its default deployment target is
Cloudflare Workers, but provider-switchable DX keeps Vercel Functions, generic
VM Docker/PM2, legacy ECS naming, k8s, AWS, and Railway as valid adapters while
the repo migrates.

Gateway responsibilities:

- CORS and request normalization
- request ID propagation
- rate limiting and abuse checks
- auth/session verification
- tenant header derivation
- webhook signature checks
- proxying approved origin requests

Gateway must forward origin requests with:

```text
x-nebutra-request-id
x-nebutra-client-ip
x-nebutra-tenant-id
x-nebutra-gateway-secret
```

### Cloud VM Origin

Cloud VM Origin, also called ECS Origin by legacy deploy governance, is the
default heavy backend runtime. "ECS" in older scripts is a legacy alias for an
SSH-managed cloud server; supported targets include AWS EC2, Alibaba Cloud ECS,
Tencent Cloud CVM, GCP Compute Engine, and equivalent Linux VMs.

For backwards-compatible automation, this runtime is still referred to as
ECS Origin in legacy workflow and governance checks.

Cloud VM Origin runs:

- FastAPI origin API in `backends/python/ai`
- Celery worker
- Celery beat when needed
- Caddy or Nginx in front of the origin service

Cloud VM Origin verifies `x-nebutra-gateway-secret` and rejects direct public calls
without it.

### Managed Data Layer

Supabase Postgres is the primary database. Upstash Redis/QStash is the default
cache, rate-limit, lock, queue, and task-event substrate. R2/OSS stores files.

Files go to object storage. The VM handles metadata and async processing, not raw
frontend file ingress.

### Task Envelope

Long-running origin work is exposed as `/api/v1/tasks`, not as a provider
specific Celery, QStash, or arq API. The standard envelope persists task state
in Postgres and returns `queued`, `running`, `succeeded`, `failed`, or
`cancelled` progress. Dispatch is provider-switchable through
`TASK_DISPATCHER_PROVIDER=celery|queue|memory`; production defaults to Celery
on Cloud VM origin and requires `TASK_STORE_PROVIDER=postgres`.

---

## Packages Do Not Deploy

packages do not deploy. Packages provide domain capability only:

- `packages/platform/*` for config, DB, logging, health, rate limiting,
  repositories, tenant store, trace store, status, provider factory
- `packages/iam/*` for auth, identity, tenant, permissions, audit, vault
- `packages/integrations/*` for cache, queue, storage, uploads, email,
  webhooks, event bus, notifications
- `packages/ai/*` for agent runtime, providers, tool registry, RAG, document
  pipeline, execution policy, support deflection
- `packages/commerce/*` for waitlist, access gate, metering, license
- `packages/design/*` for UI, theme, tokens, icons, brand

If a package needs runtime behavior, it is consumed by an app, the gateway, or
the origin backend. It does not become a deployment target by itself.

---

## Migration State

Current workflows still contain legacy ECS/k8s deployment paths. The accepted
target is to migrate those paths behind per-service `DEPLOY_TARGET_*` selectors.
The old global `DEPLOY_TARGET` gate is a temporary compatibility bridge only; it
must not become the long-term DX contract.

Migration sequence:

1. Use `@nebutra/preset/deploy-target` as the source of truth for target names,
   defaults, and env keys.
2. Gate each adapter job by the relevant per-service selector.
3. Remove frontends from automatic VM/k8s deployment once Vercel projects and
   env vars are verified.
4. Add the Cloudflare Workers gateway adapter before flipping
   `DEPLOY_TARGET_GATEWAY=cloudflare-workers` in production.
5. Keep dormant adapters documented and validated, but not active.

---

## UX / DX Standard

The hard-but-correct governance target is boring production operation:

- users see stable frontends and task progress, not substrate churn
- engineers switch providers by config, not code rewrites
- agents can read one selector module and one ADR to know the production path
- CI prevents accidental double-deploys and packages-as-services drift

Provider switchability is a DX feature. Single-active deployment is the
governance constraint that keeps it from turning into runtime drift.
