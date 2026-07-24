# @nebutra/forge

Nebutra Forge — human tool station + Agent invoke API.

## Dev

```bash
pnpm --filter @nebutra/forge dev
# http://localhost:3105
```

## Surfaces

| Path | Role |
|------|------|
| `/` | Search + category grid |
| `/t/[slug]` | Human tool page + runner |
| `/docs` | API quick docs |
| `GET /api/v1/tools` | Catalog |
| `POST /api/v1/tools/invoke/{id}` | Invoke (id may include `/`) |

Runtime: `@nebutra/forge-runtime`  
Wallet demo: `@nebutra/prepaid-wallet` MemoryPrepaidWallet (swap to CreditBalance via `createCreditLedgerWallet`)

---

## md-to-pdf registry policy

**Decision (host-only registration):** keep `doc/md-to-pdf` **out** of
`F0_BATCH1_TOOLS` / `ForgeRegistry.openDefault()`. The Forge product host
registers it in `src/lib/registry.ts` via `@nebutra/forge-runtime/pdf`.

| Layer | Choice | Why |
|-------|--------|-----|
| Default runtime registry | **No** md-to-pdf | Avoid optional Playwright peer on every consumer (edge, tests, non-PDF apps) |
| `apps/forge` host | **Always register** `mdToPdfTool` | SEO landing + workspace runner require a catalog entry |
| PDF engine | `engine: auto \| playwright \| simple` | `auto` tries Chromium print, falls back to structured PDF |
| Playwright dependency | **optional peer** of `@nebutra/forge-runtime` | Do **not** add Playwright to every ECS/Vercel bundle by default |

### Operator notes (ECS / self-host)

1. Without Chromium, invoke still works (`engine=auto` → simple structured PDF). UI shows `renderEngine` + `sotaNote`.
2. For print-fidelity SOTA on a host: install Playwright browsers on that machine only, e.g. `npx playwright install chromium` (and OS deps). Do not force this into monorepo install for all apps.
3. Prefer `engine=playwright` when you must fail closed without Chromium; use `simple` in CI.

### What we reject

- Silently claiming production print quality when only the simple PDF path ran.
- Pulling Playwright into `F0_BATCH1_TOOLS` so every host pays install cost.
- Leaving `/t/md-to-pdf` as a workspace-only dead link while the tool is unregistered.

See also: `docs/plans/tools/md-to-pdf.md`, `packages/ai/forge-runtime/skills/md-to-pdf/`.

---

## Lab tools (honest labeling)

Internal `sotaStatus: lab` is **not** a marketing “SOTA” badge. On product UI we
show an **实验** chip for lab blades so SEO/traffic does not over-claim:

| Slug | Status | Note |
|------|--------|------|
| `kinship` | lab | Lightweight dictionary; not a full 亲戚称呼 engine |
| `phone-lookup` | lab | Prefix/carrier coarse map only; not a full 归属地库 |

Do not promote lab tools as production SOTA in copy or SEO titles.
