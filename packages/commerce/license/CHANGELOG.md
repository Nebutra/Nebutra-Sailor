# @nebutra/license

## 0.1.3

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
  - @nebutra/email@0.1.2
  - @nebutra/queue@0.1.3
  - @nebutra/logger@0.1.2
  - @nebutra/db@0.1.2

## 0.1.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/email@0.1.1
  - @nebutra/logger@0.1.1
  - @nebutra/queue@0.1.2
  - @nebutra/db@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [[`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704), [`5d3d7e6`](https://github.com/Nebutra/Nebutra-Sailor/commit/5d3d7e6c59cae5aa242bb988b75a9888cfd0db39)]:
  - @nebutra/queue@0.1.1
