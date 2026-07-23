# Nebutra Router & Forge — Design

**Date:** 2026-07-23  
**Status:** Approved (product philosophy & architecture boundaries)  
**Brand:** Nebutra (not Nebula)  
**Hosts:** `router.nebutra.com` · `forge.nebutra.com`  
**Related:** `docs/DOMAINS.md`, `backends/gateway` AI gateway routes, `packages/ai/*`, ADR TS-by-default  

**Follow-ons:**

- [Forge F0 catalog & OSS map](./2026-07-23-nebutra-forge-f0-catalog.md)  
- [Implementation plan](./2026-07-23-nebutra-router-forge-implementation-plan.md)  
- **[SOTA Quality Playbook](./2026-07-23-nebutra-sota-quality-playbook.md)** — mandatory 5-step research + ship gates for tools & platform

---

## 1. Goal

Ship two peer cloud products under Nebutra:

| Product | Host | Role |
|---------|------|------|
| **Nebutra Router** | `router.nebutra.com` | Model Fabric — multi-supply AI API relay (OpenAI-compatible), prepaid wallet, Agent-ready contracts |
| **Nebutra Forge** | `forge.nebutra.com` | Internet Swiss-army **tool station** (SEO + ads + humans) **and** Agent tool OS — same capabilities, dual surface |

They share identity, tenant, and wallet language with the rest of Nebutra. They are **not** a rebrand of New-API UI and **not** a greenfield rewrite of relay engines.

**Success criterion (phase 1):** *Agent-dependable* — stable contracts, idempotency where needed, correct usage metering, clear failure semantics — over early revenue optimization.

**Forge success (strategic):** *Dense, instant, complete* human tool-station feel (80→250+ tools) **plus** every tool Agent-ready via SOTA open-source engines wrapped in AI-native contracts — not a thin 6-tool demo.

---

## 2. Locked decisions (书记批示)

| # | Topic | Decision |
|---|--------|----------|
| 1 | Product philosophy | **Dual Fabric** — Router and Forge are equal product surfaces |
| 2 | Success metric | **Agent-dependable** first |
| 3 | Org positioning | **Nebutra cloud product line** (Sailor monorepo is foundation + customer) |
| 4 | Supply posture | **Mixed relay** — official API keys, account/subscription pools, peer relays |
| 5 | Market | **CN + Global dual-track** from day one (payments, copy, channel ops) |
| 6 | Open source | **Contracts open; operations closed** (OpenAPI/MCP/SKILL/examples public; routing, margins, channels private) |
| 7 | Human console | **Full relay-station depth** in *Nebutra* UI (keys, wallet, usage, logs, pricing, playground) — not engine admin |
| 8 | Domains | **`router`** + **`forge`** on `nebutra.com` |
| 9 | Engine integration | **Version-pinned container sidecars** — do not vendor/rewrite engines in monorepo |
| 10 | Phase-1 engines | **New-API + Sub2API**; **CLIProxyAPI (CPA) in phase 2** |
| 11 | Billing truth | **Nebutra control plane is source of truth** for customer balance/charges; engine usage = cost & reconciliation |
| 12 | Engine Admin UI | **Internal ops only** (VPN/private network); never C-end |
| 13 | Deploy manifests | Thin tree under **`infra/`** (compose, `versions.lock`, config templates) — no engine source trees |
| 14 | User-facing “groups” | **Not in default UX**; internal supply scheduling may exist later as ops/enterprise option |
| 15 | User journey | **302.ai philosophy** — register → top up → API key → call → ledger/pricing |
| 16 | Wallet | **Pure prepaid balance, pay-as-you-go** (no default monthly plan) |
| 17 | CPA meaning | **CPA = CLIProxyAPI** (account/CLI reverse-proxy pool), not an unrelated acronym |
| 18 | Forge product shape | **Full internet tool-station Swiss army knife** (dense categories, high-frequency micro-tools) — not a sparse Agent demo shelf |
| 19 | Forge quality bar | **Per-tool SOTA** — five-step research (need → competitors → solutions → OSS → **unicorn wheels**); pin best engines; **function-complete is not shippable** (see SOTA playbook) |
| 20 | Forge rebuild lens | **AI-Native dual surface** — every tool is great for humans **and** first-class Agent infrastructure (REST + MCP + SKILL + meter) |
| 21 | Platform quality bar | Router + Forge **journey / UX / ease / AI-native / visual craft** must be professional-grade, not “works in demo” |
| 22 | Honesty metadata | Every tool declares `sota_status`: `scaffold` \| `lab` \| `production`; only `production` may be marketed as SOTA |

---

## 3. Non-goals (phase 1)

- Rewriting New-API / Sub2API / CLIProxyAPI data planes in TypeScript/Go inside Sailor
- Exposing engine login pages or native tokens as the primary customer path
- **Replacing** the tool-station catalog with only “Agent-native” abstractions (Agent layer **adds** to the knife; it does not delete drawers)
- Re-implementing crypto/image/PDF/tokenizers when a maintained OSS SOTA already exists
- Grey-market marketing copy as brand narrative (ops may use mixed supply; product speaks reliability + unified access)
- User-mandatory “economy vs enterprise” group picker at signup
- Perfect multi-engine arbitrage and six-peer smart routing on day one
- Shipping Forge with fewer than a **credible catalog** of everyday tools (empty “platform” shell)

---

## 4. Product principles

### 4.1 Generators vs grid

> **Engines are generators. Nebutra is the grid and the meter.**

- **Generators (do not rebuild):** New-API, Sub2API, later CLIProxyAPI — battle-tested provider coverage, streaming, pools, channel ops.
- **Grid & meter (must build):** auth, prepaid wallet, customer API keys, public contracts, model cards, Forge tools, Nebutra console UX, audit, margin ledger.

### 4.2 AI-native without abandoning humans

- **Primary consumers:** agents, SDKs, IDE agents (OpenAI-compatible / Anthropic-compatible where exposed).
- **Human console:** 302-style ops surface (wallet, keys, usage, price list, playground) — polished Nebutra design system, not engine chrome.
- **Machine contracts:** OpenAPI + (Forge) MCP + SKILL.md; progressive discovery; stable error codes; `request_id` on every call.

### 4.3 Shell / engine boundary

```text
Customer / Agent
       │
       ▼
┌──────────────────────────────┐
│  Nebutra control plane         │
│  router.* / forge.*            │
│  auth · wallet · sk · S3-ops*  │
│  contracts · console UI        │
└──────────────┬───────────────┘
               │ private network only
       ┌───────┴────────┐
       ▼                ▼
 ┌──────────┐    ┌──────────┐
 │ New-API  │    │ Sub2API  │   (+ CPA phase 2)
 │ channels │    │ sub pool │
 └──────────┘    └──────────┘
```

\*Internal supply policy only; not default user concept.

---

## 5. Nebutra Router

### 5.1 External surface

| Surface | Description |
|---------|-------------|
| `https://router.nebutra.com/v1` | OpenAI-compatible API (chat completions + stream minimum; expand per engine capability) |
| `GET /v1/models` | Machine-readable catalog (aliases, pricing hints, capability flags) |
| Console | Register/login (Nebutra auth), top-up, API keys, balance, usage, API logs, pricing, playground |
| Docs | Three-minute SDK / Cursor / Claude Code quickstarts |

Customer mental model (302-like):

```text
Base URL  = https://router.nebutra.com/v1
API Key   = sk-… (Nebutra-issued)
Wallet    = prepaid balance, pay-as-you-go
```

### 5.2 Supply classes (internal)

| Class | Name | Examples | Notes |
|-------|------|----------|-------|
| **A** | Official API | Provider keys, Azure/Bedrock-style | Highest compliance narrative |
| **B** | Account / subscription relay | Sub2API (phase 1); CLIProxyAPI (phase 2) | Cost capacity; higher operational risk |
| **C** | Peer relay | Other New-API-compatible stations, OpenAI-compatible peers | Elasticity; health + balance probes required |

All classes terminate behind Router. Customers do not choose class by default.

### 5.3 Phase-1 engine topology

| Engine | Role | Customer-visible? |
|--------|------|-------------------|
| **New-API** | Channel hub: official keys, peer relays, model channels, ops tooling | No |
| **Sub2API** | Subscription → API pool (B-class) | No |
| **CLIProxyAPI** | CLI/OAuth account reverse proxy (B-class) | Phase 2 |

**Integration mode:** pull **published container images**, pin digests/tags in `infra/.../versions.lock`. Configure via env/files. Talk over HTTP from Nebutra Adapter.

**Forbidden by default:** long-lived hard forks, vendoring full engine source into `packages/`, rewriting provider matrices.

**Exception path:** short-lived patch fork only if production-blocking and upstream unresponsive; must have expiry and “merge upstream or drop” date.

### 5.4 Control-plane responsibilities (Nebutra-owned)

- Issue/revoke customer API keys; map request → wallet + policy
- Prepaid top-up (CN + Global payment rails), balance checks, 402 on insufficient funds
- Model alias table (public model id → engine channel/model)
- Stream passthrough with minimal buffering (P99 dominated by upstream, not shell)
- Async or edge-safe usage recording; **customer ledger in Nebutra**
- Supply cost events from engine usage for margin / reconciliation
- Health checks and failover **across configured engines/channels** (policy in shell; execution still via engines)
- Ops visibility: which supply path served a request (customer-facing optional/redacted)

### 5.5 Wallet & billing (decision 11 + 16)

| Concern | Owner |
|---------|--------|
| Customer balance, top-ups, debits, invoices | **Nebutra** |
| Per-request customer charge | **Nebutra** (from metered tokens/calls + public price card) |
| Engine-reported usage | **Cost basis / reconciliation** |
| Engine internal user systems | **Not** the customer identity source |

**Default plan shape:** pure prepaid, no monthly subscription required.

### 5.6 User journey (302 philosophy)

1. Land on Router marketing or console entry  
2. Register / login via Nebutra auth (`auth.nebutra.com` or product-local RP)  
3. Top up wallet (CN WeChat/Alipay + Global cards as dual-track)  
4. Create API key  
5. Copy Base URL + Key + example model  
6. Use from Agent / SDK / IDE  
7. Inspect balance, usage ledger, API logs, model prices  
8. Optional: in-console playground / debug  

**Not in default journey:** pick supply group, open New-API UI, hold engine-native tokens.

### 5.7 Internal scheduling (not user groups)

Platform may later attach keys or tenants to internal policies (e.g. prefer class A). Phase 1 default: **single product path**; ops configures channel priority inside engines + thin adapter policy. No signup step for “default vs enterprise.”

### 5.8 Reuse of existing Sailor pieces

| Existing | Use |
|----------|-----|
| `backends/gateway` AI gateway routes, `sk-sailor-*`, usage enqueue | Evolution target / patterns for Router data path |
| `@nebutra/gateway-core` | Pipeline, streaming usage extract |
| `@nebutra/metering`, billing packages | Customer metering language |
| `@nebutra/vault` | Store engine secrets & provider keys |
| `@nebutra/ai-providers`, `@nebutra/agents` | Metadata + runtime patterns (Router is product edge, not only in-process SDK) |
| `docs/DOMAINS.md` | Register `router` / `forge` when DNS cutover is planned |

---

## 6. Nebutra Forge

### 6.1 Positioning (strategic)

Forge is a **strategic growth + infrastructure product**:

1. **Internet Swiss army knife** — the dense, instant, “I need this in 30 seconds” tool station (SEO landers, ad campaigns, habitual human traffic).  
2. **Agent infrastructure** — the **same** tools, rebuilt so agents can discover, invoke, meter, and compose them.  
3. **SOTA without vanity R&D** — quality comes from **adopting open-source SOTA solutions** (formatters, PDF/image pipelines, tokenizers, converters) that already ship good UX and edge-case coverage; Nebutra invests in **productization, dual surface, brand, wallet, and contracts**.

> **Cover the full tool-station drawer set.  
> Make each blade SOTA by standing on OSS.  
> Re-cut every blade AI-Native so humans and Agents share one capability.**

### 6.2 Doctrine: three rules

| Rule | Meaning |
|------|---------|
| **Cover** | Match real tool-station taxonomy (text, codec, hash, JSON, time, image, PDF, A/V light, network, frontend, units, life calculators, CN validators, convert matrix, generators…) — density **80 → 150–250+** for “knife feel” |
| **SOTA via OSS** | Per tool: survey maintained open-source SOTA (or de-facto standard lib), pin version, wrap — **do not** re-derive algorithms or rebuild mediocre half-clones |
| **AI-Native rebuild** | Human UX (search, categories, instant page) **and** machine contract (OpenAPI, MCP, SKILL, meter, errors, jobs) for the **same** capability id |

**Anti-patterns**

| Forbidden | Why |
|-----------|-----|
| Six demo tools called “platform” | No Swiss-army feel; no SEO flywheel |
| NIH: rewrite PDF/image stack “for fun” | Drift, worse UX, endless bugs |
| Human-only pages with no API path for core tools | Misses Agent OS mission |
| Agent-only APIs with ugly/no human entry | Misses SEO/ads mission |
| Thin programmatic spam pages | Hurts brand and SEO quality |

### 6.3 Dual surface (one capability, two readers)

```text
                    ┌─────────────────────────────┐
                    │  Capability registry          │
                    │  id · schema · engine · meter │
                    └──────────────┬────────────────┘
               ┌───────────────────┼───────────────────┐
               ▼                                       ▼
    ┌─────────────────────┐               ┌─────────────────────┐
    │ Human surface         │               │ Agent surface         │
    │ forge…/t/{slug}       │               │ POST /v1/tools/…      │
    │ search · categories   │               │ MCP · SKILL.md        │
    │ SEO · ads landers     │               │ jobs · webhooks       │
    │ free tier / wallet    │               │ API key · wallet      │
    └─────────────────────┘               └─────────────────────┘
```

Site IA (human “knife drawer”):

```text
forge.nebutra.com/
  /                      search + category grid + hot + recent
  /t/{category}          category hub
  /t/{slug}              single tool (primary SEO URL)
  /t/{slug}/api          machine contract docs for same tool
  /all  /hot  /new
  /zh|en/...             locales
```

Homepage must feel like a **tool station** (big search + category cards), not a SaaS hero for “Agent Fabric.”

### 6.4 SOTA engine policy (same spirit as Router sidecars)

For each tool or tool cluster:

1. **Pick** a maintained OSS SOTA (lib or service) with real adoption and acceptable license.  
2. **Pin** version/digest; document choice in tool metadata (`engine`, `upstream`, `license`).  
3. **Wrap** — input/output schema, limits, privacy (local-first when pure client), errors, metering.  
4. **Skin** — Nebutra UI patterns; keep interaction quality ≥ common OSS demos (they are often already good — preserve, don’t invent worse).  
5. **Expose** Agent surface without a second implementation.

Illustrative mapping (final picks at implementation; principle is fixed):

| Cluster | Prefer OSS SOTA class (examples of *kind*) |
|---------|-----------------------------------------------|
| Markdown | Established MD parsers / renderers |
| PDF | Mature PDF merge/split/compress stacks |
| Image | Sharp / libvips-class pipelines; specialized OSS for vectorize etc. |
| JSON/YAML | Ecosystem-standard parsers + formatters |
| Hash/crypto | Platform / audited crypto libs only |
| Diff | Battle-tested diff libraries |
| Token count | Official or widely used tokenizers per family |
| Office convert | Proven converters / headless stacks where needed |

Reuse Nebutra packages when they already own a capability (`document-pipeline`, `image-pipeline`, `tool-registry`, `mcp`, …); still **back** them with SOTA engines rather than toy logic.

### 6.5 AI-Native rebuild checklist (ship gate)

A tool is not “done” until:

| # | Gate |
|---|------|
| 1 | Human page: instant use, clear empty/error states, mobile-usable |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) |
| 3 | MCP tool registration (for Agent-eligible tools) |
| 4 | SKILL.md (progressive disclosure: what / when / how / limits) |
| 5 | Meter id + wallet hooks (free tier vs paid limits) |
| 6 | Side-effect class: `pure` \| `read` \| `write` \| `external` |
| 7 | Stable error codes; `request_id` on server paths |
| 8 | Privacy note: client-only vs uploaded; retention |
| 9 | Decl/ads: intent title, unique value, related tools — not doorway spam |
| 10 | Decl engine metadata: upstream SOTA name + version |

**Tiering**

| Tier | Human | Agent API | Note |
|------|-------|-----------|------|
| **Core** | Yes | Yes (full gate) | High frequency + high Agent value |
| **Catalog** | Yes | Optional phase later | Pure client SEO fillers; still quality UX |
| **Job** | Yes | Yes + async job | PDF/video/large files |

### 6.6 Full drawer taxonomy (coverage target)

Forge must **cover** these drawers (Swiss-army completeness). Volume target: **≥80** to call it a station; **150–250+** for competitive density.

| # | Drawer | Examples (non-exhaustive) |
|---|--------|---------------------------|
| 1 | Text | word count, clean lines, replace, 简繁, pinyin, 人民币大写, diff, markdown |
| 2 | Encode/decode | base64, URL, unicode, HTML entities, image↔base64 |
| 3 | Hash/crypto UX | MD5/SHA, HMAC, AES demo, password gen/strength, file checksum |
| 4 | Data formats | JSON/YAML/XML/CSV format & convert, JSON path |
| 5 | Time | timestamp, timezone, cron, 农历 |
| 6 | Image | compress, convert, resize, watermark, 证件照, QR, png→svg |
| 7 | PDF/office | merge/split/compress, pdf↔image, md/html→pdf, office matrix later |
| 8 | A/V light | extract audio, video→gif, light compress |
| 9 | Network/web | IP, UA, DNS, SSL view, CIDR, webhook bin |
| 10 | Frontend/dev | beautify/minify, regex, JWT, UUID, color, SQL format |
| 11 | Unit convert | length/weight/temp/data size/… full converter set |
| 12 | Life/office calc | mortgage, BMI, %, 亲戚称呼, tax estimate (dated) |
| 13 | CN validators | 身份证校验, 手机归属地, bank BIN (validate/lookup only) |
| 14 | Generators | fake data, lorem, random, placeholder images |
| 15 | Convert matrix | programmatic “A→B” pages on shared engines |
| 16 | Agent/LLM blades | token count, cost estimate, schema validate, SKILL lint — **on top of** drawers 1–15 |

Drawers 1–15 create tool-station muscle memory; drawer 16 is the AI-Native edge and Router bridge.

### 6.7 Density & commercial phasing

| Phase | Catalog feel | Focus |
|-------|----------------|-------|
| **F0** | ~40–60 tools + real home IA | Text, codec, hash, JSON, time, dev knives; prove dual-surface pipeline |
| **F1** | ~100+ | Image, PDF core, unit converters, life calcs — **SEO/ads scale** |
| **F2** | ~150–200 | Convert matrix, A/V light, heavier jobs |
| **F3** | 200–300+ | Long-tail + Agent blade depth + Router deep links |

Commercial (aligned with prepaid wallet): free tier limits → login → top-up → higher limits / API; ads allowed on free human tier; **Agent/API path stays clean and metered**.

### 6.8 Shared account with Router

Same Nebutra identity and **same prepaid wallet** language (302-like unified purse). Cross-sell: token/cost tools and docs point at `router.nebutra.com`. Key scopes (`models:*` / `tools:*`) are control-plane detail.

---

## 7. Repository & ops layout

### 7.1 Allowed in monorepo

```text
infra/nebutra-router/          # name can be refined at impl time
  compose.yaml                 # new-api + sub2api + deps
  versions.lock                # image tags/digests
  config/*.template
  README.md                    # upgrade, backup, private-only exposure

# Nebutra-owned code (locations finalized at implementation)
backends/… or packages/…       # control plane, adapters, ledger
apps/…                         # router/forge console if separate apps
```

### 7.2 Not allowed (default)

- Full New-API / Sub2API / CPA source trees under `packages/` or `apps/`
- Customer-facing routes that proxy engine admin HTML
- Divergent long-term forks without governance

### 7.3 Drift control

1. Pin image versions; upgrades are change-managed  
2. Contract tests against compose stack (stream, 401/402, model list, usage shape)  
3. Adapters only: alias, auth map, health, usage normalize — no reimplemented provider matrix  
4. Customer ledger vs engine usage reconciliation alerts  

---

## 8. Security & compliance posture

- Engine admin and engine DB **not** on public internet  
- Secrets in vault / secret manager; audit on credential changes  
- Supply class B (subscription pools) must be **disableable** for enterprise-only policies later  
- Dual-track CN/Global: separate payment and legal copy; **one** API contract family  
- Public narrative: unified model/tool access + reliability; not “bypass subscription” marketing  

---

## 9. Open-source boundary

| Open | Closed |
|------|--------|
| Public OpenAPI for Router/Forge | Channel lists, margins, adapter config |
| Error code catalog, model/tool card schemas | Engine topology, credentials |
| SDK examples, Agent quickstarts | Ops runbooks with internal URLs |
| Optional: adapter *interface* shapes | Concrete commercial routing rules |

---

## 10. Phased delivery

### Phase 0 — Spec & skeleton (this doc)

- Decisions locked; domains documented for later DNS  
- No customer traffic required  

### Phase 1 — Router MVP (Agent-dependable + 302 journey)

- Sidecars: New-API + Sub2API pinned  
- Router shell: auth, prepaid wallet, keys, chat completions stream, `/models`, usage ledger  
- Nebutra console (not engine UI)  
- Adapter + health + alias table  
- Contract tests on compose  

### Phase 1b — Forge F0 (parallel track; do not wait for “perfect Router”)

- Tool-station IA: search, categories, hot/new  
- Capability registry + dual-surface pipeline (page + OpenAPI + MCP + SKILL + meter)  
- **40–60** everyday tools across text/codec/hash/JSON/time/dev (OSS SOTA wraps)  
- ≥1 job tool (e.g. md→pdf) proving async path  
- Shared wallet identity hooks  

### Phase 2

- CLIProxyAPI sidecar (Router)  
- Forge **F1**: image + PDF core + units + life calcs → ~100+ tools; SEO/ads ready  
- Richer ops supply desk (optional; may still use private engine admin)  
- Cross-engine fallback polish  

### Phase 3+

- Forge **F2–F3**: convert matrix, A/V, 200–300+ density, Agent blades deep link Router  
- Stronger dual-track GTM  
- Self-serve enterprise policies without exposing engines  

---

## 11. Relationship to existing `api.nebutra.com`

| Host | Role going forward |
|------|---------------------|
| `api.nebutra.com` | Platform BFF / internal SaaS API; may keep AI helpers for `app` |
| `router.nebutra.com` | **Public product** for model relay brand, SDK defaults, Agent docs |
| `forge.nebutra.com` | **Public product** for tool fabric |

Avoid forcing customers to treat `api` as the OpenRouter-class endpoint. Internal code may share libraries with Router.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Extra hop latency | Co-locate shell and engines; stream passthrough; cache API key auth |
| Engine upgrade breakage | Pin versions; contract tests; staged rollout |
| Ledger drift vs engine | Nebutra truth + reconciliation jobs |
| Supply ToS / ban risk on class B | Internal only; kill-switch; enterprise can stay A/C |
| Scope creep (rebuild engines) | This doc’s non-goals; review rejects “just rewrite New-API” |
| Ugly/redundant engine features leak to UX | Product console is sole C-end; engines private |

---

## 13. Implementation plan trigger

This document is the **approved design**. Implementation planning should:

1. Update `docs/DOMAINS.md` when DNS is scheduled  
2. Scaffold `infra/nebutra-router` (or final path) with locked images  
3. Define Adapter interfaces + customer ledger schema  
4. Ship Router phase 1 before deep Forge catalog  
5. Follow monorepo TDD / package AGENTS.md rules  

Do **not** start by forking engine UIs or copying full upstream source into the monorepo.

---

## 14. Decision log (session)

| When | Decision |
|------|----------|
| 2026-07-23 | Dual Fabric; Agent-dependable; Nebutra cloud line; mixed supply |
| 2026-07-23 | Domains `router` + `forge` |
| 2026-07-23 | Sidecar engines; no rewrite; contracts open / ops closed |
| 2026-07-23 | Phase-1 engines New-API + Sub2API; CPA later |
| 2026-07-23 | Billing truth on Nebutra shell; engine admin internal; infra thin tree |
| 2026-07-23 | Drop user-facing S3 groups from default UX |
| 2026-07-23 | 302.ai user-journey philosophy |
| 2026-07-23 | Prepaid pure balance pay-as-you-go |
| 2026-07-23 | Brand correction: Nebutra not Nebula; CPA = CLIProxyAPI |
| 2026-07-23 | Forge = full tool-station Swiss army knife + per-tool OSS SOTA + AI-Native dual surface |

---

## 15. One-line summary

**Nebutra Router** is productized model access: 302-style wallet journey outside; New-API + Sub2API (later CLIProxyAPI) as pinned supply engines inside.

**Nebutra Forge** is the internet’s Swiss army knife **and** Agent tool OS: cover every everyday drawer, make each blade SOTA by wrapping open-source best-in-class engines, and rebuild every tool so humans (SEO/ads/UX) and Agents (API/MCP/SKILL/meter) share one capability — never a sparse demo shelf, never NIH rewrites of solved problems.
