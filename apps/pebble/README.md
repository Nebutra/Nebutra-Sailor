# `@nebutra/pebble-site`

Brand front for **https://pebble.nebutra.com**.

## Role

| Surface | Behavior |
|---------|----------|
| `/`, `/download` | Marketing / download (static) |
| `/whats-new/*.json`, `/media/*` | Machine-consumed static feeds — **no redirects** |
| `/docs/*` | 301 → `https://docs.nebutra.com/pebble/*` |
| `POST /v1/feedback`, `/diagnostics/*` | Vercel rewrite → `api.nebutra.com/pebble/*` (legacy clients only) |

This app has **no database and no first-party API**. Canonical feedback and diagnostics live on the shared gateway under `/pebble`.

Topology: Sailor `docs/DOMAINS.md` · Pebble `docs/reference/infra-index.md`.

## Local

```bash
pnpm --filter @nebutra/pebble-site dev
```

## Deploy

- DNS: `CNAME pebble → cname.vercel-dns.com` (proxied) via `point-pebble-dns.yml`
- Vercel project: `nebutra-pebble` · root `apps/pebble` · domain `pebble.nebutra.com`
- Workflow: `.github/workflows/deploy-pebble-vercel.yml`
