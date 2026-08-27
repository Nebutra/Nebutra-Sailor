# Proposal: Launch Access Funnel

## Status

Proposed on 2026-05-29. No production exposure. If prototyped later, keep it behind a default-off feature flag and label it as an unreviewed automated prototype.

## The real job

Founders shipping an AI-native SaaS do not just need a pretty landing page. They need one controlled path from:

`interest -> invite/waitlist -> activation -> first paid conversion -> attributable revenue`

Today Nebutra already has most of the pieces, but they are split across separate packages and docs.

## Why this is not trend-chasing

This solves a concrete go-to-market job that repeats across AI SaaS launches:

- Collect qualified demand before opening the floodgates.
- Admit the right users in batches.
- Track where good users came from.
- Turn activated users into self-serve paid accounts.

This is not "yet another page generator". It is a launch operating loop.

## Proposed product shape

A founder-facing launch mode that combines:

1. Waitlist capture with referral and attribution.
2. Invite issuance and redemption.
3. Onboarding state tracking.
4. Plan/paywall handoff once a tenant is activated.
5. Admin visibility into funnel stages by campaign, invite batch, and plan.

Primary surfaces:

- landing CTA blocks
- `/sign-up` invite-aware flow
- lightweight founder launch dashboard
- admin export for invite batches, activation, and paid conversion

## AI and business mechanism

AI is not the product here; AI helps with funnel assistance only where it earns its keep:

- suggested segmentation of waitlist entries
- invite batch recommendations from referral and activation signals
- launch copy variants drafted from proven package metadata

Business mechanism:

- makes `create-sailor` more credible for founders
- creates a clean upsell path from free waitlist to paid plan
- turns Nebutra from "starter" into "launch infrastructure"

## Reuse vs new build

Reuse directly:

- `@nebutra/access-gate` for bounded invite issuance and redemption
- `@nebutra/waitlist` for signup, position, referral code, and admin queries
- `@nebutra/analytics` for Dub-based attribution links
- `@nebutra/onboarding` for first-run progress
- `@nebutra/billing` for self-serve plan upgrade
- existing landing/blog surfaces for public acquisition
- admin patterns in `backends/gateway/src/routes/admin`

New work:

- one unified funnel state model and dashboard
- schema for durable waitlist storage if this should graduate beyond in-memory
- conversion reporting by invite batch, channel, and plan
- template wiring in `create-sailor` so this can be scaffolded intentionally

## Success metrics

- waitlist-to-invite redemption rate
- invite redemption-to-activated org rate
- activated org-to-first-payment rate
- median time from waitlist join to activation
- share of paid signups with attributable campaign/referral metadata

## Implementation sketch

1. Add a launch-funnel domain module that composes waitlist, access-gate, analytics, onboarding, and billing.
2. Add a founder dashboard view with funnel counts, invite batch actions, and campaign slices.
3. Wire landing CTA blocks to waitlist capture and tracked invite URLs.
4. Gate advanced billing actions until invite redemption and onboarding milestones are complete.
5. Expose CSV/export and event hooks for founder review.

## Effort

Estimated `S-M`:

- 1 week for first coherent internal demo
- 2 weeks for scaffold-ready package and dashboard hardening

## Main risks

- waitlist is still foundation-level and needs durable storage before claiming production readiness
- attribution quality depends on consistent link generation and invite usage
- easy to bloat into CRM territory; the boundary should stay focused on launch ops

## Benchmark essence

What to copy in substance, not surface:

- Clerk: remove auth and organization friction from the critical path
- Stripe: make monetization a first-class system, not a later patch
- Dub: attribution must be native, not spreadsheet glue
- Resend: founder workflows should feel immediate and legible
- Lovable/Bolt/Framer: fast page generation matters, but only as an input to a real funnel

Official references:

- [Clerk](https://clerk.com/)
- [Stripe](https://stripe.com/us)
- [Dub](https://dub.co/)
- [Resend](https://www.resend.com/)
- [Lovable](https://lovable.dev/)
- [Bolt](https://support.bolt.new/building)

## Decision

Build this before any marketplace or ecosystem bet. It has the strongest value/fit/effort ratio in the current repo.
