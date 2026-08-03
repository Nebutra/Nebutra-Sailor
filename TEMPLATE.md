# Template Architecture

This repo is **both** Nebutra's live product codebase **and** the template that
ships via `npm create sailor@latest`. A single `.templateignore` file separates
the two concerns: when a user scaffolds a new project, Nebutra's business
content is stripped and only the reusable skeleton remains.

## How it works

```
npm create sailor@latest my-app
   │
   ▼
packages/create-sailor fetches the repo tarball (shallow, fast)
   │
   ▼
Reads .templateignore from the cloned dir
   │
   ▼
Deletes every path matched by the ignore patterns (gitignore syntax)
   │
   ▼
Removes .templateignore itself
   │
   ▼
Runs configured prune step (ORM / i18n / app type)
   │
   ▼
my-app/ contains only the reusable skeleton
```

## What gets stripped

- **Marketing / legal** — landing marketing + legal routes and brand assets
- **Dashboard business pages** — admin, billing, tenants, chat, feature-flags, …
- **Nebutra product apps** — `forge`, `router`, `pebble`, `typelens`, `design`,
  `admin`, `auth` (auth-center), `sleptons`, `studio`, `sailor-docs`
- **Product backends / infra** — `backends/go`, `backends/rust`,
  `infra/nebutra-router`, gateway routes for pebble / startup-os
- **Product CI / DNS** — `deploy-pebble*`, `deploy-carina*`, `point-*-dns`, …
- **Press / PR** — `marketing/`, `changelog/`
- **Internal planning / governance** — `docs/plans/`, `governance/*.current.json`
- **Build artifacts** — `artifacts/`, `playwright-report/`, `test-results/`
- **Env + locks** — `.env*` (except `.env.example`), `openstatus.lock`

## What is preserved

- Every `packages/*` primitive (UI, tokens, queue, search, metering, vault, …)
- Scaffold apps: `web`, `landing` (shell), `idp`, `mail-preview`, `storybook`,
  `design-docs` (shell without Nebutra content)
- App shells: `layout.tsx`, `globals.css`, `package.json`, `next.config.ts`
- Build config: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `biome.json`
- The `create-sailor` CLI itself
- API gateway core (`backends/gateway`, minus product-only routes)
- Python AI backend tree when present (`backends/python`)
- `e2e/` and `tests/` (skeleton tests, minus Nebutra-only specs)
- Generic CI: `ci`, `codeql`, `secrets-scan`, `dependency-review`, …

> **Contract:** Sailor-Template is a *skeleton monorepo*, not a fork of every
> Nebutra product surface. Product apps stay in `Nebutra-Sailor` only.

## Adding new Nebutra business code

When you add new Nebutra-owned business code (a new landing section, a new
admin page, a new changelog post, a new brand asset), **add it to
`.templateignore` in the same commit**. Use gitignore syntax.

Example — adding a new landing section `ComparisonMatrix.tsx` is already
covered by the existing rule:

```
apps/landing/src/components/landing/
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

## Why not a separate template repo?

A separate template repo drifts — it goes stale the moment Nebutra ships a
real feature. By making the product repo itself the template source and
letting `.templateignore` carve out the reusable subset, every change Nebutra
ships to its own product also benefits scaffolded projects, and vice versa.
