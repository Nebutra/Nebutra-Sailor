# AGENTS.md — packages/search

Execution contract for Nebutra's pluggable search package.

## Scope

Applies to everything under `packages/search/`.

This package owns the cross-provider search contract, provider selection,
singleton lifecycle, and the checked-in provider adapters for Meilisearch,
Typesense, and Algolia. It is the shared indexing/search abstraction, not an
app-local search UI or ranking-policy layer.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical search document, query, result, settings, and provider config
  contracts: `src/types.ts`
- Provider selection, auto-detection, singleton, and shutdown behavior:
  `src/factory.ts`
- Provider implementations and backend-specific translation:
  `src/providers/meilisearch.ts`,
  `src/providers/typesense.ts`,
  `src/providers/algolia.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep `src/types.ts` as the canonical cross-provider contract. Tightening
  query, result, or settings shapes is a compatibility change for consumers.
- Keep backend selection centralized in `src/factory.ts`. Do not duplicate
  environment detection or default singleton logic in downstream packages.
- Preserve provider-specific translation inside `src/providers/`. Cross-provider
  callers should depend on the shared contract rather than backend-specific
  request shapes.
- Respect the current foundation status in `package.json`. Provider adapters are
  still incomplete, and tenant index isolation is not fully enforced; do not
  document or code against stronger guarantees than the package provides today.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in codegen.
- Do not hand-edit transient index snapshots, provider debug dumps, or future
  emitted build artifacts.
- If provider behavior changes, update the source files above and rebuild
  rather than patching derived output.

## Validation

- Search contract or provider changes:
  `pnpm --filter @nebutra/search typecheck`
- Export or build-output changes:
  `pnpm --filter @nebutra/search build`
