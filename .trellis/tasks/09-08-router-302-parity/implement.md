# Router 302-parity — converged implementation plan

Single source of truth for execution. Supersedes `research/prd.md` §8 where they differ.
Reads: `research/prd.md` (journeys, page/API/schema detail), `decisions.md` (verified
amendments A1–A4), `research/critique.md` (the 14 convergence items, §4).

**Convergence rule**: every item the critic raised is placed in a batch below. Nothing is
"deferred" without a written decision in the batch that owns it.

## Batch A — Money spine

Ends: the demo wallet, the public unauthenticated mutation, two key-store modes.

- [ ] A1 bootstrap: call `configureBillingTenantDb(getTenantDb)` in a Router bootstrap
      (`instrumentation.ts`, mirroring `apps/web`). Without it every credits call throws.
- [ ] A1 cache: the admit/guard path must not read `balanceCache` (module-level Map,
      per-instance). Bypass it, and call `invalidateCreditCache(tenantId)` in the same
      transaction as every debit.
- [ ] Delete `src/lib/demo-store.ts` and `ROUTER_KEY_STORE`; `nebutra` is the only path.
- [ ] Wire `createCreditLedgerWallet()` over `CreditBalance`/`CreditTransaction` keyed by
      `Tenant.id`; `MemoryPrepaidWallet` becomes a test double (README note).
- [ ] Move `/api/v1/{chat,wallet,wallet/topup,keys}` → `/api/console/v1/*`; exclude that
      prefix from the `next.config.ts` rewrite. Route test: `/v1/wallet/topup` is 404.
- [ ] Edge: key → tenant → balance; reserve worst-case; on completion price the parsed usage,
      write one `UsageLedgerEntry` with `unitCost`/`totalCost`, release the reservation, debit.
- [ ] **C8 zero-completion insurance**: a streamed 200 whose body carries an error chunk, or
      `completion_tokens == 0` with a blank/`error` finish reason, writes a zero-cost ledger
      row and refunds the reservation. Same for non-2xx.
- [ ] **C3 `models[]` failover**: accept OpenRouter's `models[]` array; on a retryable upstream
      failure fall through to the next candidate. `proxyChatCompletions()` already implements
      the fallback and is dead code — wire it rather than writing a second one.
- [ ] **C4 rate limit, enforcement half**: enforce `APIKey.rateLimitRps`; emit
      `X-RateLimit-Limit/Remaining/Reset` and `Retry-After` on 429.
- [ ] `402` envelope for `insufficient_balance` / `key_quota_exceeded`; per-key
      `costDaily`/`costTotal` in the same transaction.
- [ ] Prisma: `APIKey` extension (prd §7.1) + the minimal `ModelConfig` pricing subset.
- [ ] Seed `ModelConfig` from `getListingCatalog()` — idempotent script in `infra/nebutra-router/scripts/`.

Tests: pricing units; usage parse → ledger row (OpenAI/Anthropic/SSE); **PostgreSQL integration**
— concurrent calls cannot overdraw, failed upstream refunds, idempotency collision is a no-op,
RLS on `credit_balances` filters a *personal* tenant; route test for the console prefix.
Done when: a call debits a real balance, a second call at zero returns 402, and `rg 'demo'` in
`apps/router/src` hits only tests.

## Batch B — Console truth

- [ ] **A2**: do **not** create `RouterRequestLog`. Extend the existing `RequestLog`
      (`ai_request_logs`) with `ttfbMs`, `cachedPromptTokens`, `cacheWriteTokens`, `supplyPath`,
      `clientIp`, `expiresAt`. Router edge writes it. One per-request log for both relays.
- [ ] Retention sweep driven by `expiresAt` in the existing ops cron.
- [ ] Console APIs: `usage/{summary,by-model,by-key,history,records,export}`, keys full CRUD.
- [ ] **One** fetch client `src/lib/console-client.ts`: `res.ok`, typed error envelope,
      `AbortController`, no `as` casts. Every client component uses it — this is the fix for
      the state-management defects catalogued in `research/our-router.md` §4.
- [ ] Pages: `/usage` (new); `/keys` rebuilt (quota, expiry, rename, revoke with confirm,
      optimistic update + rollback); `/dashboard` reads real numbers.
- [ ] `/use` rebuilt: session-authenticated, streaming, abortable, cost readout, history.
- [ ] **C4 rate limit, publish half**: the enforced number is documented in `/docs` and returned
      by `GET /v1/limits`.
- [ ] Every list page renders four states: loading skeleton, empty, error with retry, populated.

Tests: aggregate windows/buckets/UTC; key lifecycle integration (create → use → limit → 402 →
disable → 401 → delete); component tests for the four states.

## Batch C — Money in

- [ ] `TopUpOrder`; reuse `Invoice`/`InvoiceItem`/`Payment`/`PaymentMethod`.
- [ ] Checkout via `packages/commerce/billing`; webhook with signature verification and an
      **atomic lease/CAS** so a replay credits once.
- [ ] **C10 gift bucket**: gifted/bonus credits are a distinct, non-refundable bucket with a
      consumption order (gift first). Without it the refund policy is unwritable.
- [ ] Fee model per channel `{pct, fixed}`, shown in the chooser and stored on the order.
- [ ] `/wallet` rebuilt: packages, custom amount, method chooser with fee math, order history,
      invoices; refund path (`REFUNDED` + `CreditTransaction(REFUND)`) and policy text.
- [ ] **C11 auto top-up**: threshold + amount + per-day cap, fee waived. Named here, not deferred.
- [ ] **C13 CN compliance is a precondition, not a feature**: enabling any CN rail requires
      实名认证, ICP 备案 and 增值电信许可证. Recorded as a blocking dependency of the CN provider;
      if unmet, the CN rail stays off and the chooser does not show it.

Tests: order state machine incl. expiry; replay credits once; out-of-order paid/failed does not
double-credit; one Stripe test-mode E2E.

## Batch D — Price service, catalogue, brand

- [ ] Full `ModelConfig` pricing + `FxRate`; idempotent importer from models.dev / New-API.
- [ ] One resolver `packages/platform/router-supply/src/pricing.ts`: `(model, usage) → charge`.
      No price string is computed anywhere else.
- [ ] **A3 brand is an entity**: `Brand { key (normalised), name, description, logo,
      role: AUTHOR|HOST|BOTH }`. The shelf's `cate → tag → brand` navigation needs it;
      seed from `research/302-category-tree.zh.json`.
- [ ] **C7 provider trust columns** on the brand/host: trains-on-prompts, retention
      (`ZERO|N_DAY|RETAINS`), BYOK, headquarters, ToS/privacy links. This is the honest answer
      to "where does my prompt go" for a relay fronting OAuth account capacity — and it is the
      largest unexplained deletion in the corpus, so it lands here.
- [ ] **C5 deprecation is a first-class entity**: `deprecatedAt`, `retiresAt`,
      `replacedBySkuId` + a changelog surface + a fixed notice window (7 days, per SiliconFlow).
      A model id must never silently 404.
- [ ] **C6 variant listing rule**: upstream already exposes `-thinking` / `-search` /
      `-web-search` variants. Decide the *listing* rule now (variants group under their base SKU
      with a variant chip); the *routing* grammar (`:free :nitro :floor`) is explicitly out of
      scope for 2026 and recorded as such.
- [ ] **C1 batch tier**: model a `BATCH` price component and a batch window. If no batch
      endpoint ships this cycle, the written decision is "no batch API in 2026" — recorded, not
      silent.
- [ ] **C9 public catalogue JSON**: `GET /v1/catalog` is **public and unauthenticated**, with the
      same filter params as the shelf UI. It does not live under `/api/console/`.
- [ ] `/price` page; cards, `/models` (pager + count) and the PDP read the resolver.
- [ ] Display currency real: FX table with `asOf` and a visible "display only" note.

Tests: golden file — `/price` rows, card strings and `GET /v1/models` agree; unit per price unit
and tier; "no price → not published"; visual regression on `/price`, `/models`, PDP.

## Batch E — Operator desk

- [ ] `RouterAdminState`: move the in-memory plan map and pending-login map onto it (survives restart).
- [ ] `GET/PUT /admin/v1/pricing/{modelId}`; `actions/shelf.publish|unpublish` on the existing
      plan → apply → audit contract.
- [ ] Admin pages `/admin/pricing`, `/admin/shelf`, `/admin/usage` (margin).
- [ ] **C2 Files API**: `POST/GET /v1/files` over `@nebutra/uploads` — one allow-list entry;
      it is also the precondition for any future batch endpoint.
- [ ] `GET /v1/status?model=` TTFB probe feeding the PDP metrics block; until a model has probe
      data the PDP says "not measured", never a fabricated number.
- [ ] `manifest.status` `wip → implemented`; `versions.lock` gains the balance-debit sample.

Tests: plan expiry / single-use / restart survival; unpriced model cannot be published; every
apply writes an audit row; margin aggregate correctness.

## Batch F — Journey and shell

- [ ] Auth entry with a correct `returnTo` on **first paint** (no localhost fallback).
- [ ] Remove the 9 hard-coded `localhost:3105` links; the 应用集市 channel renders only when
      `NEXT_PUBLIC_FORGE_URL` is set.
- [ ] **C12 snippet builder**: `/docs` snippets are generated from the picked model out of the
      published catalogue, not six hand-written blocks with hard-coded ids.
- [ ] **C14 BYOK**: either ship the link target to the gateway's `provider-keys` UI, or state
      plainly in `/docs` that BYOK does not exist yet. No link to nothing.
- [ ] `/help` + `/legal/{terms,privacy,refund}`.
- [ ] `热门 / 推荐` become real sort keys; taxonomy counts live.
- [ ] i18n + microcopy pass (禁七/禁四) over every new string.
- [ ] `e2e/golden/router-journey.spec.ts` — all 12 steps of J1, green in CI, unskipped.
- [ ] Link check: no `localhost` in a production build.

Done when: J1 passes unattended in CI.
