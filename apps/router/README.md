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
