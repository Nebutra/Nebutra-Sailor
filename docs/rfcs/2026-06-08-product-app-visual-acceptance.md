# RFC B2/B6: Add Product App Visual Acceptance for Startup OS and Tenant Branding

Status: Proposed
Date: 2026-06-08
Dimensions: B2 design system and UI component maturity, B6 test blind spots, B7 developer experience

## Delta Scope

This proposal covers a new product-quality gap after the 2026-06-02 governance baseline. The product app now has more visible Startup OS, billing/settings, tenant branding, and Vite app surfaces, but browser-level visual acceptance is still concentrated in landing and design-docs flows.

No code or configuration was changed by this review.

## Current State

- `.github/workflows/visual-acceptance.yml` triggers for design-docs, landing, and design package paths, but not `apps/web`.
- Root scripts expose `visual:design-docs` and `visual:landing`; there is no `visual:web` command.
- `e2e/visual/design-docs-primitives.spec.ts` and `e2e/visual/landing-feature-showcase.spec.ts` provide browser checks for overflow, text density, surface stability, and route-specific UI states.
- `scripts/verify-ui-governance.ts` adds static governance for raw colors, motion usage, Tier 1 story coverage, dependency boundaries, and dashboard experience rules.
- `apps/web/src/__tests__/dashboard-ui-governance.test.ts` provides source-level dashboard governance checks, but it does not prove rendered layout, responsive behavior, keyboard focus, or text fit.
- Current web changes increase product-surface risk around Startup OS entry points, tenant logo/sidebar branding, settings, billing, and Vite route compatibility.

## Architectural Tradeoffs

Option A: add a narrow product app visual acceptance suite.

This would add browser proof for the highest-risk product states without turning every dashboard change into a broad snapshot review. A small suite can target Startup OS entry/empty states, workspace shell, billing/settings, tenant logo/sidebar branding, and sign-in or gated states across desktop and mobile.

Option B: rely on static governance and unit tests.

This is cheaper and faster, but it cannot catch text overflow, unusable responsive layouts, missing focus states, or visual regressions caused by token/component drift.

Option C: move the full product app into broad Storybook/Chromatic coverage.

This provides richer component review, but it adds authentication, fixture, and maintenance overhead before the product app runtime contract is fully settled.

Recommended direction: choose Option A as a small browser acceptance gate. It is the lowest-cost way to make product UI quality visible while keeping the design system governance comparable to the operating discipline expected from Linear, Vercel, Supabase, and Stripe-style product surfaces.

## Decision Information Needed

- Which runtime should product visual acceptance open: the Vite app, the legacy Next app, or both during migration?
- Which test identity or fixture strategy can render authenticated states without creating accounts or changing permissions?
- Which tenant branding fixture should represent the canonical sidebar/logo state?
- Which product states are critical enough to block CI, and which should remain advisory?
- What CI budget is acceptable for a `visual:web` suite on pull requests?
- Should product app visual acceptance run on `apps/web/**`, shared design package changes, token changes, or all three?

## Proposed Decision Path

1. Pick four to six canonical product states for visual acceptance.
2. Define auth and tenant fixtures that do not require account creation or permission changes.
3. Add a `visual:web` command and workflow path filters only after the runtime decision is confirmed.
4. Keep assertions structural and ergonomic: no horizontal overflow, stable shell dimensions, readable text density, correct focus visibility, and no broken tenant-branding states.

## Non-Goals

- Do not redesign the product app inside this governance review.
- Do not add visual baselines by weakening existing UI governance tests.
- Do not create accounts, grant permissions, or modify shared access settings to obtain screenshots.
