# ops/nebutra — Nebutra-instance-only configuration

Nebutra-Sailor is two things in one tree: the source of the public **Sailor
template** (mirrored to `Nebutra/Sailor-Template` by `sync-template.yml`) and
the codebase behind **one deployment of it** — Nebutra's own. Most of the repo
belongs to the template. A small part belongs only to the instance: Nebutra's
Fly organisation, its DNS zone, its Vercel team, its ECS host, its bills.

This directory is the declared home for the instance-only *configuration*
side of that split. Anything committed here is stripped from the template by
the `/ops/` rule in `.templateignore` and never reaches a scaffolded project.

## What belongs here

Config that names a Nebutra account, host or resource and would be wrong in
anyone else's deployment:

- Fly org / app bindings and per-app secrets manifests (names, never values)
- DNS record overrides for the `nebutra.com` zone beyond what
  `infra/ops/dns/topology.defaults.yaml` derives from the brand config
- Vercel team / project id maps, Cloudflare account and zone ids
- Host inventories (ECS, VMs) and their PM2 / nginx process maps

## What does not belong here

- Runbooks and history — `docs/ops/nebutra/`
- Architecture tests that assert facts about the Nebutra instance —
  `tests/architecture/nebutra/`
- Generic infra that any deployment uses with its own values — `infra/`
- Secrets. Names of secrets are fine; values are never committed anywhere.

## The boundary, in three places

| Kind | Instance (stripped) | Product (shipped) |
| --- | --- | --- |
| Config | `ops/` | `infra/` |
| Docs | `docs/ops/nebutra/` | `docs/ops/` |
| Tests | `tests/architecture/nebutra/` | `tests/architecture/` |

Workflows and Fly manifests have no directory split, so `.templateignore`
lists them one by one; the rule is that a workflow ships in the template only
when it carries no Nebutra instance literal.

Guarded by `tests/architecture/template-boundary.test.ts`, which builds the
template and scans the output, and by `node scripts/template-check.ts`.
