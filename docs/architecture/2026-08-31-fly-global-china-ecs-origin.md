# Fly product + Hono origin (Singapore), ECS kept for China transit / issuer / leak / rollback

- **Date**: 2026-08-31
- **Status**: Product edges and Hono origin live on Fly `sin`; ECS keeps issuer / leak / China transit
- **Runbook**: [fly-origin.md](../ops/fly-origin.md)

```text
China + global browsers
  -> Cloudflare (proxied)
    -> Fly Machines in sin     forge / router / web / pebble / design / kuanlan / idp / admin / docs
    -> Fly Machines in sin     Hono api-gateway (nebutra-gateway)
    -> Cloudflare Workers      api.nebutra.com → nebutra-gateway.fly.dev
                               auth.nebutra.com /api/auth/*
    -> Vercel                  nebutra.com
    -> Shanghai ECS            China transit, sso, leak DNS, rollback
```

Fly retired `hkg`; new Machines go to Singapore (`sin`). Shanghai ECS is
not the Worker origin. It stays the OIDC issuer, authoritative leak DNS,
and the hop for China transit / emergency rollback.

`api.nebutra.com` stays orange-cloud on the edge Worker. `ORIGIN_URL` is
the Fly app URL, not `origin.nebutra.com` on ECS. Grey-cloud
`origin.nebutra.com` may point grey-cloud A/AAAA at the same Fly app as an alias.

Do not move `sso.nebutra.com` or `ns1.leak.nebutra.com` in this cutover.
