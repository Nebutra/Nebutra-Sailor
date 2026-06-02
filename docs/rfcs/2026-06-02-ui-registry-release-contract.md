# RFC B2/B7/B8: Govern Public UI Registry Release Contracts

Status: Proposed
Date: 2026-06-02
Dimensions: B2 design system and UI component maturity, B7 developer experience, B8 feature flag debt

## Delta Scope

This proposal covers the public `@nebutra/ui` registry surface after recent UI governance and design-docs registry changes. The review found a new distribution-risk signal in the working tree: generated `apps/design-docs/public/r/*.json` manifests currently contain uncommitted deletions of transitive support files across multiple registry items.

No code, configuration, generated registry artifact, domain setting, or access-control setting was changed by this review.

## Benchmark Posture

Current benchmark references checked on 2026-06-02:

- [21st.dev](https://21st.dev/?tab=home): AI-native component discovery with many component categories and install/remix style expectations.
- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines): reviewable interaction, accessibility, form, copy, motion, and performance rules.
- [Vercel Geist](https://vercel.com/geist/stack): system-level consistency posture for Vercel product surfaces.
- [Supabase UI Library](https://supabase.com/blog/supabase-ui-library): shadcn-compatible component registry packaged for several React app styles.
- [Stripe Apps design guidance](https://docs.stripe.com/stripe-apps/design): UI quality through constrained components, design patterns, and toolkit consistency.
- [Stripe Apps UI extensions model](https://docs.stripe.com/stripe-apps/how-ui-extensions-work): sandboxed UI extension architecture and explicit component restrictions.

The relevant lesson is not to copy any single brand aesthetic. Nebutra's public registry needs the same maturity pattern: stable install contracts, constrained primitives, accessibility proof, versioned ownership, and low-friction external consumption.

## Current State

- `apps/design-docs/AGENTS.md` defines `ui.nebutra.com` as both design docs and a public shadcn-style registry host.
- `packages/design/ui/scripts/build-registry.ts` generates TIER B component manifests into `apps/design-docs/public/r/<name>.json` and `apps/design-docs/public/registry.json`.
- `apps/design-docs/scripts/build-registry.mjs` separately generates preview-demo manifests and the internal preview registry.
- `.github/workflows/ui-governance.yml` now fails on registry freshness drift after running design-docs prebuild and docs governance.
- `scripts/verify-ui-governance.ts` asserts that UI governance workflow, visual acceptance, and registry freshness checks remain wired.
- `apps/design-docs/src/lib/registry.ts` treats missing `registry.json` as a build error, which is appropriate for a public distribution surface.
- `docs/architecture/2026-05-14-registry-dual-track-distribution.md` established dual-track npm plus shadcn distribution, but it also depends on future telemetry from `ui.nebutra.com`.
- `apps/design-docs/src/components/component-preview.tsx` exposes copyable `npx shadcn@latest add https://ui.nebutra.com/r/<name>.json` commands and AI integration prompts.
- Current generated manifest diffs remove embedded support files such as overlay, dropdown menu, and tooltip helpers from multiple registry JSON files. That may be valid dependency normalization, but it is unsafe to publish without external install proof.
- There is no obvious automated smoke that creates a fresh external app, runs `shadcn add` against selected Nebutra manifests, installs dependencies, and compiles the copied result.

## Architectural Tradeoffs

Option A: treat registry JSON freshness as sufficient.

- Pros: fast and deterministic; catches accidental generator drift.
- Cons: does not prove an external consumer can install, build, or render a copied component.

Option B: add a representative external install smoke before release.

- Pros: proves the public distribution contract and catches missing transitive files or bad registry dependencies.
- Cons: slower and may need network/cache isolation to keep CI stable.

Option C: keep registry public but mark more items beta until install proof exists.

- Pros: honest maturity posture and less risk to external consumers.
- Cons: weakens the current "canonical" registry story unless maturity metadata is actively managed.

Recommended direction: Option B for canonical/stable items, paired with Option C for items whose dependency graph is not yet externally proven.

## Decision Information Needed

- Which registry items are canonical/stable enough to require external install proof before release.
- Whether preview-demo manifests are public distribution artifacts or internal docs fixtures.
- Whether transitive helpers should be embedded as `registry:lib`, declared as `registryDependencies`, or installed through package dependencies.
- Whether `lastVerified` means local source governance, Storybook proof, visual acceptance, or external `shadcn add` success.
- Owner and SLA for `ui.nebutra.com` domain binding, cache headers, content type, and uptime.
- Whether public registry telemetry is required before any npm export removal target remains credible.
- Whether temporary registry feature gates or migration flags need owners and expiry dates, instead of living as implicit script constants.

## Proposed Decision Path

1. Define a `RegistryReleaseContract` for each item: maturity, dependency mode, required docs page, required story, required visual proof, required external install smoke, owner, and last verification date.
2. Add a small representative external install matrix for high-risk items: one primitive, one overlay/menu family item, one AI tool primitive, and `nebutra-tokens`.
3. Treat generated `public/r` diffs that remove embedded support files as requiring install proof before publication.
4. Split preview registry governance from public component registry governance so docs fixtures do not imply public install support.
5. Decide whether `lastVerified` should be machine-updated from evidence or manually reviewed as release metadata.
6. Review stale dual-track removal targets quarterly, using actual registry adoption and internal import usage rather than dates alone.

## Non-Goals

- This RFC does not revert or approve the current generated registry JSON diffs.
- This RFC does not change the public registry host, cache headers, or install commands.
- This RFC does not delete any stale flag or registry item; deletions require owner confirmation and dependency proof.
