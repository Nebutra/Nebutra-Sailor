# Deployment Responsibility Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize deployment so all frontends run on Vercel and all backends run on a *switchable* compute substrate (ecs-pm2 default; k8s + aws as first-class, dormant, selectable adapters), with DB on Supabase and cache/queue on Upstash — while killing the current 3-way deploy drift.

**Architecture:** Introduce a `DEPLOY_TARGET_<SERVICE>` selector (surfaced via the preset system) that gates each deploy adapter behind a CI `if`. Exactly one substrate is active per service per environment, enforced by an architecture test. Frontends move to Vercel git-integration; `web`'s 64 API routes are split into thin BFF (Vercel) vs heavy (gateway) by a lint-guarded rule. Cache/queue converge on Upstash via the existing auto-detect, with `idp`/`python-ai` brought into the abstraction. Dual-market is designed-for (region overlay) but default-single.

**Tech Stack:** GitHub Actions, Vercel, PM2/SSH (Aliyun ECS), Kustomize/k8s, AWS ECS/Fargate, `@nebutra/preset`, `@nebutra/cache` (+ Upstash REST / QStash), Prisma 7 + Supabase, Vitest (architecture tests), Biome + custom lint scripts.

**Reference design:** `docs/plans/2026-06-04-deployment-responsibility-split-design.md`

---

## Pre-flight (read before starting)

- This plan is **infra + CI + config + governance**, not classic feature code. TDD applies where there is real logic (the architecture guard test, the BFF lint guard, the cache-convergence helpers). For CI/config/docs tasks, the "test" is a dry-run / validation command with an expected result.
- **Every change is additive and gated** so the default (today's behavior) never breaks until a selector is intentionally flipped.
- Carry-over governance rule: **no `continue-on-error`, `|| true`, skipped steps, or weakened assertions** to make CI green.
- Commit after every task. Branch off `main` (do not open long-lived branches without need; this repo commits to `main`).
- Each phase ends with a working, testable state.

---

## File Structure (what gets created / modified)

**Created**
- `packages/ops/preset/src/deploy-target.ts` — selector type + resolver + per-service allow-lists.
- `tests/architecture/deploy-target.test.ts` — one-active-substrate-per-service guard + selector validity.
- `scripts/lint-bff-boundary.mjs` — flags heavy logic in `apps/web/src/app/api/**` routes classified as BFF-eligible.
- `.github/workflows/deploy-aws.yml` — AWS ECS/Fargate adapter (gated, dormant by default).
- `docs/architecture/2026-06-04-deployment-substrate-abstraction.md` — ADR.
- `infra/iac/aws/README.md` (+ minimal IaC stub) — AWS adapter manifest placeholder.

**Modified**
- `.github/workflows/deploy-ecs.yml` — gate behind `DEPLOY_TARGET_*`; drop frontends once Vercel is live; add `python-ai` path.
- `.github/workflows/deploy.yml` — gate k8s behind selector.
- `.github/workflows/docker-build-push.yml` — keep image build; ensure ECR/ACR pushes are gated by selected target.
- `apps/web/vercel.json`, `apps/web/next.config.ts` — Vercel deploy + standalone gating (mirror landing).
- `apps/design-docs/`, `apps/sailor-docs/` — add `vercel.json`, gate `output: standalone` behind `NEXT_OUTPUT`.
- `apps/idp/package.json` + idp redis usage — converge onto `@nebutra/cache`.
- `backends/python/ai/` — Upstash cache wiring + ecs-pm2 deploy path.
- `CLAUDE.md` — document the deployment abstraction + BFF boundary rule.

---

## Phase 1 — Abstraction skeleton (no behavior change)

### Task 1.1: Define the deploy-target selector

**Files:**
- Create: `packages/ops/preset/src/deploy-target.ts`
- Test: `tests/architecture/deploy-target.test.ts`

- [ ] **Step 1: Write the failing test** — selector resolves defaults and rejects invalid combos.

```ts
// tests/architecture/deploy-target.test.ts
import { describe, it, expect } from "vitest";
import { resolveDeployTarget, FRONTEND_TARGETS, BACKEND_TARGETS } from "@nebutra/preset/deploy-target";

describe("deploy-target selector", () => {
  it("defaults frontends to vercel, backends to ecs-pm2", () => {
    expect(resolveDeployTarget("web", {})).toBe("vercel");
    expect(resolveDeployTarget("gateway", {})).toBe("ecs-pm2");
  });
  it("honors explicit env override", () => {
    expect(resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "k8s" })).toBe("k8s");
  });
  it("rejects a target not allowed for the surface kind", () => {
    expect(() => resolveDeployTarget("web", { DEPLOY_TARGET_WEB: "k8s" })).toThrow();
    expect(() => resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "vercel" })).toThrow();
  });
  it("exposes the canonical target sets", () => {
    expect(FRONTEND_TARGETS).toEqual(["vercel", "standalone"]);
    expect(BACKEND_TARGETS).toEqual(["ecs-pm2", "k8s", "aws"]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** — `pnpm vitest run --config vitest.arch.config.ts tests/architecture/deploy-target.test.ts` → module not found.
- [ ] **Step 3: Implement `deploy-target.ts`** — export `FRONTEND_TARGETS`, `BACKEND_TARGETS`, a `SERVICE_KIND` map (web/landing/design-docs/sailor-docs/idp→frontend or backend per design; gateway/python-ai→backend), `resolveDeployTarget(service, env)` with defaults + validation, and `DEPLOY_TARGET_ENV_KEY(service)`.
- [ ] **Step 4: Run it, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(preset): add switchable deploy-target selector"`

### Task 1.2: One-active-substrate-per-service guard

**Files:**
- Modify: `tests/architecture/deploy-target.test.ts`

- [ ] **Step 1: Write failing test** — parse the deploy workflows, assert each service's adapter jobs are mutually-exclusively gated by a single `DEPLOY_TARGET_*` var (no service can be unconditionally deployed by two substrates).
- [ ] **Step 2: Run, expect FAIL** (current workflows are ungated → multiple active).
- [ ] **Step 3:** (this guard goes green only after Phase 2/3 gate the workflows) — mark the assertion `it.fails` is NOT allowed; instead scope this test to the *selector contract* now and add the *workflow-gating* assertion in Task 3.4 when the gates exist. Keep this step as: assert the env-key naming contract only.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "test(arch): deploy-target env-key contract"`

### Task 1.3: Wire selector into preset surface

**Files:**
- Modify: `packages/ops/preset/src/index.ts` (export), preset config schema.

- [ ] Add `deployTargets` to the preset schema (per-service, optional, defaulted).
- [ ] Export `deploy-target` from package `exports`.
- [ ] Run `pnpm --filter @nebutra/preset typecheck`. Expected: PASS.
- [ ] Commit — `git commit -m "feat(preset): expose deployTargets in preset schema"`

---

## Phase 2 — Frontends → Vercel

### Task 2.1: Make `web` Vercel-deployable

**Files:**
- Modify: `apps/web/next.config.ts` (gate `output:"standalone"` behind `NEXT_OUTPUT`, mirroring landing), `apps/web/vercel.json` (verify crons, functions memory/maxDuration, regions).

- [ ] Change `output: "standalone"` → `output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined`.
- [ ] Verify `apps/web/vercel.json` crons (invitation/session cleanup) + function config are correct for Vercel.
- [ ] Verify env: `pnpm --filter @nebutra/web build` locally (Vercel-mode, no NEXT_OUTPUT) succeeds.
- [ ] Commit — `git commit -m "build(web): gate standalone output for Vercel-default deploy"`

### Task 2.2: Add Vercel configs for docs apps

**Files:**
- Create: `apps/design-docs/vercel.json`, `apps/sailor-docs/vercel.json`
- Modify: their `next.config.ts` (gate `output:"standalone"` behind `NEXT_OUTPUT`).

- [ ] Add `vercel.json` (framework nextjs) for each.
- [ ] Gate standalone output behind env in both configs.
- [ ] Build each in Vercel-mode locally to confirm.
- [ ] Commit — `git commit -m "build(docs): make design-docs + sailor-docs Vercel-deployable"`

### Task 2.3: Remove frontends from ECS/k8s matrices (Vercel becomes active)

**Files:**
- Modify: `.github/workflows/deploy-ecs.yml` (drop landing/web/design-docs/sailor-docs from build-next + filter + cleanup), `.github/workflows/deploy.yml` (drop web/landing-page from k8s image-set).

- [ ] Remove the frontend entries from the ECS `build-next` matrix and path filters; keep the `standalone` build invocable manually (dormant self-host adapter) but not auto-triggered.
- [ ] Remove frontend deployments from the k8s `kubectl set image` loops.
- [ ] Validate YAML: `python3 -c "import yaml;[yaml.safe_load(open(f)) for f in ['.github/workflows/deploy-ecs.yml','.github/workflows/deploy.yml']]"`.
- [ ] Commit — `git commit -m "ci: frontends deploy via Vercel; drop from ECS/k8s matrices"`

> ⚠️ **Operational pre-req (human):** Vercel projects for `web`, `design-docs`, `sailor-docs` must be linked + env vars set in the Vercel dashboard before merging Task 2.3. Document the required env keys in the ADR (Task 7.2).

---

## Phase 3 — Backend substrate adapters (gated)

### Task 3.1: Gate the ECS adapter behind the selector

**Files:**
- Modify: `.github/workflows/deploy-ecs.yml`

- [ ] Add `if: vars.DEPLOY_TARGET_GATEWAY == 'ecs-pm2' || vars.DEPLOY_TARGET_GATEWAY == ''` to the gateway deploy job (default-active).
- [ ] Validate YAML + commit — `git commit -m "ci(ecs): gate gateway deploy behind DEPLOY_TARGET_GATEWAY"`

### Task 3.2: Gate the k8s adapter

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] Add `if: vars.DEPLOY_TARGET_GATEWAY == 'k8s'` (and analogous for `ai`) so k8s is dormant unless selected.
- [ ] Validate YAML + commit — `git commit -m "ci(k8s): gate deploy behind DEPLOY_TARGET selector"`

### Task 3.3: Add the AWS adapter (dormant)

**Files:**
- Create: `.github/workflows/deploy-aws.yml`, `infra/iac/aws/README.md`

- [ ] Author `deploy-aws.yml` (ECS/Fargate deploy from the image `docker-build-push.yml` already pushes to ECR), gated `if: vars.DEPLOY_TARGET_GATEWAY == 'aws'`.
- [ ] Add minimal IaC stub + README documenting required AWS secrets.
- [ ] Validate YAML + commit — `git commit -m "ci(aws): add dormant ECS/Fargate deploy adapter"`

### Task 3.4: Bring `python/ai` into the abstraction + activate the guard

**Files:**
- Modify: `.github/workflows/deploy-ecs.yml` (add python-ai ecs-pm2 path), `.github/workflows/deploy.yml` (gate ai k8s), `tests/architecture/deploy-target.test.ts`

- [ ] Add a `python-ai` ecs-pm2 deploy path (uvicorn under PM2 or systemd via SSH) gated `DEPLOY_TARGET_PYTHON_AI`.
- [ ] Now implement the **one-active-substrate** assertion deferred from Task 1.2: parse all deploy workflows, assert every service's adapter jobs are each gated by exactly one selector value and no two are simultaneously default-active.
- [ ] Run arch test → PASS. Commit — `git commit -m "ci(ai): unify python-ai under deploy-target + enforce single active substrate"`

---

## Phase 4 — `web` BFF boundary

### Task 4.1: Write the BFF-vs-gateway lint guard

**Files:**
- Create: `scripts/lint-bff-boundary.mjs`
- Test: `tests/architecture/bff-boundary.test.ts`

- [ ] **Step 1: failing test** — given a fixture route importing `@nebutra/vault`/`@nebutra/billing` or doing a DB write, the linter reports it as "must-be-gateway".
- [ ] **Step 2: run, expect FAIL.**
- [ ] **Step 3:** implement `lint-bff-boundary.mjs` — scan `apps/web/src/app/api/**`, classify heavy (imports vault/billing/db-write helpers, calls agents/AI, or annotated `// @gateway`) vs BFF-eligible; exit non-zero on a heavy route lacking a `// @gateway-exempt` justification.
- [ ] **Step 4: run, expect PASS** on fixtures.
- [ ] **Step 5: commit** — `git commit -m "feat(lint): web BFF-vs-gateway boundary guard"`

### Task 4.2: Wire guard into `pnpm lint` + document rule

**Files:**
- Modify: root `package.json` (`lint` script), `CLAUDE.md`

- [ ] Append `node scripts/lint-bff-boundary.mjs` to the `lint` script.
- [ ] Document the BFF boundary heuristics in CLAUDE.md (what may live on Vercel vs gateway; on-touch migration policy).
- [ ] Run `pnpm lint` → record current heavy routes as a shrink-only allowlist (ratchet, like the OpenAPI debt). Commit — `git commit -m "chore(lint): enforce BFF boundary + document rule"`

> Note: route migration itself is **on-touch / incremental** — not a big-bang task. The guard prevents *new* heavy logic on Vercel; existing heavy routes are tracked in the allowlist and migrated to gateway as they are next modified.

---

## Phase 5 — Cache / Queue convergence (Upstash)

### Task 5.1: Converge `idp` onto `@nebutra/cache`

**Files:**
- Modify: `apps/idp/**` (replace raw `ioredis` usage), `apps/idp/package.json` (drop direct `ioredis` if fully replaced)
- Test: existing idp tests + `@nebutra/cache` provider tests

- [ ] **Step 1: failing test** — idp cache calls route through `@nebutra/cache` (mock Upstash auto-detect).
- [ ] **Step 2: run, expect FAIL.**
- [ ] **Step 3:** replace raw `ioredis` calls with `@nebutra/cache` API; keep self-host Redis switchable via existing auto-detect.
- [ ] **Step 4: run, expect PASS** + `pnpm --filter @nebutra/idp typecheck`.
- [ ] **Step 5: commit** — `git commit -m "refactor(idp): use @nebutra/cache (Upstash-default, Redis-switchable)"`

### Task 5.2: Point `python/ai` cache at Upstash (switchable)

**Files:**
- Modify: `backends/python/ai/**` redis client init, `.env.example`

- [ ] Make the python redis client read `UPSTASH_REDIS_REST_URL` (REST) with `REDIS_URL` fallback (mirror the TS auto-detect order).
- [ ] Update `.env.example` + run python tests (`pytest`) for the cache path.
- [ ] Commit — `git commit -m "refactor(ai): Upstash-default cache with Redis fallback"`

### Task 5.3: Document Upstash as default across envs

**Files:**
- Modify: `.env.example` files, ADR

- [ ] Ensure `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are documented defaults; `REDIS_URL` is the switchable fallback.
- [ ] Commit — `git commit -m "docs(cache): Upstash default, Redis switchable"`

---

## Phase 6 — Dual-market overlay (docs + opt-in only)

### Task 6.1: Document the region overlay

**Files:**
- Modify: `docs/architecture/2026-06-04-deployment-substrate-abstraction.md`

- [ ] Document: default single-market; opt-in dual-market adds (a) a second backend region selector value, (b) a `standalone` China-reachable frontend edge (Aliyun/Tencent CDN + ICP) alongside global Vercel, (c) per-market Upstash region.
- [ ] **Do not implement** the second region in this iteration — only the documented shape + preset flag placeholder.
- [ ] Commit — `git commit -m "docs(deploy): dual-market region overlay (opt-in, design only)"`

---

## Phase 7 — Cleanup, ADR, governance

### Task 7.1: Verify no service has two active substrates

- [ ] Run `pnpm vitest run --config vitest.arch.config.ts tests/architecture/deploy-target.test.ts`. Expected: PASS (single active per service).
- [ ] Manually confirm `docker-build-push.yml` only builds images (harmless when k8s/aws dormant) and its ECR/ACR pushes are gated by the active target.

### Task 7.2: ADR + CLAUDE.md finalization

**Files:**
- Create: `docs/architecture/2026-06-04-deployment-substrate-abstraction.md`
- Modify: `CLAUDE.md`

- [ ] Write the ADR: the abstraction, defaults, adapter table, governance rule, required env/secrets per target, operational pre-reqs (Vercel project linking, AWS secrets).
- [ ] Add a "Deployment" section to CLAUDE.md referencing the ADR + the selector keys.
- [ ] Commit — `git commit -m "docs(adr): deployment substrate abstraction"`

### Task 7.3: Full verification sweep

- [ ] `pnpm lint` (incl. BFF guard) → PASS.
- [ ] `pnpm vitest run --config vitest.arch.config.ts` (arch tests) → PASS.
- [ ] `pnpm --filter @nebutra/web build` (Vercel-mode) → PASS.
- [ ] YAML-validate all touched workflows.
- [ ] Confirm defaults unchanged from a fresh-checkout perspective (no selector set → ecs-pm2 backends + Vercel frontends).
- [ ] Commit any fixes — `git commit -m "chore: deployment split verification sweep"`

---

## Done-When
- Frontends deploy via Vercel; removed from ECS/k8s auto-matrices (standalone dormant).
- Backends deploy via the selected substrate; default `ecs-pm2`; k8s + aws are gated dormant adapters; `python-ai` unified.
- Arch test enforces exactly one active substrate per service.
- `web` BFF boundary lint guard live + documented; heavy routes tracked as shrink-only allowlist.
- Cache/queue default Upstash everywhere; `idp` + `python-ai` no longer bypass the abstraction.
- Dual-market overlay documented (opt-in), not implemented.
- ADR + CLAUDE.md updated. No `continue-on-error`/skips introduced.
