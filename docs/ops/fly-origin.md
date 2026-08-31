# Fly origin (product edges)

ECS PM2 is no longer the intended home for `forge` / `router` / `web` /
`pebble` / `design`. Those apps ship as Next standalone Machines in `hkg`
via [`.github/workflows/deploy-fly.yml`](../../.github/workflows/deploy-fly.yml).

Landing, Cloudflare Workers (gateway + auth-edge), `sso.nebutra.com`,
`origin.nebutra.com`, and `leak.nebutra.com` stay put. `deploy-ecs.yml`
remains the rollback.

## Why traffic is still on ECS

Machines are not live until `https://<app>.fly.dev` returns 200/302/307.
CI creates apps non-interactively and needs an org slug (`vars.FLY_ORG`,
`fly orgs list` / GraphQL, then `personal`).

1. `gh workflow run deploy-fly.yml` (empty `apps` = forge router web pebble design)
2. Confirm each `https://nebutra-<app>.fly.dev` is healthy
3. Then `gh workflow run deploy-fly.yml -f cutover=true`

SSO, leak DNS, grey-cloud `origin.nebutra.com`, the Node api-gateway, and
auth-edge stay on ECS / Cloudflare. Admin is staff-only and not in this slice.

Cutover writes a proxied CNAME `<host>.nebutra.com → <app>.fly.dev`.
Rollback is [`point-forge-dns-ecs.sh`](../../infra/ops/scripts/point-forge-dns-ecs.sh)
(and the sibling ECS DNS scripts).

## Secrets

The workflow copies `/var/www/nebutra/<app>/.env` from the VM into
`fly secrets import` when SSH vars exist. If that file is missing, set
secrets on the Fly app before trusting the hostname.
