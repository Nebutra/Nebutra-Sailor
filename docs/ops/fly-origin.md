# Fly origin (product edges)

ECS PM2 is no longer the intended home for `forge` / `router` / `web` /
`pebble` / `design`. Those apps ship as Next standalone Machines in `sin`
via [`.github/workflows/deploy-fly.yml`](../../.github/workflows/deploy-fly.yml).

Landing, Cloudflare Workers (gateway + auth-edge), `sso.nebutra.com`,
`origin.nebutra.com`, and `leak.nebutra.com` stay put. `deploy-ecs.yml`
remains the rollback.

## Live traffic

`forge` / `router` / `app` / `pebble` / `design` are proxied CNAMEs to
Fly Machines in `sin` (Let's Encrypt certs issued). Confirm with
`via: 1.1 fly.io` on the product hostname.

SSO, leak DNS, grey-cloud `origin.nebutra.com`, the Node api-gateway, and
auth-edge stay on ECS / Cloudflare. Admin is staff-only and not in this slice.

Cutover writes a proxied CNAME `<host>.nebutra.com → <app>.fly.dev`.
Issue `fly certs add <host>.nebutra.com` first
(`.github/workflows/issue-fly-certs.yml`). Without that cert, Cloudflare
returns 525. The GitHub `CLOUDFLARE_API_TOKEN` currently cannot write
zone DNS (API 10000); cutover has to go through a token that has
Zone DNS Edit, or the Cloudflare account API.

Rollback is [`point-forge-dns-ecs.sh`](../../infra/ops/scripts/point-forge-dns-ecs.sh)
(and the sibling ECS DNS scripts).

## Secrets

The workflow copies `/var/www/nebutra/<app>/.env` from the VM into
`fly secrets import` when SSH vars exist. If that file is missing, set
secrets on the Fly app before trusting the hostname.
