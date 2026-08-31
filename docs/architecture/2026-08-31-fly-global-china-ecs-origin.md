# Fly product origin (Hong Kong), ECS kept for issuer / leak / rollback

- **Date**: 2026-08-31
- **Status**: Implemented substrate — production DNS still ECS until `FLY_API_TOKEN` exists
- **Runbook**: [fly-origin.md](../ops/fly-origin.md)

```text
China + global browsers
  -> Cloudflare (proxied)
  -> Fly Machines in hkg     forge / router / web / pebble / design
  -> Cloudflare Workers      api.nebutra.com, auth.nebutra.com /api/auth/*
  -> Vercel                  nebutra.com
  -> Shanghai ECS            origin.nebutra.com, sso, leak DNS, rollback
```

Hong Kong is the Fly region closest to mainland users. Shanghai ECS is not
used as a reverse proxy to Fly — that would add a hop. It stays the grey-cloud
API origin, the OIDC issuer, and authoritative leak DNS.

Do not move `sso.nebutra.com` or `ns1.leak.nebutra.com` in the first cutover.
