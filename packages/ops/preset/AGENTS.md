# AGENTS.md — packages/preset

Execution contract for Nebutra's product compiler.

## Scope

Applies to everything under `packages/ops/preset/`.

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
- **Published `@nebutra/*` caret ranges for scaffolds / CLI**
  (`NEBUTRA_PACKAGE_VERSIONS`):
  `src/nebutra-package-versions.ts`

  This is the **only** owned version map. `create-sailor` and `nebutra` CLI
  re-export it via relative path (do not duplicate). Keep ranges equal to
  `^${package.json.version}` for every listed declassified package:

  ```bash
  pnpm package-versions:sync   # rewrite from package.json
  pnpm package-versions:check  # fail on drift (also wired into release.yml)
  ```

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
