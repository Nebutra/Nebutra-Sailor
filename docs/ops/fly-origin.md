# Fly origin (product edges + Hono gateway)

ECS PM2 is no longer the intended home for `forge` / `router` / `web` /
`pebble` / `design` / the Node api-gateway. Next product edges ship as
standalone Machines in `sin` via
[`.github/workflows/deploy-fly.yml`](../../.github/workflows/deploy-fly.yml).
The Hono origin ships separately via
[`.github/workflows/deploy-fly-gateway.yml`](../../.github/workflows/deploy-fly-gateway.yml)
because it is not a Next standalone image.

Landing, Cloudflare Workers (gateway-edge + auth-edge), `sso.nebutra.com`,
and `leak.nebutra.com` stay put. Shanghai ECS is China transit and
rollback only. `deploy-ecs.yml` remains the rollback.

## Why some public DNS is still on ECS

Product Machines are not live on their public names until
`https://<app>.fly.dev` returns 200/302/307 **and** `fly certs add` has
issued a certificate for `<host>.nebutra.com`. Orange-cloud CNAME without
that cert is Cloudflare 525.

CI creates apps non-interactively and needs an org slug (`vars.FLY_ORG`,
`fly orgs list` / GraphQL, then `personal`).

1. `gh workflow run deploy-fly.yml` (empty `apps` = forge router web pebble design)
2. `gh workflow run deploy-fly-gateway.yml` (Hono origin)
3. Confirm each `https://nebutra-<app>.fly.dev` is healthy, and
   `https://nebutra-gateway.fly.dev/api/misc/health` is 200
4. Then cut DNS:
   - product edges: `gh workflow run deploy-fly.yml -f cutover=true`
   - API origin: `gh workflow run deploy-fly-gateway.yml -f cutover=true`
     (grey-cloud `origin.nebutra.com` only)

SSO, leak DNS, and auth-edge stay on ECS / Cloudflare. Admin is
staff-only and not in this slice.

Product-edge cutover writes a **proxied** CNAME
`<host>.nebutra.com → <app>.fly.dev`. Issue
`fly certs add <host>.nebutra.com` first
(`.github/workflows/issue-fly-certs.yml`).

API origin cutover writes a **grey-cloud** CNAME
`origin.nebutra.com → nebutra-gateway.fly.dev`. The edge Worker
(`nebutra-gateway-edge`) forwards to `https://nebutra-gateway.fly.dev`
so it never depends on that alias being live. Do not point `ORIGIN_URL`
at `api.nebutra.com` — that loops back into the Worker.

The GitHub `CLOUDFLARE_API_TOKEN` currently cannot write zone DNS
(API 10000); cutover has to go through a token that has Zone DNS Edit,
or the Cloudflare account API.

Rollback is [`point-forge-dns-ecs.sh`](../../infra/ops/scripts/point-forge-dns-ecs.sh)
(and the sibling ECS DNS scripts). Production product hostnames were
rolled back to ECS A `106.15.4.31` after the first 525.

## Secrets

The Next workflow copies `/var/www/nebutra/<app>/.env` from the VM into
`fly secrets import` when SSH vars exist. The Hono workflow copies
`/var/www/nebutra/api/.env`. If that file is missing, set secrets on
the Fly app before trusting the hostname.
