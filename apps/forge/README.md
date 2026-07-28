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

## Coverage honesty

Some blades ship on deliberately narrow data — `kinship` uses a lightweight
dictionary, `phone-lookup` a coarse prefix/carrier map. Say so in the tool's own
`description`, which is the one place both the page and the API already read.
Do not over-claim coverage in SEO titles or marketing copy.
