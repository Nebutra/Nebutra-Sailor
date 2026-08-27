# @nebutra/forge

Nebutra Forge — human tool station + Agent invoke API.

## Dev

```bash
pnpm --filter @nebutra/forge dev
# http://localhost:3105
```

## Production build (ECS / standalone)

```bash
NEXT_OUTPUT=standalone pnpm --filter @nebutra/forge build
# → apps/forge/.next/standalone + .next/static
```

Default `build` uses `next build --experimental-build-mode compile` so the
bundle is fully dynamic (all routes already `force-dynamic`) and skips Next 16’s
broken `/_global-error` static prerender (`workStore` invariant). Use
`build:full` only when you need a complete generate pass and that bug is fixed.

Assemble for PM2 (cwd = release root that contains `apps/forge/server.js`):

```bash
STAGE=.deploy/forge
rm -rf "$STAGE" && mkdir -p "$STAGE"
rsync -a apps/forge/.next/standalone/ "$STAGE/"
mkdir -p "$STAGE/apps/forge/.next"
rsync -a apps/forge/.next/static/ "$STAGE/apps/forge/.next/static/"
rsync -a apps/forge/public/ "$STAGE/apps/forge/public/"
```

## Surfaces

| Path | Role |
|------|------|
| `/` | Search + category grid |
| `/t/[slug]` | Human tool page + runner |
| `/r/[root]` | Demand-root hub (generator / converter / checker …) |
| `/docs` | API quick docs |
| `GET /api/v1/tools` | Catalog |
| `POST /api/v1/tools/invoke/{id}` | Invoke (id may include `/`) |
| `GET /api/tools.json` | Machine catalog — roots, sideEffect, meterId, mcpName |
| `GET /api/openapi.json` | OpenAPI 3.1 — one operation per tool, schemas from Zod |
| `POST /api/mcp` | MCP-over-HTTP bridge (`tools/list`, `tools/call`) |
| `POST /api/v1/jobs` · `GET /api/v1/jobs/{id}` | Async (J) surface |

### Machine surface contract

Agent-facing schemas are **derived**, never hand-written: `toolInputJsonSchema()`
(`@nebutra/forge-runtime`) converts each tool's Zod `inputSchema` to JSON Schema,
and both MCP descriptors and the OpenAPI request bodies read from it. Adding a
tool to the registry is therefore enough to make it callable, discoverable and
typed for agents — there is no second place to update.

Runtime: `@nebutra/forge-runtime`  
Wallet demo: `@nebutra/prepaid-wallet` MemoryPrepaidWallet (swap to CreditBalance via `createCreditLedgerWallet`)

---

## i18n contract

| What | Where |
|------|--------|
| Locale resolution | Cookie `NEXT_LOCALE` → `src/i18n/request.ts` (full `@nebutra/i18n` wheel) |
| Shell / categories / runner chrome | `messages/en.json` (+ overrides e.g. `zh-Hans.json`) |
| Tool title / description / SEO | Registry `LocalizedString` `{ zh, en }` + `src/lib/bilingual.ts` `pickBilingual` |

**Do not** put per-tool titles into message JSON. **Do** put new runner labels under `runners.*` in messages. Full rules: `docs/plans/2026-07-23-nebutra-router-forge-design.md` §6.10.

---

## Hard-correct product policy

**No degraded positioning.** Lab dictionaries, coarse data, silent engine
fallbacks, and deep-link shells are **not** product blades. Either the engine
is industry-ready, or the tool stays **out of the registry**.

Source of truth: [`docs/plans/tools/_hard-correct-decisions.md`](../../docs/plans/tools/_hard-correct-decisions.md)  
CI: `node scripts/lint-forge-hard-correct.mjs` (part of monorepo `pnpm lint`)

| Gate | Rule |
|------|------|
| Registry | Delisted tools (kinship, phone-lookup, router-translate, toy minify/UA/SVG, …) not exported |
| Workspace | Every registered slug has an explicit runner case |
| md-to-pdf | Default `playwright`; missing Chromium **fails closed** |
| Wallet | Production default `ledger` (`@nebutra/billing` CreditBalance); memory only in dev |
| Translator root | Empty until real Router invoke (W6) |
| SOTA engines | CSSO · Prettier · html-minifier-terser · SVGO · ua-parser-js |

---

## md-to-pdf registry policy

**Decision (host-only registration):** keep `doc/md-to-pdf` **out** of
`F0_BATCH1_TOOLS` / `ForgeRegistry.openDefault()`. The Forge product host
registers it in `src/lib/registry.ts` via `@nebutra/forge-runtime/pdf`.

| Layer | Choice | Why |
|-------|--------|-----|
| Default runtime registry | **No** md-to-pdf | Avoid optional Playwright peer on every consumer (edge, tests, non-PDF apps) |
| `apps/forge` host | **Always register** `mdToPdfTool` + **depends on `playwright`** | Product path requires Chromium print |
| PDF engine | `engine: playwright \| simple` | **Default playwright.** `simple` only when explicitly requested (tests/CI) |
| Playwright dependency | **required on `@nebutra/forge` host**; optional peer of `@nebutra/forge-runtime` | Only the product host pays browser cost |

### Install Chromium (required on every Forge product host)

```bash
# macOS / most dev machines
pnpm forge:playwright:install
# same as:
pnpm --filter @nebutra/forge playwright:install

# Linux ECS when shared libs are missing
pnpm --filter @nebutra/forge playwright:install:deps

# Verify product path (must print OK twice)
pnpm forge:md-to-pdf:verify
```

### Operator notes (ECS / self-host)

1. After every fresh host or release root that does not inherit the Playwright
   browser cache, run `playwright:install` (or `install:deps` on bare Linux).
2. Without Chromium, md-to-pdf invoke **fails closed** — by design.
3. CI unit tests may pass `engine=simple` / `FORGE_MD_PDF_ENGINE=simple` only.
4. Never market simple structured PDF as print-grade layout.

### What we reject

- Silent fallback from Playwright → simple while returning `ok`.
- Pulling Playwright into `F0_BATCH1_TOOLS` so every host pays install cost.
- Leaving `/t/md-to-pdf` as a workspace-only dead link while the tool is unregistered.
- Shipping “lab / coarse / shell” tools with honesty copy instead of real engines.

See also: `docs/plans/tools/md-to-pdf.md`, `packages/ai/forge-runtime/skills/md-to-pdf/`.
