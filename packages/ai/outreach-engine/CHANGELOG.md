# @nebutra/outreach-engine

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
  - @nebutra/content-store@0.1.2
  - @nebutra/event-log@0.1.2
  - @nebutra/generation-context@0.1.2
  - @nebutra/play-loader@0.1.2
  - @nebutra/capability-kit@0.2.2
  - @nebutra/errors@0.1.2

## 0.1.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/capability-kit@0.2.1
  - @nebutra/content-store@0.1.1
  - @nebutra/errors@0.1.1
  - @nebutra/event-log@0.1.1
  - @nebutra/generation-context@0.1.1
  - @nebutra/play-loader@0.1.1

## 0.1.1

### Patch Changes

- [`6ee7635`](https://github.com/Nebutra/Nebutra-Sailor/commit/6ee7635a8aa59bf9696a23e12f3d6f0d9b62f861) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add Layer 6 play-product packages for landing pages, outreach campaigns, and
  support deflection with SKILL.md declarations, deterministic local APIs, CLIs,
  examples, docs, tests, and governance boundaries.
