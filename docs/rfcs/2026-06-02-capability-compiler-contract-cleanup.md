# RFC B1/B8: Retire Scenario Preset Contracts After Capability Compiler Split

Status: Proposed
Date: 2026-06-02
Dimensions: B1 technical debt and legacy architecture, B7 developer experience, B8 feature flag debt

## Delta Scope

This proposal covers changes observed since the 2026-05-31 governance baseline. The runtime direction moved away from scenario presets and toward capability/env contract resolution, but several public and agent-facing contracts still describe the old preset model.

No code or configuration was changed by this review.

## Current State

- Recent commits removed the preset CLI command and deleted scenario preset definitions, including `packages/ops/cli/src/commands/preset.ts` and `packages/ops/preset/src/presets/*.ts`.
- `packages/ops/preset/AGENTS.md` still defines `@nebutra/preset` as a "product-shape compiler for Nebutra scenarios" and lists `src/presets/*.ts` as a source of truth.
- `packages/ops/preset/README.md` still advertises `defineConfig({ preset: "ai-saas" })` and enumerates scenario names.
- `packages/ops/cli/src/commands/completions.ts` still includes `preset` in shell completion metadata and describes it as "List and apply SaaS presets".
- `packages/ops/cli/src/commands/test.ts` still accepts `preset` as a valid app filter.
- `apps/web/src/lib/product-capabilities.ts` is now the practical web capability gate for workspace, billing, notifications, and prototypes.
- `backends/gateway/.env.example` still sets `NEBUTRA_BILLING_CHECKOUT_MODE=hosted`, while the web capability resolver only recognizes `none`, `individual`, and `workspace`.
- Startup OS has two env readers with different production truthiness: `resolveWebProductCapabilities` accepts `true` or `1`, while `isStartupOSPrototypeEnabled` only accepts `1`.

## Architectural Tradeoffs

Option A: complete the capability compiler split now.

- Pros: removes stale scenario vocabulary, improves onboarding, makes env contracts testable, and lowers future migration cost before external users rely on the old command names.
- Cons: requires a migration note for anyone still using old docs, completions, or scripted `preset` workflows.

Option B: keep a compatibility alias for one release window.

- Pros: safer if internal scripts or demos still call `nebutra preset`.
- Cons: preserves a dead concept and keeps new contributors learning a model the code no longer implements.

Option C: restore first-class scenario presets.

- Pros: keeps the original starter-oriented product taxonomy.
- Cons: conflicts with the recent capability-map direction and risks coupling product packaging to environment flags again.

Recommended direction: Option A unless there is evidence that an external or shared automation still depends on the removed preset command.

## Decision Information Needed

- Whether any CI, demo script, docs workflow, or customer-facing setup guide still calls `nebutra preset`.
- Whether `@nebutra/preset` should be renamed conceptually to a capability compiler, or kept as a package name for compatibility only.
- Canonical allowed values for every `NEBUTRA_*` env that leaves the compiler boundary, especially billing checkout mode.
- Canonical boolean semantics for prototype gates: strict `"1"` only, or `"1" | "true"` everywhere.
- Whether old scenario names should get a migration table to capability bundles, or be removed entirely.

## Proposed Decision Path

1. Audit command consumers and shell completion snapshots for `preset`.
2. Freeze a capability-contract matrix: source env, normalized type, allowed values, default, owning app/package.
3. Decide whether stale scenario names are migration aliases or deleted concepts.
4. In a later implementation PR, update docs, completions, tests, env examples, and package metadata together.

## Non-Goals

- This RFC does not restore the deleted preset command.
- This RFC does not change any env default.
- This RFC does not suppress failing tests, loosen type checks, or change CI behavior.
