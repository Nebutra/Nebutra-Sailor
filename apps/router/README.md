# @nebutra/router

Nebutra Router — OpenAI-compatible model relay with **管理后台 ≠ 使用界面** (302 principle).

```bash
pnpm --filter @nebutra/router dev   # http://localhost:3106
```

## Surfaces (aligned with 302.AI)

| Mode | Path | Purpose |
|------|------|---------|
| **API 集市（默认首页）** | `/` AI 推荐, `/models` 货架 | 搜索 · 类目 · 横幅 · 卡片（公开货架） |
| **快捷使用** | `/use` | 试用对话 |
| **管理后台** | `/dashboard`, `/keys`, `/wallet`, `/docs` | 数据汇总 · Key · 钱包 · 接入 |

`/playground` redirects to `/use`.

Public OpenAI-compatible edge (302.ai contract): `https://router.nebutra.com/v1`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/v1/models` | New-API inventory |
| POST | `/v1/chat/completions` | same body as 302.ai |
| POST | `/v1/images/generations` | same body as 302.ai |
| POST | `/v1/images/edits` | multipart `image` + `prompt` + `model` + `size` |

| POST | `/v1/responses` | Responses API (Codex CLI, Agents SDK) |
| POST | `/v1/messages` | Anthropic Messages — `x-api-key` accepted (Claude Code, Anthropic SDK) |
| POST | `/v1/embeddings` | embeddings |

One key, every protocol. Supply behind New-API is either an API-key channel
(302.ai, official keys) or the CLIProxyAPI account relay (ChatGPT / Google /
Claude accounts) — the customer cannot tell and does not choose. See
`infra/nebutra-router/README.md`.

Chat and messages also accept OpenRouter's `models: [...]` fallback chain: the
edge tries each candidate in order and moves on when the upstream answers with
a retryable status (408/409/425/429/5xx). Reading it means parsing the request
body, so a JSON body is buffered (4 MB ceiling); a multipart upload and any
JSON body over the ceiling stream through untouched and simply do not get
`models[]`.

### Console API — not on the public surface

The console lives under `/api/console/v1/{wallet,wallet/topup,keys,chat}` and
requires a session. It used to live under `/api/v1/*`, which the `/v1/:path*`
rewrite made **publicly reachable**: `POST /v1/wallet/topup` was an
unauthenticated mutation on a wallet. Those paths are now 404
(`error.code = "unknown_endpoint"`), asserted in
`src/lib/console-surface.test.ts`. Nothing new may be added under `/api/v1`
except the relay's own catch-all.

### Refusals

Every refusal carries a `code` in the OpenAI envelope, so a caller can branch
without reading prose:

| Status | `error.code` | Meaning |
| --- | --- | --- |
| 401 | `missing_api_key` · `invalid_api_key` · `key_disabled` | credential |
| 403 | `model_not_published` | priced but not on the shelf, or its price is incomplete |
| 404 | `unknown_endpoint` · `unknown_model` | not sold here |
| 402 | `insufficient_balance` | the tenant balance cannot cover the hold |
| 402 | `key_quota_exceeded` | the key's `limitDaily` (UTC) or `limitTotal` would break |
| 429 | `rate_limit_exceeded` | `APIKey.rateLimitRps`; `Retry-After` is set |
| 503 | `router_unconfigured` | no supply configured |

Every `/v1` response carries `X-RateLimit-Limit` / `-Remaining` / `-Reset`.

### Key store

There is one. The customer holds a Nebutra key (`sk-sailor-…`) in the shared
`APIKey` table — the same table as app settings and the gateway. The edge
validates it by hash, swaps in `NEW_API_ACCESS_TOKEN` upstream, writes a usage
ledger row per request, and `/keys` revoke takes effect immediately.

`ROUTER_KEY_STORE` and the New-API pass-through mode are gone, along with the
in-memory demo store behind them. Needs `DATABASE_URL` and
`NEW_API_ACCESS_TOKEN`. The customer key never reaches New-API; the New-API
token never reaches customers.

### Wallet

`CreditBalance` / `CreditTransaction`, keyed by `Tenant.id`, through
`@nebutra/prepaid-wallet`. `src/instrumentation.ts` calls
`configureBillingTenantDb(getTenantDb)` at boot — without it every credits call
throws. Spend decisions read `getBalanceFresh()`, never the cached
`getBalance()`; see `src/lib/wallet.ts`.

## Model list maintenance (302-style sellable shelf)

| Layer | Source | Role |
|-------|--------|------|
| **Catalog facts** | [models.dev](https://models.dev) via `@nebutra/ai-providers` | Name, price, context, capabilities |
| **Inventory** | New-API / Sub2API `GET /v1/models` · fallback OpenRouter public list | What we can actually route |
| **Shelf** | **inventory ∩ catalog** (+ always include explicit aliases) | What `/models` shows as **可售** |
| **Alias routes** | `NEBUTRA_MODEL_ALIASES` | Failover map; badge **alias** |

### Env

| Var | Default | Meaning |
|-----|---------|---------|
| `ROUTER_LISTING_MODE` | `auto` | `auto` = inventory when available; `inventory` = sellable-only; `catalog` = models.dev only |
| `ROUTER_USE_OPENROUTER_INVENTORY` | on if no sidecar | Use OpenRouter `/api/v1/models` as lab inventory |
| `NEW_API_BASE_URL` + `NEW_API_ACCESS_TOKEN` | — | Primary supply inventory |
| `MODEL_CATALOG_TTL_MS` | 6h | models.dev cache |
| `ROUTER_INVENTORY_TTL_MS` | 5m | supply inventory cache |

Do not hand-edit hundreds of models in the app.

## Admin journey

1. `/wallet` mock top-up  
2. `/keys` create `sk-sailor-*`  
3. `/docs` baseURL snippet  
4. `/use` trial chat (or `ROUTER_GATEWAY_URL` forward)

Supply engines stay in `infra/nebutra-router`; this app is the product shell.

```bash
# Optional: shorter catalog TTL while developing
MODEL_CATALOG_TTL_MS=60000 pnpm --filter @nebutra/router dev
```

## Admin contract (`nebutra.admin/v1`)

Router owns its **supply** admin domain and exposes it to the platform admin
through the Admin Contract (`@nebutra/contracts/admin`,
docs/plans/2026-09-08-admin-of-admins-model.md). `admin.nebutra.com` renders
it from the manifest and never imports router code.

| Path | Guard | What |
|---|---|---|
| `GET /.well-known/nebutra-admin.json` | public | manifest: resources · actions · signals · policies (urls and schemas only) |
| `GET /api/admin/v1/supply/engines` | staff token | CLIProxyAPI + New-API reachability, latency |
| `GET /api/admin/v1/supply/accounts` | staff token | account pool from CLIProxyAPI auth files, normalised status |
| `GET /api/admin/v1/supply/shelf` | staff token | what New-API sells ∩ what CLIProxyAPI serves, with `pending-sync` |
| `POST /api/admin/v1/supply/actions/channel.sync` | `platform_operator` | `{mode:"plan"}` → diff; `{mode:"apply", planId}` → upsert channel + audit event |
| `GET /api/admin/v1/supply/signals/{engine.down,channel.drift,account.expired}` | staff token | `SignalReading` with `probedAt`; `unknown` when the probe itself fails |

**Staff token**: `x-service-token` (HS256 over `SERVICE_SECRET`, `signServiceToken` from `@nebutra/auth`) whose claims match `x-user-id` and `x-role`; the role must be on the staff ladder. Plans expire after 10 minutes and are single-use.

Env on the router Machine: `SERVICE_SECRET`, `CLIPROXY_API_KEY`, `CLIPROXY_MANAGEMENT_KEY`, `NEW_API_ROOT_PASSWORD`, `NEW_API_ACCESS_TOKEN` (shelf read), optional `CLIPROXY_INTERNAL_URL` / `NEW_API_INTERNAL_URL` (default 6PN hosts).
