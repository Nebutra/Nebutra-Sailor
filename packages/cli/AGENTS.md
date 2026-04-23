# AGENTS.md — packages/cli

Execution contract for Nebutra's published `nebutra` CLI package.

## Scope

Applies to everything under `packages/cli/`.

This package owns the shipped command-line surface, command registration,
delegated process execution, and CLI-specific output behavior. It is the
top-level operator interface, not the place for package-internal runtime logic
that should live in the owning workspace package.

## Source Of Truth

- Published package surface and binary entry:
  `package.json`,
  `src/index.ts`,
  `tsup.config.ts`
- Canonical command tree and global flags:
  `src/index.ts`
- Command implementations and subcommand wiring:
  `src/commands/*.ts`
- Shared delegation and process execution helpers:
  `src/utils/delegate.ts`
- Shared command error and exit-code semantics:
  `src/utils/command-error.ts`,
  `src/utils/exit-codes.ts`,
  `src/utils/errors.ts`
- CLI test harness:
  `tests/`,
  command-local `*.test.ts`

If command names, flags, exit behavior, or delegation semantics change, update
the source of truth here rather than patching generated `dist/` output.

## Contract Boundaries

- Keep `src/index.ts` as the canonical public CLI contract. New commands should
  be registered there and must remain compatible with global flags such as
  `--yes`, `--format`, and non-interactive execution.
- Prefer keeping package-specific business logic in the owning package and use
  this CLI as an orchestration layer. Do not turn `packages/cli` into a second
  source of truth for database, billing, or preset behavior.
- Preserve process execution semantics inside `src/utils/delegate.ts`. Command
  modules should reuse shared delegation helpers instead of inventing ad hoc
  `spawn` and environment-handling code.
- Keep exit-code and structured error behavior centralized. New command actions
  should follow the `runCommand` and `CommandError` migration direction instead
  of calling `process.exit` directly.
- Treat output shape as compatibility-sensitive. Changes to human-readable or
  JSON output can break automation even when the CLI still runs.
- `dist/` is a publish artifact, not a maintenance surface. Always edit source
  files and rebuild.

## Generated And Derived Files

- `dist/` is derived build output produced by `tsup`.
- Do not hand-edit published artifacts, temporary completion output, or ad hoc
  command snapshots.
- If shipped CLI behavior changes, update source files and rebuild rather than
  patching generated output.

## Validation

- CLI source changes:
  `pnpm --filter nebutra build`
- Command or utility behavior changes:
  `pnpm --filter nebutra test`
