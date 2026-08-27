# Nebutra Router & Forge — Implementation Plan

**Date:** 2026-07-23  
**Status:** Ready for execution (no code in this doc)  
**Design:** [2026-07-23-nebutra-router-forge-design.md](./2026-07-23-nebutra-router-forge-design.md)  
**Forge catalog:** [2026-07-23-nebutra-forge-f0-catalog.md](./2026-07-23-nebutra-forge-f0-catalog.md)

---

## 0. Execution principles

1. **Two tracks in parallel** after shared foundations: **Router** and **Forge** — do not serialize Forge behind “perfect Router.”  
2. **Generators not rewritten** — New-API / Sub2API (later CPA) as pinned sidecars; tool engines as pinned OSS libs.  
3. **Nebutra owns** wallet, keys, UX, contracts, dual surface.  
4. **TDD** for control-plane and tool pure functions; contract tests against compose.  
5. **Brand:** Nebutra only; domains `router` / `forge`.

---

## 1. Workstream map

```text
WS0  Shared foundation (auth, wallet, keys, metering hooks, monorepo apps skeleton)
 ├─ WS1  Router supply sidecars + adapter + 302 journey MVP
 └─ WS2  Forge capability runtime + F0 catalog + tool-station IA
WS3  DNS / docs / dual-track payments hardening
WS4  F1 Forge density + Router CPA + growth
```

---

## 2. WS0 — Shared foundation

**Goal:** One identity + prepaid wallet + API key model both products can use.

| Step | Task | Done when |
|------|------|-----------|
| 0.1 | Confirm auth path (`auth.nebutra.com` RP vs product-local) for router/forge consoles | ADR note in design or short addendum |
| 0.2 | Prepaid wallet ledger schema (balance, top-up, debit, currency dual-track) | Migration + unit tests |
| 0.3 | API key model (`sk-…`, hash at rest, scopes `models`/`tools`/both) | CRUD + auth middleware tests |
| 0.4 | Usage event envelope (customer charge vs supply cost fields) | Shared type + tests |
| 0.5 | Scaffold apps: `apps/router` (or agreed name), `apps/forge` — Next 16, tokens, layout shell | `pnpm dev` boots empty IA |
| 0.6 | OpenAPI skeleton packages for public `/v1` | Spec lint in CI |

**Exit:** Can create user → top-up (mock provider OK) → issue key → 402 without balance on metered call.

---

## 3. WS1 — Router MVP

**Goal:** Agent-dependable OpenAI-compatible edge + 302 console; engines private.

### 3.1 Infra

| Step | Task | Done when |
|------|------|-----------|
| 1.1 | `infra/nebutra-router/compose.yaml` + `versions.lock` for **New-API** + **Sub2API** + redis/db | `compose up` healthy internal-only |
| 1.2 | Network policy docs: engines not on public ingress | README + firewall checklist |
| 1.3 | Seed A-class channel (official key) + B-class Sub2API path in **private** engine admin | Internal smoke chat works **via engine** |

### 3.2 Control plane

| Step | Task | Done when |
|------|------|-----------|
| 1.4 | Supply Adapter interface (`newapi`, `sub2api`) | Unit tests with mock upstream |
| 1.5 | Model alias table public id → engine model/channel | Config + tests |
| 1.6 | `POST /v1/chat/completions` stream passthrough + auth + balance guard | Contract tests |
| 1.7 | Usage extract → Nebutra ledger debit; engine usage → supply_cost | Integration test |
| 1.8 | `GET /v1/models` from alias catalog | Snapshot test |
| 1.9 | Health + basic failover between configured channels | Failure injection test |

### 3.3 Human product (302)

| Step | Task | Done when |
|------|------|-----------|
| 1.10 | Console: balance, top-up UI (provider stubs), API keys, usage list, price table | E2E happy path |
| 1.11 | Playground (optional thin) | Manual QA |
| 1.12 | Docs: base_url + key quickstart (Cursor / OpenAI SDK / Claude Code if exposed) | Published under docs or router |

**Exit:** External client with Nebutra key can stream chat; wallet debits correctly; never opens New-API UI.

**Out of scope WS1:** CPA, user-facing supply groups, multi-peer arbitrage.

---

## 4. WS2 — Forge F0

**Goal:** Tool-station feel + ~55 tools + dual-surface pipeline; catalog file is source of truth.

### 4.1 Runtime

| Step | Task | Done when |
|------|------|-----------|
| 2.1 | Capability registry (YAML/TS) loading F0 catalog | list/get by id |
| 2.2 | `POST /v1/tools/{id}/invoke` + validation + meter + errors | Tests per Core sample |
| 2.3 | MCP server mirror for Core tools | MCP client smoke |
| 2.4 | SKILL.md generator or hand-authored for Core set | `tool-registry` compatible |
| 2.5 | Job runner for `doc/md-to-pdf` (queue + status + artifact URL) | E2E job |
| 2.6 | Shared pure modules isomorphic client/server where marked Client+API | No dual logic drift |

### 4.2 Human tool station

| Step | Task | Done when |
|------|------|-----------|
| 2.7 | Home: search, category grid, hot, recent | Lighthouse passable, not empty SaaS hero |
| 2.8 | Shared tool page template (IO, run, copy, API tab link) | One layout, N tools |
| 2.9 | Implement F0 tools per [catalog](./2026-07-23-nebutra-forge-f0-catalog.md) | ≥50 routes live |
| 2.10 | Core tools pass 10-point AI-Native gate | Checklist CI or doc audit |
| 2.11 | SEO basics: title/description per tool, zh/en hooks | Sample tools indexed structure |

### 4.3 OSS pin board

| Step | Task | Done when |
|------|------|-----------|
| 2.12 | Add deps for engines in catalog §2; pin versions | lockfile |
| 2.13 | Spike bake-off only for md→pdf | ADR one-pager in plans or package README |
| 2.14 | Each Core tool metadata includes engine name+version | Registry field required |

**Exit:** User can browse/search tools like a station; Agent can invoke ≥25 Core tools; md→pdf job works; token tools mention Router.

---

## 5. WS3 — Production cutover readiness

| Step | Task | Done when |
|------|------|-----------|
| 3.1 | Update `docs/DOMAINS.md` with router/forge rows | Merged |
| 3.2 | DNS + TLS plan (CF) for `router` / `forge` | Runbook |
| 3.3 | Real payment rails dual-track (or phased CN first with Global stub) | Top-up live in staging |
| 3.4 | Observability: request_id, latency, debit failures, engine health | Dashboards/alerts listed |
| 3.5 | Security review: engine isolation, key hashing, upload limits, ReDoS | Checklist signed |

---

## 6. WS4 — Next wave (after MVP)

| Track | Work |
|-------|------|
| Router | CLIProxyAPI sidecar; richer ops; enterprise prefer-official policy (internal) |
| Forge F1 | Image (`sharp`), PDF suite, unit converters, life calcs → ~100+ tools — **Done** (host registry ~176) |
| **Forge F2** | **Active** — quality / Processor batch / W4 MVP / F0 residue. Source of truth: [2026-07-31-forge-f2-convergence.md](./2026-07-31-forge-f2-convergence.md). **No tool-count KPI.** |
| Growth | Ad landing templates, programmatic convert matrix with quality bar |
| GTM | Dual-track copy, create-sailor default baseURL optional |

---

## 7. Suggested package / app layout (default; adjust on touch)

```text
apps/router/                 # console + optional BFF routes
apps/forge/                  # tool station Next app
infra/nebutra-router/        # compose + versions.lock + templates
packages/platform/forge-runtime/   # registry, invoke, jobs (name flexible)
packages/…/wallet or commerce     # prepaid ledger if not existing
backends/gateway/            # may host public /v1 for router/forge or edge to apps
```

Follow existing monorepo AGENTS.md; no engine source trees under `packages/`.

---

## 8. Testing strategy

| Layer | Router | Forge |
|-------|--------|-------|
| Unit | Adapter, alias, ledger math | Pure tools, schema validate |
| Contract | OpenAPI chat/models + compose upstream | invoke + job status |
| E2E | Register → top-up mock → key → stream | Home search → tool run → API invoke |
| Arch | Engines not imported as app UI | Registry completeness for Core tier |

---

## 9. Order of first PRs (concrete sequence)

1. **PR-A** Wallet + API key + usage envelope (WS0.2–0.4)  
2. **PR-B** `infra/nebutra-router` compose pin New-API + Sub2API (WS1.1–1.2)  
3. **PR-C** Router adapter + chat completions passthrough (WS1.4–1.7)  
4. **PR-D** Router console 302 thin UI (WS1.10)  
5. **PR-E** Forge registry + invoke + tool page template (WS2.1–2.8)  
6. **PR-F** Forge F0 batch 1: text + codec + hash (~25 tools)  
7. **PR-G** Forge F0 batch 2: data + time + dev + llm blades  
8. **PR-H** md→pdf job + QR + remaining Catalog  
9. **PR-I** Domains doc + staging DNS + contract CI  

PRs A–D and E–H can parallelize after PR-A.

---

## 10. Risks (implementation)

| Risk | Mitigation |
|------|------------|
| Wallet/auth blocked | Mock pay + existing auth; don’t block pure Forge client tools |
| md→pdf flaky | Isolate spike; feature-flag job |
| Catalog too large for quality | Template + Core gate; Catalog tier allowed thinner Agent |
| Engine upgrade break | versions.lock + contract tests |
| Scope creep to CPA/F1 | WS4 only after F0 exit criteria |

---

## 11. Definition of “MVP launchable”

**Router**

- [ ] Prepaid top-up (staging real or sandbox)  
- [ ] Key + stream chat + models list  
- [ ] Ledger truth on Nebutra  
- [ ] Engines internal-only  

**Forge**

- [ ] F0 catalog acceptance (see catalog §8)  
- [ ] Tool-station home IA  
- [ ] Dual surface for Core set  

**Shared**

- [ ] Design decisions unchanged unless new 书记批示  
- [ ] No Nebula naming; no engine UI for C-end  

---

## 12. What “继续” after this plan means

When starting code:

1. Open **PR-A** (wallet/keys) unless blocked — then **PR-B** + **PR-E** in parallel.  
2. Keep catalog YAML as source of truth; avoid hardcoding tool lists in UI only.  
3. Any new tool after F0 must still pass Cover / OSS SOTA / AI-Native gates from the design doc.

---

## 13. Progress log

| Date | Work | Status |
|------|------|--------|
| 2026-07-23 | **PR-A** `@nebutra/prepaid-wallet` — wallet, scopes, UsageEnvelope, `createCreditLedgerWallet` | Done |
| 2026-07-23 | **PR-E** `@nebutra/forge-runtime` — registry, invoke, page model, 13 tools | Done |
| 2026-07-23 | **CreditBalance adapter** via `createCreditLedgerWallet` + tests | Done |
| 2026-07-23 | **`apps/forge`** — home, `/t/[slug]`, invoke API, docs | Done |
| 2026-07-23 | **PR-B** `infra/nebutra-router` compose + versions.lock | Done |
| 2026-07-23 | **DOMAINS.md** router/forge rows | Done |
| 2026-07-23 | **PR-C** `@nebutra/router-supply` + gateway New-API/Sub2API upstreams + `/models` + `models:*` scope | Done |
| 2026-07-23 | **F0 density** ~29 pure tools (core + pure-batch) | Done |
| 2026-07-23 | **F1** md→pdf + image compress/resize/convert (sharp) + job store | Done |
| 2026-07-23 | **Wallet mock** top-up API + `/wallet` page | Done |
| 2026-07-23 | **MCP HTTP** `/api/mcp` tools/list · tools/call | Done |
| 2026-07-23 | **Router ops** seed-env.example + smoke-chat.sh | Done |
| — | Real WeChat/Alipay/card merchants + production DNS | Ops (outside code) |
| — | Long-tail SEO page volume 150–250 | Content scale |  
