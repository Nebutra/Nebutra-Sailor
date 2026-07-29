# AGENTS.md — packages/tokens

Execution contract for Nebutra's runtime design-token package.

## Scope

Applies to everything under `packages/design/tokens/`.

This package is the canonical runtime token layer for Nebutra apps. It owns the
base semantic CSS variables and the light/dark theme-provider surface.

## Source Of Truth

- Public package surface and exports: `package.json`, `src/index.ts`
- Canonical runtime token definitions: `styles.css` (generated from `@nebutra/design-tokens` via `sync-styles.mjs`; keep `verify:parity` at 100%)

## Contract Boundaries

- `styles.css` is where you *read* the authoritative set of runtime token names,
  semantic aliases and Tailwind-consumable variables — apps and sibling packages
  must not redefine those names. It is **not** where you write: the file is
  regenerated from `@nebutra/design-tokens`, so an edit here is erased by the
  next build of any dependent package, silently and without an error. Change
  `packages/design/design-tokens/tokens/` (light and dark as a pair) and rebuild.
  `recipe.css` in this package *is* hand-maintained and safe to edit.
- Keep `THEME_IDS` and `DEFAULT_THEME` in `src/index.ts` aligned with the
  actual light/dark behavior implemented in `styles.css`.
- This package owns the base light/dark token system only. Do not move named
  product-mood presets here. **Design-language catalog & global swap** belong in
  `@nebutra/theme` (`languages.json`, `applyLanguage`, `skins.css`). Brand Package
  *engine* (compile / emit / normalize) stays in this package (`brand-package/`).
  Multi-mood oklch catalogs were deleted — never reintroduce a second root `@theme` primary.
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
