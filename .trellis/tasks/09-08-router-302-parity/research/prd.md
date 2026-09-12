# Nebutra Router — 302.AI parity PRD + batch plan

- **Date**: 2026-09-09
- **Status**: Proposed
- **Owner**: tseka_luk
- **Scope**: `apps/router`, `packages/platform/{prepaid-wallet,router-supply,db,repositories}`, `packages/commerce/billing`, `backends/gateway/src/routes/ai/*`, `infra/nebutra-router`, `e2e/`
- **Inputs**: `research/{302-market,302-price,302-docs,302-console,302-help,openrouter,siliconflow,our-router}.md`,
  `docs/plans/2026-07-23-router-302-full-route-interaction-study.md`,
  `docs/plans/2026-07-23-nebutra-router-forge-design.md` §5,
  `docs/architecture/2026-08-27-closure-phase.md`

---

## 0. One paragraph

302.AI is not a bigger model list than ours — it is a **complete money path with a shelf bolted on the
front**. A visitor can price a model without an account, register, top up, mint a key, make a call, see
that call as a priced row, and get an invoice. Our Router has a real edge (`/v1/*` → New-API, keys in
Prisma, `UsageLedgerEntry` per request) and a real supply admin, and **nothing in between**: the wallet is
a process-global in-memory 25 USD balance for a hard-coded `"demo"` tenant, `/v1/wallet/topup` is an
unauthenticated public mutation, `/v1/chat` returns a canned string, and there is no usage, log, order or
price surface at all. This PRD closes that gap in six shippable batches, ordered so that **money truth
lands before money surfaces, and money surfaces land before shelf polish**. It adds no packages and no
product nouns: every capability lands in a module that already exists.

---

## 1. Goals

| # | Goal | Measured by |
|---|---|---|
| G1 | One money truth: one wallet, one priced ledger, one balance that a request can actually exhaust | A `/v1/chat/completions` call debits the same balance the console shows; a second call at balance 0 returns 402 |
| G2 | The 302 customer journey completes end to end, unassisted | Golden e2e: visitor → register → top up → key → first call → usage row → invoice, green in CI |
| G3 | Every price the customer sees comes from one price service | Card, PDP, `/price`, `GET /v1/models`, and the ledger's `unitCost` all resolve from the same table |
| G4 | No mocks on any shipped surface | `rg -n 'demo\|mock' apps/router/src` returns only test files; every state (loading / empty / error / partial / unauthorised) is designed and reachable |
| G5 | The operator can take supply → shelf → price → publish without touching New-API's own UI | Operator batch smoke: add account, sync channel, set price, publish, model appears on the public shelf |
| G6 | The public `/v1` surface is a credible drop-in for OpenAI / Anthropic clients | `infra/nebutra-router/scripts/smoke-chat.sh` plus Claude Code / Codex CLI recipes pass against staging |

## 2. Non-goals

Explicit, and enforced in review:

- **No VPS compute this year.** No self-hosted inference, no GPU capacity, no reserved instances, no
  sandbox/VM execution, no hosted Omni-Toolbox-style bot instances. Everything is **interface over
  existing engines** (New-API, CLIProxyAPI, sub2api) or over a third party.
- **No new workspace packages, no new product nouns, no new infra categories** (closure-phase ADR). If a
  capability needs a home, it goes in the module that already owns the nearest concept.
- **Not in scope**: 302's Agent / MCP-server hosting, Custom API (OpenAPI import) relay, developer
  revenue-share ("Pay with 302", withdrawals), affiliate cashback, KYC/real-name flows, the app shelf as a
  real product shelf (the `product_type=tool` channel stays a Forge deep-link or is hidden — decision in
  Batch F), desktop client, blog/news.
- **Not in scope this cycle**: sub-accounts / team management (design the tenant seam so it can land next
  cycle — do not build the UI), BYOK in the Router console (the gateway already has
  `/api/v1/ai/provider-keys`; Router links to it, does not re-implement), batch API, fine-tuning.
- **Not a rewrite.** The gateway relay (`/api/v1/ai/gateway/*`) is not deleted and not merged; §5 picks a
  canonical path and documents the other as internal.

## 3. Locked decisions (resolve `our-router.md` §7 open questions)

| # | Question | Decision | Consequence |
|---|---|---|---|
| D1 | Which ledger is the customer's truth? | **`UsageLedgerEntry`**, written by the Router edge, **priced at write time** (`unitCost`, `totalCost`, `currency` already exist on the model). `RequestLog` stays the gateway relay's internal log. | The Router console never reads `RequestLog`. `/api/v1/ai/usage/*` is not used by the Router. |
| D2 | Wallet backing | **`CreditBalance` / `CreditTransaction` keyed by `tenantId`** via the existing `createCreditLedgerWallet()` adapter. The schema already keys `CreditBalance` on `tenant_id` — the feared org/tenant mismatch does not exist. | `MemoryPrepaidWallet` is demoted to a test double. |
| D3 | Should `/v1/chat`, `/v1/wallet*` stay public? | **No.** Console APIs move under `/api/console/v1/*`, excluded from the `/v1/:path*` rewrite. The public `/v1` surface is only the OpenAI/Anthropic-compatible allow-list. | Deletes an unauthenticated public mutation. |
| D4 | Default key store | **`nebutra` is the only mode.** `ROUTER_KEY_STORE` and `demo-store.ts` are deleted. | `/keys`, `/dashboard`, `/docs` stop branching on mode. |
| D5 | Canonical relay for chat | **The Router edge** (`/api/v1/[...path]`). It gains the balance guard, pricing and ledger write. The gateway relay keeps serving in-product AI, is documented as internal, and is not extended. | One place to hang balance/usage. |
| D6 | In-memory admin state | **Persisted.** Action plans and pending OAuth logins move to a Prisma table with TTL. | Router may run >1 instance. |
| D7 | Currency | **Real.** Balance and billing are **USD only**; the currency switch is a **display** conversion over a stored FX table with an `asOf` date and a visible "display only" note. No CNY billing this cycle. | The dead dropdown becomes honest, or it is removed in Batch F if the FX table slips. |
| D8 | 应用集市 (`product_type=tool`) | Hidden behind `NEXT_PUBLIC_FORGE_URL`; when unset the channel is not rendered. No `localhost:3105` ships. | Removes 9 hard-coded localhost links. |
| D9 | PDP data | Real fields only: price rows, context, capabilities, endpoint list derived from the model's **actual** allow-listed paths, and a probe block that renders **"not measured"** until Batch E ships probes. No template prose presented as fact. | Kills the templated marketing paragraphs. |
| D10 | Money unit naming | **USD, shown as `$`.** No PTC-equivalent noun (closure phase: no new product nouns). Balance is "余额 / Balance" in USD with 2 dp; per-request cost to 6 dp. | — |

---

## 4. User journeys (acceptance-shaped)

### J1 — Visitor → first call (the golden path)

1. Land on `/` — sees a shelf with real prices, no account required.
2. `/models?cate=api&tag=LLM&brand=Anthropic` — filters by category × brand, URL-shareable, pageable.
3. `/price` — one table, `ours | upstream list | markup`, context, unit; currency switch is display-only.
4. `/product/detail/[slug]` — price rows, context, capabilities, endpoints, "copy for AI", docs link.
5. `注册` → Auth Center → returns to Router with a tenant.
6. `/wallet` → pick a package or custom amount → payment method chooser with **explicit fee math** →
   provider redirect → return → **balance updated, order row visible**.
7. `/keys` → create key with name, expiry preset, total + daily quota → **full key shown once**.
8. `/docs` → copy Base URL + key + example model → paste into Claude Code / Codex / SDK.
9. First call succeeds; response carries `x-request-id`.
10. `/usage` → the call appears as a row: time, model, prompt/completion/cached tokens, latency, cost.
11. `/wallet` → balance decreased by exactly that cost; order + consumption both in history.
12. `/wallet` → request an invoice for consumed amount → invoice row with status.

**Acceptance**: this is one Playwright spec (`e2e/golden/router-journey.spec.ts`) that must be green
before the batch that introduces each step is called done. Steps 1–5 land in Batch F, 6–12 in Batches A–C;
the spec grows batch by batch and is never skipped once added.

### J2 — Returning developer → spend control

Key list shows per-key `daily / monthly / total cost`, status toggle, expiry. Disable is reversible
(30 s cooldown copy), delete is permanent and confirmed. Per-key logs drawer with time range + request-id
+ path filters, and export. Balance alarm threshold with email notification.

### J3 — Balance exhaustion

Balance below the cost of the reserved worst case → `402` with the OpenAI-shaped error envelope
(`{"error":{"message","type":"insufficient_quota","code":"insufficient_balance"}}`), `x-request-id` set,
**no ledger charge**, console banner "余额不足" with a top-up CTA. Key quota breach → `402` with
`code:"key_quota_exceeded"`. Rate limit → `429` with `Retry-After`.

### J4 — Operator → supply to shelf

1. `/admin/supply` — engine health, accounts, shelf drift.
2. `account.login` → OAuth URL → callback replay → account healthy (state survives a restart, D6).
3. `channel.sync` → **plan** (diff, affected, warnings, expiry) → **apply** → audit row.
4. `/admin/pricing` — set or override input/output/unit price and markup for a model; unpriced models
   cannot be published.
5. `/admin/shelf` — publish / unpublish; published models appear on `/`, `/models`, `/price`, and in
   `GET /v1/models` within one cache TTL.

### J5 — Operator → reconciliation

`/admin/usage` — customer charge vs supply cost per model per day, from the same ledger; a model whose
margin is negative is flagged. No new store: this is an aggregate query over `UsageLedgerEntry`.

---

## 5. Page list with acceptance criteria

Shell rules from the 2026-07-23 study hold: **Market / Admin / Use are three shells and never mix**.
Every page below must define: loading, empty, error, unauthorised, and partial-data states. "No mocks"
means: no canned strings, no hard-coded counts, no `demo` tenant, no `localhost` URLs.

### 5.1 Market shell (public)

| Page | Purpose | Acceptance criteria |
|---|---|---|
| `/` (`?product_type=api`) | Shelf home: taxonomy rail + carousel + Hi panel + card shelf | Rail rows carry live counts from the published shelf; hover flyout renders brand cards (name + one-line description + count) from one category tree fetched once and reused by rail, flyout and `/models` panel. Tabs `最新 / 热门 / 推荐` map to real sort keys (`created desc`, curated `featured` flag, `random` seeded per session) — **`热门` may not be "price desc"**. Carousel empty state renders nothing (no `暂无轮播物料` placeholder). Card = model id as title, 2-line clamped description with full text in `title`, chips `[类型][分类][能力]`, price block with fixed min-height, hover overlay `文档 / 试用`. Source note is a footer detail, not body copy. Logged-in Hi panel shows balance + key count from the real tenant. |
| `/models?cate&tag&brand&q&sort&page` | Faceted shelf | Every filter is a URL param and a plain `<a href>`; back/forward restores state (fixes the `useState(() => parse(initial))` staleness). Server-rendered page 1 with a **pager and a visible count** ("显示 20 / 678") — not infinite scroll (302's worst anti-pattern). Sort: `日期 ⇅`, `价格 ⇅`. Grid/list toggle persisted in the URL. Empty: `没有匹配的模型` + `清除筛选`. Error: retry affordance, not a blank grid. |
| `/price` | One price table | Tabs by family (LLM / 图片 / 视频 / 音视频 / 信息处理 / RAG / 工具). Columns `模型 · 我们的价 · 上游标价 · 对比 · 说明 · 上下文`. Unit rendered inline with the number (`$0.05 / 次`, `$3 / 1M tokens`). Typeahead search across model id, brand and description; on pick, open the group and scroll the row into view. Currency toggle is display-only with a visible `1 USD = 7.xx CNY · as of YYYY-MM-DD` note. Tiers are sub-rows with the condition in `说明`, never buried. Every row deep-links to its docs anchor. **Machine mirror**: the page and `GET /api/console/v1/prices` render the same rows. |
| `/product/detail/[slug]` | PDP | Breadcrumb reverses the shelf URL grammar. Hero: model id, description, chips, price rows (input / output / cache read / cache write when known), context, released date. Sticky anchor nav `概览 · 价格 · 接口 · 指标 · 相关`. `接口` table lists the paths this model actually accepts (derived from the edge allow-list × model capability), with method and stability. `指标` renders real probe data or the literal state **"未接入探针"** — never a fabricated success rate. `相关` empty state renders nothing rather than `暂无相关模型`. `复制给 AI` copies a real, working snippet (base URL + model + curl). |
| `/docs` | Integration | Base URL + example model come from the **published shelf**, not the deprecated alias table. Recipes for: OpenAI SDK, curl, Anthropic SDK, Claude Code (`ANTHROPIC_BASE_URL`), Codex CLI (`wire_api = "responses"`), Cherry Studio / ChatWise (base-URL gotcha), image generation. Each snippet has a copy button and a "tested against" version note. Endpoint table matches the edge allow-list exactly (a test asserts this). |
| `/help`, `/legal/*` | Rules | Help index with the rules that are actually enforced: billing model (prepay, deduct, balance does not expire), meters (per-token / per-call), key rules (expiry presets, quota semantics, daily reset timezone, disable vs delete), refund policy with the day windows, support hours and contact. Legal: terms, privacy, refund. Footer links stop pointing at `/docs`. |

### 5.2 Console shell (authenticated)

| Page | Purpose | Acceptance criteria |
|---|---|---|
| `/dashboard` | 数据汇总 | Stat cards `余额` (+ `去充值` in the same card), `近 7 日消费`, `请求数`, `API Keys`. Filter bar `时间范围` + `粒度`, then charts: cost by model, calls by model, cost by key. **Every number comes from the real tenant** — the current demo-store read is deleted. Onboarding checklist items are all computed (including "已试跑一次" from the ledger), none hard-coded. Empty tenant: a first-run panel with the three next actions, not zeroed charts. |
| `/keys` | Key management | Table `名称 · Key(掩码) · 状态 · 日消费 · 月消费 · 总消费 · 创建时间 · 过期时间 · 操作`. Create form: name, expiry presets (`永不 / 1 个月 / 1 天 / 1 小时`) + datetime, `总额度` and `单日额度` each with an 无限 switch + amount, `保存日志` switch, `速率限制`. One-time full-key banner. Row actions: 复制 / 编辑 / 禁用(可恢复) / 删除(确认对话框, 不可恢复) / 日志 / 接入指引. Every failure path renders a toast with the server's `error.message` — the current silent `keys=[]` on 401 is a bug fixed here. Per-row action spinners, not one shared `loading` boolean. `colSpan` matches the column count. |
| `/keys` → 日志抽屉 | Per-key request log | Filters `时间范围 · Request ID · 路径`. Columns `Request ID · 时间 · 路径 · 模型 · 首字节/总时长 · 输入/输出 · 缓存写/读 · 费用 · 状态`. Disabled with an explanatory empty state when the key has `保存日志` off. CSV export. |
| `/usage` | 用量明细 | Filters `时间范围 · 模型 · Key · 状态`. Columns `时间 · 类型 · 模型 · Prompt · Completion · Cache Creation · Cache Read · 延迟 · 费用`. Header shows the window total. Pagination with page size. CSV export. Reads `UsageLedgerEntry` only (D1). |
| `/wallet` | 钱包 | Balance card with `1 credit = 1 USD` note and `余额预警` control. Packages (5 / 20 / 50 / 100 / 200 / 500 / 1000) + custom amount with min/max. Payment-method chooser modal showing **the fee formula per channel** (`amount × pct + fixed`) and the exact charge. `充值记录` table `订单号 · 说明 · 时间 · 支付金额 · 到账 · 赠送 · 变动 · 发票`. `消费记录` links to `/usage`. Success and failure are visually distinct (the current shared neutral `<p>` is a bug fixed here). Client-side amount validation before submit. |
| `/wallet` → 发票 | Invoice | Request an invoice for a consumed amount; fields `开票金额 · 抬头 · 税号 · 类型 · 接收方式`. Row status `草稿 / 待处理 / 已开具`. Manual fulfilment is acceptable; the record is not. |
| `/settings` | 账号 | Profile, email, balance alarm threshold + channel, display currency, locale, danger zone. |
| `/use` | 快捷使用 | Real streaming call through the customer's own key against the real edge. Model picker from the published shelf, seeded from `?model=` **server-side** (no post-mount flash). Streaming output, abortable, `AbortController` per send. Shows tokens and cost of the turn after completion. Errors render in an error slot, never as assistant content. No `mode: demo`. |

### 5.3 Admin shell (operator, staff token)

| Page | Purpose | Acceptance criteria |
|---|---|---|
| `/admin/supply` | Engines · accounts · logins | Existing probe rows keep their shape. Login flow state survives a process restart (D6). Each row states its last probe time. |
| `/admin/shelf` | Publish | Rows: model, supply path, price status, publish status. Publish is blocked with an explicit reason when a price is missing. Publish/unpublish goes through the same **plan → apply with an expiring single-use plan id + audit row** idiom already used by `channel.sync`. |
| `/admin/pricing` | Price desk | Edit input/output/unit price, unit, markup, context, capabilities, tier rows, upstream list price. Diff preview before apply; audit row after. |
| `/admin/usage` | Margin | Per model per day: customer charge, supply cost basis, margin. Negative margin flagged. |

---

## 6. API list

### 6.1 Public `/v1` surface (`/v1/:path*` → `/api/v1/[...path]`)

Unchanged in shape from today's allow-list; changed in behaviour. Auth: `Authorization: Bearer sk-sailor-…`
or `x-api-key`. Error envelope stays OpenAI-shaped everywhere.

| Method · Path | Notes |
|---|---|
| `GET /v1/models[/{id}]` | Returns the **published shelf**, with `pricing{input,output,cache_read,cache_write,unit}`, `context_length`, `capabilities`. `?llm=1` filters. |
| `POST /v1/chat/completions` | Streaming + non-streaming; balance guard, priced ledger write. |
| `POST /v1/completions`, `/v1/responses[/{id}[/cancel]]` | As today, plus guard + ledger. |
| `POST /v1/messages`, `/v1/messages/count_tokens` | Anthropic skin; `x-api-key` accepted. |
| `POST /v1/embeddings`, `/v1/rerank` | Per-token / per-call pricing. |
| `POST /v1/images/{generations,edits,variations}` | Per-call or per-image pricing. |
| `POST /v1/audio/{speech,transcriptions,translations}` | Per-character / per-minute pricing. |
| `GET /v1/status?model=` | Cheap health/TTFB signal (Batch E). |
| everything else | `404 unknown_endpoint` |

**Response headers**: `x-request-id` (always), `x-nebutra-supply-class` (internal only, redacted for
customers unless `ROUTER_EXPOSE_SUPPLY=1`), `Retry-After` on 429.

**Errors**: `{"error":{"message","type","code","request_id"}}`. `type` enum:
`invalid_request_error · authentication_error · permission_error · insufficient_quota ·
rate_limit_error · upstream_error · server_error`. Every non-2xx writes a ledger row with
`status` and `totalCost = 0` unless tokens were actually consumed.

**Removed from the public rewrite** (D3): `/v1/chat`, `/v1/wallet`, `/v1/wallet/topup`, `/v1/keys`.

### 6.2 Console APIs (`/api/console/v1/*`, session-authenticated, tenant-scoped)

| Method · Path | Request → Response |
|---|---|
| `GET /keys` | → `{keys:[{id,name,keyPrefix,scopes,status,expiresAt,rateLimitRps,limits{total,daily},cost{daily,monthly,total},lastUsedAt,createdAt}]}` |
| `POST /keys` | `{name, expiresAt?|expiresIn?, limits{total?,daily?}, rateLimitRps?, saveLogs?}` → `201 {...summary, fullKey}` |
| `PATCH /keys/{id}` | `{name?, limits?, rateLimitRps?, expiresAt?, disabled?}` → summary |
| `DELETE /keys/{id}` | → `204`; invalidates the edge key cache |
| `GET /keys/{id}/logs?from&to&requestId&path&cursor` | → `{rows[], nextCursor}`; `403 logging_disabled` when the key has `saveLogs` off |
| `GET /usage/summary?from&to` | → `{totalCost, totalTokens, requestCount, currency}` |
| `GET /usage/by-model?from&to`, `/by-key`, `/history?granularity=hour\|day` | aggregates over `UsageLedgerEntry` |
| `GET /usage/records?from&to&model&keyId&status&cursor` | paginated detail rows |
| `GET /usage/export?…` | CSV stream |
| `GET /wallet` | → `{tenantId, balance, currency, alarm{enabled,threshold,channel}}` |
| `POST /wallet/orders` | `{amount, currency:"USD", channel}` → `{orderId, checkoutUrl, fee{pct,fixed,total}, expiresAt}` |
| `GET /wallet/orders?cursor` | → order history rows |
| `GET /wallet/orders/{id}` | → order + payment status |
| `POST /wallet/alarm` | `{enabled, threshold, channel}` |
| `POST /wallet/invoices` | `{amount, title, taxId, type, delivery}` → invoice row |
| `GET /wallet/invoices?cursor` | → invoice rows |
| `GET /prices?family&q&cursor` | public-readable price rows (the machine mirror of `/price`) |
| `GET /catalog?cate&tag&brand&q&sort&page` | public-readable shelf rows (the machine mirror of `/models`) |
| `POST /chat` | Console playground; **session-authenticated**, streams, uses the caller's tenant, never accepts a pasted key |

Payment provider callbacks land at `POST /api/webhooks/payments/{provider}` with signature verification and
an **atomic lease / CAS** on the order (closure-phase P1 rule: concurrent deliveries must not double-credit).

### 6.3 Admin APIs (`/api/admin/v1/*`, staff token — existing contract, extended)

Existing: `supply/{engines,accounts,logins,shelf}`, `supply/actions/{channel.sync,account.login,account.login.callback}`,
`supply/signals/{id}`, `/.well-known/nebutra-admin.json`.

Added, all following the same `plan → apply(planId) → auditId` idiom:

| Method · Path | Notes |
|---|---|
| `GET/PUT /admin/v1/pricing/{modelId}` | Price row edit; `PUT` is plan/apply |
| `POST /admin/v1/actions/shelf.publish` / `shelf.unpublish` | Blocked when unpriced |
| `GET /admin/v1/usage/margin?from&to` | Charge vs cost basis per model |
| `GET /api/health` | unchanged; `manifest.status` flips `wip → implemented` when Batch C is green |

---

## 7. Data model deltas (Prisma)

All deltas extend tables that already exist. **No new product noun**; four new tables, each an operational
detail of an existing concept.

### 7.1 Extend `APIKey`

```prisma
model APIKey {
  // … existing fields …
  disabledAt     DateTime? @map("disabled_at")        // reversible; distinct from revokedAt
  saveLogs       Boolean   @default(false) @map("save_logs")
  limitTotal     Decimal?  @map("limit_total")  @db.Decimal(10, 4)   // null = unlimited
  limitDaily     Decimal?  @map("limit_daily")  @db.Decimal(10, 4)
  costTotal      Decimal   @default(0) @map("cost_total")  @db.Decimal(12, 6)
  costDaily      Decimal   @default(0) @map("cost_daily")  @db.Decimal(12, 6)
  costDailyResetAt DateTime? @map("cost_daily_reset_at")
  @@index([tenantId, disabledAt])
}
```

Daily counters reset lazily on read/write when `costDailyResetAt < startOfUtcDay(now)` — no cron. Timezone
is **UTC** and is stated in the UI (302 uses the browser timezone; UTC is the honest choice for a ledger).

### 7.2 Extend `ModelConfig` — the one price service (G3)

```prisma
enum PriceUnit { PER_1M_TOKENS PER_CALL PER_SECOND PER_IMAGE PER_1M_CHARS PER_MINUTE PER_PAGE FREE PASS_THROUGH }

model ModelConfig {
  // … existing: modelName, provider, inputPricePerMillion, outputPricePerMillion, currency, isActive …
  displayName        String?  @map("display_name") @db.VarChar(128)
  family             String?  @db.VarChar(32)      // llm | image | video | audio | data | rag | tools
  brand              String?  @db.VarChar(64)
  unit               PriceUnit @default(PER_1M_TOKENS)
  unitPrice          Decimal? @map("unit_price") @db.Decimal(12, 6)   // for non-token units
  cacheReadPerMillion  Decimal? @map("cache_read_per_million")  @db.Decimal(10, 6)
  cacheWritePerMillion Decimal? @map("cache_write_per_million") @db.Decimal(10, 6)
  upstreamInputPerMillion  Decimal? @map("upstream_input_per_million")  @db.Decimal(10, 6)
  upstreamOutputPerMillion Decimal? @map("upstream_output_per_million") @db.Decimal(10, 6)
  markupRate         Decimal  @default(1) @map("markup_rate") @db.Decimal(6, 4)
  contextLength      Int?     @map("context_length")
  capabilities       Json     @default("{}")       // {image,video,audio,thinking,function_call}
  tierCondition      String?  @map("tier_condition") @db.VarChar(120) // "<=200k input tokens"
  published          Boolean  @default(false)
  featured           Boolean  @default(false)
  docsAnchor         String?  @map("docs_anchor") @db.VarChar(200)
  @@index([published, family])
  @@index([brand])
}
```

`modelName` is already `@unique`; tiers add rows keyed by `modelName + tierCondition`, so the unique
constraint becomes `@@unique([modelName, tierCondition])` and the bare `@unique` is dropped.

### 7.3 New: `TopUpOrder` (the money-in record)

`Invoice` / `InvoiceItem` / `Payment` / `PaymentMethod` already exist and are reused for invoicing and for
the payment record. Only the pre-payment order needs a home:

```prisma
enum TopUpOrderStatus { PENDING PAID FAILED EXPIRED REFUNDED }

model TopUpOrder {
  id            String  @id @default(cuid())
  orderNo       String  @unique @map("order_no") @db.VarChar(32)
  tenantId      String  @map("tenant_id")
  amount        Decimal @db.Decimal(10, 2)        // what the customer pays
  credited      Decimal @db.Decimal(10, 4)        // what lands in the balance
  bonus         Decimal @default(0) @db.Decimal(10, 4)
  feeAmount     Decimal @default(0) @map("fee_amount") @db.Decimal(10, 2)
  currency      String  @default("USD") @db.VarChar(3)
  channel       String  @db.VarChar(32)           // stripe_card | alipay | wechat | usdt | manual
  status        TopUpOrderStatus @default(PENDING)
  providerRef   String? @map("provider_ref") @db.VarChar(191)
  paymentId     String? @map("payment_id")
  creditTransactionId String? @map("credit_transaction_id")
  note          String? @db.VarChar(200)
  expiresAt     DateTime? @map("expires_at")
  paidAt        DateTime? @map("paid_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([channel, providerRef])   // idempotency for webhook replays
  @@index([tenantId, createdAt])
  @@index([status])
  @@map("topup_orders")
  @@schema("public")
}
```

Crediting is one transaction: `TopUpOrder.status → PAID` + `CreditTransaction(type: PURCHASE, relatedId: orderId)`
+ `CreditBalance.balance += credited`. `CreditTransaction` already has
`@@unique([creditBalanceId, type, relatedId])` — that is the double-credit guard.

### 7.4 New: `RouterRequestLog` (per-key request log, opt-in)

`UsageLedgerEntry` is the ledger (money). The log is the **debuggable** record and is only written when the
key has `saveLogs`, with a retention window:

```prisma
model RouterRequestLog {
  id          String   @id @default(cuid())
  requestId   String   @unique @map("request_id")
  tenantId    String   @map("tenant_id")
  apiKeyId    String?  @map("api_key_id")
  path        String   @db.VarChar(120)
  model       String   @db.VarChar(128)
  status      Int
  latencyMs   Int?     @map("latency_ms")
  ttfbMs      Int?     @map("ttfb_ms")
  promptTokens Int     @default(0) @map("prompt_tokens")
  completionTokens Int @default(0) @map("completion_tokens")
  cacheReadTokens  Int @default(0) @map("cache_read_tokens")
  cacheWriteTokens Int @default(0) @map("cache_write_tokens")
  cost        Decimal? @db.Decimal(12, 6)
  supplyPath  String?  @map("supply_path") @db.VarChar(64)
  clientIp    String?  @map("client_ip") @db.VarChar(64)
  errorCode   String?  @map("error_code") @db.VarChar(64)
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
  @@index([apiKeyId, createdAt])
  @@index([expiresAt])
  @@map("router_request_logs")
  @@schema("public")
}
```

Request/response bodies are **not** stored this cycle (a decision, not an omission — say so in `/help`).

### 7.5 New: `RouterAdminState` (D6 — durable plans and pending logins)

```prisma
model RouterAdminState {
  id        String   @id @default(cuid())
  kind      String   @db.VarChar(32)    // action_plan | pending_login
  key       String   @db.VarChar(191)   // planId | oauth state
  payload   Json
  createdBy String?  @map("created_by")
  consumedAt DateTime? @map("consumed_at")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([kind, key])
  @@index([expiresAt])
  @@map("router_admin_state")
  @@schema("public")
}
```

### 7.6 New: `FxRate` (D7 — display currency, honest)

```prisma
model FxRate {
  id       String   @id @default(cuid())
  base     String   @db.VarChar(3)   // "USD"
  quote    String   @db.VarChar(3)   // "CNY" | "JPY" | "RUB"
  rate     Decimal  @db.Decimal(12, 6)
  asOf     DateTime @map("as_of")
  source   String   @db.VarChar(64)
  @@unique([base, quote, asOf])
  @@map("fx_rates")
  @@schema("public")
}
```

### 7.7 Ledger usage (no schema change)

`UsageLedgerEntry` already carries everything needed: `idempotencyKey` (`router:{requestId}`),
`type: AI_TOKEN | API_CALL`, `quantity`, `unit`, `unitCost`, `totalCost`, `currency`, `occurredAt`,
`metadata`. Batch A starts populating `unitCost` / `totalCost` and extends `metadata` with
`{product:"router", model, keyId, supplyPath, cacheRead, cacheWrite, latencyMs, supplyCost}`.
`supplyCost` in the same row is what makes J5 an aggregate query rather than a second store.

---

## 8. Implementation batches

Six batches. Each is one PR-sized risk, shippable on its own, and verifiable by named tests plus a smoke.
Order is by value: **the money spine first**, because every console surface is worthless while the wallet
is a demo object, and every price surface is worthless while nothing charges against it.

```
A ─ money spine ──┬─→ B console truth ──┬─→ C money in ──→ E operator desk
                  │                     │
                  └─────────────────────┴─→ D price service ──→ F journey & shell
```

---

### Batch A — Money spine: one wallet, one priced ledger, one guard

**Why first**: D1–D5 are all unverifiable until this lands, and every later batch reads from it.

**Scope**
- Delete `src/lib/demo-store.ts` and `ROUTER_KEY_STORE`; `nebutra` becomes the only path (D4).
- Wire `createCreditLedgerWallet()` over `CreditBalance`/`CreditTransaction` keyed by `tenantId` (D2);
  demote `MemoryPrepaidWallet` to a test double with a README note.
- Move `/api/v1/{chat,wallet,wallet/topup,keys}` to `/api/console/v1/*`; exclude that prefix from the
  `next.config.ts` rewrite; add a route test asserting `/v1/wallet/topup` is `404` (D3).
- Edge (`src/app/api/v1/[...path]/route.ts`): resolve key → tenant → balance; **admit** by reserving a
  worst-case charge from the price row; on completion, price the parsed usage and write one
  `UsageLedgerEntry` with `unitCost`/`totalCost` and release the reservation; debit `CreditBalance`.
- `402` envelope for `insufficient_balance` and `key_quota_exceeded`; per-key `costDaily`/`costTotal`
  counters (7.1) updated in the same transaction.
- Prisma: 7.1 (`APIKey` extension) + 7.2 minimal subset needed to price (`unit`, `unitPrice`,
  `cacheRead/Write`, `contextLength`, `published`).
- Seed `ModelConfig` rows for the current shelf from `getListingCatalog()` (one-time idempotent script in
  `infra/nebutra-router/scripts/`).

**Explicitly not in A**: any new page. `/wallet` and `/dashboard` keep their current shape but read real
numbers.

**Tests**
- `apps/router/src/lib/pricing.test.ts` — unit: token, per-call, per-image, cache-split, unknown-model.
- `apps/router/src/lib/openai-edge.test.ts` (extend) — usage parse → ledger row shape, OpenAI + Anthropic + SSE.
- **PostgreSQL integration** (closure-phase P1 rule): concurrent calls on the same key cannot overdraw;
  a failed upstream writes a zero-cost ledger row and refunds the reservation; ledger `idempotencyKey`
  collision is a no-op.
- Route test: console paths are not reachable under `/v1`.

**Smoke**: `infra/nebutra-router/scripts/smoke-chat.sh` extended — call with a fresh key, assert the
balance moved by exactly the ledger `totalCost`; drain the balance and assert `402`.

**Done when**: a call debits a real balance, a second call at zero returns 402, and `rg 'demo'`
in `apps/router/src` hits only tests.

---

### Batch B — Console truth: usage, logs, key lifecycle

**Depends on**: A (there is nothing to show before the ledger is priced).

**Scope**
- Prisma 7.4 (`RouterRequestLog`) + retention sweep (a `expiresAt`-driven delete in the existing ops cron).
- Console APIs: `usage/{summary,by-model,by-key,history,records,export}`, `keys` full CRUD incl. `PATCH`,
  `keys/{id}/logs`.
- Pages: **`/usage`** (new), `/keys` rebuilt to the acceptance criteria in §5.2 (quota, expiry presets,
  disable vs delete, per-row spinners, real error toasts, logs drawer, guide modal), `/dashboard` rebuilt
  on real aggregates with computed checklist and charts.
- Introduce **one** fetch client in `src/lib/console-client.ts` (`res.ok` checks, typed error envelope,
  `AbortController`, retry-once on 5xx). Every client component migrates to it — this closes the whole
  "anti-patterns" table in `our-router.md` §4 in one place.
- `/use` rebuilt: session-authenticated `POST /api/console/v1/chat`, streaming, abortable, cost readout,
  server-seeded model, error slot.

**Tests**
- Aggregate unit tests over a seeded ledger (window boundaries, granularity buckets, timezone = UTC).
- Key lifecycle integration: create → use → daily-limit breach → 402 → disable → 401 → re-enable → delete.
- Component tests for the empty / loading / error / unauthorised state of `/keys`, `/usage`, `/dashboard`.

**Smoke**: Playwright `e2e/golden/router-journey.spec.ts` steps 7–10 (key → call → usage row).

**Done when**: a call made in `/use` appears in `/usage` with a cost, and every list page renders four
designed states under fault injection.

---

### Batch C — Money in: orders, payments, invoices, alarm

**Depends on**: A (balance) — parallel with B.

**Scope**
- Prisma 7.3 (`TopUpOrder`); reuse `Invoice`/`InvoiceItem`/`Payment`/`PaymentMethod`.
- `POST /api/console/v1/wallet/orders` → provider checkout via the existing `packages/commerce/billing`
  provider seam (Stripe first; Alipay/WeChat behind the same seam, `manual` for bank transfer).
- `POST /api/webhooks/payments/{provider}` with signature verification and an **atomic lease / CAS** on the
  order row; crediting is one DB transaction using `CreditTransaction`'s unique constraint as the guard.
- Fee model: per-channel `{pct, fixed}` in config, rendered in the chooser modal and stored on the order.
- `/wallet` rebuilt: packages, custom amount with min/max, method chooser with fee math, order history,
  invoice request + list, balance alarm (threshold → notification through `@nebutra/notifications`).
- Refund path: `REFUNDED` order status + `CreditTransaction(type: REFUND)`; policy text in `/help`.

**Tests**
- Webhook: replayed delivery credits once; out-of-order `paid` then `failed` does not double-credit;
  unsigned payload rejected. (Closure phase requires a failing case + a regression case in this PR.)
- Order state machine unit tests including expiry.
- One Stripe E2E in test mode: order → checkout → webhook → balance up → invoice row.

**Smoke**: `e2e/golden/router-journey.spec.ts` steps 6 and 12 (top up; invoice).

**Done when**: money can enter the balance through a provider and the same balance leaves through a call,
with both visible in history.

---

### Batch D — Price service and the shelf that reads it

**Depends on**: A (schema 7.2 exists) — parallel with B/C.

**Scope**
- Prisma 7.2 full + 7.6 (`FxRate`); an idempotent importer from models.dev / New-API inventory that fills
  `upstream*` and leaves `markupRate` for the operator.
- One resolver in `packages/platform/router-supply/src/pricing.ts`: `(model, usage) → charge`, used by the
  edge (A), `/price`, the cards, the PDP and `GET /v1/models`. A test asserts all five call the same function.
- **`/price`** page (new) per §5.1, plus `GET /api/console/v1/prices`.
- Cards, `/models` and the PDP switch to the price service; `/models` gains pager + count; PDP loses the
  templated prose and gains real endpoint/price/capability blocks with the honest "未接入探针" state (D9).
- Display currency becomes real (D7): FX table, `asOf` note, persisted preference; if the FX importer is
  not ready by the end of the batch, **remove the dropdown** rather than ship a dead control.

**Tests**
- Golden-file test: `/price` rows, card price strings and `GET /v1/models` pricing agree for a fixture catalog.
- Unit tests per price unit and per tier condition, including "no price → not published" .
- Visual regression on `/price`, `/models`, PDP (the existing `e2e/visual` config).

**Smoke**: `GET /v1/models` returns pricing; a curl of the cheapest published model charges the price the
page showed.

**Done when**: no price string in the product is computed anywhere but the resolver.

---

### Batch E — Operator desk: supply → shelf → price → publish

**Depends on**: D (publish needs a price) and A (audit of money-affecting changes).

**Scope**
- Prisma 7.5 (`RouterAdminState`); move the in-memory plan map and pending-login map onto it (D6).
- `GET/PUT /admin/v1/pricing/{modelId}`, `actions/shelf.publish|unpublish` on the existing plan→apply→audit
  idiom; publish blocked when unpriced with a machine-readable reason.
- Admin pages `/admin/pricing`, `/admin/shelf`, `/admin/usage` (margin), plus last-probe timestamps on
  `/admin/supply`.
- `GET /v1/status?model=` TTFB probe, feeding the PDP metrics block; until a model has probe data the PDP
  keeps the honest empty state.
- `manifest.status` `wip → implemented`; `versions.lock` `upgrade_requires` gains the balance-debit
  reconciliation sample that Batch A produced.

**Tests**
- Plan expiry / single-use / restart-survival integration test.
- Publish guard: unpriced model cannot be published; audit row exists for every apply.
- Margin aggregate correctness over a seeded ledger.

**Smoke**: operator script — add a channel, sync, price it, publish, assert it appears in `GET /v1/models`
and on `/models` within one TTL.

**Done when**: an operator can put a new model on sale without opening New-API's own UI.

---

### Batch F — Journey and shell: register, docs, help, i18n, golden e2e

**Depends on**: B, C, D (the journey it verifies must exist).

**Scope**
- Auth entry: `登录 / 注册` with a correct `returnTo` on **first paint** (no localhost fallback), first-run
  tenant provisioning, and a post-register onboarding panel (top up → key → first call).
- Market chrome cleanup: remove the 9 hard-coded `localhost:3105` links (D8), footer links point at real
  pages, `/product` sitemap entry deleted or implemented, search box seeded from `?q=`.
- `/docs` rebuilt on the published shelf with the client recipes in §5.1; a test asserts the endpoint table
  equals the edge allow-list.
- `/help` + `/legal/{terms,privacy,refund}` with the rules from §5.1.
- `热门 / 推荐` become real sort keys; `featured` flag from `ModelConfig`; taxonomy counts live.
- i18n pass over every new string; microcopy review against the 禁七/禁四 families (these paths are outside
  the lint-governed `apps/web/src`, so this is a human review gate — and `暂无相关模型` / `暂无轮播物料`
  must not survive it).
- **`e2e/golden/router-journey.spec.ts` complete** — all 12 steps of J1, run in CI.

**Tests**
- Golden journey spec, green, unskipped.
- Link check: no `localhost` in a production build; every footer/nav href resolves.
- Docs snippet test: the curl in `/docs` executes against staging and returns 200.

**Smoke**: a stranger following `/docs` from a clean browser reaches a successful call — this is the
closure-phase phase-exit metric applied to the Router.

**Done when**: J1 passes unattended in CI and the README's Router section leads with that path.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Reservation/settlement adds latency to the streaming path | Reserve from a cached price row (no DB read on the hot path); settle asynchronously through the existing usage queue; the guard is a single Redis/`CreditBalance` read |
| Pricing drift between our table and upstream | `upstream*` columns + `markupRate` + a margin page (Batch E) make drift visible; the importer never overwrites an operator-set price |
| Payment provider selection slips | The provider seam already exists in `packages/commerce/billing`; `manual` channel ships in Batch C so the journey is completable while a rail is pending |
| Scope creep into 302's agent/MCP/sandbox surfaces | §2 non-goals are review gates; those all require VPS compute, which is out for the year |
| Two ledgers confuse a later reader | D1 is documented in `apps/router/README.md` and in the gateway relay's README in the same PR as Batch A |
| Deleting the demo store breaks local dev | Batch A ships a seed script that creates a tenant, a key and a starting balance for `pnpm dev` |

## 10. Definition of done for the whole effort

```
clean clone → frozen install → lint → typecheck → unit → postgres integration
→ build → e2e/golden/router-journey.spec.ts green → operator smoke green
```

Plus: no `demo` / `mock` / `localhost` marker in `apps/router/src` outside tests, `nebutra-admin.json`
reports `implemented`, and `packages/platform/{prepaid-wallet,router-supply}` READMEs move off `Status: WIP`
with the honesty layer they have actually earned.
