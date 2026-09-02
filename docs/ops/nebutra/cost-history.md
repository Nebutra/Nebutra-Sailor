# Cost history — what Nebutra's bills actually said

The record of Nebutra's own invoices, kept apart from
[cost-guardrails.md](../cost-guardrails.md) so the guardrails ship in the
Sailor template as guidance and the numbers stay with the one deployment they
describe. Append a section per audit; do not rewrite earlier ones.

## Vercel — 2026-09-02 audit

Read from `GET /v1/invoices` with the owner's CLI token. Two usage invoices in
the period that started 2026-08-23, each cut when accrued usage crossed $100:

| Invoice | Total | Build CPU Minutes | Everything else combined |
| --- | --- | --- | --- |
| 2026-08-28 | $100.05 | $99.39 (33,998 CPU-min cumulative) | $0.66 |
| 2026-09-01 | $101.49 | $99.79 (62,510 CPU-min cumulative) | $1.70 |

Web Analytics events, Speed Insights, functions, ISR, image optimization and
bandwidth were pennies. One seat. No marketplace add-ons, stores or domains.
The bill is build CPU minutes, at about $22 a day.

Cause and fix — turbo build machines promoted on `long-build-duration`, and an
Ignored Build Step that never skipped — plus the project-level settings applied
the same day are in [vercel-spend.md](./vercel-spend.md).

### Project map at the time

Production web/auth is not Vercel — those projects must not auto-deploy
(`git.deploymentEnabled: false`). `nebutra.com` is Vercel, but its build runs
on GitHub's free runners and only the prebuilt output is uploaded, so it meters
nothing; its Git integration is off for the same reason. `nebutra-kuanlan`
stays Git-linked; the ignore script skips until `apps/kuanlan/package.json`
exists.

## PlanetScale / Upstash

No invoice audit recorded yet. The role defaults and the Redis command budget
that bound them are generic and live in
[cost-guardrails.md](../cost-guardrails.md).
