# ADR - Package Subrepo Mirror Distribution

**Status**: Accepted
**Date**: 2026-06-03
**Driver**: Make Nebutra infrastructure packages visible as reusable public projects without splitting the monorepo source of truth.

---

## Context

Nebutra currently publishes reusable infrastructure through npm and GitHub Packages from `Nebutra/Nebutra-Sailor`. That is technically correct, but it hides high-value packages behind the organization packages page. External users tend to evaluate public GitHub repositories first: repo cards, topics, README quality, issues, forks, and commit activity are stronger trust signals than package listings alone.

The monorepo still matters. `Nebutra-Sailor` owns cross-package contracts, release orchestration, supply-chain checks, package dependency governance, and integrated app consumers. Moving package ownership into many independent repos would create version drift and weaken the app/template integration.

## Decision

Nebutra will use three distribution surfaces:

1. **Canonical source**: `Nebutra/Nebutra-Sailor`.
2. **Install surface**: npm and GitHub Packages.
3. **Discovery and contribution surface**: generated public subrepo mirrors under `Nebutra/<repo>`.

Subrepo mirrors are generated from `config/subrepo-mirrors.json`. The mirror generator copies the package source, rewrites `workspace:*` and `catalog:` dependency ranges into published package versions, rewrites standalone `tsconfig` inheritance, adds mirror metadata, and creates a minimal CI workflow. Mirrors are force-synced from the monorepo; they are not independent source repositories.

The first wave prioritizes packages with clear external reuse and strong public storytelling:

- AI/runtime: `@nebutra/agents`, `@nebutra/mcp`, `@nebutra/tool-registry`, `@nebutra/code-execution`, `@nebutra/sandbox-runtime`
- Design system: `@nebutra/ui`, `@nebutra/tokens`, `@nebutra/icons`, `@nebutra/fonts`
- Platform/integrations: `@nebutra/logger`, `@nebutra/errors`, `@nebutra/provider-factory`, `@nebutra/cache`, `@nebutra/email`, `@nebutra/webhooks`

## Operating Contract

- Code changes land in `Nebutra-Sailor` first.
- Releases continue through Changesets from the monorepo.
- Subrepo mirrors are synced after source changes or manually through `sync-subrepo-mirrors.yml`.
- External issues and PRs may be opened in subrepos, but accepted changes are ported into the monorepo source package before release.
- Mirror repositories must include a generated `NEBUTRA_SUBREPO.md` marker so maintainers and users can see the source-of-truth boundary.

## Commands

```bash
pnpm verify:subrepo-mirrors
pnpm subrepo:create -- --cohort=first-wave
pnpm subrepo:create -- --cohort=first-wave --apply
pnpm subrepo:sync -- --cohort=first-wave --all --out=/tmp/nebutra-subrepo-mirrors
pnpm subrepo:sync -- --package=@nebutra/agents --out=/tmp/nebutra-agents
```

Use `--push` only when the target repositories exist and a `SUBREPO_MIRROR_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN` can push to those repositories.

## Guardrails

- Do not edit generated subrepo content by hand as the canonical fix.
- Do not add private packages to the mirror manifest.
- Do not mirror packages with unresolved private runtime dependencies.
- Do not hide GitHub Packages drift by allowlisting orphan packages. Delete stale packages only as an explicit external-state operation.
- Do not move package release ownership away from Changesets until the monorepo package graph has an alternate release authority.

## Consequences

Positive:

- Package value becomes visible in the organization repository list.
- npm, GitHub Packages, and source mirrors point to the same maintained package line.
- External users can clone a focused package repo and inspect code without navigating the full monorepo.

Negative:

- Mirrors require periodic sync and repo metadata governance.
- PR intake can happen in two places, so maintainers must keep the source-of-truth rule explicit.
- Package READMEs may need stronger standalone examples to convert discovery into adoption.

## Follow-Up

- Backfill package READMEs for high-traffic mirrors (first-wave still highest leverage).
- Add adoption metrics after the mirrors are live (clones, npm installs, inbound PRs).
- ~~Graduate `@nebutra/queue` after optional private `@nebutra/db` boundary extraction~~ — done (`configure` DI).
- ~~Second-wave and later cohorts~~ — graduated through seventh-wave libraries + eighth-wave CLIs; hard Install/Build/Typecheck gates green.

### Cohort inventory (as of 2026-08)

| Cohort | Role |
|---|---|
| first-wave | AI runtime + design system + platform primitives |
| second-wave | IAM + integrations + design languages |
| third-wave | Queue, stores, contracts, knowledge primitives |
| fourth–sixth | Commerce, pipelines, agent product surfaces |
| seventh-wave | `ai-providers`, `forge-runtime`, `design-tokens` |
| eighth-wave | Published CLIs (`create-sailor`, `nebutra`) |
