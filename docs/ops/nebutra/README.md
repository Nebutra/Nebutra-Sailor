# docs/ops/nebutra — runbooks for the Nebutra instance

Runbooks in this directory describe **Nebutra's own deployment** of Sailor:
its Fly apps, its ECS host, its Vercel projects and invoices, its SSO issuer,
its Pebble support intake. They name accounts, hosts and bill amounts that are
true for exactly one installation.

The directory is stripped from the public Sailor template by the
`docs/ops/nebutra/` rule in `.templateignore`. Runbooks one level up in
`docs/ops/` are generic — they explain a mechanism any deployment uses with
its own values — and do ship.

| Runbook | Covers |
| --- | --- |
| [cost-history.md](./cost-history.md) | What Nebutra's bills actually said, and the settings applied to close them |
| [vercel-spend.md](./vercel-spend.md) | Vercel project map: what is Git-linked, what builds on GitHub, what never auto-deploys |
| [fly-origin.md](./fly-origin.md) | Fly `sin` product edges and the Hono origin; `FLY_API_TOKEN`; DNS cutover |
| [ecs-mvp-env.md](./ecs-mvp-env.md) | Environment contract for the ECS origin processes |
| [ecs-pm2-release-lessons.md](./ecs-pm2-release-lessons.md) | PM2 release / preflight gotchas on the ECS host |
| [web-auth-vercel-cutover.md](./web-auth-vercel-cutover.md) | Moving web/auth from ECS to Vercel without a DNS flip before green |
| [nebutra-owned-sso.md](./nebutra-owned-sso.md) | `sso.nebutra.com` — Nebutra acting as an OIDC issuer |
| [pebble-support-intake.md](./pebble-support-intake.md) | Pebble desktop diagnostics bucket and intake |
| [invitation-dual-table-status.md](./invitation-dual-table-status.md) | Status of the invitation dual-table migration on the Nebutra database |

Adding a runbook: if it would be wrong in someone else's deployment, it goes
here. If it explains a mechanism, it goes in `docs/ops/` and must not carry a
Nebutra host, IP, team id or invoice.

Guard: `tests/architecture/template-boundary.test.ts`.
