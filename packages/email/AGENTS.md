# AGENTS.md — packages/email

Execution contract for Nebutra's transactional email package.

## Scope

Applies to everything under `packages/email/`.

## Source Of Truth

- Public package surface and stable sender exports: `src/index.ts` and
  `package.json`
- Template catalog, preview filenames, and stable sender mapping:
  `EMAIL_TEMPLATE_CATALOG` in `src/index.ts`
- Send pipeline and Resend transport handoff: `src/index.ts`
- Package-local contract coverage: `src/__tests__/email-contract.test.ts`

## Contract Boundaries

- Keep template registration centralized through `EMAIL_TEMPLATE_CATALOG`.
  If a template is added, removed, or renamed, update the catalog, exported
  sender surface, preview output, and contract tests in the same change.
- Do not instantiate delivery providers at import time. No-key preview,
  documentation, and test flows must be able to import `@nebutra/email` without
  `RESEND_API_KEY`.
- Do not patch rendered preview HTML directly as a source-of-truth change.
  Update the sender/template catalog first, then regenerate or validate preview
  output through `apps/mail-preview`.
- Preserve the stable caller surface in `src/index.ts`. If send helper params,
  tags, or exported types change, align package exports and tests together.
- Treat `apps/mail-preview` as a consumer of this package, not a second source
  of truth. Preview/export flows should reflect `EMAIL_TEMPLATE_CATALOG` rather
  than redefining template behavior there.
- A future React Email extraction is allowed, but it must introduce the real
  files, scripts, and tests in the same change before AGENTS names those paths.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Exported preview artifacts such as `apps/mail-preview/dist/` are derived from
  the templates in this package. Regenerate them instead of editing output.
- Treat transient preview state, coverage output, and Vitest artifacts as
  derived files.

## Validation

- Template, subject, preview text, or registry changes:
  `pnpm --filter @nebutra/email test`
- Export or type surface changes:
  `pnpm --filter @nebutra/email typecheck`
- Preview/export workflow changes that affect this package:
  `pnpm mail:check` and, when rendered output matters, `pnpm mail:export`

Prefer the smallest meaningful update under `src/__tests__` when changing
template contracts, sender exports, or delivery behavior.
