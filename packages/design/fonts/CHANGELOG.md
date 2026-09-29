# @nebutra/fonts

## 4.0.1

### Patch Changes

- [`076251c`](https://github.com/Nebutra/Nebutra-Sailor/commit/076251c6f5a1d74bf98192727d0b1895d88fe607) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Fix `next/font/local` paths in `@nebutra/fonts/next` breaking on a hoisted
  `npm install` of the published package. The 19 registry faces pointed at
  `../node_modules/@fontsource-variable/<name>/files/...`, which only resolved
  because pnpm nests a workspace package's own dependencies under its own
  node_modules; npm commonly hoists `@fontsource-variable/*` to the installing
  project's top-level node_modules instead, so `next build` failed to resolve
  the font file there.

  The woff2 bytes are now vendored into the package itself
  (`generated/registry/`, copied at build/prepack time by
  `scripts/copy-registry-fonts.mjs` and committed to git, same pattern as the
  existing `generated/dm-sans.woff2`), and `next.ts` references them by a
  package-relative path instead. `@fontsource-variable/*` moved from
  `dependencies` to `devDependencies` — they are only needed to vendor the
  bytes at build time, never at runtime by a consumer.

  Also fixes `generated/dm-sans.woff2` itself being omitted from the npm
  `files` list — the same class of bug, just not yet hit by a downstream build.

- Updated dependencies []:
  - @nebutra/brand@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/brand@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/brand@3.0.0

## 2.0.0
