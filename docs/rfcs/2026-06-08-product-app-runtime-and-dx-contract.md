# RFC B1/B7/B8: Decide the Product App Runtime and Preset Script Contract After the Vite Cutover

Status: Proposed
Date: 2026-06-08
Dimensions: B1 technical debt and legacy architecture, B7 developer experience, B8 feature flag and preset debt, B6 test blind spots

## Delta Scope

This proposal covers a new runtime and onboarding governance issue introduced after the 2026-06-02 governance baseline. The product app now contains a Vite runtime surface, while tracked onboarding docs, root scripts, and preset package maps still describe or exercise older Next.js and workspace assumptions.

No code or configuration was changed by this review.

## Current State

- `apps/web/package.json` now starts and builds the product app through Vite on port 3001.
- `apps/web/src/vite-app/` contains the Vite app shell, route tree, auth/query providers, Next compatibility adapters, and a legacy Next boundary inventory.
- The root project guide still describes `apps/web` as a Next.js 16 App Router dashboard.
- Root scripts such as `dev:dashboard`, `dev:ai-saas`, `dev:solo`, `build:dashboard`, and `build:ai-saas` still reference `@nebutra/admin`.
- `pnpm turbo run dev --filter=@nebutra/admin --dry=json` fails because no workspace package named `@nebutra/admin` exists.
- `dev:marketing` dry-run planning includes `@nebutra/blog#dev` with a non-existent command because `packages/commerce/blog/package.json` has no `dev` script.
- `packages/ops/preset/src/feature-map.ts` still maps the `admin` capability to `@nebutra/admin` and the `blog` capability to `@nebutra/blog`.

## Architectural Tradeoffs

Option A: make Vite the authoritative product app runtime.

This matches the newest app structure and lets the remaining Next app/API surface become an explicit migration inventory. It requires updating onboarding docs, preset metadata, root scripts, and gateway migration contracts so local startup and generated presets match the actual product direction.

Option B: treat Vite as a temporary compatibility shell.

This preserves the older Next.js app contract while giving the migration a limited experiment window. It requires an owner, expiry date, and clear success criteria so the repo does not accumulate a permanent dual-runtime contract by accident.

Option C: keep both Vite and Next as permanent product runtimes.

This preserves maximum flexibility but increases onboarding friction, CI matrix cost, provider/env drift, and ambiguity about where product routes and server boundaries belong.

Recommended direction: choose Option A if the Vite cutover is the intended platform direction. Otherwise choose Option B with an explicit retirement decision date. Option C should be avoided unless the business needs two product runtimes and is willing to fund duplicated governance.

## Decision Information Needed

- Is Vite now the canonical runtime for `apps/web`, or is it still an experiment?
- Which remaining Next app/API routes must move to `backends/gateway`, and what is their owner and deadline?
- Should `@nebutra/admin` be removed from root scripts and preset metadata, replaced by an app-local admin route, or restored as a real package?
- Is `@nebutra/blog` a commerce package only, or should it provide a runnable app-level dev command?
- Which command is the blessed first local startup path for dashboard contributors?
- Which dry-run checks should gate root scripts and preset feature maps so stale workspace packages cannot re-enter generated workflows?

## Proposed Decision Path

1. Decide the canonical product runtime for `apps/web`.
2. Align root scripts, package metadata, preset feature maps, and onboarding docs to that runtime.
3. Add a lightweight script-contract check that proves every advertised `dev:*` and `build:*` target resolves to an existing package and command.
4. Track any remaining Next boundaries as migration work with an owner and removal condition.

## Non-Goals

- Do not edit scripts, docs, or preset maps inside this governance review.
- Do not suppress failing commands, add `|| true`, or loosen tests to mask stale package references.
- Do not remove a runtime until the product owner confirms the intended migration path.
