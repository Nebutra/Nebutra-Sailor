# PLG Referral Infrastructure Design

## Context

`/refer?code=...` is a growth-infrastructure entrypoint, not a one-off page.
The referral code is an arbitrary campaign or user referral code supplied at
runtime. The implementation must not hardcode example values.

The current public surface is incomplete:

- `https://nebutra.com/refer?code=...` returns 404.
- `https://www.nebutra.com` is not a reliable alias.
- The shared `@nebutra/marketing` waitlist UI simulates success.
- `@nebutra/waitlist` has the right domain shape but is marked foundation-only.
- Public health is degraded when Redis or AI origin checks fail.

## Product Loop

The referral loop should support three public states:

- Valid code: attribute the signup to the referrer/campaign.
- Missing code: allow direct waitlist signup and issue a shareable code.
- Unknown code: accept the signup, preserve the attempted code in metadata, and
  do not award a referral increment.

After signup, the user receives position, referral code, referral URL, and a
clear share action. The UI should be useful even without JavaScript, but the
enhanced client flow can show inline progress and copy/share controls.

## Architecture

- `@nebutra/waitlist` owns join, idempotency, referral counting, share URL
  creation, analytics summaries, and storage interfaces.
- `@nebutra/db` owns the durable `WaitlistEntry` schema and migration.
- `apps/landing` owns the localized `/refer` route, request validation, and
  public API adapter.
- CI owns public URL smoke tests for canonical domains, aliases, and the referral
  route.

This keeps domain rules high-cohesion in the package and leaves the page as an
orchestration layer.

## Data And Observability

Waitlist metadata captures source, campaign, medium, landing page, attempted
referral code, user agent, and IP-derived request context where available.
Submission responses return enough information for the page to show a closed
loop without exposing other users' emails.

Analytics should track waitlist joins, referral-attributed joins, and share-link
generation. Events must be best-effort and must not make signup falsely fail.

## Delivery Governance

The deployment path should fail if canonical public URLs, `www` aliases, API
health, or `/refer?code=smoke` fail after deploy. ECS fallback remains supported,
but smoke gates must catch domain and route regressions before a release is
considered healthy.

Longer term, the ECS path should move from single-box PM2 fallback toward
short-lived GitHub OIDC credentials, image provenance, ECR/ECS service
deployments, deployment circuit breaker rollback, and optional blue/green for
high-risk releases.

## Tests

- Unit tests for waitlist idempotency, referral normalization, unknown referral
  handling, and share URL creation.
- Route tests for `/api/waitlist`.
- Component tests for success, duplicate/idempotent signup, and error states.
- Public URL smoke tests that include `/refer?code=smoke` and aliases.
