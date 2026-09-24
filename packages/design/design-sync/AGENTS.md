# AGENTS.md — packages/design-sync

Execution contract for Nebutra's provider-agnostic design-sync package.

## Scope

Applies to everything under `packages/design/design-sync/`.

This package owns the provider abstraction for syncing design-tool token state with the canonical W3C DTCG JSON files committed to the repo. It is a foundation integration layer, not an app-specific design system package.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical sync contracts: `src/types.ts`
- Provider selection, singleton lifecycle: `src/factory.ts`
- Auto-detection logic: `src/detect.ts`
- DTCG filesystem helpers: `src/io.ts`
- Provider implementations:
  `src/providers/git-only.ts`,
  `src/providers/memory.ts`,
  `src/providers/design-md.ts`
- CLI entry point: `src/cli/index.ts`

If sync semantics, provider selection, or DTCG validation rules change, update the source of truth here rather than patching consumers.

## Contract Boundaries

- Keep `src/types.ts` as the canonical sync contract. `DesignSyncProvider`, `PullOptions`, `PushOptions`, `HealthStatus`, and provider config types define the package boundary.
- Preserve provider selection inside `src/factory.ts` and `src/detect.ts`. Do not scatter `DESIGN_SYNC_PROVIDER` detection across consuming packages.
- Preserve the dry-run-by-default semantic for `design-md` `push()`. The package must never call a remote design-tool write API silently — credentials gate the call, and even with credentials the operator still has to omit `dryRun: true` explicitly.
- Keep DTCG validation centralised in `src/io.ts#validateDtcgTree`. Every provider runs the same validator before sending data anywhere.
- Respect the foundation status in `package.json`.
- Per ADR 2026-09-24 (Sailor Convergence), Figma and Penpot providers were deleted outright (not demoted to stub) — `git-only` is the single default and `design-md` is the AI-native alternative. Do not reintroduce a third design-tool adapter without amending that ADR's provider table.

## Generated And Derived Files

- This package exports source files directly and has no checked-in generated source of truth.
- Do not hand-edit transient sync state, remote API response dumps, or local DTCG mirrors that came from a `pull()` call.

## Validation

- Type contract changes: `pnpm --filter @nebutra/design-sync typecheck`
- Behavioural changes: `pnpm --filter @nebutra/design-sync test`
- Smoke test the CLI: `pnpm --filter @nebutra/design-sync exec design-sync detect --json`
