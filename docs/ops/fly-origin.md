# Fly origin (product edges)

ECS PM2 is no longer the intended home for `forge` / `router` / `web` /
`pebble` / `design`. Those apps ship as Next standalone Machines in `hkg`
via [`.github/workflows/deploy-fly.yml`](../../.github/workflows/deploy-fly.yml).

Landing, Cloudflare Workers (gateway + auth-edge), `sso.nebutra.com`,
`origin.nebutra.com`, and `leak.nebutra.com` stay put. `deploy-ecs.yml`
remains the rollback.

## Why traffic is still on ECS

There is no `FLY_API_TOKEN` in GitHub. The tokens pasted in chat were
revoked. Without a new deploy token, CI cannot create Machines.

1. Mint a **deploy** token at https://fly.io/user/personal-access-tokens
2. `gh secret set FLY_API_TOKEN`
3. `gh workflow run deploy-fly.yml -f apps=forge`
4. Confirm `https://nebutra-forge.fly.dev` is healthy
5. Repeat or run with empty `apps` for the rest
6. When the Fly URLs are good: `gh workflow run deploy-fly.yml -f cutover=true`

Cutover writes a proxied CNAME `<host>.nebutra.com → <app>.fly.dev`.
Rollback is [`point-forge-dns-ecs.sh`](../../infra/ops/scripts/point-forge-dns-ecs.sh)
(and the sibling ECS DNS scripts).

## Secrets

The workflow copies `/var/www/nebutra/<app>/.env` from the VM into
`fly secrets import` when SSH vars exist. If that file is missing, set
secrets on the Fly app before trusting the hostname.
