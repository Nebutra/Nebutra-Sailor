# AGENTS.md — packages/marketing

Execution contract for Nebutra's reusable marketing package.

## Scope

Applies to everything under `packages/marketing/`.

This package owns reusable marketing components, attribution helpers, and
marketing-specific configuration shared across public-facing surfaces.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical reusable component barrel: `src/components/index.ts`
- Canonical shared config and defaults: `src/config/index.ts`
- Canonical analytics and attribution helpers: `src/utils/index.ts`
- Canonical shared types: `src/types/index.ts`
- Exported style tokens for this package: `src/styles/tokens.css`

## Contract Boundaries

- Keep the top-level public API centralized through `src/index.ts`. If a
  component, hook, config helper, or type becomes public, export it there and
  keep subpath exports aligned.
- Treat `src/types/index.ts` as the canonical contract for testimonial,
  Product Hunt, launch-banner, and attribution shapes. Do not fork parallel
  app-local marketing types.
- Treat `src/config/index.ts` as the source of default marketing behavior and
  URL helpers. Do not hardcode duplicated defaults into consumers.
- Keep browser-side attribution and storage logic under `src/utils/index.ts`
  and related hooks. Do not mix server-only concerns or unrelated analytics
  provider code into this package.
- `src/styles/tokens.css` is the styling boundary for this package. Do not edit
  compiled CSS output or consumer copies instead of updating the source style
  file.
- `dist/` is derived output; source changes belong under `src/`.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Consumer build output and copied CSS are derived from `src/`.
- Temporary local attribution state and analytics events stored in the browser
  are runtime data, not source.

## Validation

- Export, type, utility, or config changes:
  `pnpm --filter @nebutra/marketing typecheck`
- If package output matters:
  `pnpm --filter @nebutra/marketing build`
