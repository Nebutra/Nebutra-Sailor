---
"nebutra": patch
"create-sailor": patch
---

Fix the CLI's "customer path": running `nebutra` (via `npx` or a global install) from inside a project scaffolded by create-sailor no longer breaks.

- Root resolution (`findMonorepoRoot`) now walks up from `process.cwd()` — never from the CLI's own install location under `node_modules` — checking `nebutra.config.json`, then `pnpm-workspace.yaml`, then a `package.json` with `workspaces`. Every delegating command (`doctor`, `env`, `db`, `infra`, `services`, `i18n`, `generate`, `e2e`, `ui`) was audited and fixed. When no project root is found, commands fail fast with a clear message and a `create-sailor` suggestion instead of silently resolving to the wrong directory.
- `db status` (and every other Prisma-backed `db` subcommand) no longer hangs: it now runs non-interactively with a 20s timeout, and checks for a configured `DATABASE_URL` up front with a clear error instead of letting `npx prisma` block on an unreachable database or an interactive install prompt.
- `--format json` now actually works on `db status`, `infra status`, `services status`, and `env <verb>` — it was previously captured by the root program's global `--format` option and silently discarded by each subcommand's own (never-reachable) local default.
- `infra status` falls back to plain `docker compose ps` on older Docker Compose that rejects `--format json`, and every `infra`/`services` command now reports "Docker not found" / "Docker daemon not running" instead of a raw stderr dump.
- `services` description and health checks no longer reference deleted services (meilisearch, novu, openfga); the service list is now read from `docker-compose.yml`. Added `services list` as an alias of `services status`.
- `ui search`/`component`/`validate`/`migrate` degrade with a clear, accurate message when the (Nebutra-internal, non-scaffolded) UI agent manifest isn't present, instead of pointing at a `build:registry` script that doesn't exist.
- `nebutra license` no longer claims to unlock "premium CLI features" — Sailor scaffolds are MIT-licensed and nothing in the CLI is gated by a license key; `activate`/`status` now say so honestly.
- `create-sailor`'s done screen and welcome page no longer tell users to run `pnpm db:seed` (it doesn't exist). The must-do path is now `nebutra status` then `pnpm dev` (http://localhost:3001); `infra:up`/`db:migrate` are called out as optional, for when you want your own Postgres.
