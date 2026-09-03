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

## Instance vs product — the declared boundary

The repo is also **one deployment** of the template: Nebutra's. Anything that
is true only for that deployment — its Fly apps, its DNS zone, its Vercel team,
its ECS host, its bills — is *instance* content, and it has three declared
homes so the split is a directory rule rather than a growing file list:

| Kind | Instance (stripped) | Product (shipped) |
| --- | --- | --- |
| Config | `ops/` ([`ops/nebutra/README.md`](./ops/nebutra/README.md)) | `infra/` |
| Runbooks | `docs/ops/nebutra/` | `docs/ops/` |
| Architecture tests | `tests/architecture/nebutra/` | `tests/architecture/` |

Workflows and Fly manifests have no directory split, so `.templateignore`
names them one by one. The rule: a workflow or manifest ships in the template
only when it carries no Nebutra instance literal (a `nebutra.com` host, a
`nebutra-*` Fly or Worker app, the ECS IP, the Vercel team id). Every
`infra/fly/*.toml` whose `app` starts with `nebutra-` is listed; brand
replacement does not rewrite Fly app names.

`tests/architecture/template-boundary.test.ts` builds the template with
`scripts/template-build.ts` and asserts the output has none of those
directories, none of those workflows or manifests, and no Nebutra identifier
(`nebutra.com` and its subdomains, `nebutra-gateway` / `-auth` / `-web`,
`nebutra-*.fly.dev`, the ECS IP, the Vercel team id, the GitHub slug) in any
shipped file outside `tests/architecture/template-residue.baseline.json`. The
hosts and the IP count in their regex-escaped form too (`api\.nebutra\.com`
inside a URL matcher). That baseline was generated once from the build and may
only shrink: a new carrier fails, and so does an entry that no longer matches.
Adding a Nebutra host, IP or account id to a file that ships fails that test;
the fix is to move the file into one of the three homes or list it in
`.templateignore`, not to add a baseline entry. The one rule-based exemption is
the source-repo slug in `package.json` `repository` / `bugs` / `homepage` and
`.changeset/config.json`. Text files over 1 MiB are outside the scan — today
that is `pnpm-lock.yaml` alone, pinned in the test so a new one has to be
classified. Local runs skip gitignored files (they never reach the mirror,
which CI builds from a clean checkout); CI is authoritative.

When a shipped doc has to point at instance content (a runbook, an instance
test, a stripped script or deploy kit), mark the link "(source repo only)" so a
template consumer knows the target is absent by design, not by accident.

## What is preserved

- Every `packages/*` primitive (UI, tokens, queue, search, metering, vault, …)
- Scaffold apps: `web`, `landing` (shell), `idp`, `mail-preview`, `storybook`,
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

## Sailor version

The core and runtime graph — every publishable package whose `nebutra.graph`
is `core` or `runtime` — publishes in lockstep as one **sailor version**.
`.changeset/config.json` lists those packages in a single `fixed` group, so
`changeset version` moves all of them to the same number whenever any one of
them carries a changeset. Labs packages and the unscoped CLIs (`create-sailor`,
`nebutra`) keep their own versions: they have their own publish identity and
cadence, and must not drag the graph with them.

`scripts/sailor-version.mjs` owns the group; the config file is a projection
of it:

```bash
node scripts/sailor-version.mjs            # current sailor version (highest in the group)
node scripts/sailor-version.mjs --group    # the packages, one per line
node scripts/sailor-version.mjs --check    # exit 1 when config.json's fixed group drifts
node scripts/sailor-version.mjs --write    # regenerate the fixed group
```

`tests/architecture/sailor-version.test.ts` runs the check, so a new core or
runtime package must join the group before it merges — or declare a different
`nebutra.graph`, if the classification is what is wrong.

The template build stamps the same number into `.sailor-template.json` as
`sailorVersion`, and `sync-template.yml` tags the mirror `v<sailorVersion>`
on the first sync that carries that version. The tag is never moved: later
syncs at the same version keep it where it is, and `source-<sha>` still marks
every sync individually. `SAILOR_TEMPLATE_REF=v<sailorVersion>` therefore
scaffolds from the tree that first carried those package versions.

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
