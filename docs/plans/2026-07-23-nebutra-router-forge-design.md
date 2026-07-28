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
| 22 | Honesty | Craftsmanship acceptance is an **internal review gate** tracked in tool briefs (`docs/plans/tools/`), never a registry or catalog field; only accepted tools may be marketed as SOTA |

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
| **AI-Native rebuild** | Human UX (search, categories, instant page) **and** machine contract (OpenAPI, MCP, SKILL, meter, errors, jobs) for the **same** capability id. **AI-Native is the contract, not a model call** — a `pure` tool an agent can type-check and meter is AI-Native; a model-backed tool with an opaque schema is not (§6.7.8) |

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
| 11 | **Competitor teardown on file** — brief with named competitors, journey map, captured layout (§6.7.10). No teardown, no ship |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) — the generic form runner is a *fallback*, never the default |

**Tiering**

| Tier | Human | Agent API | Note |
|------|-------|-----------|------|
| **Core** | Yes | Yes (full gate) | High frequency + high Agent value |
| **Catalog** | Yes | Optional phase later | Pure client SEO fillers; still quality UX |
| **Job** | Yes | Yes + async job | PDF/video/large files |

### 6.6 Full drawer taxonomy (coverage target)

Forge must **cover** these drawers (Swiss-army completeness). Volume target: **≥80** to call it a station; **150–250+** for competitive density.

**Inventory snapshot (2026-07):** `@nebutra/forge-runtime` default registry has **≥139** tools (W2/W2b + W3 staples + **W4 long-tail + EXIF**). Engineering categories: text, codec, hash, data, dev, unit, life, image, time, doc, llm, cn. **W1 roots:** every tool resolves `roots[]` (explicit or `roots-defaults`). **Demand hubs:** `/r/{root}` (generator, checker, …) + related-by-root on tool pages.

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

**Triple navigation (must coexist) — AI-Native first:**

| Nav | Serves | Structure |
|-----|--------|-----------|
| **Agent verbs / demand roots** (§6.7) | Models, agents, MCP clients, SEO | Generator / Converter / Checker / … as *callable intents* |
| **Engineering drawers** (this §) | Human browse + code ownership | text / codec / hash / unit / … |
| **Object domains** | Composition & routing | “what payload” (text, pdf, image, id, …) |

Same capability is **triple-tagged** in the registry: drawers place the blade, **roots are the agent verb**, objects are the typed payload. Discovery for agents is **not** “scrape HTML category pages” — it is `tools.json` / OpenAPI / MCP / SKILL with roots + schema.

### 6.7 Demand-root product matrix (AI-Native + Google intent grammar)

> **Source:** “51 个挖掘谷歌需求关键词” demand-mining grammar (Translator, Generator, Converter, …).  
> **Human principle:** demand = **root suffix × concrete object** (e.g. `password` + `generator`) → SEO landers.  
> **AI-Native principle:** the same root is an **agent verb** — deterministic, schema-bound, meterable steps that models *compose* (not pages they scrape).  
> **One-liner:** Forge = *tool matrix organized by intent roots for both search engines and agents* × *one implementation, two readers (H + A), Router for probabilistic steps*.

#### 6.7.0 AI-Native reading of the 51 roots (non-negotiable)

The 51 list is **not** a SEO-only growth cheat sheet. Under AI-Native doctrine (§6.2–6.5):

| Lens | What the root means | Forge must ship |
|------|---------------------|-----------------|
| **Human** | How people type into Google | Title / slug / lander / related tools |
| **Agent** | How models name a *tool call* | Stable `id`, JSON Schema I/O, MCP name, SKILL when/why |
| **Composition** | How agents chain work | Root sequences as default pipelines (see §6.7.4) |
| **Meter** | How wallet bills a step | `meterId` per capability; free tier vs paid; Router for LLM roots |
| **Honesty** | What is deterministic vs model | `pure` / `read` / `write` / `external`; never market LLM noise as “Checker” |

**Agent-first default for Tier S:** if a cell cannot pass §6.5 gates **for agents** (OpenAPI + MCP + errors + meter + side-effect class), it is **not covered** — a pretty human page alone is **scaffold**, not matrix complete.

**Probabilistic vs deterministic split:**

| Kind | Roots (examples) | Where it runs |
|------|------------------|---------------|
| **Deterministic tools** | Generator, Converter, Formatter, Calculator, Checker, Optimizer, Viewer, Extractor, Analyzer, Comparator | Forge runtime (OSS SOTA wrap) — preferred for agents (reproducible) |
| **Probabilistic / generative AI** | Translator, Assistant, “smart” Extractor/Analyzer when LLM-backed | **Router** models + Forge *shell tool* that calls Router with explicit `external` + model meter |
| **Out of Agent OS** | Downloader, Scraper, arbitrary Compiler, Manager/Dashboard | Tier X — do not pollute agent catalogs |

#### 6.7.1 Coordinate system

| Axis | Meaning | Human mapping | Agent mapping |
|------|---------|---------------|---------------|
| **X · Demand root** | Intent verb | SEO title, hubs `/r/{root}`, related-by-root | MCP tool group / verb family; composition alphabet |
| **Y · Object domain** | Payload type | Category cards | Schema `$id` / content-type / field conventions |
| **Z · Delivery surface** | Consumer | **H** page | **A** sync API+MCP · **J** async job+webhook |
| **W · Cognitive class** | Deterministic vs model | Copy & privacy notes | Routing: Forge engine vs Router model |

Cell target state (AI-Native):

```text
[root] × [object]
  → 1 primary capability id (+ 2–4 long-tail variants)
  → H: SEO copy, instant UX
  → A: OpenAPI + MCP + SKILL (Core) + stable errors + request_id
  → meterId + sideEffect
  → optional compose-with: [root′/object′] edges for agent planners
```

Registry metadata (illustrative):

```text
id:           hash/password-generate
slug:         password-generate
category:     hash                 ← engineering drawer
roots:        [generator]          ← demand / agent verb
objects:      [secret, text]
sideEffect:   pure
surfaces:     [human, agent]       ← Core
meterId:      forge.hash.password_generate
seo.en:       "Password Generator"
seo.zh:       "在线密码生成器"
mcp.name:     forge_password_generate
compose.next: [checker/password-strength]   ← optional graph edge
```

#### 6.7.2 Strategic tiering of the 51 roots

**Tier S — main runway (must densify; AI-Native Core by default)**  
High intent; finish-in-one-session; pure/controlled upload; **agents must be able to call without a browser**.

| Root cluster | ~IDs | Intent | Agent role | Audited 2026-07-28 | Matrix goal |
|--------------|------|--------|------------|--------------------|-------------|
| **Generator** | 02 | Create | Produce structured artifacts | **24** — UUID / NanoID / password / QR / lorem / hash family | ≥3 tools/domain; schema outputs agents can pipe |
| **Converter / Convert** | 04, 37 | Transform | Typed I/O transforms | **54** — codec / data / unit / color / time / CN | Lossless where possible; declare lossy in schema |
| **Formatter / Format** | 22 | Beautify | Canonicalize for next tool | **18** — JSON / XML / YAML / SQL / CSS / HTML | Pretty + minify pairs; idempotent |
| **Calculator** | 19 | Compute | Numeric/date pure functions | **28** — mortgage / BMI / units / date / token cost | Pure, unit-tested; no float surprises undocumented |
| **Checker** | 26 | Validate | Gate before write/send | **22** — ID / phone / email / regex / schema | Machine-readable pass/fail + error codes |
| **Verifier** | 42 | Prove | Cryptographic / checksum proof | **4** — id-card, credit-card-luhn, hmac-verify, email-validate | Split from Checker: verifier answers *provably*, not *plausibly* |
| **Optimizer** | 35 | Compress / slim | Cost/size reduction step | **19** — minify family / pdf-compress / image / whitespace | Report metrics (bytes in/out) for agents |
| **Viewer** | 38 | Inspect | Grounding for RAG/pipelines | **19** — JWT / CSV / MD / cron / QR decode | Structured view > screenshot-as-product |
| **Extractor** | 39 | Extract | Structured payload out of blobs | **16** — JSONPath / PDF / docx / xlsx / pptx / URLs | Structured extract; declare partial coverage |
| **Analyzer** | 13 | Analyze | Features / stats / explain | **16** — counts / diff stats / strength / checksum | Prefer deterministic; mark LLM-backed as external |
| **Comparator** | 46 | Diff / compare | CI / eval / change detect | **4** — text-diff, json-diff, hash-compare, string-similarity | Structured diff JSON for agents |

**S-tier KPI:** 11/11 roots present; **≥5 tools/root** — met on 9, **short on Verifier (4) and Comparator (4)**;
**Core H+A same impl**; 100% of tools on `tools.json` + MCP + OpenAPI (landed 2026-07-28).

**Tier A — selective density (Agent-gated by side-effect)**  

| Root cluster | ~IDs | Stance | AI-Native note |
|--------------|------|--------|----------------|
| **Editor** | 09 | Single-screen only | Prefer *transform tools* over free-form editors for agents |
| **Template** | 21 | Lorem, license, gitignore | Generators with fixed schemas — excellent for agents |
| **Detector** | 27 | MIME / encoding / secrets (read-only) | Pre-pipeline gate; never auto-exfiltrate findings |
| **Simulator** | 43 | Cron next-run, timezone only | Pure prediction tools OK; no game sims |
| **Processor** | 10 | Batch pipelines | Map to **J** jobs; progress + webhook for agents |
| **Translator** | 01 | Router/LLM shell | `external` + model meter; cacheable prompts in SKILL |
| **Sender / Notifier** | 15, 41 | mailto / preview only | Agents must not get unconstrained “send email” without product policy |
| **Recorder** | 34 | Default **out** | Privacy + payload; not agent-safe by default |

**A-tier KPI:** deepen 4–5 roots; Agent eligibility explicit in registry (`surfaces` / sideEffect).

**Tier X — non-runway (do not poison agent catalogs)**

| Root cluster | ~IDs | Why out | Policy |
|--------------|------|---------|--------|
| Manager / Dashboard / Planner | 29, 31, 32 | Product shell, not a tool call | Link wallet/docs; **exclude from MCP default list** |
| Uploader / Downloader / Scraper | 18, 06, 28 | Abuse / copyright | No scrapers/downloaders; upload only temp+metered |
| Compiler / Interpreter | 12, 17 | Sandbox | No arbitrary exec; format/lint only |
| Designer / Creator / Maker | 07, 08, 11 | Creative suite | QR/logo-class generators only |
| Navigator / Syncer / Connector | 47–49 | Integration fabric | Out of Forge |
| Assistant | 44 | Chat product | Router / product chat; not a Forge “tool” dumping ground |
| Cataloger / Constructor / Responder | 45, 50, 51 | Platform nouns | Ignore for expansion |

#### 6.7.2a Coverage ledger — all 51 roots (audited 2026-07-28)

Counts are read from the registry (`ForgeRegistry.openDefault()`, 147 tools; the
product host adds `doc/md-to-pdf` → 148). A root's count is the number of tools
carrying that tag, so a tool with two roots is counted under both.

**Verdict at the 2026-07-28 audit: 18 of the 51 entries in scope — 10 dense,
4 thin, 4 empty; the other 33 deliberately out.**

**Updated after W3 landed (same day, 147 → 169 tools):** the four W3 targets all
cleared their bar — Comparator 4 → 8, Verifier 4 → 9, and the two empty roots
opened: Template 0 → 8, Detector 0 → 5. Editor (3) and Simulator (2) remain thin
and were not in W3 scope. Root 01 Translator stays empty on the tag, though a
Router deep-link shell (`llm/router-translate`, `external`) exists tagged
`converter`; it hands off rather than translating, so opening the root honestly
still waits on the §6.7.8 gate. Processor (10) now has a design brief
(`docs/plans/tools/_processor-batch-surface.md`) but no tools — by intent: it is
a shape, and the shape is the batch surface.

| # | Root | Status | Tools | Note |
|---|------|--------|-------|------|
| 02 | Generator | ✅ dense | 24 | |
| 04 | Convert | ✅ dense | 54 | same engine set as 37 |
| 13 | Analyzer | ✅ dense | 16 | |
| 19 | Calculator | ✅ dense | 28 | |
| 22 | Format | ✅ dense | 18 | |
| 26 | Checker | ✅ dense | 22 | |
| 35 | Optimizer | ✅ dense | 19 | |
| 37 | Converter | ✅ dense | 54 | |
| 38 | Viewer | ✅ dense | 19 | |
| 39 | Extractor | ✅ dense | 16 | |
| 09 | Editor | ◐ thin | 3 | image-crop, find-replace-regex, text-replace |
| 42 | Verifier | ◐ thin | 4 | id-card, credit-card-luhn, hmac-verify, email-validate |
| 43 | Simulator | ◐ thin | 2 | dice-roll, cron-explain |
| 46 | Comparator | ◐ thin | 4 | text-diff, json-diff, hash-compare, string-similarity |
| 01 | Translator | ○ empty | 0 | Router-backed `external` shell; the only planned non-`pure` root |
| 10 | Processor | ○ empty | 0 | J surface exists (`/api/v1/jobs` + worker); **no tool is tagged `processor`** |
| 21 | Template | ○ empty | 0 | lorem-ipsum ships but tags as `generator`; license / gitignore / .editorconfig missing |
| 27 | Detector | ○ empty | 0 | MIME / encoding / secret detection — read-only pre-pipeline gate |
| 03 · 20 | Example · Sample | — out | | Content formats, not tool calls |
| 05 | Online | — out | | Query modifier, not a root |
| 06 · 28 · 18 | Downloader · Scraper · Uploader | — out | | Abuse / copyright; upload only as temp+metered input |
| 07 · 08 · 11 | Maker · Creator · Designer | — out | | Creative suite; QR/logo-class only, already under Generator |
| 12 · 17 | Compiler · Interpreter | — out | | No arbitrary exec |
| 14 | Evaluator | — out | | "Website/product evaluator" is SEO bait or an LLM opinion; deterministic parts already live in Analyzer |
| 15 · 16 · 41 | Sender · Receiver · Notifier | — out | | Unconstrained outbound is a product policy question, not a tool |
| 23 · 45 | Builder · Constructor | — out | | App builders; that is the Sailor product, not a blade |
| 24 · 25 | Scheme · Pattern | — out | | Non-technical senses (business plan, knitting) |
| 29 · 31 · 32 · 33 | Manager · Dashboard · Planner · Tracker | — out | | Product shells with state; exclude from agent catalogs |
| 30 · 47 · 48 · 49 | Explorer · Navigator · Syncer · Connector | — out | | Integration fabric / browsing |
| 34 · 40 | Recorder · Monitor | — out | | Needs persistent capture; privacy + payload cost |
| 36 | Scheduler | — out | | Scheduling *product*; cron next-run stays under Simulator |
| 44 | Assistant | — out | | Router / product chat |
| 50 · 51 | Cataloger · Responder | — out | | Platform nouns |

**What the ledger says, plainly:** the deterministic middle of the 51 is
essentially done — the transform/inspect/compute spine (Convert, Generator,
Calculator, Checker, Format, Optimizer, Viewer, Extractor, Analyzer) carries
94% of the inventory. The remaining Forge-shaped work is **8 root slots, not
40**: four thin roots to deepen and four empty ones to open. Everything else on
that poster is either a content format, a product shell, or an abuse surface —
counting it as "uncovered" would misread the map.

**Composition consequence:** `pure` is 146/147 tools, so every pipeline an
agent can assemble today is reproducible end to end. Translator (01) is the one
in-scope root that cannot be pure; it is therefore not a W3 item but a gated
one (§6.7.8), and when it lands it lands as an explicit Router-backed
`external` tool — never quietly emulated inside Forge.

#### 6.7.3 Root × object matrix (coverage map)

Legend: `●` present · `○` priority gap · `–` do not build

| Demand root ↓ / object → | Text | Data/JSON | Dev | Codec | Hash/Sec | Doc/PDF | Image | Time | Life/CN | LLM |
|--------------------------|------|-----------|-----|-------|----------|---------|-------|------|---------|-----|
| **Generator** | ●○ | ● | ● strong | ● | ● password | – | ● QR | – | – | ○ schema mock |
| **Converter** | ● 简繁 | ● strong | ● color/camel | ● strong | – | ● MD/HTML ○Office | ●○ | ● | ● CNY words | – |
| **Formatter** | ● | ● JSON/XML | ● SQL | – | – | ○ | – | – | – | – |
| **Calculator** | ○ word stats+ | – | ● radix | – | – | – | – | ● | ● mortgage/BMI | ● token/cost |
| **Checker/Verifier** | ○ | ○ schema | ● regex | – | ○ | – | – | – | ● ID/phone | ○ |
| **Optimizer** | ○ blank-lines | ○ minify | – | – | – | ○ PDF compress | ● | – | – | – |
| **Viewer** | ● MD preview | ● CSV | – | ● JWT | – | ○ PDF view | ○ | – | – | – |
| **Extractor** | ○ | ● JSONPath | – | ○ | – | ○ PDF text | ○ EXIF | – | – | – |
| **Analyzer** | ● count/diff | ○ | ○ | – | ○ checksum | – | – | – | – | ○ |
| **Comparator** | ● diff | ○ JSON diff | – | – | ○ | – | ○ | – | – | – |
| **Editor** | ○ light | ○ | – | – | – | – | ○ crop | – | – | – |
| **Translator** | ○ | – | – | – | – | – | – | – | – | ○ via Router |
| **Downloader/Scraper** | – | – | – | – | – | – | – | – | – | – |

**Expansion order (SEO × Agent overlap):**  
1. **Generator × {Dev, Sec, Image}** — cheap pure calls, high agent reuse  
2. **Converter × {Data, Codec, Doc}** — pipeline glue for agents  
3. **Checker / Optimizer / Comparator** — gates and eval loops for agent workflows  
4. **Extractor (structured)** — grounding before Router LLM steps  

#### 6.7.4 Dual surface + composition (H / A / J)

| Tool shape | Human (H) | Agent (A) | Metering | Examples |
|------------|-----------|-----------|----------|----------|
| **Core pure** | Primary SEO keyword + instant run | Sync API + MCP **required** | Free tier → wallet | UUID, JSON format, Base64 |
| **Catalog pure** | Long-tail SEO | API optional phase-2 | Near-free | Sort lines, strip blanks |
| **Job / write** | Upload progress + download | Async job + webhook + poll | Per call / MB | PDF merge, bulk image |
| **External / LLM** | “via Router” honesty | Key + model meter; never silent | Router ledger | Translate, smart extract |

**Rule:** Tier S new tools default **Core (H+A same engine wrap)**. If H and A cannot share one implementation, it is not Tier S.

**Default agent compositions** (planner hints / SKILL “when to chain” — not hard-coded workflows only):

```text
ingest → Extractor/Viewer → Converter/Formatter → Checker → (Router Translator?) → Generator/Optimizer → Comparator
```

Examples:

| Human journey | Agent composition (capability ids conceptual) |
|---------------|-----------------------------------------------|
| “Clean and validate JSON” | `formatter/json` → `checker/json-schema` |
| “Ship a QR for this URL” | `checker/url` → `generator/qr` |
| “Hash then compare” | `generator` n/a → `hash/sha256` → `comparator/hash` |
| “PDF text then translate” | `extractor/pdf-text` → Router `translator` (external) |
| “Estimate LLM cost” | `calculator/token-count` → `calculator/cost-estimate` (Router prices) |

Agents discover compositions via: **schema-compatible edges**, `compose.next` metadata, SKILL progressive disclosure, and MCP tool descriptions — **not** by scraping landers.

#### 6.7.5 Machine discovery surface (AI-Native product requirement)

Every matrix cell that claims “covered” must appear on at least one machine index:

| Surface | Role | State 2026-07-28 |
|---------|------|------------------|
| `GET /api/tools.json` | Catalog: id, roots, sideEffect, meterId, engine, invoke path, mcpName | **v2 shipped** |
| `GET /api/openapi.json` | Invoke contract — OpenAPI 3.1, one operation per tool | **Shipped**, 148 operations |
| `POST /api/mcp` | Agent runtime binding (`tools/list` / `tools/call`) | **Shipped** with derived schemas |
| SKILL.md (Core) | When to use / limits / composition tips | **Missing** — W4 |
| Wallet + API keys | Same purse as Router where applicable | Shipped (demo wallet) |

**Derivation rule (why this stays true):** agent-facing schemas are generated
from each tool's Zod `inputSchema` via `toolInputJsonSchema()`. There is no
hand-maintained second copy to drift, and a test fails the build if any tool
degrades to an opaque `{ type: "object" }`. Registering a tool is the whole job.

**Human SEO without machine index = incomplete AI-Native cell.**

#### 6.7.6 Three waves (matrix fill order)

| Wave | Goal | Focus (always dual-surface) | State |
|------|------|------------------------------|-------|
| **W1 · Intent alignment** | 0–few engines | Tag all tools with `roots` + primary EN/ZH SEO; related-by-root; `/r/{root}` hubs + sitemap | **Done** — every tool resolves roots (`roots-defaults.ts`), 13 hubs live |
| **W2 · Fill S gaps** | → **~100–110** tools | Waves 2–5 batches; **pdf-compress** via host qpdf/Ghostscript (+ pdf-lib fallback); **exif-viewer** via exifr; docx/xlsx/pptx text via pure ZIP OOXML | **Done** — 148 tools |
| **W2.5 · Machine surface** | 100% callable by agents | Zod → JSON Schema derivation; OpenAPI 3.1 one-op-per-tool; MCP descriptors carry real schemas; `tools.json` v2 | **Done 2026-07-28** — `json-schema.ts` / `openapi.ts`; regression test forbids opaque schemas |
| **W3 · Close the open slots, all `pure`** | quality over count | Deepen **Verifier / Comparator** to ≥5; open **Template → Detector → Processor** (that order, see §6.7.9); bring dense roots to competitor parity | **Next** |
| **W4 · Composition** | agent planners | `compose.next` edges, per-tool SKILL.md, schema-compatible chaining | Not started |
| **W5 · New object domains, still `pure`** | new traffic, same doctrine | Geo and bio columns on the object axis — existing verbs over new payloads (§6.7.8) | Planned |
| **W6 · LLM-backed, gated** | only after the gate | Translator and the model-backed candidates, each as an explicit Router-backed `external` tool | **Gated — not scheduled by tool count** |

**W3 is deliberately not "add 50 more tools."** §6.7.2a shows the count metric
is already met while four root slots sit empty; density now means *opening the
missing verbs and the async/external shapes*, not padding the Converter column.

**Still explicit non-goals:** Downloader, Scraper, general Compiler, project Manager/Dashboard, unconstrained outbound Sender.

#### 6.7.7 North stars & guardrails

| Metric | Target | Actual 2026-07-28 |
|--------|--------|-------------------|
| Registered tools | 79 → **120** (W2) → **150+** (W3) | **170** (169 default + host `md-to-pdf`) |
| In-scope roots opened | 18/18 of the 51 | **16/18** — Template and Detector opened in W3; Translator (gated, §6.7.8) and Processor (a shape, designed not populated) remain |
| S-root density | **≥5 tools each** | **11 of 11** — Verifier 9, Comparator 8 after W3 |
| Tools on MCP + tools.json + OpenAPI | **100%** | **100%** — schemas derived from Zod, no hand-written duplicate |
| `pure` share | ≥85% (reproducible agent steps) | **99.4%** (168/169) |
| Tier X tools in default agent catalog | **0** | **0** |
| LLM-backed tools without Router meter | **0** | **0** — no LLM-backed tool ships yet |

**Read `pure` 99.3% as an asset, not a debt.** It is the reason every Forge
step is reproducible, cacheable, cheap to serve, and safe to put in an agent
loop. It falls only when an LLM-backed tool passes the gate in §6.7.8 — and
then deliberately, one tool at a time, never as drift.

Ship gate remains §6.5. **Additional AI-Native coverage rule:** missing MCP/OpenAPI/meter/sideEffect for a Core cell ⇒ **not covered** in this matrix (even if the human page ranks).

#### 6.7.8 Pure-first, and the gate an LLM tool must pass

**AI-Native is a contract property, not a model call.** A `pure` tool that an
agent can discover, type-check, invoke and meter through one stable contract is
already AI-Native — that is the whole point of the machine surface in §6.7.5.
A tool that calls a model but hands an agent an opaque schema and an unpriced
step is *less* AI-Native, not more. So the order is settled:

> **Finish Pure first.** These roots already carry the search volume, they are
> reproducible, and their unit cost is server time. Nothing about shipping them
> well is blocked on a model.

Adding a model changes the cost structure, the latency budget, the failure
mode, and the abuse surface all at once. We will pay that price — an Agent OS
that never touches a model would be a lie — but on evidence, not on schedule.

**The gate.** An LLM-backed tool may be built only when all four hold:

| # | Gate | Why it is a gate and not a preference |
|---|------|----------------------------------------|
| 1 | **Rides validated PMF** | The demand must already be visible — a pure tool of ours with traffic, or an established competitor's proven surface. We do not invent a market and then staff it. |
| 2 | **Removes a step in a job the user is already doing** | Not a new job. If the model step is a detour from the journey the pure tool serves, it is a different product. |
| 3 | **Unit economics close** | Cost per call priced against free-tier ad revenue or wallet debit, with a stated cap. An unbounded model call behind a free SEO page is a bill, not a feature. |
| 4 | **Honest UX under failure** | Marked `external`, Router-metered, latency disclosed, degrades to the pure path where one exists. Never marketed as a deterministic Checker/Converter. |

**Do not invent PMF — sit on top of it.** The strongest LLM candidates are
therefore *adjacent to traffic we can already measure*, which is another reason
Pure comes first: it is what generates the evidence.

**Planned directions (owner's list, not yet scheduled).**

| Direction | Shape | First move |
|-----------|-------|------------|
| **Geographic information** | Mostly **pure + dataset**: coordinate-system conversion (WGS84/GCJ02/BD09), distance/bearing, geohash, bbox, timezone-from-point, address normalization | Ship the pure layer as a new object column; a model only helps later at fuzzy address parsing |
| **Biological information** | Mostly **pure + dataset**: FASTA/GenBank parse, reverse-complement, codon translation, GC content, sequence diff, primer melting temp | Same — deterministic first; model value is in interpretation, not computation |
| **Hero background generator** | Genuinely **generative** (image model) | The one candidate with no pure core; treat it as the pilot for the gate above, not as a blade among blades |

**The insight worth acting on:** geo and bio are **new columns on the object
axis, not new verbs on the root axis**. Converter, Calculator, Viewer,
Extractor and Checker all apply to them unchanged. So two thirds of the
owner's LLM list can ship as `pure` tools *first*, earn traffic, and only then
present a measured case for a model step. That is what "sit on validated PMF"
looks like operationally.

#### 6.7.9 Per-layer play (dense · thin · empty)

The three layers in §6.7.2a need three different kinds of work. Treating them
as one backlog is how a tool station becomes wide and bad.

**Dense (10 entries, 94% of inventory) — go to SOTA.**
Coverage is done here; quality is not. Per tool: reach competitor parity on the
journey (paste → result → copy/download, keyboard, large-input behaviour,
mobile), then add the thing the competitor cannot be bothered to do. Where the
best available wheel is genuinely weak, say so in the brief and close the gap
with engineering rather than shipping the weakness. **A dense root that is only
"present" is not covered** — §6.5 gates apply per tool, not per root.

**Thin (Editor 3 · Verifier 4 · Simulator 2 · Comparator 4) — complete them.**
These are half-open doors: the verb exists, so an agent planner will reach for
it and find nothing behind it. Bring each to ≥5 with tools that are obviously
the missing members of the set, not filler.

**Empty (4) — design the set before building it.** Priority is by *web-first
frequency*: which operation does a human come to a browser to finish?

| Order | Root | Why this order | Candidate set |
|-------|------|----------------|---------------|
| 1 | **Template** 21 | Highest web-first frequency and trivially deterministic — people search these by name every day | license chooser, .gitignore, .editorconfig, Dockerfile starters, commit-message / PR templates, README skeleton |
| 2 | **Detector** 27 | Developer-frequency, strong pipeline value as a pre-flight gate | MIME/file-type from bytes, text encoding + BOM, line-ending, secret/API-key scan (read-only), language detect |
| 3 | **Processor** 10 | **Not a keyword play** — it is a *shape*, not a search term | Batch/async wrappers over heavy tools we already have (bulk image, multi-PDF), delivered on the existing `/api/v1/jobs` surface |

Naming Processor honestly matters: chasing "processor" as an SEO root would
produce junk pages. What users want is *the same tools, over many files, without
blocking* — so the work is the J surface, and the traffic keeps coming through
the tools they already search for.

#### 6.7.10 Competitor research and know-how (per tool, not per quarter)

We are building a station; several of our competitors have spent years polishing
one blade. On any single tool they usually hold the domain know-how and we do
not. That gap is closed by research, and research is only real if it is written
down where the next person will hit it.

**Research precedes code. Every tool, no exceptions.** A tool built without a
teardown may be technically clean and still point the wrong way — wrong journey,
missing the one feature users actually came for, or awkward in a way the user
cannot name but feels. Polishing the engine cannot recover from that. On
household-name categories (PDF, image, JSON) we are entering markets where the
incumbents are genuinely good; going in blind is how you ship a worse copy.

**Required in every tool brief** (`docs/plans/tools/<slug>.md`, the artifact
that already exists — extended, not replaced by a new mechanism):

| Field | Content |
|-------|---------|
| **Named competitors** | 3–5 real products, chosen by *actual reach* — what ranks for the keyword, what the dev community reaches for — not the first three search hits |
| **Feature inventory** | What each one actually does. Which capability is their core strength, and which features exist only as upsell |
| **Journey map** | Step by step: what the user sees on arrival, what they touch first, how the result appears, how they get it out. Note where the journey has *no* button because it runs live |
| **Layout** | How the page is organised — input/output placement, options density, what is above the fold. **Full-page screenshots captured to `docs/research/forge/<slug>/`** via `scripts/research-screenshot.mjs` — that directory is **gitignored**: captures are local reference material, the brief is the committed deliverable, and anyone can regenerate them from the URLs the brief names |
| **Their debt** | Ad density, dark patterns, upload-required-for-local-work, dead UI, no API |
| **Domain know-how** | The non-obvious rules of this problem — the things that make a naive implementation wrong |
| **Our differentiator** | What a user gets here that they cannot get there |
| **Chosen archetype** | Which journey archetype below, and why |

**取其精华，去其糟粕.** Copy the journey, not the chrome. An ugly competitor may
still have the right sequence of steps; a beautiful one may have a bad one. Judge
the flow separately from the styling, and never import their ad density,
upload-gating, or upsell interruptions.

**Journey archetypes — a tool station is not one template repeated.**
Picking "form + button + output" for everything is the fastest way to make 150
tools feel like one mediocre tool. Choose deliberately, and record the choice:

| Archetype | Shape | Fits |
|-----------|-------|------|
| **Instant transform** | Paste → live result, **no run button**; the button is a step tax when compute is trivial | base64, case convert, url encode, formatters |
| **Configure-then-generate** | The options *are* the product; output regenerates as they change | .gitignore by stack, password rules, QR |
| **Decision wizard** | The user does not yet know what they want; the tool narrows by asking | LICENSE chooser, unit family pickers |
| **Drop-and-verdict** | File in → one clear answer, detail on demand | file-type detect, checksum, EXIF |
| **Two-pane compare** | Side-by-side inputs, synchronized structured output | diff family, comparators |
| **Inspect-and-drill** | One input → a structure the user explores | JWT decode, JSONPath, CSV preview |
| **Batch queue** | Many inputs, visible progress, download-all | job-tier media tools |

A tool whose archetype is "form + button" should be able to say why the other
six were wrong for it.

**Where our edge actually is.** Not per-tool depth — a single-point competitor
will usually match or beat us there, and we should expect to spend real effort
just reaching parity. Our edge is what they structurally cannot offer:

| Their weakness | Our position |
|----------------|--------------|
| Ad-choked pages, interstitials, fake download buttons | No ad clutter on the tool journey; ads, if any, never sit inside the workflow |
| Inconsistent per-tool UI, every page a different product | One design system, one journey grammar across 148 blades |
| No machine contract — a human page and nothing else | Every tool callable via OpenAPI + MCP with a derived schema and one wallet |
| Upload-first for work that could stay local | Client-side where possible; privacy stated per tool (§6.5 gate 8) |
| A tool ends where its page ends | Tools compose — chained by schema, billed on one purse |

**The compounding claim, stated so it can be checked:** our moat is per-tool
quality **×** composition. Composition alone, over mediocre blades, is a
demo — which is exactly why the dense layer must reach parity before we sell
the chaining story.

### 6.8 Density & commercial phasing

Aligned with §6.7 waves (F* = catalog density; W* = demand-matrix + AI-Native workstreams).

| Phase | Catalog feel | Focus | State |
|-------|----------------|-------|-------|
| **F0** | ~40–60 → **~79** + real home IA | Dual-surface pipeline proven; **W1** root tags + machine catalog honesty | Done |
| **F1** | ~100–120 | Image/PDF/units/life + **W2** S-root gap fill; **W2.5** machine surface | Done — **148** |
| **F2** | **quality, not count** | **W3**: dense roots to competitor parity, thin roots completed, Template/Detector/Processor opened; **W4** composition metadata | Next |
| **F3** | new object domains | **W5** geo / bio columns — still `pure`; long-tail + Router deep links | Planned |
| **F4** | first metered model steps | **W6** LLM-backed tools, one at a time, each through the §6.7.8 gate | Gated |

**F2 deliberately has no tool-count target.** The count target was met at F1
while four root slots stood empty and dense roots sat at "present" rather than
"good" — so the next phase is measured by parity and completeness, not by
inventory. Counting resumes at F3, when new object domains genuinely add rows.

Commercial: free tier → login → top-up → API limits; ads allowed on free **human** tier, **never inside the tool workflow** (§6.7.10); **Agent/API path stays clean, metered, and free of Tier X clutter**.

### 6.9 Shared account with Router

Same Nebutra identity and **same prepaid wallet** language (302-like unified purse). Cross-sell: token/cost tools and docs point at `router.nebutra.com`. Key scopes (`models:*` / `tools:*`) are control-plane detail.

**AI-Native billing boundary:** deterministic Forge tools bill `forge.*` meters; **Translator / LLM Extractor / Assistant** roots bill **Router** model meters via Forge shell tools marked `external` — never a silent second ledger and never marketed as pure Checkers/Converters.

### 6.10 i18n architecture (Forge product host)

Forge is **cookie-locale** (`NEXT_LOCALE` → `apps/forge/src/i18n/request.ts`), same wheel as other Nebutra product apps (`@nebutra/i18n` route locales). There is **no** `/[locale]` URL prefix (`localePrefix: "never"`).

| Layer | Source of truth | Rule |
|-------|-----------------|------|
| **Shell chrome** (nav, footer, home, search, categories, tool page frame, runner chrome) | `apps/forge/messages/<messageKey>.json` via next-intl | Author **en.json** first; override product languages (at least **zh-Hans**). Other locales shallow-merge onto en (missing keys fall back to English). **Do not** put per-tool titles here. |
| **Tool title / description / SEO keywords** | `@nebutra/forge-runtime` `LocalizedString` `{ zh, en }` on each tool definition | Content axis is bilingual only (`toContentLocale` → `zh` \| `en`). UI picks via `pickBilingual` / `isChineseLocale`. **Never** add 34 message keys per tool. |
| **Category labels** | `messages.*.categories.<id>.{label,hint}` | Category *ids* stay English machine keys (`codec`, `text`, …); only labels are translated. |
| **Runner field labels / common buttons** | `messages.*.runners.*` | New Wave tools (W2+) must use `useTranslations("runners")` for field labels and notes. Legacy runners still hardcode ZH — migrate on-touch. |
| **API / MCP / tools.json** | English-first machine ids + optional bilingual summary fields | Agents consume `id` / `slug` / schema; human SEO is a separate surface. |

**Anti-patterns**

- Hardcoding Chinese (or English) in new catalog runners for user-facing labels
- Adding tool titles into `messages/*.json` (does not scale; breaks registry single source)
- Expanding `LocalizedString` to full PRODUCT_LANGUAGES until content ops require it
- Using raw `console` / ad-hoc locale cookies outside `canonicalizeLocaleOrDefault`
- Root `layout.tsx` `generateMetadata` that calls next-intl / `cookies()` — Next 16 prerenders `/_global-error` **without** workStore and the whole production build dies (`Invariant: Expected workStore to be initialized`). Keep **static** root metadata; put locale-aware metadata on route segments only.

**Implementation touchpoints:** `apps/forge/src/lib/bilingual.ts`, `src/i18n/*`, `messages/en.json` + `zh-Hans.json`, tool definitions under `packages/ai/forge-runtime/src/tools/`.

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
- **40–60** everyday tools target → **~79 registered** (2026-07 inventory; text/codec/hash/JSON/time/dev + expansions)  
- ≥1 job tool (e.g. md→pdf) proving async path  
- Shared wallet identity hooks  
- **Demand-root matrix** locked in §6.7 (W1 SEO/root tagging)  

### Phase 2

- CLIProxyAPI sidecar (Router)  
- Forge **F1** + **W2**: image + PDF core + units + life calcs + S-root gap fill → **~100–120** tools; SEO/ads ready  
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
| 2026-07-28 | Machine surface derived from Zod (OpenAPI 3.1 + MCP + tools.json v2); no hand-written schema copy |
| 2026-07-28 | Acceptance status is an internal review gate in tool briefs — **not** a registry field |
| 2026-07-28 | 51-root audit: 18 in scope (10 dense / 4 thin / 4 empty), 33 deliberately out |
| 2026-07-28 | **Pure-first**: AI-Native means the agent contract, not a model call; LLM tools are gated on validated PMF + unit economics (§6.7.8), never on schedule |
| 2026-07-28 | Geo / bio enter as **object-axis columns shipped `pure`**, not as LLM features |
| 2026-07-28 | F2 measured by parity and completeness, not tool count |

---

## 15. One-line summary

**Nebutra Router** is productized model access: 302-style wallet journey outside; New-API + Sub2API (later CLIProxyAPI) as pinned supply engines inside.

**Nebutra Forge** is the internet’s Swiss army knife **and** Agent tool OS: cover every everyday drawer, make each blade SOTA by wrapping open-source best-in-class engines, and rebuild every tool so humans (SEO/ads/UX) and Agents (API/MCP/SKILL/meter) share one capability — never a sparse demo shelf, never NIH rewrites of solved problems.
