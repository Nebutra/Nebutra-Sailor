# Forge F2 Convergence — quality, not inventory

**Date:** 2026-07-31  
**Status:** **F2 exit criteria met (2026-07-31)** — Tracks A–D shipped. Follow-ups: denser SKILL polish, optional competitor screenshot packs, W5 geo/bio only when opened.  
**Parent:** [2026-07-23-nebutra-router-forge-design.md](./2026-07-23-nebutra-router-forge-design.md) §6.7–6.8  
**Catalog (historical):** [2026-07-23-nebutra-forge-f0-catalog.md](./2026-07-23-nebutra-forge-f0-catalog.md)  
**Processor shape:** [tools/_processor-batch-surface.md](./tools/_processor-batch-surface.md)

---

## 0. One-line freeze

> **Inventory is done enough. F2 is not “add 50 tools.”**  
> F2 = open the last empty **shape** (Processor batch) + close F0 leftovers + raise agent composition (W4) + one dense-root SOTA pass — measured by completeness and parity, not slug count.

Anything that does not advance one of the four tracks below is **out of F2**.

---

## 1. Baseline (audited 2026-07-31)

| Metric | Value | Source |
|--------|-------|--------|
| Tool defs in `forge-runtime` | **176** ids | `packages/ai/forge-runtime/src/tools/**` |
| Default registry `F0_BATCH1_TOOLS` | **175** | excludes host-only Playwright peer |
| Product host `apps/forge` | **176** | `F0_BATCH1_TOOLS` + `doc/md-to-pdf` |
| Explicit `roots[]` on defs | ~105 / ~151 parsed exports | rest via `roots-defaults.ts` |
| Machine surface | **100%** of registered tools | OpenAPI + MCP + `tools.json` (Zod-derived) |
| SKILL.md set | **~36** partial | `packages/ai/forge-runtime/skills/` — Core set incomplete |
| Dedicated UI runners | ~50+ components | remainder uses generic invoke |

### 1.1 Demand-root ledger (explicit tags, live)

| Root | Tools (explicit) | F2 stance |
|------|------------------|-----------|
| Generator / Converter / Formatter / Calculator / Checker / Optimizer / Viewer / Extractor / Analyzer | dense (10–50+) | **SOTA pass only** — no pad |
| Comparator | 7 | ≥5 met — **hold** |
| Verifier | 8 | ≥5 met — **hold** |
| Editor | 5 | ≥5 met — **hold** |
| Simulator | 5 | ≥5 met — **hold** |
| Template | 7 | open done — **hold** |
| Detector | 5 | open done — **hold** |
| **Processor** | **0** | **F2 Track A — ship the shape** |
| **Translator** | **0** (honest empty) | **out of F2** — W6 gate only |

W3 *count* goals for thin/empty pure roots are **met** except Processor (shape, not SEO). Document §6.7.2a numbers that still say “Template empty / Comparator 4” are **stale**; this file supersedes them for planning.

### 1.2 F0 catalog residue

Original F0 (~55–60) vs live registry: **58/60**.

| Missing slug | Decision in F2 |
|--------------|----------------|
| `time/world-clock` | **Done** — Catalog, dayjs IANA multi-zone |
| `dev/js-format` | **Done** — Catalog, Prettier (max 200k chars) |

Renames already accepted (do not re-implement):

- `text/remove-duplicate-lines` → `text/unique-lines`
- `text/rmb-uppercase` → `finance/rmb-uppercase`
- `dev/user-agent` → `dev/user-agent-parse`
- `llm/token-estimate-text` → folded into `llm/token-count`

### 1.3 Explicit non-goals (F2 and beyond until reopened)

| Non-goal | Why |
|----------|-----|
| Tool-count KPI / “reach 200” | F2 has **no count target** (parent §6.8) |
| `/r/processor` SEO hub | Processor is a shape; traffic stays on tool SEO pages |
| Cross-item DAG pipelines (CloudConvert-style) | Batch = N independent same-tool invokes |
| New geo / bio object columns | F3 / W5 |
| Real Translator / LLM extractors | F4 / W6, four-gate only |
| Downloader / Scraper / arbitrary Compiler | Parent §6.7.2 out list |
| Per-tool dedicated runner for every slug | Generic invoke is valid; dedicated only when journey archetype needs it |
| Re-research engines that already ship SOTA wrappers | Research only for new blades or SOTA remediations |

---

## 2. F2 success criteria (exit when all true)

| # | Criterion | How verified |
|---|-----------|--------------|
| 1 | **Processor shape live** | `POST/GET /api/v1/batches*` + at least 2 `resultKind:json` tools + 1 `resultKind:file` tool wired through `<BatchQueue>` |
| 2 | **Honest Processor root** | ≥1 tool carries `roots` including `processor` **or** batch-capable tools declare `batch: { resultKind, accept }` and `/r` docs describe the shape without a junk SEO page |
| 3 | **F0 closed** | `time/world-clock` + `dev/js-format` registered + human pages |
| 4 | **W4 MVP** | `compose.next` on ≥15 Core tools **or** SKILL.md for all `tier: core` tools with “when to chain” section |
| 5 | **No inventory regression** | Default registry still pure-first; md-to-pdf stays host-opt-in |
| 6 | **SOTA sample** | 3 dense-root tools pass playbook ship-gate refresh (brief + journey parity note) |

F2 **fails** if we only add more Catalog converters without 1–4.

---

## 3. Four tracks (ordered, bounded)

### Track A — Processor batch surface (primary)

**Owner artifacts:** [tools/_processor-batch-surface.md](./tools/_processor-batch-surface.md) (design complete).  
**Implement; do not redesign.**

| Step | Work | Done when |
|------|------|-----------|
| A1 | Additive job model: `batchId?`, `label?` on job; `ForgeBatchManifest`; status `skipped`; derived batch status incl. `partial` | Unit tests on pure status derivation |
| A2 | `POST /api/v1/batches`, `GET …/batches/:id`, `POST …/retry`, `GET …/download` (file only) | Contract tests; cap `FORGE_BATCH_MAX_ITEMS` |
| A3 | Registry fields: `batch?: { resultKind: "file"\|"json"; accept: "files"\|"lines"; maxItems? }` | Zod on tool def; tools.json exposes flag |
| A4 | `<BatchQueue>` in forge host + wire **json** tools first: `text/isbn`, `life/ean-upc-gtin`, `dev/secret-scan` (paste lines) | One shared component, 3 configs |
| A5 | Wire **file** tool: `image/compress` (or `doc/pdf-compress`) with zip download | End-to-end smoke |
| A6 | OpenAPI/MCP ops `forge.batch.create` / `forge.batch.get` (schemas array-wrap tool input) | Agent smoke |
| A7 | Tag or document Processor root honestly | Hub copy or `roots` policy in README |

**Caps (decide in A1 PR, not later):**

| Knob | Default proposal | Rationale |
|------|------------------|-----------|
| Global `FORGE_BATCH_MAX_ITEMS` | **50** | TinyPNG-class UX; abuse bound |
| Pure checker override | up to **200** lines | Cheap pure ISBN-class |
| File/job heavy override | **20** | Match TinyPNG free UX, cost control |
| Poll interval | 1s while running; stop on terminal | Brief §4.4 |
| TTL | same as jobs (24h) | Manifest + items co-expire |

**Open questions resolved for F2:**

| Question | Decision |
|----------|----------|
| sync/async on `sideEffect` | **Do not expand enum.** Document job/batch as transport: page-model already has Job tier; batch is Job×N. |
| `resultKind` location | **On tool def `batch` field**, not inferred only by category |
| MCP for batch | **Yes in F2** — required for AI-Native cell |

**Out of Track A:** building 20 new tools just to fill Processor SEO.

---

### Track B — F0 residue (small, must close)

| Tool | Engine | Tier | Notes |
|------|--------|------|-------|
| `time/world-clock` | `dayjs` + tz (already used) | Catalog | Multi-city list; client OK; no meter drama |
| `dev/js-format` | Prettier (bounded file size) **or** `oxc`/biome format if already monorepo | Catalog | Timeout + max input; never unbounded Prettier in free tier |

Ship gate: full brief only if journey is non-obvious; otherwise thin brief + playbook engines table is enough for Catalog.

---

### Track C — W4 composition MVP (agent edge)

Parent §6.7.6 W4 is “not started.” F2 takes a **MVP slice**, not full graph product.

| Step | Work | Done when |
|------|------|-----------|
| C1 | Optional `compose?: { next?: string[]; prev?: string[] }` on tool defs | Type + tools.json |
| C2 | Seed **≥15** Core tools with real edges (not decorative) | Examples below |
| C3 | SKILL.md for every Core tool missing one **or** generate from registry template | Directory complete for Core |
| C4 | Human “Related / Next” from compose + roots (already have root hubs) | Tool page shows chain hints |

**Seed composition edges (minimum set):**

```text
dev/url-validate → image/qr-generate
data/json-format → llm/json-schema-validate
hash/sha256 → hash/hash-compare
doc/pdf-text → (external Router translate — document only until W6)
llm/token-count → llm/cost-estimate
text/diff → text/find-replace-regex
dev/secret-scan → security/secret-generate   # detect then rotate guidance
data/csv-preview → data/csv-columns
codec/jwt-decode → (viewer end)
image/exif-viewer → image/exif-strip
```

Agents discover edges via tools.json + SKILL; no hard-coded workflow engine in F2.

---

### Track D — Dense-root SOTA sample (quality, not width)

Pick **exactly three** high-traffic blades; refresh brief + journey to competitor parity:

1. `data/json-format` (already briefed — remediate if gap)  
2. `doc/md-to-pdf` or `doc/pdf-compress` (engine honesty already policy)  
3. `image/compress` (ties to Track A file batch)

**Rule:** no fourth SOTA remediation in F2 unless one of these three fails ship-gate.

---

## 4. Sequencing

```text
Week-shaped order (can parallelize owners):

  A1–A3  batch model + API          ─┬─ critical path
  B1–B2  world-clock + js-format    ─┤  small parallel
  A4–A5  BatchQueue UI              ─┤
  A6–A7  MCP + root honesty         ─┤
  C1–C4  compose + SKILL            ─┘  after tools.json fields stable
  D      three SOTA remediations       anytime after A4 if image/pdf involved
```

**Do not start W5 geo/bio or W6 Translator inside F2 PRs.**

---

## 5. Registry / package policy (unchanged, re-stated)

| Policy | Keep |
|--------|------|
| `F0_BATCH1_TOOLS` default | No Playwright peer tools |
| `doc/md-to-pdf` | Host-only registration |
| Schemas | Single Zod source → OpenAPI/MCP |
| `pure` share | Stay ≥85%; batch does not force tools to become `write` |
| Meter | Batch create meters once + per-item existing tool meters (document in A2) |

---

## 6. Acceptance checklist (copy into F2 epic)

### Track A

- [x] Batch create rejects `items.length > cap` with `batch_too_large` before any job write  
- [x] Partial batch: 49 ok + 1 fail → status `partial`; retry single item  
- [x] JSON tools: aggregate table path (no zip); tools declare `batch.resultKind=json`  
- [x] File tools: zip download when terminal (`GET …/download`)  
- [x] MCP batch ops when host wires hooks (`forge.batch.create` / `forge.batch.get`)
- [x] `<BatchQueue>` + image compress Batch tab  
- [x] Four tools tagged `processor` + `batch` (isbn, ean, secret-scan, image-compress)

### Track B

- [x] `time/world-clock` and `dev/js-format` in host catalog + invoke green  
- [x] F0 residue closed (60/60 original catalog)

### Track C

- [x] ≥15 tools with non-empty `compose.next` (`compose-edges.ts` seed + registry merge)  
- [x] Core SKILL coverage 100% via `skills:generate` / `renderCoreSkillMarkdown` (88 Core)

### Track D

- [x] Three SOTA sample journeys improved — see [tools/f2-track-d-sota-pass.md](./tools/f2-track-d-sota-pass.md)  
- [x] json-format: live validate, sortKeys, ⌘/Ctrl+Enter  
- [x] pdf-compress: **download bug fixed**, drop zone, savings bar  
- [x] image-compress: privacy honesty + batch path already live

### Meta

- [ ] Parent design §6.7.2a / §6.7.6 status lines point here  
- [ ] No new “F2.5 count wave” opened  

---

## 7. What “converged” means

| Before (sprawl risk) | After (this plan) |
|----------------------|-------------------|
| “Still missing tools” as open-ended list | Only **2** F0 leftovers + **0** required new blades for Processor |
| W3 ledger stale (Template empty, etc.) | Live ledger in §1.1 |
| Processor design without ship path | Track A steps A1–A7 |
| W4 undefined | MVP: compose edges + Core SKILL |
| Temptation to pad Converter | Explicit non-goal |

**Next action after this doc is approved:** implement Track A1–A2 (schema + API) under TDD; do not open a parallel “wave 6 tools” PR.

---

## 8. Changelog

| Date | Note |
|------|------|
| 2026-07-31 | Initial F2 convergence from live 176-tool audit + processor brief + parent §6.7 |
