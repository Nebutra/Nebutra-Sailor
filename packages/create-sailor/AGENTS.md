# AGENTS.md — packages/create-sailor

Execution contract for Nebutra's published `create-sailor` scaffolding CLI.

## Scope

Applies to everything under `packages/create-sailor/`.

This package owns first-run project scaffolding, template mutation, guided
selection flow, and generated starter defaults. It is the product bootstrapper,
not a second source of truth for runtime package behavior after scaffolding.

## Source Of Truth

- Published package surface and binary entry:
  `package.json`,
  `src/index.ts`,
  `tsup.config.ts`
- Canonical scaffold config contract and `nebutra.config.json` writer:
  `src/utils/config.ts`
- Template application and package-selection transforms:
  `src/utils/*.ts`
- Provider template rendering and marker semantics:
  `src/utils/providers.ts`
- Prompting and completion UI:
  `src/ui/*.ts`
- Scaffold source assets:
  `templates/`
- Package-local tests:
  `src/**/*.test.ts`

If scaffolded file shape, selection semantics, or generated config changes,
update the source of truth here instead of patching downstream generated apps.

## Contract Boundaries

- Keep `src/index.ts` as the canonical orchestration surface. CLI prompts,
  defaults, dry-run behavior, analytics emission, and ordered apply-steps
  should remain coordinated there.
- Keep `templates/` authoritative for checked-in scaffold source. Do not patch
  generated app output in tests or docs when the template itself should change.
- Preserve the split between template source and mutation helpers. Utilities in
  `src/utils/` own targeted edits such as provider selection, env injection,
  pruning, and optional subsystem wiring.
- Keep `src/utils/config.ts` as the canonical scaffold config contract. Region,
  docs, auth, billing, and optional-service selections should not be
  re-declared across multiple helpers.
- Treat marker processing in `src/utils/providers.ts` as compatibility-
  sensitive. Unknown or partially handled markers can silently corrupt
  scaffolded registries and env files.
- `create-sailor` owns bootstrap-time composition only. Runtime policy for the
  generated app belongs in the corresponding packages and apps, not here.

## Generated And Derived Files

- `dist/` is derived build output produced by `tsup`.
- Scaffolded app output in temporary test directories is derived and should not
  be treated as a checked-in source of truth.
- If generated output changes, update `templates/` or the relevant `src/utils/`
  transform instead of patching artifacts after generation.

## Validation

- Scaffold logic changes:
  `pnpm --filter create-sailor test`
- Published CLI entry or build changes:
  `pnpm --filter create-sailor build`
