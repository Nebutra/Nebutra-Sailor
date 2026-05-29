# Template Architecture

This repo is **both** Nebutra's live product codebase **and** the source used to
sync the `Nebutra/Sailor-Template` mirror consumed by `create-sailor`. A single
`.templateignore` file separates the two concerns: the sync workflow strips
Nebutra's business content and publishes only the reusable skeleton.

## How it works

```
npm create sailor@latest my-app
   │
   ▼
packages/ops/create-sailor fetches Nebutra/Sailor-Template as an immutable tarball
   │
   ▼
If the mirror is unavailable, it falls back to Nebutra/Nebutra-Sailor main
   │
   ▼
Fallback only: reads .templateignore and deletes every matched path
   │
   ▼
Removes .templateignore itself if fallback pruning was needed
   │
   ▼
Runs configured prune step (ORM / i18n / app type)
   │
   ▼
my-app/ contains only the reusable skeleton
```

## What gets stripped

- **Marketing pages** — `apps/landing-page/src/app/[lang]/(marketing)/*`
- **Legal pages** — `apps/landing-page/src/app/[lang]/(legal)/*`
- **Nebutra landing components** — `apps/landing-page/src/components/landing/`
- **Dashboard business pages** — admin, billing, tenants, chat, etc.
- **Nebutra-owned apps** — `apps/sleptons`, `apps/tsekaluk-dev`, `apps/studio`,
  content from `apps/design-docs` and `apps/docs`
- **Press / PR** — `marketing/`, `changelog/`
- **Internal planning / governance** — `docs/plans/`, `governance/*.current.json`
- **Build artifacts** — `artifacts/`, `playwright-report/`, `test-results/`
- **Env + locks** — `.env*` (except `.env.example`), `openstatus.lock`

## What is preserved

- Every `packages/*` primitive (UI, tokens, queue, search, metering, vault, …)
- App shells: `layout.tsx`, `globals.css`, `package.json`, `next.config.ts`
- Build config: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `biome.json`
- The `create-sailor` CLI itself
- API gateway skeleton (`backends/gateway`)
- `e2e/` and `tests/` (skeleton tests, minus Nebutra-only specs)

## Adding new Nebutra business code

When you add new Nebutra-owned business code (a new landing section, a new
admin page, a new changelog post, a new brand asset), **add it to
`.templateignore` in the same commit**. Use gitignore syntax.

Example — adding a new landing section `ComparisonMatrix.tsx` is already
covered by the existing rule:

```
apps/landing-page/src/components/landing/
```

Adding a new top-level Nebutra-owned app? Add an explicit rule:

```
apps/my-new-nebutra-app/
```

## Validating

After editing `.templateignore`, run:

```bash
pnpm template:check
```

This:

1. Walks the repo applying the ignore rules.
2. Asserts required skeleton files are still preserved (layouts, package.json,
   tokens/ui packages, etc.).
3. Asserts known Nebutra business content is stripped.
4. Prints `X files preserved, Y paths stripped`.

If the script fails, either:

- A required skeleton file is being stripped → loosen the rule, or add a
  negation (`!path/to/keep.tsx`).
- Known Nebutra content isn't being stripped → tighten the rule.

## Extending the must-preserve / must-strip list

The assertions live in `scripts/template-check.ts` under `MUST_PRESERVE` and
`MUST_STRIP`. Add entries whenever you want to hard-guard a path against
accidental drift.

## Why keep a mirror?

The mirror is derived, not hand-maintained. `scripts/template-build.ts` builds a
clean tree from this repo, `.github/workflows/sync-template.yml` pushes it to
`Nebutra/Sailor-Template`, and `create-sailor` consumes that pre-stripped mirror
for faster scaffolds. The fallback-to-main path exists only to keep scaffolding
available if the mirror is temporarily unavailable.
