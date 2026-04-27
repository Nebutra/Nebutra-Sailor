# AGENTS.md — apps/mail-preview

Scoped execution contract for the local email preview and export app.

## Scope

This app owns the local email preview and export surface for development.

It owns:

- preview/export runtime commands in `package.json`
- local preview-specific README and output directory conventions

It does not own the email templates themselves. The canonical template catalog
and public sender mapping live in `packages/email/src/index.ts`.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for preview, export, and validation commands
- `README.md` for local operator guidance only

Treat `packages/email/src/index.ts` and `EMAIL_TEMPLATE_CATALOG` as the real
source of truth for template IDs, preview filenames, and sender mappings.

## Contract Boundaries

- This app is a consumer of `packages/email`, not a second template system.
- Keep template edits, template registration, and send semantics inside
  `packages/email`.
- Changes here should be limited to preview/export workflow and local operator
  ergonomics.
- Do not add app-local template copies under this directory.

## Generated And Derived Files

Treat these as derived artifacts:

- `dist/`
- `.react-email/`
- `.turbo/`
- `node_modules/`

If preview output is wrong, update the email package source rather than editing
the exported HTML in this app.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter mail-preview check`
- `pnpm --filter mail-preview export`
