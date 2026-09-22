# `@nebutra/pebble-site`

Brand front for **https://pebble.nebutra.com**.

## Production topology (2026-07-30)

| Layer | Value |
|-------|--------|
| DNS | Cloudflare **A** `pebble` → `106.15.4.31` (Proxied) — same pattern as `app` / `api` |
| Origin | ECS PM2 process `pebble` on `127.0.0.1:3017` |
| Edge | `infra/runtime/nginx/conf.d/pebble.nebutra.com.conf` |

Production is the Fly Machine `nebutra-pebble` (`deploy-fly.yml` app=`pebble`);
the ECS PM2 process above is the rollback path. The Vercel surface was retired
on 2026-09-22.

## Routes

| Surface | Behavior |
|---------|----------|
| `/`, `/download` | Next app (marketing / download) |
| `/whats-new/*.json`, `/media/*` | Static feeds from the app — **no client redirects** |
| `/updater/latest.json` | Tauri updater manifest mirror: live GitHub fetch with disk + bundled fallback (`public/updater/latest.json`, `src/lib/updater-latest.fallback.json`) |
| `/docs/*` | Self-hosted docs on the brand app (until Sailor Docs Worker redeploys) |
| `POST /v1/feedback`, `/diagnostics/*` | nginx reverse-proxy → `api-gateway` `/pebble/*` (legacy clients) |

Canonical machine endpoints remain `https://api.nebutra.com/pebble/*`.

## Local

```bash
pnpm --filter @nebutra/pebble-site dev   # :3017
```

## Deploy

```bash
# From Nebutra-Sailor, after merge to main:
gh workflow run "Deploy ECS" -R Nebutra/Nebutra-Sailor -f apps=pebble
```

Requires `NEXT_OUTPUT=standalone` at build time (set by `deploy-ecs.yml`).
