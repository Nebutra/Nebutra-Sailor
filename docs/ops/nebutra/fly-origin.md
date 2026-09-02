# Fly origin (product edges + Hono gateway)

ECS PM2 is no longer the intended home for `forge` / `router` / `web` /
`pebble` / `design` / `kuanlan` / `idp` / `admin` / `sailor-docs` / the auth UI / the Node api-gateway. Next product edges ship as
standalone Machines in `sin` via
[`.github/workflows/deploy-fly.yml`](../../../.github/workflows/deploy-fly.yml).
The Hono origin ships separately via
[`.github/workflows/deploy-fly-gateway.yml`](../../../.github/workflows/deploy-fly-gateway.yml)
because it is not a Next standalone image.

Landing and Cloudflare Workers (gateway-edge + auth-edge) stay put.
`sso` / `admin` / `docs` ship as Fly Next Machines. Carina is a static
nginx Machine (`deploy-carina-fly.yml`). New-API is a private Machine
with no public IP (`deploy-new-api-fly.yml`); Router reaches it at
`http://nebutra-new-api.internal:3000/v1`. Leak DNS is UDP/TCP 53 on a
dedicated IPv4 (`deploy-dns-leak-fly.yml`); glue A stays DNS-only.
Shanghai ECS is China-forward / rollback only. `deploy-ecs.yml` remains
the rollback.

## Live traffic

`forge` / `router` / `app` / `pebble` / `design` / `kuanlan` / `sso` /
`admin` / `docs` / `carina` are proxied CNAMEs to Fly Machines in `sin`
(Let's Encrypt certs issued). Confirm with `via: 1.1 fly.io` on the
product hostname. `ns1.leak` is a grey-cloud A to the leak Machine's
dedicated IPv4. New-API has no public DNS.

The Hono origin is `nebutra-gateway` in `sin`. `api.nebutra.com` stays
orange-cloud on `nebutra-gateway-edge`, which forwards to
`https://nebutra-gateway.fly.dev`. Grey-cloud `origin.nebutra.com` is an
A/AAAA alias to the same Machine.

New Machines still need `https://<app>.fly.dev` healthy **and**
`fly certs add <host>.nebutra.com` before orange-cloud CNAME, or
Cloudflare returns 525.

Auth-edge stays on Cloudflare. Admin is staff-only (Cloudflare Access
in front of the Fly Machine). Leak DNS and New-API are not Next
standalone images.

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

Rollback is [`point-forge-dns-ecs.sh`](../../../infra/ops/scripts/point-forge-dns-ecs.sh)
(and the sibling ECS DNS scripts).

## Secrets

The Next workflow copies `/var/www/nebutra/<app>/.env` from the VM into
`fly secrets import` when SSH vars exist. The Hono workflow copies
`/var/www/nebutra/api/.env`. If that file is missing, set secrets on
the Fly app before trusting the hostname.

The VM file describes the VM. Two of its keys must never reach a Machine:
`CACHE_BACKEND=ioredis` and `REDIS_URL=redis://127.0.0.1:6379` point at the
VM's local Redis. Imported onto `nebutra-gateway` they made `@nebutra/cache`
prefer ioredis over the valid Upstash REST credentials beside it, so every
Redis call failed with `ECONNREFUSED`, BullMQ logged a worker error every two
seconds, and every rate-limited route answered 500 while `/api/misc/health`
stayed 200 with `cache: down` — from the cutover until 2026-09-02. The Hono
workflow now skips and unsets both. The queue provider is a separate choice:
the Machine has no `QSTASH_TOKEN`, so with `REDIS_URL` gone it needs either a
QStash token or `ALLOW_MEMORY_QUEUE_IN_PRODUCTION=true` as an explicit
stop-gap, or the AI gateway routes do not mount.

`/api/misc/health` is the Fly check (`infra/fly/gateway.toml`, every 15s) and
stays 200 while a dependency is merely degraded on purpose: a 503 there
restarts the Machine, which fixes nothing when Redis is the problem. So it is
not a monitor. `/api/misc/ready` is — one `EVAL` through the same
`@nebutra/cache` client the rate limiter uses plus a `SELECT 1`, answering 503
with `{ "ready": false, "failing": [...] }` when either is down. The 30-minute
job in `.github/workflows/public-url-check.yml` asserts it, the
`X-RateLimit-Limit` header on a rate-limited route, and `"redis":"connected"`
in `/api/system/status`; `status.nebutra.com` probes it as well. Do not point
the Fly check at `/ready`.
