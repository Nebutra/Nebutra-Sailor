# AGENTS.md — packages/feature-flags

Execution contract for Nebutra's feature flag abstraction package.

## Scope

Applies to everything under `packages/feature-flags/`.

This package owns flag evaluation contracts, provider switching, in-memory and
env-backed fallback behavior, and the client-side React adapter. It is a flag
evaluation layer, not a product-policy registry or rollout dashboard.

## Source Of Truth

- Public package surface and subpath exports:
  `package.json`,
  `src/index.ts`,
  `src/react.tsx`
- Canonical flag contracts:
  `FeatureFlagContext`,
  `FeatureFlagProvider`
- Default provider behavior and singleton provider lifecycle:
  `dbProvider`,
  `envProvider`,
  `memoryProvider`,
  `setFeatureFlagProvider`,
  `useDbProvider`,
  `useEnvProvider`,
  `useMemoryProvider`
- Main evaluation entry points:
  `isFeatureEnabled`,
  `getFeatureVariant`,
  `isEnabledForPercentage`,
  `FLAGS`
- Client-side React context and hooks:
  `FeatureFlagProvider`,
  `useFeatureFlag`,
  `useFeatureFlags`,
  `useFlags`

If flag semantics, provider precedence, or client hydration behavior changes,
update the source of truth here rather than patching consumers.

## Contract Boundaries

- Keep `src/index.ts` as the canonical server/runtime flag contract. Provider
  semantics and fallback order are compatibility-sensitive.
- Preserve provider selection through the exported setter/helpers. Do not add
  ad hoc global provider toggles in consuming apps.
- Keep Redis/env fallback logic centralized here. Consumers should ask whether
  a flag is enabled, not replicate kill-switch, cache, or env-key resolution.
- Keep `src/react.tsx` as a thin client adapter over the package contract. It
  should not become a separate source of truth for flag names or rollout rules.
- Respect the package's current `wip` status in `package.json`. Managed
  providers, gradual rollout infrastructure, and production integrations are
  not complete; do not write scoped guidance that assumes LaunchDarkly-style
  maturity already exists.
- Treat `FLAGS` and flag-name strings as public compatibility boundaries.
  Renames or removals can silently disable product paths even if typechecking
  still passes.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient cache state, fetched flag snapshots, or future
  build output.
- If generated artifacts are introduced later, update the source files above
  rather than patching derived output.

## Validation

- Feature flag contract changes:
  `pnpm exec tsc -p packages/feature-flags/tsconfig.json --noEmit`
- Because the package currently has no package-local test script, verify the
  narrowest downstream consumer that exercises the changed flag path.
