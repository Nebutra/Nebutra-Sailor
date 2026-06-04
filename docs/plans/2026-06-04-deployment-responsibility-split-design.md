# Deployment Responsibility Split — Design

**Date:** 2026-06-04
**Status:** Approved (design) — refined by
`docs/architecture/2026-06-04-production-runtime-closure.md`
**Goal:** Unicorn-grade AI-SaaS deployment topology with excellent boilerplate DX, governed the hard-but-right way.

> 2026-06-04 refinement: the production default is now recorded as Vercel
> frontends → Cloudflare Workers gateway → ECS Origin FastAPI/Celery. Gateway
> remains provider-switchable (`cloudflare-workers`, `vercel-functions`,
> `ecs-docker`, `k8s`, `aws`, `railway`), but Cloudflare Workers is the recommended
> default edge target. Treat older gateway-on-ECS wording in this design as a
> dormant adapter path, not the long-term default.

---

## 1. Goals & Non-Goals

### Goals
- **Clear responsibility split:** frontends on Vercel, backends on a *switchable* compute substrate, DB on Supabase, cache/queue on Upstash.
- **Provider-agnostic deployment**, consistent with Nebutra's DNA (queue/cache/billing/search are already provider-swappable — deployment target should be too).
- **Kill the 3-way drift**: today `gateway` deploys to ECS **and** k8s **and** Vercel simultaneously; `landing` to 3 places. Exactly **one active substrate per service per environment**.
- **Boilerplate-friendly default**: scaffolds run cheap out of the box; scaling/cloud migration is a flag flip ("有钱了切 AWS"), not a rewrite.
- **Dual-market ready**: serve China + overseas, but **default to single-market** so the boilerplate stays simple.

### Non-Goals (this iteration)
- Building a full multi-region active-active topology (we make it *possible*, not *default*).
- Migrating `studio` (Sanity-hosted) or `storybook` (build artifact) — they are external/static.
- Re-architecting application business logic. Only deployment topology + the `web` BFF boundary.

---

## 2. Current State (verified 2026-06-04)

| App / Service | Type | API routes | Vercel | Aliyun ECS (PM2) | k8s | Docker image |
|---|---|---|---|---|---|---|
| `landing-page` | Next.js | 13 | ✅ (linked) | ✅ | ✅ | ghcr nebutra-landing-page |
| `web` | Next.js (full-stack) | **64** | configured, not live | ✅ | ✅ | ghcr nebutra-web |
| `design-docs` | Next.js (Fumadocs) | 0 | ❌ | ✅ | ❌ | shared |
| `sailor-docs` | Next.js (Fumadocs) | 0 | ❌ | ✅ | ❌ | shared |
| `idp` | Next.js OIDC server | ~5 | ❌ | ❌ | ❌ | ❌ (not deployed) |
| `gateway` | Hono API | 96+ | ✅ | ✅ | ✅ | ghcr nebutra-api-gateway |
| `python/ai` | FastAPI | REST | ❌ | ❌ | ✅ (only) | ghcr nebutra-ai |
| `studio` | Sanity | — | external | — | — | — |
| `storybook` | build artifact | — | — | — | — | — |

**Key facts**
- 4 deployment pipelines exist: `deploy.yml` (k8s), `deploy-ecs.yml` (Aliyun PM2), `docker-build-push.yml` (images → ghcr + conditional AWS ECR / Aliyun ACR / Tencent TCR), plus Vercel git-integration.
- `vercel.json` exists for `landing-page`, `web`, `gateway`; `.vercel/project.json` links landing.
- Cache (`@nebutra/cache`) already auto-detects `UPSTASH_REDIS_REST_URL` > `REDIS_URL`. Queue (`@nebutra/queue`) already QStash-primary. **`idp` uses raw `ioredis`** (bypasses the abstraction).
- DB on Supabase: Prisma 7 + `@prisma/adapter-pg`, pooled `DATABASE_URL` + `DIRECT_URL`.
- Aliyun ECS is **mainland China**, 2C4G "Lite" — documented cross-border SSH flakiness, disk-full incidents (#141), scp keepalive hacks.

**The problem:** redundant live substrates per service (drift, #141-class incidents, cognitive load) and no clean abstraction for "which substrate".

---

## 3. Target Architecture

| Layer | Default | Switchable to | Notes |
|---|---|---|---|
| **Frontend** (landing, web, design-docs, sailor-docs) | **Vercel** | `standalone` self-host (Aliyun/Docker/Nginx) | edge / preview / ISR |
| **`web` server logic** | **Layered**: thin BFF → Vercel Functions; heavy → gateway | — | see §5 |
| **Backend** (gateway, python/ai) | **`ecs-pm2`** (Aliyun) | **`k8s`**, **`aws`** (ECS/Fargate or EKS), (fly/railway later) | all three first-class adapters; one active |
| **Database** | **Supabase** | Prisma adapter swap (Neon/RDS) | unchanged |
| **Cache + Queue** | **Upstash** (REST + QStash) | self-host Redis / BullMQ | converge `idp` into `@nebutra/cache` |
| **Market** | **single** | **dual** (region overlay) | Vercel CN-reachability handled via `standalone` CN edge when dual |

---

## 4. Deployment-Target Abstraction (the core)

A new **switchable deployment dimension**, modeled exactly like the existing provider abstractions.

### 4.1 Selector
- One env/preset key per service: `DEPLOY_TARGET_<SERVICE>`.
  - Frontends accept `{ vercel, standalone, cloudflare-pages, railway }`.
  - `gateway` accepts `{ cloudflare-workers, vercel-functions, ecs-docker, k8s, aws, railway }`.
  - `python-ai` accepts `{ ecs-docker, k8s, aws, railway }`.
  - Defaults (when unset): frontends → `vercel`; `gateway` → `cloudflare-workers`; `python-ai` → `ecs-docker`.
- Surfaced through the existing **preset system** (`packages/ops/preset`) so a scaffold picks a coherent set; documented in one place.

### 4.2 Adapters (all retained, only one active)
Each backend adapter is a **gated CI job + its manifest**, none of which fire unless selected:
- `ecs-pm2` → `deploy-ecs.yml` (PM2/SSH; already the cheapest path)
- `k8s` → `deploy.yml` + `infra/iac/k8s/**` + `docker-build-push.yml`
- `aws` → new `deploy-aws.yml` (ECS/Fargate via the image already pushable to ECR) + IaC stub

Each adapter job begins with a guard:
```yaml
if: vars.DEPLOY_TARGET_GATEWAY == 'k8s'   # dormant unless explicitly selected
```
The **shared build artifact** (Docker image, or Next standalone bundle) is produced once; adapters only differ in *where it lands*. Switching target = change one repo/env variable, no code change.

### 4.3 Governance rule (drift killer)
- **Exactly one `active` substrate per service per environment.** A CI guard (architecture test) asserts that for each service, at most one deploy adapter is enabled for a given env — preventing the current gateway-on-3-substrates situation from recurring.
- `python/ai` joins this abstraction (today k8s-only) so all backends are uniform.
- Dormant adapters stay in-repo as **documented, tested, ready-to-activate** paths — that is the "可切 DX", not parallel-live pipelines.

### 4.4 Why all three (per decision)
ECS-PM2 (cheap MVP) ↔ k8s (elastic scale) ↔ AWS (managed cloud) are the three substrates a SaaS realistically graduates through. Keeping all three as switchable adapters — with a cheap default — gives boilerplate users the upgrade path without forcing the ops cost upfront.

---

## 5. `web` Layering (thin BFF vs gateway)

`web` has 64 API routes. We split, not lift-and-shift.

**Stays on Vercel (thin BFF Functions):** read-only session/identity reads, response aggregation/shaping, form/input validation, ISR revalidation hooks, lightweight per-request glue. Latency-tolerant, no secrets beyond session.

**Moves to / lives in gateway (ECS):** authn/authz enforcement, billing, AI inference + long-running tasks, DB writes, webhook receivers, anything holding privileged secrets or needing the backend's region.

**Governance:** a written rule + lint guard classifies an API route as "BFF-eligible" vs "must-be-gateway" (heuristics: imports vault/billing/db-write, calls AI, runtime > Ns). Documented in CLAUDE.md. This is iterative — existing routes are migrated on-touch, not in a big bang, with the lint guard preventing new heavy logic from landing on Vercel.

---

## 6. Cache / Queue Convergence (Upstash)

- Make **Upstash the documented default** for cache + queue across all envs (code already auto-detects it).
- **Converge `idp`'s raw `ioredis`** onto `@nebutra/cache` so every surface goes through the switchable abstraction (no bypass).
- `python/ai` uses `redis` (ioredis-equiv) — point it at Upstash via env or a thin shared helper; keep self-host Redis as the switchable fallback.
- **Dual-market caveat:** Upstash region must be chosen per market; default single-region. Backend in mainland China hitting global Upstash is a latency consideration captured in the region overlay.

---

## 7. Dual-Market (default single, optional overlay)

- **Default single-market:** boilerplate scaffolds one region; everything above "just works".
- **Optional `region` overlay** (selected via preset): adds a second backend region + a **China-reachable frontend edge** (since Vercel is unreliable in mainland China → `standalone` CN front via Aliyun/Tencent CDN + ICP filing) alongside the global Vercel front.
- This is *designed-for* now, *implemented* only when a user opts into dual. We will document the overlay shape, not build the second region in this iteration.

---

## 8. Pipeline Convergence (drift elimination)

Target end-state of CI:
- **Frontend:** Vercel git-integration (default) — remove frontends from `deploy-ecs.yml` and `deploy.yml` matrices; their `standalone` path stays as the dormant self-host adapter.
- **Backend:** the three gated adapters (§4.2). `gateway` converges to `ecs-pm2` active (k8s/aws dormant). `python/ai` joins (ecs-pm2 active, was k8s-only).
- `docker-build-push.yml` retained — it feeds k8s/aws adapters and is harmless when those are dormant (image build only).
- Add the **one-active-substrate** architecture test (§4.3).

---

## 9. Migration Phases (high level — detail in implementation plan)

1. **Abstraction skeleton:** define `DEPLOY_TARGET_*` selector + preset wiring + the one-active-substrate guard test. No behavior change yet.
2. **Frontend → Vercel:** make `web`/`design-docs`/`sailor-docs` Vercel-deployable (configs, env, crons), remove them from ECS/k8s matrices, keep `standalone` dormant.
3. **Backend adapters:** gate `deploy-ecs.yml` (ecs-pm2) + `deploy.yml` (k8s) behind selector; add `deploy-aws.yml`; bring `python/ai` into the abstraction (add ecs-pm2 path).
4. **`web` BFF boundary:** write the BFF-vs-gateway rule + lint guard; migrate heavy routes on-touch.
5. **Cache convergence:** Upstash defaults everywhere; converge `idp` ioredis + `python/ai` redis onto the switchable abstraction.
6. **Dual-market overlay (docs + optional):** document the region overlay; leave implementation behind the opt-in.
7. **Cleanup:** retire redundant live triggers; finalize docs in CLAUDE.md + a `docs/architecture/` ADR.

---

## 10. Risks & Rollback

| Risk | Mitigation |
|---|---|
| Vercel unreachable in mainland China (dual-market) | `standalone` CN edge overlay + CDN/ICP; default single-market avoids it |
| Cross-border latency: Vercel front ↔ Aliyun backend | Layered BFF keeps chatty/light logic on Vercel; heavy single round-trips to gateway; region overlay when dual |
| Switching target breaks an env | Adapters are additive + gated; default unchanged; each adapter validated before flip; rollback = reset the selector var |
| `web` route mis-classified as BFF | Lint guard + on-touch migration; no big-bang |
| `idp`/`python` cache migration regressions | Keep self-host Redis fallback switchable; migrate behind the existing auto-detect |

**Rollback:** every change is gated by a selector variable defaulting to today's behavior; reverting a target is a variable change, not a redeploy of code.

---

## 11. Testing / Verification
- Architecture test: one-active-substrate-per-service guard (extends `tests/architecture/`).
- Each adapter: a dry-run / lint of its workflow + manifest validity.
- BFF lint guard: route-classification rule in `pnpm lint`.
- Cache: existing provider auto-detect tests extended to cover `idp` + `python/ai` convergence.
- No suppression / `continue-on-error` introduced (carry-over governance rule).

---

## 12. DB / ORM layer — switchability decisions (recorded 2026-06-04)

These were investigated and decided during implementation. Recorded here so they
are not re-litigated.

### 12.1 DB provider switchable (Supabase / Neon / self-host Postgres) — ✅ already abstracted, no work
- `@nebutra/db` exposes only `getTenantDb` / `getSystemDb`; the connection layer is
  `createPgPool` (`@nebutra/db/pool`) + `@prisma/adapter-pg`, driven by `DATABASE_URL`
  (+ `DIRECT_URL` for DDL). 97 consumers go through this — none pin a provider.
- Switching Supabase ↔ Neon ↔ self-host Postgres is **just `DATABASE_URL`**, already
  proven (main = Supabase, `tsekaluk-dev` = Neon). Non-Postgres (MySQL/SQLite) = swap the
  Prisma adapter. **Action: document only.** No abstraction work needed.
- `apps/tsekaluk-dev` is **not** a bypass: its `prisma.ts` uses the shared `createPgPool`
  + adapter-pg + `DATABASE_URL` (provider abstracted). Its own schema/generated client is
  *correct* — a personal-portal data model (Guestbook/NowEntry/Feedback + Better Auth),
  unrelated to the SaaS multi-tenant schema. Forcing `@nebutra/db`'s schema on it would be wrong.

### 12.2 ORM switchable (Prisma ↔ Drizzle) — ⚠️ do NOT build runtime switching
- A *runtime* swappable ORM (both present, flag-selected) is over-engineering: permanent
  abstraction tax for an option almost never exercised; Prisma is deeply woven in
  (`db.<model>.<op>()` across many files).
- **Decision: keep the door open via the repository seam, not a dual-ORM runtime.** A future
  Drizzle swap re-implements repositories, not the whole app. For a boilerplate, the only
  defensible stronger form is *scaffold-time* ORM choice (preset generates Prisma OR Drizzle
  data layer) — a real product investment, deferred until "Drizzle option" is a committed selling point.

### 12.3 Repository seam — selective, not dogmatic
- Seam required for **core, long-evolving domains** (users/teams/permissions/tenancy/identity,
  subscriptions/quota/payments/license/metering, agent runs/exec/logs, file/PDF/object-store tasks).
- **Not** for simple CMS CRUD, config tables, one-off scripts, marketing surfaces, side apps —
  wrapping those in pass-through repositories is over-abstraction.
- Decision test: *"could this data access ever change implementation, or add
  caching / permissions / multi-tenancy / RLS / audit / async workers / external stores?"*
  yes → seam; no → direct Prisma.
- Enforced by `scripts/lint-repository-seam.mjs` (in `pnpm lint`): a **core-domain-scoped,
  shrink-only ratchet**. New core bypasses fail CI; 26 existing core bypasses migrate on-touch;
  everything outside `CORE_SEAM_DOMAINS` is ungoverned. Escape hatch: `// @seam-exempt: <reason>`.
  Full rule in CLAUDE.md → "Data Access — Repository Seam".

### 12.4 Cache — `idp` is not a seam bypass (correction)
- The design's earlier "idp bypasses `@nebutra/cache`" was imprecise. `apps/idp/src/lib/oidc.ts`
  hands a **raw ioredis client to the OIDC provider's state adapter** (`createNebutraOIDCProvider({ redis })`) —
  that needs full Redis semantics, not the cache facade (whose Upstash backend is REST). It already
  uses the standard `REDIS_URL` (which can point at Upstash's TCP endpoint or self-host). **No convergence —
  forcing `@nebutra/cache` here would be wrong.** Phase 5's idp item is dropped.
