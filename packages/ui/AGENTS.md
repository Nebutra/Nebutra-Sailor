# AGENTS.md — packages/ui

Execution contract for the shared UI library.

## Scope

Applies to everything under `packages/ui/`.

## Source Of Truth

- Public export surface: `src/index.ts` and subpath export barrels
- Shared primitives and patterns: `src/primitives`, `src/patterns`, `src/components`
- Layout surfaces: `src/layout`, `src/layouts`
- Styling helpers and tokens integration: `src/theme`, `src/styles`, `src/utils`

This package is the reusable UI system. App-specific business logic should stay
out of it.

## Defaults

- Reuse semantic tokens; do not hardcode Nebutra brand values into component
  internals when the value belongs in tokens or theme packages.
- Prefer composable primitives over app-specific wrappers.
- Preserve public exports when refactoring. If you add a new public component,
  export it intentionally.
- Avoid introducing runtime dependencies on app code.

## Validation

```bash
pnpm --filter @nebutra/ui typecheck
```

If the change affects public behavior, update the relevant story or downstream
usage in Storybook or consuming apps as part of the same work.
