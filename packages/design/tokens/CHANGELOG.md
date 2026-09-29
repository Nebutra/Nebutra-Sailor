# @nebutra/tokens

## 4.0.1

### Patch Changes

- Updated dependencies [[`076251c`](https://github.com/Nebutra/Nebutra-Sailor/commit/076251c6f5a1d74bf98192727d0b1895d88fe607)]:
  - @nebutra/fonts@4.0.1
  - @nebutra/design-tokens@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/design-tokens@4.0.0
  - @nebutra/fonts@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/design-tokens@3.0.0
  - @nebutra/fonts@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/design-tokens@2.0.0
  - @nebutra/fonts@2.0.0

## 0.1.2

### Patch Changes

- Ship the MIT LICENSE file these packages have always declared but never included.

  Every one of these declares `"license": "MIT"` in its manifest, and npm shows
  that on the registry page — but the tarball carried no licence text at all.
  MIT's own terms require the notice to accompany "all copies or substantial
  portions of the Software", so a consumer vendoring one of these packages had
  nothing to comply with.

  No code changes. This is the licence text only, published so the tarballs
  match what the manifests have been claiming.

  `tests/architecture/release-surface.test.ts` now asserts the LICENSE _file_
  exists and is MIT, not just the manifest _field_ — the field-only check is how
  this went unnoticed, and is also how `create-sailor` shipped the full AGPL-3.0
  text under an MIT declaration for its entire published history.

- Updated dependencies []:
  - @nebutra/design-tokens@0.1.2

## 0.1.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/design-tokens@0.1.1
