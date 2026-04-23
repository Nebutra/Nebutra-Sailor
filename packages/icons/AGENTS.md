# AGENTS.md — packages/icons

Execution contract for Nebutra's generated icon package.

## Scope

Applies to everything under `packages/icons/`.

This package owns the checked-in SVG source set and the generated React icon
surface built from it.

## Source Of Truth

- Public package surface: `package.json`
- Canonical raw icon assets: `src/svg/`
- Canonical generator for React components and barrel exports:
  `scripts/generate.ts`
- Generated component source and barrel: `src/components/`, `src/index.ts`

## Contract Boundaries

- Treat `src/svg/` as the editable icon source. Do not hand-maintain generated
  React components when the underlying SVG should change instead.
- Treat `scripts/generate.ts` as the only supported path for producing
  `src/components/*.tsx` and `src/index.ts`. If generation rules change, update
  the generator and regenerate.
- `src/components/` and `src/index.ts` are generated compatibility surfaces.
  If an icon is added, removed, or renamed, regenerate the package and keep the
  public exports aligned in the same change.
- Preserve the shared `IconProps` contract emitted by the generator. Do not
  introduce icon-specific prop shapes without an intentional generator change.
- `dist/` is published build output, not source.

## Generated And Derived Files

- `src/components/*.tsx` and `src/index.ts` are generated from `src/svg/` via
  `scripts/generate.ts`.
- `dist/` is build output from `tsup`.
- Temporary generation artifacts and compiler caches are derived files.

## Validation

- SVG or generator changes:
  `pnpm --filter @nebutra/icons generate`
- Public icon surface changes:
  `pnpm --filter @nebutra/icons typecheck`
- If published output matters:
  `pnpm --filter @nebutra/icons build`
