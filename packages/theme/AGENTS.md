# AGENTS.md — packages/theme

Execution contract for Nebutra's multi-theme preset package.

## Scope

Applies to everything under `packages/theme/`.

This package owns the named product-theme layer that sits above base runtime
tokens. It is CSS-first and intentionally small.

## Source Of Truth

- Public package surface and exports: `package.json`, `src/index.ts`
- Canonical named theme selectors and CSS theme payloads: `themes.css`

## Contract Boundaries

- Treat `themes.css` as the canonical source for theme-specific CSS behavior.
  Do not duplicate theme selector logic in apps.
- Keep `THEME_IDS` in `src/index.ts` aligned with the `[data-theme]` selectors
  defined in `themes.css`. Adding, renaming, or removing a theme requires
  updating both in the same change.
- This package re-exports `next-themes` as a convenience boundary. Do not add
  unrelated runtime policy, product gating, or token definitions here.
- Keep this package distinct from `@nebutra/tokens`. `@nebutra/theme` owns
  named presets such as `ocean` or `minimal`; `@nebutra/tokens` owns the base
  semantic token system.

## Generated And Derived Files

- `tsconfig.tsbuildinfo` and similar compiler artifacts are derived files.
- Treat consumer app theme state and compiled CSS output as derived from
  `themes.css` and `src/index.ts`.

## Validation

- Theme surface or type changes:
  `pnpm --filter @nebutra/theme typecheck`
- When selector changes matter, verify a consumer imports `@nebutra/theme/themes.css`
  instead of patching compiled output.
