# @nebutra/knowledge-base

## 0.2.3

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
  - @nebutra/content-store@0.1.2
  - @nebutra/document-pipeline@0.1.2
  - @nebutra/knowledge-graph@0.2.2
  - @nebutra/knowledge-rag@0.2.2
  - @nebutra/integration-vault@0.1.2
  - @nebutra/capability-kit@0.2.2
  - @nebutra/errors@0.1.2

## 0.2.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/capability-kit@0.2.1
  - @nebutra/content-store@0.1.1
  - @nebutra/document-pipeline@0.1.1
  - @nebutra/errors@0.1.1
  - @nebutra/integration-vault@0.1.1
  - @nebutra/knowledge-graph@0.2.1
  - @nebutra/knowledge-rag@0.2.1

## 0.2.1

### Patch Changes

- Updated dependencies [[`4f2548d`](https://github.com/Nebutra/Nebutra-Sailor/commit/4f2548d8ad24dcc03018c0c33188bbac344d146a)]:
  - @nebutra/knowledge-graph@0.2.0

## 0.2.0

### Minor Changes

- [`d2ebdb8`](https://github.com/Nebutra/Nebutra-Sailor/commit/d2ebdb83e236cd2625c357cbe532a5a67b1fcde2) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add the tenant-scoped knowledge-base product layer over existing content, document, and retrieval primitives.
