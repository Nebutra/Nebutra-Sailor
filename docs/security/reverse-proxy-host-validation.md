# Reverse proxy & Host validation

**Visibility:** G30, G32  
**Last updated:** 2026-07-27

## Policy

Production origins must only accept requests whose `Host` / `X-Forwarded-Host`
matches an explicit allowlist. Unknown hosts receive **421 Misdirected Request**
(or 400 when the header is missing in strict mode).

## Allowlist sources (priority)

1. `ALLOWED_HOSTS` — comma-separated hostnames (no scheme, no path)
2. Brand domains from `@nebutra/brand` (`domains.www`, `domains.app`, status, docs)
3. Localhost variants in non-production only (`localhost`, `127.0.0.1`)

Example:

```env
ALLOWED_HOSTS=nebutra.com,www.nebutra.com,app.nebutra.com,status.nebutra.com
```

## Origin token / edge authenticity (G30)

When traffic terminates on Cloudflare / Vercel before the origin:

| Layer | Mechanism |
| --- | --- |
| Edge → Origin | Prefer platform private networking; optional shared secret header |
| Optional | `ORIGIN_EDGE_TOKEN` — request must include `x-nebutra-edge-token: <token>` when set |
| mTLS | Supported at infrastructure level (CF Authenticated Origin Pulls / ALB mTLS); not required for Vercel-only topology |

## Implementation

- Landing: `apps/landing/src/proxy.ts` → `assertAllowedHost()`
- Web / other apps: same pattern when terminating external Host headers

## Default production topology

See ADR `docs/architecture/2026-06-04-production-runtime-closure.md`:

`Vercel frontends → CF Workers gateway → Origin`
