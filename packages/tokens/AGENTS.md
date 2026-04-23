# AGENTS.md — packages/tokens

Execution contract for Nebutra's runtime design-token package.

## Scope

Applies to everything under `packages/tokens/`.

This package is the canonical runtime token layer for Nebutra apps. It owns the
base semantic CSS variables and the light/dark theme-provider surface.

## Source Of Truth

- Public package surface and exports: `package.json`, `src/index.ts`
- Canonical runtime token definitions and semantic CSS variables: `styles.css`

## Contract Boundaries

- Treat `styles.css` as the single source of truth for runtime token names,
  semantic aliases, and Tailwind-consumable CSS variables. Do not redefine core
  token names in apps or sibling packages.
- Keep `THEME_IDS` and `DEFAULT_THEME` in `src/index.ts` aligned with the
  actual light/dark behavior implemented in `styles.css`.
- This package owns the base light/dark token system only. Do not move named
  product-theme presets here; those belong in `@nebutra/theme`.
- Preserve the package boundary between CSS tokens and component usage.
  `@nebutra/ui` and apps should consume the exported CSS surface rather than
  importing token internals.
- Because `./styles.css` is an exported side-effect file, treat renames or
  variable removals as cross-repo breaking changes even if TypeScript passes.

## Generated And Derived Files

- `tsconfig.tsbuildinfo` and compiler artifacts are derived files.
- Consumer app compiled CSS output is derived from `styles.css`.

## Validation

- Token or export changes:
  `pnpm --filter @nebutra/tokens typecheck`
- When token names or theme IDs change, verify at least one consuming package
  updates with the same change instead of relying on stale compiled CSS.
