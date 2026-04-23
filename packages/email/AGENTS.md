# AGENTS.md — packages/email

Execution contract for Nebutra's transactional email package.

## Scope

Applies to everything under `packages/email/`.

## Source Of Truth

- Public package surface and stable sender exports: `src/index.ts` and
  `package.json`
- Template registry and render pipeline: `src/lib/templates.ts`
- Send pipeline and transport handoff: `src/lib/send-email.ts`,
  `src/provider/index.ts`, `src/provider/resend.ts`
- Template contracts and shared payload types: `src/types.ts`,
  `src/config.ts`
- Canonical email templates: `src/emails/*.tsx`
- Shared email layout primitives: `src/components/*.tsx`
- Package-local contract coverage: `src/__tests__/email-contract.test.ts`

## Contract Boundaries

- Treat `src/emails/*.tsx` as the canonical source for email content, subjects,
  preview text, and `PreviewProps`. Do not patch rendered HTML directly.
- Keep template registration centralized through `src/emails/index.ts` and
  `src/lib/templates.ts`. If a template is added, removed, or renamed, update
  the registry, exported sender surface, and contract tests in the same change.
- Keep rendering separate from delivery. `src/lib/templates.ts` renders React
  Email output; `src/lib/send-email.ts` builds the envelope; provider-specific
  delivery stays under `src/provider/`.
- Do not leak provider-specific logic into templates or public sender helpers.
  Resend-specific behavior belongs in `src/provider/resend.ts`.
- Preserve the stable caller surface in `src/index.ts`. If send helper params,
  tags, or exported types change, align package exports and tests together.
- Treat `apps/mail-preview` as a consumer of this package, not a second source
  of truth. Preview/export flows should reflect `packages/email/src/emails`
  rather than redefining template behavior there.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Exported preview artifacts such as `apps/mail-preview/dist/` are derived from
  the templates in this package. Regenerate them instead of editing output.
- Treat transient React Email preview state, coverage output, and Vitest
  artifacts as derived files.

## Validation

- Template, subject, preview text, or registry changes:
  `pnpm --filter @nebutra/email test`
- Export or type surface changes:
  `pnpm --filter @nebutra/email typecheck`
- Preview/export workflow changes that affect this package:
  `pnpm mail:check` and, when rendered output matters, `pnpm mail:export`

Prefer the smallest meaningful update under `src/__tests__` when changing
template contracts, sender exports, or delivery behavior.
