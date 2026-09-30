# SERVICE_SECRET parity guard

Date: 2026-09-30 · Related: [fly-origin.md](./fly-origin.md), [2026-09-29 Fly machine shrink](./2026-09-29-fly-machine-shrink.md)

## Incident

`nebutra-gateway` + `nebutra-web` held one `SERVICE_SECRET` value;
`nebutra-router` + `nebutra-admin` held another. Gateway → Router
service-to-service tokens (`packages/iam/auth/src/s2s.ts`) were signed with
one secret and verified with the other, so every call was rejected with 401.
Nothing failed loudly: each app's own health check only proves it can reach
itself, never that its peers agree with it. The owner found this by hand,
diffing values across Fly apps. The owner has since realigned them.

## Guard

[`infra/ops/scripts/check-service-secret-parity.sh`](../../../infra/ops/scripts/check-service-secret-parity.sh)
compares `SERVICE_SECRET` across every Fly app in `infra/fly/*.toml`
(override with an explicit app list on argv). It never prints or transmits a
raw secret: each app reduces its own `SERVICE_SECRET` to the first 12 hex
characters of its sha256 over an SSH session (`flyctl ssh console`), and only
that fingerprint leaves the Machine. The all-zeros-input fingerprint
(`e3b0c44298fc`, sha256 of the empty string) means the app has no
`SERVICE_SECRET` set — that app is skipped, not treated as a mismatch,
since an app that never calls another service over `SERVICE_SECRET` has no
reason to carry one. An app with no started Machine, or whose SSH session
fails outright, is also skipped and reported, not failed — this checks the
secret on Machines that are actually up, not deploy completeness.

It fails (exit 1, printing an app → fingerprint table) only when two or more
apps each report a *set* `SERVICE_SECRET` and their fingerprints disagree.

[`.github/workflows/ops-service-secret-parity.yml`](../../../.github/workflows/ops-service-secret-parity.yml)
runs it daily (05:12 UTC cron — a failed scheduled run is the alert) and on
`workflow_dispatch`. It is also a reusable workflow: `deploy-fly.yml` calls it
in a `service-secret-parity` job gated on `needs: [deploy, deploy-gateway]`
with the default success condition (not `always()`), so drift introduced by a
deploy — e.g. importing a stale VM `.env` onto one app but not its peers — is
caught the same day instead of at the next cron tick.

## Fixing a reported mismatch

```bash
flyctl secrets set SERVICE_SECRET="<value>" -a nebutra-gateway
flyctl secrets set SERVICE_SECRET="<value>" -a nebutra-web
flyctl secrets set SERVICE_SECRET="<value>" -a nebutra-router
flyctl secrets set SERVICE_SECRET="<value>" -a nebutra-admin
```

Every app on either side of a `SERVICE_SECRET`-signed call must carry the
same value — re-run the workflow (`workflow_dispatch`) after realigning to
confirm.
