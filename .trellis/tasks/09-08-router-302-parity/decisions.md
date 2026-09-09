# Amendments to research/prd.md — verified against the repo, 2026-09-09

The critic (`research/critique.md` §2.1–2.3) found three defects in the PRD. Each was
checked directly against the code. These amendments override the PRD where they conflict.

## A1 — Wallet keying: the PRD's conclusion is right, its reason is incomplete

**Verified**
- `schema.prisma:1320` — `CreditBalance.tenantId String @unique`, FK to `Tenant`. So keying by
  `Tenant.id` (personal or org) is correct; `our-router.md` §7.2, `gap-analysis.md` §9.2 and
  `entity-model.md` §15.3 are wrong to call this a blocker.
- `packages/commerce/billing/src/db.ts:39` — `requireTenantDb(organizationId)` is only a
  host-injected getter; the parameter name is cosmetic. It delegates to whatever
  `configureBillingTenantDb()` was given.
- `packages/platform/db/src/client.ts:348` — `getTenantDb(tenantId)` accepts any non-empty
  string and sets `app.current_tenant_id` for RLS. A personal tenant id works.

**The real work the PRD missed**
1. **Router never bootstraps billing.** `configureBillingTenantDb(getTenantDb)` is called in
   `apps/web/src/instrumentation.ts`, `backends/gateway/src/index.ts` and
   `apps/kuanlan/src/lib/credits.ts` — and nowhere in `apps/router`. Without it every credits
   call throws "requires a host tenant DB". Batch A must add this to a Router bootstrap.
2. **`balanceCache` is a module-level `Map`** (`credits/service.ts:86-126`, TTL-based) — a
   per-instance cache in front of the number the admit/guard depends on. Batch A must either
   bypass it on the guard path or call `invalidateCreditCache(tenantId)` inside the same
   transaction as every debit. A stale positive balance on a second instance is an overdraw.
3. RLS policies on `credit_balances` must be confirmed to filter by `tenant_id` for a personal
   tenant before the guard is trusted; add it to the PostgreSQL integration test in Batch A.

## A2 — No third request store: extend `RequestLog`, do not add `RouterRequestLog`

**Verified**: `schema.prisma:834` `RequestLog` (`ai_request_logs`) already carries
`requestId @unique`, `apiKeyId`, `tenantId`, `model`, `promptTokens`, `completionTokens`,
`totalTokens`, `cost Decimal(10,6)`, `latencyMs`, `status`, `errorMessage`, `createdAt`, and
indexes `(tenantId, createdAt)`, `(apiKeyId)`, `(model, createdAt)`.

PRD §7.4 proposes `RouterRequestLog` whose columns are a superset by six fields, in a batch
whose stated purpose is to end "two ledgers, no join". **Decision: delete §7.4.** Batch B adds
`ttfbMs`, `cachedPromptTokens`, `cacheWriteTokens`, `supplyPath`, `clientIp`, `expiresAt` to
`RequestLog`, and the Router edge writes it. `UsageLedgerEntry` stays the money record (D1),
`RequestLog` becomes the one per-request log for both relays — which is the join the gap
analysis asked for, not a third store.

## A3 — Vendor/brand is an entity (entity-model §1.1 wins over the PRD)

The shelf's whole navigation is `cate → tag → brand` and 302 serves brand `name`, `count`,
`description`, `logo` from its category tree (captured in `302-category-tree.zh.json`). A
string column cannot carry a logo or a description. Batch D models `Brand` as a row keyed by a
normalised `key`, with `role: AUTHOR | HOST | BOTH` per OpenRouter's author/provider split.

## A4 — Sequencing consequence

Batch A's scope grows by the billing bootstrap and the cache-correctness work (A1), and shrinks
by one table (A2). Batch A stays the first batch.

## A5 — `models[]` failover forces a body-handling split (found while prepping Batch A part 2)

`packages/platform/router-supply/src/proxy.ts` `proxyChatCompletions()` is usable and generic
(it POSTs to `target.url`; the name is narrower than the code), but it takes
`body: Record<string, unknown>` and `JSON.stringify`s it. The current edge streams the raw body
through (`init.body = request.body`, `duplex: "half"`).

Reading `models[]` requires parsing the body, so the edge cannot stay purely streaming. Rule for
Batch A part 2:

- JSON request **with** `models[]` → parse, buffer, run the fallback chain.
- Everything else (no `models[]`, or a non-JSON body such as `multipart/form-data` on
  `images/edits` and `audio/transcriptions`) → stream raw, exactly as today.

Buffering must stay bounded; reuse the existing 4 MB tee cap as the ceiling and fall back to
streaming above it rather than holding an unbounded body in memory.

## A6 — Migration SQL is history, not the apply path (verified 2026-09-09)

Batch A part 1 flagged that its hand-written `20260909000000_router_money_spine/migration.sql`
could not be machine-diffed (no local shadow database). Checked how migrations actually reach
production:

- CI's "Database Schema Check" (`.github/workflows/ci.yml`) runs `prisma db push` then
  `migrate diff --from-config-datasource --to-schema`. It verifies **schema.prisma against a
  freshly-pushed database** — it never replays the `migrations/` directory. So a wrong
  migration file would not fail CI.
- `.github/workflows/ops-database-migrate.yml` chooses its mode from the live database: with a
  `_prisma_migrations` table it runs `migrate deploy`, without one it runs `db push`. Production
  has none (it was shaped by `db push`), and the workflow has a `dry_run` that prints the plan
  and stops.

**Consequence**: the SQL file is documentation and future-history, not the apply path. The
authoritative artifact is `schema.prisma`, which was verified field-by-field against the SQL and
matches. Do not spend more effort hand-verifying migration SQL in later batches; do always run
`ops-database-migrate` with `dry_run` first (see the production-database memory note).

## A7 — Infrastructure completed: `@nebutra/db/testing` (2026-09-09)

Batch A's definition of done requires a PostgreSQL integration test proving concurrent calls
cannot overdraw a balance. The capability existed but was unreachable:

- `packages/platform/db/__tests__/support/rls-sql-client.ts` already had a **dual-backend** SQL
  harness — PGlite (Postgres as WASM, no service) always, plus a real PostgreSQL in a throwaway
  schema when `RLS_ATTACK_DATABASE_URL` or a localhost `DATABASE_URL` is reachable.
- It lived in a `__tests__/` directory, so no other package could import it. Every money-path
  test would otherwise have been skipped locally or mocked.

**Fix**: promoted verbatim to `packages/platform/db/src/testing.ts` and exported as
`@nebutra/db/testing` (`SqlClient`, `availableBackends`, `createPgliteClient`,
`createPostgresClient`, `localhostDatabaseUrl`, `becomeTenant`, `randomRoleName`). The old path
re-exports it, so the three existing RLS suites are unchanged — 318 db tests still pass. The
default throwaway schema prefix generalised `rls_attack` → `nebutra_test`.

Verified from a consumer package: `import("@nebutra/db/testing")` resolves, PGlite opens, and a
conditional debit (`UPDATE … WHERE balance >= x RETURNING`) — the exact shape the overdraw guard
needs — runs with no service started.

**Consequence**: SQL-level guarantees are now testable from any package with
`describe.each(availableBackends())`. Money-path tests must not be skipped for want of a
database. `@electric-sql/pglite` stays a devDependency of `@nebutra/db` (resolves for workspace
consumers, absent from the published tarball).

## A8 — Migration history has no baseline, and a naive one would drop RLS

While checking A6: the 36 migrations contain no `CREATE TABLE organizations` — the initial
schema came from `db push`, so the directory genuinely cannot replay from empty. The obvious fix
(generate a baseline with `migrate diff --from-empty --to-schema-datamodel`) is **unsafe**: RLS
policies are not expressible in `schema.prisma`, so a generated baseline would silently drop
every policy the `enable_rls` and `rls_full_tenant_coverage` migrations install. That is why CI
verifies `db push` output instead of replaying history.

Do not "fix" this by generating a baseline. If migration replay is ever wanted, the baseline must
be `pg_dump --schema-only` of a correct database, not a Prisma-generated script.

## A9 — Stranded holds were silent money loss; fixed, not deferred (2026-09-09)

Batch A part 2 reported this as a Batch B follow-up. It is not deferrable, so it was fixed
immediately. Verified in the code first:

`billing-edge.ts admit()` takes a hold via `RouterBillingRepository.reserve()`
(`router-billing.repository.ts` L152-179), which is a **bare conditional decrement** on
`credit_balances`; `release()` is a bare increment. Nothing records that the money is held.

Failure mode: the process dies between `admit()` and `settle()` — a Fly deploy restart, an OOM, a
crash, during a request the edge allows to run up to 180 s. The customer's balance stays reduced,
no ledger row explains it, and nothing can find it to refund. Fly restarts machines on every
deploy, so this is normal operation, not a disaster scenario.

Fix: a `RouterReservation` row keyed by the request id, inserted in the same transaction as the
decrement and deleted in the same transaction as the settle, so the record brackets the money
exactly. Two sweeps: opportunistic (an `admit()` first releases that tenant's expired holds, so an
active customer is made whole on their next call with no scheduled job) and global (an Inngest
cron alongside `pebbleDiagnosticsRetention`, for tenants who stop calling). Every swept refund
writes a credit transaction, so no balance ever moves without a trace.

## A10 — Multipart endpoints are post-paid; require a positive balance

Part 2's own report: `images/edits`, `images/variations`, `audio/transcriptions` and
`audio/translations` take `multipart/form-data`, and the model name is a form field that cannot be
read without consuming the upload stream. So no price is knowable at admit time and no hold is
taken — these endpoints are post-paid.

Consequence as shipped: a key with a **zero balance** can call them indefinitely, bounded only by
the rate limit. That is unbounded free usage.

Decision: do not buffer uploads to read the model (it would hold whole files in memory for a price
lookup). Instead **admit a multipart request only when the balance is positive**, refusing with
`402 insufficient_balance` otherwise, and settle post-paid as today. One call may still overshoot
into a small negative; unbounded free usage cannot happen. Recorded here and implemented as a
follow-up to A9.

## A11 — Accepted, with reasons

- **Settlement may go slightly negative** when actual usage exceeds the worst-case reservation.
  Admission is the control, and the overshoot is bounded by one request. Accepted.
- **The rate limiter and the guard each read the key row.** One shared read would halve it.
  Accepted for now; revisit if the edge shows up in latency profiling. Not a correctness issue.

## A12 — Review findings carried forward (2026-09-09)

The independent review of Batch A found and fixed one bypass, and left two items that must not be
forgotten:

**Fixed during review**: a JSON body over the 4 MB buffer cap fell through to the unpriced path —
no hold, and `wantsBody` false so **no settle at all**. A key with $0.01 could pad a prompt past
4 MB and buy unlimited inference. Now a `413 payload_too_large` before any upstream call, with a
regression test. (The tell was that `payload_too_large` existed in `EdgeRefusalCode` and was
emitted nowhere.)

**Carry-forward 1 — blocks Batch D.** `priceUsage` handles `PER_IMAGE`, `PER_SECOND`,
`PER_MINUTE`, `PER_PAGE` and `PER_1M_CHARS`, but `parseUsage` only ever produces token counts, so
those units settle at **zero**. Unreachable today (the seed writes `PER_1M_TOKENS` only and an
unpriced model is refused), but it becomes a live revenue leak the moment Batch D publishes an
image or audio SKU. **Batch D must extend `parseUsage` to emit non-token quantities before it
publishes any non-token SKU.**

**Carry-forward 2 — Batch B.** `RouterBillingRepository` has no direct test. The two SQL suites
re-implement its semantics in raw SQL (proving the shape is sound) and `billing-edge.test.ts` uses
a fake, so nothing asserts that Prisma emits the SQL those suites validate. Add a repository-level
test against the dual-backend harness.

**Also noted**: `apps/router/src/app/api/console/v1/chat/route.ts` honours `ROUTER_GATEWAY_URL`,
which is unset today. Pointed at New-API it would be a second guard-free egress. Documented in the
file; Batch B should either remove the escape hatch or route it through the same guard.

## A13 — Multipart is not post-paid, it is unpaid (2026-09-09)

Batch B-1 reported, as a logging gap, that "post-paid multipart calls write no log row — they
never reach `settle()`". Verified in `openai-edge.ts`: settle is gated on
`if (opts.guard && admission)` (L572) and `wantsBody` on `opts.guard && admission` (L549). A
multipart request has **no** admission — A10 routes it through `admitUnpriced`, which returns
`{ok:true}` and no hold. So nothing settles, and nothing charges.

This is a revenue hole, not an observability one, and it is A10's own incompleteness: A10 stopped
a **zero**-balance key from calling `images/edits` forever, but a key with $0.01 still calls it
forever for free.

Fix (dispatched): extract the model from the multipart stream's prefix as it passes through —
form fields precede the file part in every client we care about, so a bounded prefix scan finds
`name="model"` without buffering the upload — then settle post-paid against the response's usage.
When the model cannot be found within the cap, settle zero **and log it as a warning**, so the
gap is visible instead of silent.

Second gap, same area: a refusal (401/402/429) writes no `RequestLog` row, so a customer who is
refused sees nothing explaining why. Both OpenRouter and 302 show refusals in the activity log.
Refusals must write a zero-cost row.

## A14 — Batch B-1 built real Prisma-over-PGlite integration tests

Beyond its brief, B-1 added `createPglitePrismaClient()` to `@nebutra/db/testing`: a real
`PrismaClient` (generated client + query compiler + `@prisma/adapter-pg`) over PGlite served on a
loopback socket via `@electric-sql/pglite-socket`. This is what actually closes A12's
carry-forward 2 — the raw-SQL suites proved the SQL was sound, nothing proved Prisma emits it.
46 tests now do.

Constraint to remember: PGlite serves **one** connection, so genuinely concurrent interactive
transactions exhaust it. Contention tests stay on the raw-SQL harness; the Prisma harness proves
shape and semantics sequentially.

## A15 — Multipart is now priced from the upload's prefix (2026-09-09)

A13's fix, as landed.

- **Scan, do not buffer.** `readRequestBody` wraps a `multipart/form-data` body in a
  pass-through `TransformStream` that enqueues every chunk first and only then copies it into a
  bounded prefix, capped at **64 KB** (`MULTIPART_MODEL_SCAN_LIMIT`). Every client that matters
  writes the scalar fields before the file, so `model` lands in the first few hundred bytes;
  64 KB is ~100x that and still irrelevant next to the file, which is never held. The upload
  keeps streaming — `edge-money.test.ts` still asserts `forwarded instanceof ReadableStream`.
  `scanMultipartModel()` only returns a value whose line is terminated, so a prefix cut mid-value
  reports nothing rather than a truncated model id, and a part carrying `filename=` is never read
  as the model field.
- **Post-paid is `admission: null`, not a zero admission.** `EdgeSettleInput.admission` is now
  nullable. `RouterBillingRepository.settle()` already handles it correctly: no reservation row
  to claim, `refunded = -charged`, so the balance is debited once. Faking `reserved: 0` inside an
  `EdgeAdmission` would have claimed a hold that never existed.
- **Non-token units.** `ParsedUsage` gained `images` (entries of `data[]` that actually carry an
  image) and `seconds` (`usage.seconds`, else a `verbose_json` `duration`); `priceSettled` passes
  `images` / `seconds` / `minutes` to `priceUsage`. This is the image/audio slice of A12
  carry-forward 1; `PER_1M_CHARS` and `PER_PAGE` still have no producer and remain Batch D's.
  Note `UsageLedgerEntry.quantity` is a `BigInt`, so a fractional second rounds in the ledger
  row while `totalCost` stays exact.
- **Model not found** → settle at zero with `metadata.unpriced = "model_unreadable"` and a
  `logger.warn` carrying request id, path, key and tenant. Visible, never silent.
- **Refusals are logged.** `EdgeGuard.noteRefusal()` writes a zero-cost `ai_request_logs` row
  (`status = "refused"`, `errorMessage` = the refusal code) for every refusal that identified a
  key — 401 `key_disabled`, 402, 403, 404 `unknown_model`, 413, 429. An unauthenticated caller
  has no tenant, so `missing_api_key` / `invalid_api_key` write nothing. Refusal responses now
  also carry `x-request-id`, so the customer can quote the row back at us.

## A15 — Deploy stopped before the router: a live consumer would 401 (2026-09-09)

Migration applied to production successfully (all three, `migrate deploy`). The price seed was
dry-run only. **The router was not deployed**, on purpose.

`apps/kuanlan` calls `https://router.nebutra.com/v1` with `ROUTER_API_KEY = sk-1e6b458…` — a
**New-API user token**, issued before Batch A. Batch A deleted `ROUTER_KEY_STORE` and made the
shared `APIKey` table the only credential store, so the edge now resolves a key by SHA-256 hash
against that table. That token is not in it: every kuanlan image call would return `401
invalid_api_key` the moment the router restarts.

Second, smaller issue found in the same pass: the seed dry-run publishes 14 models and **holds 4**
as unpriced, and one of the held ones is `gpt-image-2` — the model kuanlan actually uses. Even
with a valid key it would then get `403 model_not_published`. 302 prices the equivalent
(GPT-image-1) per 1M tokens, split by input kind: $5/1M text in, $40/1M image in. Ours has no
price row because models.dev does not carry it.

Both are business decisions, not mechanics: what balance a first-party consumer starts with, and
what we charge for image generation. Recorded rather than guessed.

Fix before deploying the router:
1. Issue an `sk-sailor-*` key for kuanlan's tenant and set it as that app's `ROUTER_API_KEY`.
2. Give that tenant a credit balance, or it 402s instead of 401s.
3. Price `gpt-image-2` in `model_configs` and publish it.
4. Then deploy router + gateway, and re-run the smoke.
