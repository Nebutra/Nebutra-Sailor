# tsekaluk-dev extraction (2026-07-27)

`apps/tsekaluk-dev` was removed from the Nebutra-Sailor monorepo and lives at:

**https://github.com/TsekaLuk/tsekaluk-dev** (private)

## Status

| Date | Event |
| --- | --- |
| 2026-07-27 | ADR written; intended monorepo deletion |
| 2026-07-28 | **Completed on `main`**: tree, brand sync, SEO arch tests, lockfile, docs — app no longer under `apps/` |

Do **not** re-add `apps/tsekaluk-dev` to this monorepo. Product deploys must not depend on its `package.json` / lockfile importers.

## Why

Personal portfolio/editorial site should not share deploy, i18n, and CI coupling
with the product monorepo. A half-extracted tree (ADR said gone, `apps/*` still
scanned the folder) once broke **frozen-lockfile** installs and blocked forge/router ECS deploys.

## Coupling that was broken

| Was (monorepo) | Now (standalone) |
| --- | --- |
| `workspace:*` @nebutra packages | Published npm `@nebutra/*` where available |
| `@nebutra/i18n/*` | Local `@/lib/i18n-locales` + path LanguageSwitcher |
| `@nebutra/analytics/posthog` | Local `@/lib/analytics/posthog` |
| `@nebutra/db/pool` | Local `@/lib/db-pool` |
| Vercel monorepo ignore script | App-local `vercel.json` |
| `pnpm-lock.yaml` importer | Removed — monorepo lock no longer tracks portfolio deps |

## Monorepo cleanup (2026-07-28)

- Deleted `apps/tsekaluk-dev/`
- Dropped from `packages/design/brand/scripts/sync-assets.ts` app list
- SEO architecture tests: no longer INDEXABLE as monorepo app
- Landing architecture diagram data: entry removed
- README / sailor-docs structure mentions updated
- `pnpm install` lockfile resynced without the app
