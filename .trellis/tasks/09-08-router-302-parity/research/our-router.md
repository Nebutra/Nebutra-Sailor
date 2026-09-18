# Our Router — current product inventory (code audit, 2026-09-08)

Scope: `apps/router` (every page, API route, `lib/*`, `components/*`), `packages/platform/router-supply`,
`packages/platform/prepaid-wallet`, `backends/gateway/src/routes/ai/*`, `infra/nebutra-router`.
Method: static read of every file (no browser; nothing was run). Route map of 302 itself is in
`docs/plans/2026-07-23-router-302-full-route-interaction-study.md` and is not repeated here.

Repo root: `/Users/tseka_luk/workspace/code/personal/nebutra/nebutra-sailor/seasnake` — all paths below are relative to it.

## 1. Summary

The Router is two products glued together by one Next.js app. The **public edge** (`/v1/*` → `/api/v1/[...path]`) and the
**supply admin contract** (`/api/admin/v1/supply/*`, `/.well-known/nebutra-admin.json`) are real: they talk to New-API /
CLIProxyAPI over private URLs, validate `sk-sailor-*` keys against the shared `APIKey` Prisma table (when
`ROUTER_KEY_STORE=nebutra`), write a `UsageLedger` row per request, and audit-log channel syncs. The **market shell**
(`/`, `/models`, `/product/detail/[slug]`) is real-ish: catalog facts come from models.dev, inventory from New-API /
OpenRouter, but every product-page field beyond `publicModel / provider / price / context` is templated copy and
there is no per-model detail data. The **customer console** (`/dashboard`, `/keys`, `/wallet`, `/use`) is where the
gap is: the wallet is a `MemoryPrepaidWallet` seeded with 25 USD for a hard-coded `"demo"` tenant, `/wallet/topup`
is a mock with **no auth**, `/api/v1/chat` returns a canned string unless `ROUTER_GATEWAY_URL` is set, the
dashboard's "API Keys" stat reads the in-memory demo list even in `nebutra` mode, and there is **no usage /
billing-log / order / recharge-history surface at all** — the gateway has `/api/v1/ai/usage/*` aggregates over
`RequestLog`, but the Router never calls them. Client components are all `useState` + `fetch` with no error
handling, no optimistic state, and one refetch race in `/models` filter sync.

## 2. Page / feature inventory

Status legend: **real** = backed by DB / engine / catalog; **mocked** = in-memory or canned; **partial** = real
data feed, templated presentation; **missing** = surface 302 has, we do not.

### 2.1 Public market shell (chrome = `MarketShell` in `src/components/console-shell.tsx`)

| URL | Purpose | Key fields / columns | Actions / buttons (exact labels) | States / empty / error | Status | Files |
|---|---|---|---|---|---|---|
| `/` (`?product_type=api`) | 302-style API market home: left taxonomy rail + center carousel + right "Hi" panel + card shelf | Card: `publicModel` (mono), `description`(=name), category chip, `入 $x/1M · 出 $y/1M`; rail rows: label · hint · live count; Hi panel: `可售` count | Tabs `最新 / 热门 / 为你推荐`; view toggle `网格视图 / 列表视图`; `全部 →`; rail links `/models?cate=api&tag=…`; flyout brand cards → `/models?cate=api&tag=&brand=`; Hi shortcuts `汇总 密钥 钱包 试用 文档 更多`; CTA `登录 / 注册` + `没有账号？注册`; carousel `上一帧/下一帧`, dot `第 N 帧` | Carousel empty: `暂无轮播物料`; shelf footnote = `sourceNote` (e.g. `可售货架 · N · 供给库存 · newapi(123) · 价/上下文 models.dev · 库存 newapi(123) · inventory∩models.dev`); no loading state (RSC) | **partial** — models are real (catalog ∩ inventory); `热门` sorts by input price desc (fake "hot"); `为你推荐` = `sellable \|\| routed`; grid interleaves brands round-robin to 15 | `src/app/page.tsx`, `src/components/market-home.tsx`, `src/components/market-banner-carousel.tsx`, `src/lib/market-banners.ts`, `src/lib/market-taxonomy.ts`, `src/lib/listing-catalog.ts` |
| `/?product_type=tool` | "应用集市" tab — Forge promo | Left TOOL_TAXONOMY rows (label + chips) all `href=http://localhost:3105`; center dark hero `Forge 工具工作台` | `打开 Forge →` (`NEXT_PUBLIC_FORGE_URL ?? http://localhost:3105`) | none | **mocked** — hard-coded localhost links, no real app shelf | `src/components/market-home.tsx` L172-247, `src/lib/market-taxonomy.ts` L165-208 |
| `/models?cate=api&tag=&brand=&q=&sort=` | 302 `/product/list` analogue: collapsible taxonomy mega-panel (category rows × brand chips) + shelf | Same card fields; header `h1` = `全部模型` / category / `分类 · 品牌`; count `N 个` | `分类` panel toggle (`折叠分类 / 展开分类`), inline filter input `在结果中筛选…`, `价格 ↕/↑/↓` tri-state sort by `inputPerMTok`, grid/list toggle, `清除筛选` | Empty: `没有匹配的模型`; sourceNote footer; no loading; no pagination (renders entire list) | **partial** — data real; URL sync via `router.replace` in `startTransition` | `src/app/models/page.tsx`, `src/components/models-catalog.tsx`, `src/components/product-card.tsx` |
| `/product/detail/[slug]` | 302 PDP analogue: breadcrumb · cover · price dl · metrics aside · TOC · sections | Breadcrumb `API / {category} / {provider} / {publicModel}`; badges `可售` or `目录`, `上下文 {context}`; dl `输入 $x/1M tokens`, `输出`, `厂商`; warning `大额采购可联系支持获取专属价`; sections `API介绍`, `Playground`, `API列表`(2 fixed rows: `Chat（聊天）`, `Chat（流式）` → `/api/v1/chat/completions`, `POST`, `稳定`, `查看详情`), `API价格表`(1 row: 模型/上下文/输入/输出/说明=`目录价 · 按量`), `猜你喜欢` (8 cards) | `复制给 AI` (→ `已复制` for 1.6s), `查看文档` ×2, `Playground` → `/use?model=`, `打开 Playground · {model}`, `点击登录` | `notFound()` when slug unknown; `猜你喜欢` empty: `暂无相关模型` (禁七 violation — outside governed path); aside text: `运行探针（成功率 / 延迟 / TPS）接入后在此展示；当前无上报数据。` | **partial** — every prose block is a template string from provider/category/price; the API list, stability, and metrics are placeholders | `src/app/product/detail/[slug]/page.tsx`, `src/components/product-detail.tsx` |
| Market chrome (all above) | Utility bar + logo/search + channel dock + footer | Utility L: currency dropdown `USD $ / CNY ¥ / JPY ¥ / RUB ₽` (state only, **never converts prices**), locale switcher (37 message files), `登录 / 注册`; Utility R: `首页`, `管理后台`, `快捷使用`, `技术支持 ▾` (`API 文档`, `接入说明` → both `/docs`); search `请问你想用 AI 做什么呢？` → `/models?q=`; `AI 推荐` → `/models`; dock `应用集市 / API 集市 / 模型目录 / 客户端(→localhost:3105)` | as listed | — | **partial** — currency is cosmetic; footer `Support`/`Legal` links all point to `/docs`; `客户端` → localhost | `src/components/console-shell.tsx` L169-322, `src/components/market-footer.tsx`, `src/components/locale-switcher.tsx`, `src/components/auth-actions.tsx` |
| `/robots.txt`, `/sitemap.xml` | SEO | sitemap lists `/`, `/models`, `/product` (404 — no such page), `/docs` | — | — | real (but `/product` entry is dead) | `src/app/robots.ts`, `src/app/sitemap.ts` |

### 2.2 Admin console (chrome = `AdminShell`, guarded by `requireAuth()` → Auth Center redirect)

| URL | Purpose | Key fields | Actions | States | Status | Files |
|---|---|---|---|---|---|---|
| `/dashboard` | 数据汇总 | Stats `余额 {balance} {currency}` (hint `prepaid wallet`), `API Keys {n}` (hint `sk-sailor-*`), `目录模型 {n}`, `显式路由 {n}` (hint `aliases`); `接入参数` CopyField `baseURL`, `示例 model`, curl snippet; `上线检查` checklist `钱包余额 > 0`, `至少一个 API Key`, `配置 baseURL`(always ✓), `快捷使用试跑`(always ✗); `目录精选` 6 cards | `API 集市`, `快捷使用 →`, `打开 API 集市 →` | none (RSC); no error state | **mocked** — `getWallet().getBalance("demo")` and `listKeys()` from `demo-store` even when `ROUTER_KEY_STORE=nebutra` (so the key count is wrong in prod mode); checklist booleans are half hard-coded | `src/app/dashboard/page.tsx`, `src/lib/demo-store.ts` |
| `/keys` | API Keys | Table cols `名称 / prefix / scopes / 创建时间 / (操作)`; create form `名称` input default `default`; one-time banner `仅显示一次 · 请立即保存` + `<pre>` full key | `创建 Key` (→ `创建中…`), `复制`, `吊销` (only when `store==="nebutra"`) | Empty: `还没有 Key` (colSpan 4 vs 5 columns — misaligned); no error toast; fetch failure → unhandled | **real in `nebutra` mode** (shared `APIKey` table, tenant-scoped, revoke invalidates in-process cache); **mocked in default mode** (global in-memory array). No `lastUsedAt`, `expiresAt`, `rateLimitRps`, no rename, no scope editing — all of which the gateway's `/api/v1/ai/api-keys` already supports | `src/app/keys/page.tsx`, `src/components/keys-client.tsx`, `src/app/api/v1/keys/route.ts`, `src/app/api/v1/keys/[id]/route.ts`, `src/lib/router-keys.ts` |
| `/wallet` | 钱包 | `当前余额 {balance} {currency}` (`…` while null), note `Demo 内存账本 · 生产写入 prepaid-wallet`; `Mock 充值` presets `+5 +10 +25 +50 +100`, `金额` number input | `充值` (→ `处理中…`) | msg line shows server `message`/`error`; no history, no orders, no invoices | **mocked** — `MemoryPrepaidWallet` seeded 25 USD on `"demo"`; process-global, resets on restart; not per-tenant | `src/app/wallet/page.tsx`, `src/components/wallet-client.tsx`, `src/app/api/v1/wallet/route.ts`, `src/app/api/v1/wallet/topup/route.ts` |
| `/docs` | 接入 (not auth-guarded, but in admin nav) | CopyField `baseURL`, `示例 model`; 6 snippets `TypeScript · openai SDK`, `curl`, `TypeScript · @anthropic-ai/sdk`, `Claude Code`, `Codex CLI · Responses API`, `图片生成`; endpoint table `Method / Path / 说明` (7 rows) | copy buttons | — | **real** (static), but `sampleModel` comes from deprecated `getModels()` (alias table), not the shelf; snippets hard-code `claude-sonnet-4-5`, `gpt-5-codex`, `gpt-image-2` | `src/app/docs/page.tsx` |
| `/use` (`/playground` → 302 redirect) | 快捷使用 — single-turn trial chat | `模型` select (shelf ids, seeds `?model=`), `API Key（可选）` (`sk-sailor-… 转发真实网关时填写`), `消息` textarea (12 rows), output pane `回复` + model, `mode=demo · 本地模拟（未配上游）` | `发送` (→ `请求中…`) | Empty output: `发送消息后，模型回复会显示在这里。`; errors rendered in the output pane as plain text | **mocked by default** — `/api/v1/chat` returns `（demo）{model} 收到：{prompt}…` and debits 0.001 from the demo wallet; forwards to `ROUTER_GATEWAY_URL/chat/completions` only when both env and a pasted key exist. No streaming, no history, no multi-turn, no token/cost display | `src/app/use/page.tsx`, `src/app/playground/page.tsx`, `src/components/playground-client.tsx`, `src/app/api/v1/chat/route.ts` |

### 2.3 Missing surfaces (302 has them; we have nothing)

| 302 surface | Ours | Nearest existing data source |
|---|---|---|
| 用量 / 日志 (per-request logs: time, model, tokens, cost, status, latency) | **missing** | `UsageLedger` rows written by `src/lib/usage-ledger.ts` (metadata: `path, keyId, promptTokens, completionTokens, status, latencyMs, supplyPath`); gateway `/api/v1/ai/usage/{summary,by-model,by-key,history}` over `RequestLog` |
| 充值记录 / 订单 / 发票 | **missing** | `CreditLedgerPort.addCredits` (type `PURCHASE\|BONUS\|ADJUSTMENT\|REFUND`) exists in `prepaid-wallet` but is never wired |
| 余额消费明细 | **missing** | same |
| 兑换码 / 礼品卡 | **missing** | — |
| 团队 / 子账号 / 分组 | **missing** | Router resolves tenant = org tenant else personal tenant (`resolveSessionTenantId`) — no UI |
| 模型价格总表 (`/price`) | **missing** as page (prices only on cards / PDP) | `getListingCatalog()` already has `inputPerMTok/outputPerMTok/context` for all models |
| BYOK / 自有 key | **missing** in Router | gateway `/api/v1/ai/provider-keys` (OPENAI/ANTHROPIC/GOOGLE/SILICONFLOW/CUSTOM, masked `••••last4`, `alwaysUse`) |
| Key 限速 / 有效期 / 改名 | **missing** | gateway `CreateApiKeySchema` has `rateLimitRps`, `expiresInDays`; `PATCH /{id}` |
| 应用集市 real shelf | **mocked** (Forge links) | — |
| 帮助中心 / 费用说明 / 法务页 | **missing** (footer → `/docs`) | — |
| 探针指标 (成功率/延迟/TPS) on PDP | **missing** (explicit placeholder text) | — |

### 2.4 API inventory — `apps/router/src/app/api/**` (+ `next.config.ts` rewrite `/v1/:path* → /api/v1/:path*`)

| Method · Path | Auth | Backing | Status | Notes | File |
|---|---|---|---|---|---|
| `GET /api/health` | none | `@nebutra/health` | real | fleet probe | `src/app/api/health/route.ts` |
| `ANY /api/v1/[...path]` (public `/v1/*`) | `Authorization: Bearer` or `x-api-key` | New-API (`NEW_API_BASE_URL`) | **real** | Allow-list: `models[/id]`, `chat/completions`, `completions`, `responses[/id[/cancel]]`, `messages[/count_tokens]`, `embeddings`, `images/{generations,edits,variations}`, `audio/{speech,transcriptions,translations}`, `rerank`; else 404 `unknown_endpoint`. `nebutra` mode: hash-lookup in `APIKey` (60s +cache / 5s −cache, cap 2000), swaps to `NEW_API_ACCESS_TOKEN`, tees body (4 MB cap) to parse usage from JSON/SSE (OpenAI + Anthropic shapes), calls `recordRouterUsage`. `newapi-token` mode (default): forwards credential untouched. 503 `router_unconfigured` when no base URL; 180 s timeout; `x-request-id` echoed | `src/app/api/v1/[...path]/route.ts`, `src/lib/openai-edge.ts`, `src/lib/router-keys.ts`, `src/lib/usage-ledger.ts` |
| `POST /api/v1/chat` | **none** | demo wallet or `ROUTER_GATEWAY_URL` | **mocked** | Body `{model, prompt, apiKey}`. Response `{mode:"demo"\|"gateway", content}`. Debits 0.001 from `"demo"`. Publicly reachable as `/v1/chat` via rewrite | `src/app/api/v1/chat/route.ts` |
| `GET /api/v1/keys` | session (nebutra) / **none** (demo) | `ApiKeyRepository.listByTenant` / in-memory | real (nebutra) · mocked (demo) | Returns `{keys, store}`; demo rows `key_N` | `src/app/api/v1/keys/route.ts` |
| `POST /api/v1/keys` | session (nebutra) / **none** (demo) | `ApiKeyRepository.create` | real (nebutra) · mocked (demo) | Body `{name}` (1-64, default `default`). Returns `{...summary, fullKey}` 201; demo adds `warning: "Shown once only in demo store"`. Scopes fixed to `models:* tools:*`; no `expiresAt`/`rateLimitRps` | same |
| `DELETE /api/v1/keys/[id]` | session | `ApiKeyRepository.revoke` + `invalidateKeyCache()` | real | 501 `Revoke needs ROUTER_KEY_STORE=nebutra.` in demo mode | `src/app/api/v1/keys/[id]/route.ts` |
| `GET /api/v1/wallet` | **none** | `MemoryPrepaidWallet` | **mocked** | Always tenant `"demo"` → `{tenantId, balance, currency}` | `src/app/api/v1/wallet/route.ts` |
| `POST /api/v1/wallet/topup` | **none** | `MemoryPrepaidWallet.topUp` | **mocked** | Body `{amount>0}`; returns `{ok, message:"Mock top-up ok — wire real payments in production", transactionId:"mem_txn_N", balanceAfter}`. **Unauthenticated mutation, publicly reachable as `/v1/wallet/topup`** | `src/app/api/v1/wallet/topup/route.ts` |
| `GET /.well-known/nebutra-admin.json` | none | static manifest | real | `contract: nebutra.admin/v1`, `product: router`, `status: "wip"`; resources `engine/account/login/shelf`, actions `account.login / account.login.callback / channel.sync`, signals `engine.down / channel.drift / account.expired`, policy `channel.autosync` (disabled) | `src/app/.well-known/nebutra-admin.json/route.ts`, `src/lib/admin/manifest.ts` |
| `GET /api/admin/v1/supply/engines` | `x-service-token` HS256 + `x-user-id` + `x-role` ≥ `platform_readonly` | probes `CLIPROXY_INTERNAL_URL/v1/models`, `NEW_API_INTERNAL_URL/api/status` (4 s) | real | rows `{id, label, status: healthy\|degraded\|down, latencyMs, detail:"HTTP n"}` | `src/app/api/admin/v1/supply/engines/route.ts`, `src/lib/supply/domain.ts` |
| `GET /api/admin/v1/supply/accounts` | staff token | CLIProxyAPI `/v0/management/auth-files` | real | rows `{id, provider, account, status: healthy\|expired\|disabled\|unknown, detail, lastUsed, requests}` | `…/accounts/route.ts`, `src/lib/supply/clients.ts` |
| `GET /api/admin/v1/supply/logins` | staff token | in-process `Map` of pending OAuth flows (30 min TTL) + status probe | real but **in-memory** (lost on restart / not shared across instances) | rows `{id=state, provider, providerLabel, url, status: wait\|ok\|error\|unknown, detail, startedAt, startedBy}` | `…/logins/route.ts`, `src/lib/supply/login.ts` |
| `GET /api/admin/v1/supply/shelf` | staff token | New-API `/v1/models` ∩ CLIProxyAPI `/v1/models` | real | rows `{id, supply: account\|key, status: on-shelf\|pending-sync}` | `…/shelf/route.ts` |
| `POST /api/admin/v1/supply/actions/channel.sync` | `platform_operator` | New-API admin API (root login, `PUT/POST /api/channel/`) + `@nebutra/audit` | real; plan store **in-memory** (10 min TTL, single-use) | `{mode:"plan"}` → `ActionPlan{planId, summary, diff[], affected, warnings, expiresAt}`; `{mode:"apply", planId}` → `ActionResult{auditId, summary, result}`; 409 `plan_expired` | `…/actions/[id]/route.ts`, `src/lib/supply/domain.ts` |
| `POST …/actions/account.login` | `platform_operator` | CLIProxyAPI `/v0/management/{codex,antigravity,anthropic}-auth-url` | real | input `{provider}`; result `{state, provider, url, callbackHost: localhost:{1455\|51121\|54545}}` | `src/lib/supply/login.ts` |
| `POST …/actions/account.login.callback` | `platform_operator` | CLIProxyAPI `/oauth-callback?…` replay | real | input `{redirectUrl}`; matches `state` to pending map | same |
| `GET /api/admin/v1/supply/signals/[id]` | staff token | composed from above | real | `SignalReading{id, status: ok\|raised\|unknown, severity, probedAt, title, detail, resource, action?, data?}` | `…/signals/[id]/route.ts` |

### 2.5 `packages/platform/router-supply` (WIP per README)

| Module | Status | Notes |
|---|---|---|
| `alias.ts` — `parseAliasTableJson(NEBUTRA_MODEL_ALIASES)`, `DEFAULT_ALIASES`, `resolveAliases`, `listPublicModels` | real (env-config) | Defaults = 12 ids from `frontier-defaults.ts` all → `newapi` priority 10, `claude-sonnet*` also → `sub2api` 20, `*` wildcard → `newapi` 1000 |
| `frontier-defaults.ts` | **hand-maintained snapshot** | `DEFAULT_PUBLIC_MODEL = "gpt-5.6-luna"`; comment: must be synced by hand with `packages/ai/ai-providers/src/frontier.ts` |
| `engines.ts` — `loadEnginesFromEnv()` | real | `newapi` (NEW_API_*), `sub2api` (SUB2API_*), `official-openai` (OPENAI_API_KEY); `openaiCompatibleUrl()`, `chatCompletionsUrl()` |
| `inventory.ts` — `getSupplyInventory()` | real, module-level cache (`ROUTER_INVENTORY_TTL_MS` 5 m) | union of engine `/v1/models` + **OpenRouter public list fallback** (`ROUTER_USE_OPENROUTER_INVENTORY`) — in lab this means the shelf shows OpenRouter's catalog as "可售" even with no New-API |
| `proxy.ts` — `proxyChatCompletions()` | real but **unused by the app** (edge proxies raw to New-API) | fallback across targets on 408/409/425/429/5xx |
| `resolve.ts` — `resolveUpstreamChain()`, `toOpenAiModelList()` | real; used by gateway `/models` only | supply class headers `X-Nebutra-Supply-Class: A\|B\|C` |

### 2.6 `packages/platform/prepaid-wallet` (WIP per README)

| Module | Status | Notes |
|---|---|---|
| `wallet.ts` — `PrepaidWallet` port, `MemoryPrepaidWallet` | port real; impl **test/demo only** ("Not for production multi-instance use") | `getBalance / topUp / debit / hasBalance / seed`; `transactionId: mem_txn_N`; money rounded to 4 dp |
| `credit-ledger-wallet.ts` — `createCreditLedgerWallet(port)` | real adapter, **never instantiated anywhere** | maps to `@nebutra/billing/credits` (`getCreditBalance / addCredits / deductCredits`, tx type `PURCHASE`) |
| `api-key.ts` — `issueApiKey()`, `hashApiKey()` (SHA-256), prefix slice 12 | real; used by router + gateway | key = `sk-sailor-` + 64 hex |
| `scopes.ts` — `models:* / tools:*`, `hasScope`, `DEFAULT_PRODUCT_SCOPES` | real | empty scopes = unrestricted |
| `usage-envelope.ts` — `UsageEnvelope` zod (customerCharge + optional supplyCost, `product: router\|forge`, status enum) | contract only; **no producer/consumer** in router | dual-ledger idea not wired |
| `router-adapter-types.ts` | types only | `SupplyEngineKind = newapi\|sub2api\|cliproxyapi\|official` |
| `errors.ts` | real | codes `insufficient_credits / insufficient_scope / invalid_amount / tenant_not_found / key_invalid` |

### 2.7 `backends/gateway/src/routes/ai/*` (a second, parallel relay — not what `router.nebutra.com/v1` uses)

| Route | Auth | Status | Notes |
|---|---|---|---|
| `POST /api/v1/ai/chat`, `/embeddings`, `GET /models` (`index.ts`) | session | real | proxies to Python `AI_SERVICE_URL` with circuit breaker; `/models` from models.dev catalog |
| `createAiGatewayRoutes` — `GET /api/v1/ai/gateway/models`, `POST …/chat/completions` (`gateway.ts`) | `sk-sailor-*` via `createGatewayPipelineMiddleware` (Redis + Prisma + credit balance) | real | worst-case reservation (`admitSpend`) priced from model pricing; upstream chain `defaultEnvUpstreams()` (newapi, sub2api, openai, openrouter, litellm, portkey, ai-gateway, custom; `AI_GATEWAY_PROVIDER_CHAIN`); streaming usage extraction; `enqueueCompletion` for async billing; headers `X-Nebutra-AI-Provider(-Type)`. **Only chat/completions** — no responses/messages/images |
| `api-keys.ts` — `POST/GET /`, `DELETE/PATCH /{id}` | session + org | real | create supports `scopes, rateLimitRps(1-10000), expiresInDays(1-3650)`; list returns `lastUsedAt, revokedAt, expiresAt, rateLimitRps`; Redis cache invalidation `apikey:{hash}` |
| `usage.ts` — `GET /summary`, `/by-model`, `/by-key`, `/history?granularity=hour\|day` | session + org | real (MVP: `/history` buckets in memory) | over `RequestLog` (`totalTokens`, `cost` Decimal); default period = UTC month-to-date |
| `byok-upstreams.ts`, `provider-keys/index.ts` | session + org + CASL `AiProviderKey` | real | BYOK: tenant key first (`alwaysUse` pins), SSRF guard `isSafeUpstreamBaseUrl` |

Divergence to flag: the Router edge writes `UsageLedger` (`source: API, type: AI_TOKEN, unit: token`), while the
gateway relay writes `RequestLog` via queue and the usage dashboard reads `RequestLog`. Two ledgers, no join.

### 2.8 `infra/nebutra-router`

| Item | Status | Notes |
|---|---|---|
| `compose.yaml` | real, dev | `new-api v0.8.7.4` @ `127.0.0.1:3001`, `cliproxyapi v7.2.154` @ `127.0.0.1:3003`, optional `sub2api` profile (`latest` — unpinned), postgres 16, redis 7.4; `SESSION_SECRET: change-me-in-production`, pg password `nebutra_dev_only` |
| `compose.ecs.yaml` | real, lab box | New-API `127.0.0.1:3301`, CLIProxyAPI `127.0.0.1:3303`; README says Fly is production for CLIProxyAPI |
| `config/cliproxyapi.yaml.template` | template | `remote-management.allow-remote: true` (needed for admin proxy); comment in `versions.lock` still says "Management API stays off" — **stale** |
| `scripts/new-api-setup.py`, `seed-newapi-channel-cliproxy.py` | real, idempotent | root bootstrap; channel upsert (superseded by `channel.sync` action but kept) |
| `scripts/cliproxy-login.sh` | real CLI fallback | codex/gemini/claude/kimi/xai; paste-back flow |
| `scripts/smoke-chat.sh` | real | probes `/models`, `/chat/completions`, `/responses`, `/messages` (x-api-key) |
| `versions.lock` | real | `policy.customer_entry: https://router.nebutra.com`; `upgrade_requires` lists "balance debit reconciliation sample" — no such sample exists |

## 3. Entities and fields (as coded)

| Entity | Where | Fields / formats / units |
|---|---|---|
| **ListingModel** (shelf row) | `src/lib/listing-catalog.ts` | `publicModel` (bare id, e.g. `gpt-5.6-luna`, `claude-sonnet-5`; `/`, `:`, `@`, 8-digit dates, `>64` chars filtered out), `name`, `description`(=name), `category: chat\|reasoning\|fast\|multimodal\|image\|video\|audio\|data\|rag\|tools\|other`, `provider` (19-value enum incl. `qwen zhipu minimax baichuan yi doubao hunyuan nvidia other`), `context` (formatted `128k`/`1M`/`—`), `inputPerMTok`/`outputPerMTok` (USD per 1M tokens, `0` = unknown → `—`), `routes[]{engineId, upstreamModel, priority}`, `routed`, `sellable`, `source: models.dev\|alias-fallback` |
| Category labels | same | `语言大模型 推理模型 高性价比 多模态 图片生成 视频生成 音视频处理 信息处理 RAG 相关 工具 API 其他` |
| Price format | `formatPrice()` | `$0.15` (<1 → 2 dp), `$3` / `$2.50` (≥1), `—` |
| **APIKey** (Prisma `api_keys`) | `packages/platform/db/prisma/schema.prisma` L290 | `id` cuid, `name` ≤64, `keyHash` (sha256 hex, unique), `keyPrefix` ≤16 (first 12 chars = `sk-sailor-xx`), `tenantId`, `createdById?`, `lastUsedAt?`, `revokedAt?`, `createdAt`, `updatedAt`, `scopes[]`, `rateLimitRps` default 10, `expiresAt?` |
| Demo key (`StoredKey`) | `src/lib/demo-store.ts` | `id: key_N`, `name`, `keyPrefix`, `scopes`, `createdAt` ISO, `fullKeyOnce` |
| Key plaintext | `prepaid-wallet/src/api-key.ts` | `sk-sailor-` + 64 hex (74 chars); scopes default `["models:*","tools:*"]` |
| **WalletBalance** | `prepaid-wallet/src/wallet.ts` | `tenantId`, `balance` (number, 4 dp), `currency` default `USD`; mutation adds `transactionId` (`mem_txn_N`), `balanceAfter` |
| Demo wallet tenant | `demo-store.ts` | literal `"demo"`, seeded `25` USD; playground debit `0.001` per call |
| **EdgeUsage / UsageLedger row** | `src/lib/openai-edge.ts`, `src/lib/usage-ledger.ts` | `requestId` uuid, `identity{keyId, tenantId, userId}`, `path`, `model` (`unknown` if unparsed), `promptTokens`, `completionTokens`, `totalTokens`, `status` (HTTP), `latencyMs`, `supplyPath` (from `x-oneapi-channel`/`x-newapi-channel`); ledger `idempotencyKey: router:{requestId}`, `source: "API"`, `type: "AI_TOKEN"`, `unit: "token"`, `metadata.product: "router"` |
| Session → tenant | `src/lib/router-keys.ts` | org tenant (`Tenant.organizationId`) else personal (`Tenant.userId`); 403 `No tenant for this account yet.` |
| **Engine probe row** | `src/lib/supply/domain.ts` | `id: cliproxyapi\|new-api`, `label`, `status: healthy\|degraded\|down`, `latencyMs\|null`, `detail: "HTTP 200"` |
| **AccountRow** | same | `provider` (from auth-file `provider\|type`), `account` (email/name), `status: healthy\|expired\|disabled\|unknown`, `detail`, `lastUsed` (ISO\|null), `requests` (n\|null) |
| **PendingLogin** | `src/lib/supply/login.ts` | providers `codex` ("ChatGPT · Codex", cb 1455), `antigravity` ("Google · Antigravity (Gemini)", 51121), `anthropic` ("Claude Code", 54545); `status: wait\|ok\|error\|unknown` |
| **Shelf row (admin)** | domain.ts | `id`, `supply: account\|key`, `status: on-shelf\|pending-sync` |
| Admin errors | `src/lib/admin/service-token.ts` | `{error:{code, message}}`; codes seen: `unauthenticated, forbidden, not_found, invalid_input, plan_expired, upstream_unavailable` |
| Currencies (UI only) | `console-shell.tsx` | `USD $, CNY ¥, JPY ¥, RUB ₽` — no FX, no persistence |
| Alias entry | `prepaid-wallet/router-adapter-types.ts` | `{publicModel, engineId, upstreamModel, priority}`; wildcard `*` |
| Gateway usage aggregates | `backends/gateway/src/routes/ai/usage.ts` | `{totalTokens, totalCost, requestCount, from, to}`; by-model `{model, tokens, cost, requests}`; by-key adds `apiKeyId, name, keyPrefix`; history `{timestamp, tokens, cost, requests}` |

## 4. UX patterns and anti-patterns

### Worth keeping
- **Three-shell routing** (`surfaceOf(pathname)` → `MarketShell / AdminShell / UsageShell`) is the right 302 skeleton; chrome never mixes market and admin.
- **Taxonomy rail + portal flyout** (`market-home.tsx`): fixed-position portal with 140 ms close timer and scroll/resize re-anchoring — avoids grid clipping; keyboard `onFocus` opens too.
- **URL-as-state on `/models`** (`?cate=api&tag=&brand=&q=&sort=`) with `router.replace(..., {scroll:false})` inside `startTransition` — matches 302's `cate/tag/brand` semantics.
- **CopyField** (`copy-field.tsx`): mono value + icon button, `Check` feedback for 1.2 s, `aria-label="复制 {label}"`.
- **One-time key banner** with warning tint and `复制` — correct disclosure pattern.
- **PageFrame** compact header (title 15 px, description 12 px, actions slot) — dense console rhythm.
- **HeaderMenu** dropdown: hover + click, outside-click + Escape close, `role=menu`, `aria-controls`.
- Admin contract's **plan → apply with expiring single-use planId** and audit row — reuse for any destructive console action.
- Edge error envelope `{error:{message,type}}` mirrors OpenAI — keep for all `/v1` errors.

### Anti-patterns / state-management smells (client components)
| Component | Smell | Detail |
|---|---|---|
| `keys-client.tsx` | useState-only; no error path | `refresh()` does `res.json()` without checking `res.ok`; a 401/403 from `/api/v1/keys` (`{error}`) silently sets `keys=[]` → shows `还没有 Key`. `create()` ignores `data.error` (e.g. 403 `No tenant…`) — button just re-enables. `revoke()` result ignored (404/501 invisible). No optimistic remove, no confirm dialog on `吊销`, no toast. Single `loading` boolean shared by create and every row's revoke → all buttons disable together. Empty-row `colSpan={4}` under 5 columns |
| `wallet-client.tsx` | useState-only; error as inline text only | `refresh()` unguarded; `topUp` shows `data.message ?? data.error` in the same neutral `<p>` — success and failure look identical. `amount` is a string; `Number("")` → 0 → server 400, no client validation. No transaction list, no optimistic balance |
| `playground-client.tsx` | error rendered as content; no abort | `data.error` is written into the output `<pre>` indistinguishable from a reply; `mode` cleared on error. No `AbortController` — rapid double `发送` can resolve out of order (last write wins on `out`). No streaming, no history. `useEffect` reads `window.location.search` after mount instead of receiving `initialModel` from the server (flash of wrong model). API key held in plain `useState` and posted in JSON body (fine for trial, but it is the customer's secret in a client bundle path) |
| `models-catalog.tsx` | dual source of truth + refetch race | Filters live in local state **and** the URL; `pushFilters` reads `cat/brand/q/sort` from closure — `onBlur` of the search input fires `pushFilters({q})` using stale `cat` if a category click happened in the same tick (click → blur ordering). `清除筛选` `Link` resets state via `onClick` while navigation also re-renders from `initial*` props, but `useState(() => parse(initial…))` never re-syncs when props change after `router.replace` (state initialised once; back/forward navigation leaves stale chips). `view` toggle not persisted / not in URL |
| `market-home.tsx` | tab/view local only; "hot" is fake | `tab` and `view` are `useState` — lost on navigation; `热门` = sort by price desc |
| `console-shell.tsx` MarketShell | currency is dead state | `currency` `useState` never affects any price; search `q` not seeded from `?q=` so `/models?q=x` shows an empty search box |
| `console-shell.tsx` AdminShell | hydration flash | `collapsed` read from localStorage in `useEffect` → initial paint is always expanded then snaps |
| `auth-actions.tsx` | `returnTo` defaults to `http://localhost:3106/` until effect runs | first paint sign-in href points at localhost |
| `dashboard/page.tsx` (RSC) | mode mismatch | reads `listKeys()` (demo) regardless of `ROUTER_KEY_STORE`; `getWallet()` always demo; checklist items `配置 baseURL` hard `true`, `快捷使用试跑` hard `false` |
| All fetch callers | no shared client | every component hand-rolls `fetch` + `as` casts; no SWR/React Query, no retry, no `res.ok` checks, no `AbortController` |

### Copy / governance
- `product-detail.tsx` `暂无相关模型` and `market-banner-carousel.tsx` `暂无轮播物料` are 禁七-shaped strings (path `apps/router` is not in the governed `apps/web/src`, so lint does not fire, but parity work should not copy them forward).
- Hard-coded `http://localhost:3105` in 9 places (`market-taxonomy.ts` ×7, `market-footer.tsx`, `market-home.tsx` fallback) ships to production chrome.

## 5. Screenshots

None — this was a code audit; no server was started and no browser session was used. Static reference images exist in
`apps/router/public/` (`router-home.png`, `router-models.png`, `302-home.png`, `302-home-mid.png`) from earlier work.

## 6. TODO / mock / demo markers (grep, excluding tests and i18n)

| File:line | Marker |
|---|---|
| `apps/router/src/lib/demo-store.ts:16,29` | "Full key only kept in demo memory"; `w.seed("demo", 25)` |
| `apps/router/src/app/api/v1/chat/route.ts:6-7,57-63` | "Demo chat … else mock response"; `mode: "demo"`; `（demo）… 配置 ROUTER_GATEWAY_URL 可转发真实中转` |
| `apps/router/src/app/api/v1/wallet/route.ts:5` | `getBalance("demo")` |
| `apps/router/src/app/api/v1/wallet/topup/route.ts:11-17` | `tenantId: "demo"`, `"router mock top-up"`, `"Mock top-up ok — wire real payments in production"` |
| `apps/router/src/app/api/v1/keys/route.ts:15,37,60` | "demo store keeps the console usable without a database"; `store: "demo"`; `warning: "Shown once only in demo store"` |
| `apps/router/src/app/dashboard/page.tsx:9,30` | imports demo-store; `getBalance("demo")` |
| `apps/router/src/app/docs/page.tsx:12` | uses deprecated `getModels()` from demo-store |
| `apps/router/src/app/wallet/page.tsx:13` | `Demo 为 mock 充值；生产接支付渠道写入同一账本。` |
| `apps/router/src/components/wallet-client.tsx:52,57` | `Demo 内存账本 · 生产写入 prepaid-wallet`; `Mock 充值` |
| `apps/router/src/components/playground-client.tsx:87,116` | `sk-sailor-… 转发真实网关时填写`; `本地模拟（未配上游）` |
| `apps/router/src/components/keys-client.tsx:28` | `store: "demo" \| "nebutra"` |
| `apps/router/src/components/product-detail.tsx:269,317` | `运行探针…当前无上报数据`; "无 mock 指标" |
| `apps/router/src/components/market-footer.tsx:26,88` | `客户端 → http://localhost:3105`; `Router API 集市（lab）` |
| `apps/router/src/components/market-home.tsx:234` | `NEXT_PUBLIC_FORGE_URL ?? "http://localhost:3105"` |
| `apps/router/src/lib/market-taxonomy.ts:26,171-206` | 7× `http://localhost:3105` |
| `apps/router/src/lib/auth.ts:27`, `components/auth-actions.tsx:25` | `http://localhost:3106` fallbacks |
| `apps/router/src/lib/admin/manifest.ts:18` | `status: "wip"` |
| `apps/router/src/lib/listing-catalog.ts:24-25` | listing depends on demo-store (`getModelRoutes`) |
| `apps/router/src/app/sitemap.ts:10` | `/product` URL has no page |
| `packages/platform/prepaid-wallet/README.md:3`, `router-supply/README.md:3` | `Status: WIP` |
| `packages/platform/prepaid-wallet/src/wallet.ts:48` | "in-memory wallet for unit tests and local demos" |
| `packages/platform/router-supply/src/alias.ts:47`, `frontier-defaults.ts:2-6` | "Lab defaults"; hand-synced snapshot |
| `packages/platform/router-supply/src/inventory.ts:8,101` | "lab default when no sidecar" (OpenRouter list as inventory) |
| `backends/gateway/src/routes/ai/usage.ts:348-350` | "MVP: fetch logs in window and bucket in memory" |
| `backends/gateway/src/routes/ai/gateway.ts:793-798` | `@deprecated aiGatewayRoutes` empty export |
| `infra/nebutra-router/compose.yaml:29,58` | `nebutra_dev_only`, `change-me-in-production` |
| `infra/nebutra-router/versions.lock` (cliproxyapi notes) | "Management API stays off" — contradicted by `cliproxyapi.yaml.template` `allow-remote: true` |
| `infra/nebutra-router/versions.lock` sub2api | `tag: latest` — "for lab only" |

No literal `TODO` / `FIXME` / `HACK` tokens exist in these surfaces; the debt is expressed as `demo` / `mock` / `lab` / `WIP`.

## 7. Open questions

1. **Which ledger is truth for the customer?** Router edge → `UsageLedger` (`AI_TOKEN`, tokens, no cost); gateway relay → `RequestLog` (tokens + `cost` Decimal) → `/usage/*`. A Router 用量 page needs one of them to carry cost per request. Is `UsageLedgerRepository.claim` expected to price, or is pricing a later reconciliation job?
2. **Wallet backing.** `createCreditLedgerWallet(@nebutra/billing/credits)` exists; is `CreditBalance` keyed by `organizationId` compatible with Router's `Tenant.id` (personal tenants have no org)? `resolveSessionTenantId` returns `Tenant.id`, the credits port wants `organizationId`.
3. **Should `/api/v1/chat`, `/api/v1/wallet*` stay under the `/v1` rewrite?** They are reachable as public `/v1/chat`, `/v1/wallet/topup` with no auth today.
4. **Default key-store mode.** `ROUTER_KEY_STORE` defaults to `newapi-token` (customer holds a New-API token). Is production already flipped to `nebutra`? The dashboard/keys UI behaves differently per mode and the dashboard ignores the flag.
5. **Which relay is canonical for chat?** `router.nebutra.com/v1` proxies raw to New-API (all protocols, no balance guard); `backends/gateway /api/v1/ai/gateway/chat/completions` has reservation + BYOK + queue billing but only chat. Parity work must pick one to hang 用量/余额 on.
6. **In-memory admin state** (`plans` Map, `pending` login Map) — acceptable for a single Machine, but is Router deployed >1 instance anywhere (Vercel default target per CLAUDE.md is `vercel` for web/landing; router's target is not listed)?
7. **Currency.** 302 shows CNY/USD switch with converted prices; ours is a dead dropdown. Is a FX table in scope, or should the dropdown go until it works?
8. **应用集市** — keep as Forge deep-link (needs `NEXT_PUBLIC_FORGE_URL` set everywhere) or hide the channel until a real app shelf exists?
9. **PDP data** — 302 PDPs carry real API lists, parameters, stability, probes. Is there any source (models.dev capabilities, New-API channel metadata) we intend to render, or does PDP stay template prose?
10. **`/product` sitemap entry** and `TOOL_TAXONOMY` localhost hrefs — delete or implement?
