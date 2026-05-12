# create-sailor

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

- Sync the CLI with the wave 3-5 features shipped across `apps/web`, `apps/landing-page`, and `packages/*`:
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
