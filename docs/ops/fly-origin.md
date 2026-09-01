# Fly origin (product edges + Hono gateway)

ECS PM2 is no longer the intended home for `forge` / `router` / `web` /
`pebble` / `design` / the auth UI / the Node api-gateway. Next product edges ship as
standalone Machines in `sin` via
[`.github/workflows/deploy-fly.yml`](../../.github/workflows/deploy-fly.yml).
The Hono origin ships separately via
[`.github/workflows/deploy-fly-gateway.yml`](../../.github/workflows/deploy-fly-gateway.yml)
because it is not a Next standalone image.

Landing, Cloudflare Workers (gateway-edge + auth-edge), `sso.nebutra.com`,
and `leak.nebutra.com` stay put. Shanghai ECS is China transit and
rollback only. `deploy-ecs.yml` remains the rollback.

## Live traffic

`forge` / `router` / `app` / `pebble` / `design` are proxied CNAMEs to
Fly Machines in `sin` (Let's Encrypt certs issued). Confirm with
`via: 1.1 fly.io` on the product hostname.

The Hono origin is `nebutra-gateway` in `sin`. `api.nebutra.com` stays
orange-cloud on `nebutra-gateway-edge`, which forwards to
`https://nebutra-gateway.fly.dev`. Grey-cloud `origin.nebutra.com` is an
A/AAAA alias to the same Machine.

New Machines still need `https://<app>.fly.dev` healthy **and**
`fly certs add <host>.nebutra.com` before orange-cloud CNAME, or
Cloudflare returns 525.

SSO, leak DNS, and auth-edge stay on ECS / Cloudflare. Admin is
staff-only and not in this slice.

Product-edge cutover writes a **proxied** CNAME
`<host>.nebutra.com → <app>.fly.dev`. Issue
`fly certs add <host>.nebutra.com` first
(`.github/workflows/issue-fly-certs.yml`).

API origin cutover writes **grey-cloud** A/AAAA (or CNAME) for
`origin.nebutra.com` onto the Fly Machine. The edge Worker
(`nebutra-gateway-edge`) forwards to `https://nebutra-gateway.fly.dev`
so it never depends on that alias being live. Do not point `ORIGIN_URL`
at `api.nebutra.com` — that loops back into the Worker.

The auth Next UI is `nebutra-auth` in `sin`. `auth.nebutra.com` remains
attached to `nebutra-auth` on Cloudflare Workers; UI requests are proxied to
`https://nebutra-auth.fly.dev`. Never point the auth Worker at the shared
`origin.nebutra.com`, because that alias is the Hono gateway.

The GitHub `CLOUDFLARE_API_TOKEN` currently cannot write zone DNS
(API 10000); cutover has to go through a token that has Zone DNS Edit,
or the Cloudflare account API.

Rollback is [`point-forge-dns-ecs.sh`](../../infra/ops/scripts/point-forge-dns-ecs.sh)
(and the sibling ECS DNS scripts).

## Secrets

The Next workflow copies `/var/www/nebutra/<app>/.env` from the VM into
`fly secrets import` when SSH vars exist. The Hono workflow copies
`/var/www/nebutra/api/.env`. If that file is missing, set secrets on
the Fly app before trusting the hostname.
