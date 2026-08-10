# TypeLens

FiU-inspired collection UI for **typelens.nebutra.com**  
Slogan: *The Typography Lens*

## Local

```bash
pnpm --filter @nebutra/typelens dev
# http://localhost:3107
```

## Cloudflare Workers (primary)

Uses **OpenNext** → Worker + Assets (same pattern as `apps/sailor-docs`).  
**No** Next `middleware.ts` / `proxy.ts` — catalog UI + client GSAP only.

```bash
pnpm --filter @nebutra/typelens build:worker
pnpm --filter @nebutra/typelens preview:worker
pnpm --filter @nebutra/typelens deploy:worker
```

| File | Role |
|------|------|
| `open-next.config.ts` | OpenNext Cloudflare adapter |
| `wrangler.jsonc` | Worker name, assets, `typelens.nebutra.com` route |

### DNS (Cloudflare zone `nebutra.com`)

1. Deploy once so Worker `nebutra-typelens` exists.
2. Preferred: Workers dashboard → **Custom domains** → `typelens.nebutra.com`.
3. Or CNAME `typelens` → `nebutra-typelens.<subdomain>.workers.dev` (proxied).
4. SSL: **Full (strict)**.

## Node production build

```bash
pnpm --filter @nebutra/typelens build
pnpm --filter @nebutra/typelens start
```

## Vercel (optional backup)

`vercel.json` is optional; primary production path is Cloudflare.
