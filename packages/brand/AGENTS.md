# AGENTS.md — packages/brand

Execution contract for Nebutra's canonical brand package.

## Scope

Applies to everything under `packages/brand/`.

This package owns Nebutra's checked-in brand identity: logos, brand metadata,
positioning copy, and reusable brand-motion primitives. It is not a generic UI
package.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical brand metadata and identity constants: `src/metadata.ts`
- Canonical positioning and product-copy DNA: `src/positioning.ts`
- Canonical brand-guideline rules: `src/guidelines/`
- Reusable React logo surface: `src/components/`
- Checked-in brand assets and fonts: `assets/`
- Asset sync workflow into app `public/` directories: `scripts/sync-assets.ts`

## Contract Boundaries

- Treat `src/metadata.ts` as the canonical source for brand names, domains,
  social links, SEO defaults, and typography metadata. Do not scatter those
  constants into apps.
- Treat `src/positioning.ts` as the canonical source for brand messaging and
  capability claims. Do not add aspirational copy that is not backed by the
  repo.
- Keep programmatic guideline logic under `src/guidelines/`. If logo or color
  usage rules change, update the source modules there instead of patching
  downstream consumers.
- Keep React logo exports under `src/components/` aligned with the checked-in
  SVG assets in `assets/`. If a new logo edition is added, update the component
  layer, exports, and asset set together.
- Treat `scripts/sync-assets.ts` as the only supported way to mirror package
  assets into app `public/` directories. Do not hand-edit synced copies and
  treat consumer app copies as derived.
- `assets/` contains checked-in source assets. Do not treat `dist/` output as
  editable source.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- App-level mirrored brand files created by `scripts/sync-assets.ts` are
  derived from `assets/`.
- Temporary build artifacts and caches are derived files.

## Validation

- Export, metadata, or guideline changes:
  `pnpm --filter @nebutra/brand typecheck`
- Asset sync workflow changes:
  `pnpm --filter @nebutra/brand sync`
- If public package output matters:
  `pnpm --filter @nebutra/brand build`
