# AGENTS.md — apps/studio

Scoped execution contract for the Sanity Studio app.

## Scope

This app owns the Sanity Studio surface used to manage Nebutra content.

It owns:

- studio runtime configuration in `sanity.config.ts` and `sanity.cli.ts`
- schema definitions under `schemaTypes/`
- public studio assets under `public/`

It does not own frontend query clients or content consumption code in other
workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and deploy commands
- `sanity.config.ts` for studio plugins, dataset/project config, and schema
  registration
- `sanity.cli.ts` for CLI behavior
- `schemaTypes/` for the checked-in content model
- `public/` for checked-in studio assets

Do not treat `dist/`, `.sanity/runtime/`, or deployment output as
implementation truth.

## Contract Boundaries

- Schema changes belong in `schemaTypes/`; studio bootstrapping belongs in
  `sanity.config.ts`.
- Keep the content model additive and explicit; avoid ad hoc schema behavior in
  unrelated studio files.
- Public brand assets belong in `public/`; built copies under `dist/` are
  derived output.
- Changes here affect downstream content consumers, so preserve schema names and
  field semantics unless the migration is intentional.

## Generated And Derived Files

Treat these as derived artifacts:

- `dist/`
- `.sanity/runtime/`
- `node_modules/`

If the studio output is wrong, change the checked-in schema or config instead of
editing generated runtime files.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/studio build`
