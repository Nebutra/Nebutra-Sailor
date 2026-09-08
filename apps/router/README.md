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

### Key store

| `ROUTER_KEY_STORE` | Customer holds | Edge does |
|---|---|---|
| unset / `newapi-token` (default) | a New-API user token | forwards it untouched (legacy) |
| `nebutra` | a Nebutra key (`sk-sailor-…`, shared `APIKey` table with app + gateway) | validates by hash, swaps in `NEW_API_ACCESS_TOKEN`, writes a usage ledger row per request, `/keys` revoke takes effect immediately |

`nebutra` mode needs `DATABASE_URL` and `NEW_API_ACCESS_TOKEN`. The customer key
never reaches New-API; the New-API token never reaches customers.

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
