# AGENTS.md — packages/preset

Execution contract for Nebutra's product compiler.

## Scope

Applies to everything under `packages/preset/`.

## What This Package Is

`@nebutra/preset` is not just a feature-flag helper. It is the product-shape
compiler for Nebutra scenarios.

Its responsibilities are:

- preset definitions
- config resolution
- product capability resolution
- environment contract generation

## Source Of Truth

- Config schema and resolved config: `src/config.ts`
- Product capability resolution: `src/capabilities.ts`
- Env bridge and app/package mapping: `src/feature-map.ts`
- Scenario definitions: `src/presets/*.ts`

## Defaults

- Use TDD for behavior changes.
- Prefer capability-level semantics over one-off env flags.
- Preserve env contract stability unless the change is intentional and reflected
  in tests.
- When adding a new preset dimension, update:
  - schema
  - resolver
  - env mapping
  - tests

## Validation

```bash
pnpm --filter @nebutra/preset test
pnpm --filter @nebutra/preset typecheck
```

If a change does not add or update tests here, it is usually incomplete.
