# AGENTS.md — packages/email

Execution contract for Nebutra's transactional email package.

## Scope

Applies to everything under `packages/integrations/email/`.

## Source Of Truth

- Public package surface and stable sender exports: `src/index.ts` and
  `package.json`
- Template catalog, preview filenames, and stable sender mapping:
  `EMAIL_TEMPLATE_CATALOG` in `src/index.ts`
- Send pipeline and Resend transport handoff: `src/index.ts`
- Package-local contract coverage: `src/__tests__/email-contract.test.ts`
- React Email-style template surface (`{ subject, preview, render }`):
  `src/templates/index.ts` plus per-template modules under `src/templates/`
- Per-template body coverage: `src/templates/__tests__/templates.test.ts`

## React Email-style templates

Live under `src/templates/`. Each module exports typed `Props`, `subject`,
`preview`, and `render` plus a default named bundle (e.g. `welcomeEmail`).

Currently registered:

| File | Catalog id | Send helper |
| ---- | ---------- | ----------- |
| `welcome.tsx` | `welcome-react` | `sendWelcomeReactEmail` |
| `password-reset.tsx` | `password-reset` | `sendPasswordResetEmail` |
| `invitation.tsx` | `invitation` | `sendInvitationEmail` |
| `receipt.tsx` | `receipt` | `sendReceiptEmail` |

`react-email` / `@react-email/components` is not installed in this workspace.
The templates are framework-free `.tsx` files that compose plain template
literals through `src/templates/_layout.ts` (`baseLayout`, `escapeHtml`).
Migration to React Email is a drop-in replacement of the renderers; the public
contract (`{ subject, preview, render }`) and `EMAIL_TEMPLATE_CATALOG` entries
stay stable.

`apps/mail-preview/scripts/render-react-templates.ts` materializes these four
templates into `apps/mail-preview/dist/<file>-email.html` so the existing
`pnpm --filter mail-preview check` flow finds them.

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
