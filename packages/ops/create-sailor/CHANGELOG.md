# create-sailor

## 1.10.1

### Patch Changes

- [`08c23c3`](https://github.com/Nebutra/Nebutra-Sailor/commit/08c23c373364f59dc979a486739a991259238c7f) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - `templates/infra/ops/platform-expected.example.json` gains `github.branchProtection[]` — the required status checks, up-to-date rule, admin enforcement and review count a protected branch must carry — so `scripts/ops/platform-reconcile.mjs` reports when the bar that decides "CI is green" changes in the GitHub UI. Read from `GET /repos/{owner}/{repo}/branches/{branch}/protection`; a token without `administration:read` reports the row as skipped, never as an error.

## 1.10.0

### Minor Changes

- [#489](https://github.com/Nebutra/Nebutra-Sailor/pull/489) [`57a76b0`](https://github.com/Nebutra/Nebutra-Sailor/commit/57a76b01a16063802cede6708b226b6e946ff3bc) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Ship the ops kits that came out of the 2026-09-02 convergence as scaffold assets:
  - `templates/tests/degradation.test.example.ts` — a gateway failure-mode suite: Redis unreachable or misconfigured falls back to the in-memory rate limiter instead of answering 500, health reports `degraded`, and a healthy Redis costs exactly one EVAL per request.
  - `templates/infra/ops/platform-expected.example.json` — the declaration format for `scripts/ops/platform-reconcile.mjs`, which checks Vercel project settings, Fly secret names, GitHub variables and Cloudflare Worker bindings against what the repo says they should be, daily, and fails loudly on drift.

  Also: the template no longer carries Nebutra-instance runbooks, DNS one-shots and VM ops workflows (`TEMPLATE.md`, "Instance vs product"), and the shared `deploy-vercel.yml` builds every app on the GitHub runner and uploads prebuilt output, so Vercel meters no build minutes.

## 1.9.6

### Patch Changes

- [`e9ced5c`](https://github.com/Nebutra/Nebutra-Sailor/commit/e9ced5c4c51c958752b4e2c860ac4132f202e6aa) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Align the published CLI surface with the MIT scaffold contract and stop leftover Aug 3 hotfix changesets from re-bumping already-shipped versions.
  - Backfill create-sailor 1.9.2–1.9.5 and nebutra 0.4.2–0.4.3 changelog entries the hotfix train skipped
  - Fix README, welcome-page, and template `package.json` copy still describing AGPL / get-license
  - Document `--audit-log` as default-off (`@nebutra/audit` is WIP)
  - Raise the create-sailor tsup target to Node 22 to match `engines`

## 1.9.5

### Patch Changes

- [`2a118b4`](https://github.com/Nebutra/Nebutra-Sailor/commit/2a118b477f4cf4467f107430d1b47a220a22ed86) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Strip Nebutra product apps, product CI/DNS, and product backends from the Sailor-Template surface. Raise the Node engine floor to `>=22` to match the monorepo.

## 1.9.4

### Patch Changes

- [`739439a`](https://github.com/Nebutra/Nebutra-Sailor/commit/739439a4781de645b153fe57f46f50f2a9193a4e) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Converge the first-run UX: compact plan summary with confirm/customize for payment · email · storage · deploy, a config-aware golden-path done screen, clearer install failures, and English region labels.

  Published as a patch on the 2026-08-03 hotfix train; the official changeset changelog was not generated.

## 1.9.3

### Patch Changes

- [`739439a`](https://github.com/Nebutra/Nebutra-Sailor/commit/739439a4781de645b153fe57f46f50f2a9193a4e) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Replace the path text prompt with a two-intent location flow: create in a new folder (name only, default `my-app`) or scaffold into the current directory. Prefer current when cwd is empty; refuse when a project already exists. CLI still accepts names, paths, and `.`.

## 1.9.2

### Patch Changes

- [`739439a`](https://github.com/Nebutra/Nebutra-Sailor/commit/739439a4781de645b153fe57f46f50f2a9193a4e) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Restore `npx create-sailor`. `1.9.1` shipped `"@nebutra/brand": "workspace:*"` as a production dependency, which npm cannot resolve (`EUNSUPPORTEDPROTOCOL`). Keep `@nebutra/*` as build-time devDependencies, bundle them via tsup `noExternal`, and reject monorepo-only protocols on CLI production deps in `verify:release-surface`.

## 1.9.1

### Patch Changes

- [`8acefae`](https://github.com/Nebutra/Nebutra-Sailor/commit/8acefae3b5f119ce650563a78ca089c8c7fecc83) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Align scaffolded `@nebutra/*` dependency ranges with monorepo package.json versions.
  - Make `packages/ops/preset/src/nebutra-package-versions.ts` the single source of truth
  - Re-export it from the `nebutra` and `create-sailor` CLIs (remove the stale CLI-local map)
  - Add `pnpm package-versions:sync` / `package-versions:check` and wire check into release

## 1.9.0

### Minor Changes

- Retire the scaffold-marker signing apparatus.

  The signed `.nebutra/scaffold-meta.json` marker existed for one reason: its
  presence and a valid HMAC were what conferred the Independent Developer
  License instead of AGPL copyleft. That tier was retired on 2026-07-26 and
  scaffolded projects are now MIT unconditionally, so the marker gated nothing
  and the cryptography protected nothing — while still costing a signing-key
  registry, a mirrored verifier, and a key-rotation runbook to maintain.

  Removed:
  - `nebutra license verify [path]` — the subcommand and its implementation
  - the signing-key registry and the CLI-side verifier that mirrored it
  - `POST /api/license/verify` on the marketing site, which had no callers
  - the key-rotation runbook

  `nebutra license activate <key>` and `nebutra license status` are unaffected —
  they handle paid support tiers, which still issue keys.

  The marker file itself stays, unsigned, as a provenance breadcrumb: which CLI
  version produced this project and when. It grants nothing, and deleting it
  costs a project no rights — the emitted file now says so in its own `purpose`
  field. Markers written by create-sailor <= 1.8.4 still carry `signature`,
  `nonce` and `signingKeyId`; nothing reads them any more, and their presence is
  ignored rather than rejected.

  Minor rather than patch: this removes a published CLI subcommand and a public
  HTTP endpoint.

## 1.8.4

### Patch Changes

- Updated dependencies []:
  - @nebutra/brand@0.1.2

## 1.8.3

### Patch Changes

- Ship the correct licence in scaffolded projects and in the package itself.

  Two licensing defects are fixed:
  - **The package declared `"license": "MIT"` while shipping the full AGPL-3.0
    text as its `LICENSE` file**, which `files` explicitly included. Every
    published tarball since the first release carried that contradiction. The
    `LICENSE` file is now MIT, matching the declared field.
  - **Scaffolded projects received the retired Independent Developer License**,
    complete with AGPL copyleft warnings, a ≤ 1 FTE limit, and a $799/year
    upgrade path. Scaffolded output is distributed inside this MIT-licensed
    package, so it is MIT — the emitted `LICENSE` now says so, and states
    plainly that commercial use is free with no registration or attribution.

  The upstream repository licence is preserved in the scaffold as
  `LICENSE-UPSTREAM-REFERENCE.md` (FSL-1.1-ALv2 today, AGPL-3.0 for checkouts
  from before 2026-07-26).

  `.nebutra/scaffold-meta.json` is demoted to provenance: it no longer gates any
  right, and its `purpose` string says so. Its `license.tier` value becomes
  `mit-scaffold`, but verifiers still accept the legacy `independent` value, so
  markers written by create-sailor <= 1.8.2 keep verifying.

## 1.8.2

### Patch Changes

- Maintain Sailor-Template CI profile and scaffold platform defaults:
  - Template mirror CI runs `template-contract` only (no full monorepo security
    audit on every sync push).
  - Align with auth-center single-entry login (`auth.nebutra.com`) docs and
    production URL defaults.
  - Inherit Next.js `^16.2.11` floor for current App Router security patches.

## 1.8.1

### Patch Changes

- Add first-class PlanetScale Postgres scaffolding via `--db-host=planetscale`.
  The host now keeps Prisma on the PostgreSQL engine, emits a pooled
  `DATABASE_URL` on port `6432`, emits a direct `DIRECT_URL` on port `5432`
  for migrations, and records `databaseHost` in `nebutra.config.json`.

- Preserve provider-specific database URLs during `.env.local` injection so a
  PlanetScale scaffold is not overwritten by the local Postgres fallback.

## 1.8.0

### Minor Changes

- [`4769338`](https://github.com/Nebutra/Nebutra-Sailor/commit/47693386093eb725158753e3ca3b16a632b6935b) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Maintenance + dependency upgrades:
  - Bump CLI dependencies: `commander` 12→15, `ignore` 5→7, `@clack/prompts` 0.7→1.5, `@mrleebo/prisma-ast` 0.15→0.16.
  - Raise the Node engine floor to `>=20.9.0` (Node 18 is EOL; `commander` 15 requires Node 20+).
  - Migrate `@clack/prompts` `validate` callbacks to v1's stricter `string | undefined` value type.
  - Drop an unused `@ts-expect-error` on the optional `@nebutra/analytics` import (was failing `tsc` with TS2578).

  CLI commands, flags, and scaffold behavior are unchanged.

## 1.7.3

### Patch Changes

- Publish registry package metadata under the MIT license.

## 1.7.2

### Patch Changes

- [`94adc0a`](https://github.com/Nebutra/Nebutra-Sailor/commit/94adc0ad7d305e92ef62411768b04f8fd79cdb48) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Close drift between the CLI/scaffolder surface and the current monorepo.

  `nebutra`:
  - Read VERSION from package.json at module load (was hardcoded "0.1.0"
    while published as 0.3.0, breaking --version and update-notifier).
  - Switch `@nebutra/theme` dep from `workspace:*` to published `^0.1.0`
    and bundle @nebutra/\* via tsup `noExternal` so the npm package runs
    standalone (the upstream @nebutra/theme ships .ts sources Node refuses
    to import from node_modules).
  - Replace stale `api-gateway` strings with `backends/gateway` in preset
    apps, test VALID_APPS, generate route description, and ai agents
    scanner comments (file paths were already correct).
  - Clean preset app lists to actual scaffolded apps: drop `admin`, `blog`
    (don't exist as scaffolded apps; were moved into feature flags), and
    rename `docs` → `sailor-docs`.
  - Extend `nebutra doctor` with monorepo-layout drift checks: legacy
    `apps/api-gateway/` warning, presence of `backends/gateway/`,
    categorized-packages enforcement (flag flat `packages/<name>/`),
    and `.nebutra/scaffold-meta.json` marker check.
  - Add `--category <design|iam|commerce|integrations|platform|ops|ai>`
    required option to `nebutra generate package`, placing new packages
    under the categorized layout `packages/<category>/<name>/`. Also
    point `generate component` at `packages/design/ui` (was the old
    pre-merger `packages/ui`).

  `create-sailor`:
  - Show the same `NEBUTRA_TELEMETRY` first-run banner that the runtime
    CLI shows, using a shared `~/.config/nebutra/first-run-acked` marker
    so the banner only fires once per machine across both tools. Users
    running `npm create sailor@latest` now see the opt-out notice on
    first scaffold, matching what the Privacy + Cookies pages document.

## 1.5.0

### Minor Changes

- **NEW: `--orm=drizzle` dual-ORM mode** — closes out the roadmap item from
  1.4.3 / 1.4.4. When the user picks `--orm=drizzle`, the scaffold adds a
  second package, `packages/platform/db-drizzle`, alongside the primary
  Prisma `packages/platform/db`. Both connect to the same `DATABASE_URL`;
  new code can opt into Drizzle's SQL-shaped query builder while existing
  auth / billing / audit / oauth flows keep working against Prisma. The
  Drizzle package ships with:
  - `drizzle.config.ts` targeting Postgres
  - `src/schema/{auth,tenant,billing}.ts` — read-mostly mirrors of the core
    Better Auth (user/session/account/verification/organization/member/
    invitation) + commerce (subscriptions/usage_ledger) tables
  - `db:generate` / `db:migrate` / `db:push` / `db:studio` scripts
  - A README that's explicit about the dual-ORM contract: **Prisma owns the
    schema and writes; Drizzle is for new code, read-mostly until enough
    consumers migrate to make a one-way swap worthwhile.**

  **What this is NOT:** a one-way swap of the scaffold to Drizzle. ~60
  files across `apps/web` / `backends/gateway` / `packages/commerce/*` /
  `packages/iam/*` / `packages/platform/repositories` were built on
  `PrismaClient` and would break wholesale. A real Drizzle-primary scaffold
  would require rewriting all of them; that's a separate ~3000-LOC effort
  with its own release.

  Postgres-only for now — `--orm=drizzle --db=mysql` (or sqlite) skips with
  a clear reason rather than shipping a broken adapter.

## 1.4.4

### Minor Changes

- **NEW: `--db-host` flag** — splits the database decision into two axes:
  `--db` chooses the ENGINE (postgresql / mysql / sqlite), `--db-host` chooses
  WHO operates it (supabase / neon / vercel-postgres / planetscale / railway /
  aliyun-rds / tencent-cdb / local / none). Each host has its own env-var
  block, Prisma datasource extras (e.g. PlanetScale's relationMode = "prisma"),
  and forced-engine override (PlanetScale = mysql regardless of --db). Smart
  defaults: region=global → supabase, region=cn → local. Previously the CLI
  pretended `--db=postgres` was a complete decision — but Supabase, Neon,
  Vercel Postgres etc. differ at the env-var and datasource level.

- **CacheClient interface + multi-backend** — `@nebutra/cache` was hardcoded
  to `@upstash/redis`. New `CacheClient` interface (get / set / del — the
  audited surface) with two adapters: `UpstashRedisCacheClient` (HTTP REST,
  default) and `IoredisCacheClient` (TCP, for self-hosted Redis / Dragonfly /
  Vercel KV / Redis Cloud). Auto-detects backend from `UPSTASH_REDIS_REST_URL`
  vs `REDIS_URL`, override via `CACHE_BACKEND`. ioredis adapter does
  JSON-(de)serialization so callers see the same structured-value contract.
  All four strategies (ttlCache / lockCache / stampede / lazyRefresh) updated
  to use `CacheClient`. Downstream typecheck verified (gateway-core /
  feature-flags / rate-limit).

### Patch Changes

- **Fix `removePackageDir` static-path bug** — `env-helpers.ts:removePackageDir`
  was hardcoded to `packages/<pkgName>` flat. Categorized monorepo means every
  applier using it (notifications / webhooks / feature-flags / captcha / cms)
  silently no-op'd. New `resolvePackageDir(targetDir, pkgName)` scans
  packages/{design,iam,commerce,integrations,platform,ops,ai}/<pkgName> +
  legacy flat fallback. Same fix applied to search.ts / queue.ts / cache.ts
  apply functions (each had their own hardcoded flat path).
- **Drizzle scope honesty** — `--orm` accepts any value but normalises to
  `prisma`. Help text now says "prisma (only — the scaffold uses Prisma)".
  Removed pretense that drizzle/none silently work; real Drizzle support is
  on the roadmap as a separate ~400 LOC piece.

### Net effect

After 1.4.4 publishes, the previously-silent appliers (notifications, webhooks,
feature-flags, captcha, cms) actually mutate the scaffold. The `--db-host`
question moves from invisible-default to explicit user choice. And the
`@nebutra/cache` package can run against any Redis-protocol backend, not just
Upstash.

## 1.4.3

### Patch Changes

- **Implement pgvector search provider** — Real `PgvectorProvider` in
  `@nebutra/search/src/providers/pgvector.ts`. Creates `vector` extension,
  bootstraps per-index tables with GIN (tsvector) + ivfflat (vector cosine)
  indexes. Routes between BM25 keyword and vector cosine search based on
  whether the query passes `filters._embedding`. Tenant-scoped via
  `tenant_id` column. Configurable embedding dim + table prefix.
- **Implement Knock notifications provider** — Real `KnockProvider` in
  `@nebutra/notifications/src/providers/knock.ts`. Uses Knock's HTTP API
  directly (no SDK dep) so it doesn't drift with `@knocklabs/node` releases.
  Covers send / sendBatch / getInAppNotifications / mark-as-read /
  preferences. Per-channel overrides passed through `data.__nebutra_overrides`
  so workflow templates can read them.
- **--orm help text honesty** — `--orm` now says `prisma (default)` and
  explicitly notes drizzle / none are not yet implemented. The scaffold
  always uses Prisma regardless of this flag's value; full Drizzle support
  is its own scope and deferred.

### Deferred to 1.4.4+

- `@nebutra/cache` multi-backend refactor (currently Upstash-only; the
  CLI's `--cache=vercel-kv|redis|dragonfly` options set the env var but
  the package's client.ts + strategies hardcode the `@upstash/redis`
  client). Real fix requires interface design + wrapping `ioredis` to
  match the methods used by strategies + downstream consumer updates.

## 1.4.2

### Patch Changes

- **Fix `--auth=*` silently no-op'd against categorized monorepo** — `applyAuthSelection` was still looking for `packages/auth` but the W3b reorg moved it to `packages/iam/auth`. Same fix for `--payment=*` (`packages/billing` → `packages/commerce/billing`) and `--db=*` (`packages/db` → `packages/platform/db`). All three CORE-STACK pickers now actually mutate the scaffold.
- **Fix `--ai=gateway` mapping** — the topology shorthand strings (`gateway` / `direct` / `custom` / `none`) were being silently parsed as provider IDs, producing a registry with a fake provider named "gateway". Now correctly routed to `resolveAiTopology({mode})` with the right default seed.
- **Add SQS queue provider** — real adapter using `@aws-sdk/client-sqs` for enqueue + long-poll receive + handler dispatch + DeleteMessage. Previously `--queue=sqs` was a vapor option that would crash at runtime.
- **Remove Upstash Kafka** — Upstash discontinued the Kafka product in 2024. Removed from the queue meta + CLI `--queue` enum.

### Deferred to 1.4.3+

These vapor-or-incomplete options were flagged in the audit but NOT fixed in this release; they remain in the CLI with caveats:

- `--search=pgvector` — needs a real adapter in `@nebutra/search/src/providers/pgvector.ts`
- `--notifications=knock` — needs a real adapter in `@nebutra/notifications/src/providers/knock.ts`
- `--cache={vercel-kv,redis,dragonfly}` — `@nebutra/cache` is hardcoded to Upstash; only `upstash-redis` actually works today
- `--orm=drizzle` / `--orm=none` — Prisma is the only working ORM; these flags are silently ignored

## 1.4.1

### Patch Changes

- **Fix `ENOENT: .env.example.template`** — `git add -A` in the mirror sync workflow was silently filtering out `.env.example.template` because the root `.gitignore`'s `.env.*` rule matched it. Added `!*.template` exemption so all `.template` files reach the mirror. Without this fix, every `npx create-sailor@latest` run crashed during AI provider scaffolding.
- **Fix categorized-layout path drift in dist** — the published `1.4.0` dist still referenced the pre-categorization `packages/ai-providers/` path. Source was correct since the W3b layout migration but dist wasn't rebuilt. Now rebuilt against `packages/ai/ai-providers/templates`.
- **Add pnpm pre-check** — CLI now refuses to scaffold if pnpm is unavailable and prints the install command instead of failing mid-scaffold.
- **Improve post-scaffold next-steps** — final hint now shows `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` as one block so users don't have to copy four separate snippets.

## 1.3.6

### Minor Changes

- Sync the CLI with the wave 3-5 features shipped across `apps/web`, `apps/landing`, and `packages/*`:
  - **Mail** — Resend + React Email templates rendered through `@nebutra/email`, mail-preview app refresh.
  - **Cron jobs** — scheduled handlers wired through `@nebutra/queue` + `vercel.json` crons. Toggle with `--cron-jobs=<bool>`.
  - **Billing polish** — pricing-plan grid, checkout route, active-plan endpoint, plan-aware UI gates.
  - **Auth expansion** — magic link, passkeys, set-password, forgot/reset-password, verify-email, email change verification flows.
  - **App shell + onboarding** — design-system shell provider, create-workspace step, refreshed not-found and global-error.
  - **Admin** — organizations + users admin pages, `/api/admin/impersonate` route + tests.
  - **Audit log** — `/settings/audit-log` viewer + architecture test. Toggle with `--audit-log=<bool>`.
  - **API keys** — `/settings/api-keys` lifecycle page. Toggle with `--api-keys=<bool>`.
  - **Notifications** — multi-channel preferences page + in-app inbox.
  - **Webhooks** — `/settings/webhooks` management surface backed by `@nebutra/webhooks`.
  - **Command palette** — ⌘K palette across the dashboard. Toggle with `--command-palette=<bool>`.
  - **Cookie consent + legal** — GDPR/CCPA banner and dynamic `/legal/[slug]` rendered from `@nebutra/legal`. Toggle with `--cookie-consent=<bool>` and `--legal-pages=<bool>`.
  - **GDPR data export** — `/settings/account/export` and `/api/account/*` routes.
  - **China compliance** — new `@nebutra/china-compliance` package (ICP footer, region detection, WeChat OAuth scaffolding). Toggle with `--china-compliance=<bool>`; auto-enabled when `--region=cn`.
  - **SEO + landing polish** — Vercel-style soft section anchoring, refreshed metadata, registry phase 1 components.
- Done card now surfaces a "What you can do next" section with deep links into the new settings pages.
- `package-status.ts` registers `@nebutra/china-compliance` as `foundation` so the CLI prints the readiness banner when it is enabled.

## 1.3.3

### Patch Changes

- Fix provider template generation and refresh create-sailor onboarding docs and help examples.

## 1.3.2

### Patch Changes

- [#57](https://github.com/Nebutra/Nebutra-Sailor/pull/57) [`1cd5e0e`](https://github.com/Nebutra/Nebutra-Sailor/commit/1cd5e0efbe9ef61bed123fa12543d7f1f3d31b08) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Ship the refreshed scaffold onboarding guidance and harden remote template fetching to use immutable GitHub archives with trusted publishing-ready release plumbing.
