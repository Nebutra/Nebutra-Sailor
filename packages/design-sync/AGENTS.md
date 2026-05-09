# AGENTS.md — packages/design-sync

Execution contract for Nebutra's provider-agnostic design-sync package.

## Scope

Applies to everything under `packages/design-sync/`.

This package owns the provider abstraction for syncing design-tool token state with the canonical W3C DTCG JSON files committed to the repo. It is a foundation integration layer, not an app-specific design system package.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical sync contracts: `src/types.ts`
- Provider selection, singleton lifecycle: `src/factory.ts`
- Auto-detection logic: `src/detect.ts`
- DTCG filesystem helpers: `src/io.ts`
- Provider implementations:
  `src/providers/figma.ts`,
  `src/providers/penpot.ts`,
  `src/providers/git-only.ts`,
  `src/providers/memory.ts`
- Tokens Studio plugin config snapshot: `src/figma-config/tokens-studio.config.json`
- CLI entry point: `src/cli/index.ts`

If sync semantics, provider selection, or DTCG validation rules change, update the source of truth here rather than patching consumers.

## Contract Boundaries

- Keep `src/types.ts` as the canonical sync contract. `DesignSyncProvider`, `PullOptions`, `PushOptions`, `HealthStatus`, and provider config types define the package boundary.
- Preserve provider selection inside `src/factory.ts` and `src/detect.ts`. Do not scatter `DESIGN_SYNC_PROVIDER`, `FIGMA_*`, or `PENPOT_*` detection across consuming packages.
- Preserve the dry-run-by-default semantic for `figma` and `penpot` `push()`. The package must never call a remote design-tool write API silently — credentials gate the call, and even with credentials the operator still has to omit `dryRun: true` explicitly.
- Keep DTCG validation centralised in `src/io.ts#validateDtcgTree`. Every provider runs the same validator before sending data anywhere.
- Respect the foundation status in `package.json`. Live Figma push and live Penpot push are intentionally not implemented — keep the throw-with-explanation pattern instead of silently no-op-ing.
- Tokens Studio metadata at `.tokens-studio/{config,metadata,themes}.json` is required by the `figma` provider. The mirror at `src/figma-config/tokens-studio.config.json` is the in-package canonical copy; both must move together.

## Generated And Derived Files

- This package exports source files directly and has no checked-in generated source of truth.
- Do not hand-edit transient sync state, remote API response dumps, or local DTCG mirrors that came from a `pull()` call.
- The `.tokens-studio/` directory at the repo root is owned by this package's `figma` provider. Do not edit those files in-place from app code; route changes through the Tokens Studio plugin or this package's CLI.

## Validation

- Type contract changes: `pnpm --filter @nebutra/design-sync typecheck`
- Behavioural changes: `pnpm --filter @nebutra/design-sync test`
- Smoke test the CLI: `pnpm --filter @nebutra/design-sync exec design-sync detect --json`
- For changes that touch the figma provider, verify the mirror config still parses against the Tokens Studio plugin schema.
