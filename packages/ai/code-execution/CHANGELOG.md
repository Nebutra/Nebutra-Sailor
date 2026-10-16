# @nebutra/code-execution

## 0.1.8

### Patch Changes

- [`8c77238`](https://github.com/Nebutra/Nebutra-Sailor/commit/8c772384caec2c5a7cb7f259d397dc73e2df57e3) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Relicense to Apache-2.0. Every package now declares `"license": "Apache-2.0"` and ships the Apache-2.0 LICENSE text (previously MIT). `create-sailor` writes an Apache-2.0 LICENSE and a NOTICE into each generated project and prints `Skip to production.` in its banner. See ADR 2026-10-16 apache-2-relicense.

- Updated dependencies [[`8c77238`](https://github.com/Nebutra/Nebutra-Sailor/commit/8c772384caec2c5a7cb7f259d397dc73e2df57e3)]:
  - @nebutra/capability-kit@5.0.0
  - @nebutra/errors@5.0.0
  - @nebutra/event-log@5.0.0
  - @nebutra/execution-policy@5.0.0
  - @nebutra/sandbox-runtime@5.0.0

## 0.1.7

### Patch Changes

- Updated dependencies []:
  - @nebutra/capability-kit@4.0.1
  - @nebutra/errors@4.0.1
  - @nebutra/event-log@4.0.1
  - @nebutra/execution-policy@4.0.1
  - @nebutra/sandbox-runtime@4.0.1

## 0.1.6

### Patch Changes

- Updated dependencies []:
  - @nebutra/capability-kit@4.0.0
  - @nebutra/errors@4.0.0
  - @nebutra/event-log@4.0.0
  - @nebutra/execution-policy@4.0.0
  - @nebutra/sandbox-runtime@4.0.0

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @nebutra/capability-kit@3.0.0
  - @nebutra/errors@3.0.0
  - @nebutra/event-log@3.0.0
  - @nebutra/execution-policy@3.0.0
  - @nebutra/sandbox-runtime@3.0.0

## 0.1.4

### Patch Changes

- Updated dependencies []:
  - @nebutra/capability-kit@2.0.0
  - @nebutra/errors@2.0.0
  - @nebutra/event-log@2.0.0
  - @nebutra/execution-policy@2.0.0
  - @nebutra/sandbox-runtime@2.0.0

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
  - @nebutra/event-log@0.1.2
  - @nebutra/execution-policy@0.1.2
  - @nebutra/sandbox-runtime@0.1.2
  - @nebutra/capability-kit@0.2.2
  - @nebutra/errors@0.1.2

## 0.1.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/capability-kit@0.2.1
  - @nebutra/errors@0.1.1
  - @nebutra/event-log@0.1.1
  - @nebutra/execution-policy@0.1.1
  - @nebutra/sandbox-runtime@0.1.1
