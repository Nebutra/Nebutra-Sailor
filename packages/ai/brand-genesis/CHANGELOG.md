# @nebutra/brand-genesis

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @nebutra/video-pipeline@0.1.4
  - @nebutra/capability-kit@2.0.0
  - @nebutra/errors@2.0.0
  - @nebutra/event-log@2.0.0
  - @nebutra/3d-pipeline@0.1.4
  - @nebutra/audio-pipeline@0.1.4
  - @nebutra/content-store@0.1.5
  - @nebutra/image-pipeline@0.1.4
  - @nebutra/play-loader@0.1.4
  - @nebutra/voice-realtime@0.1.4
  - @nebutra/generation-context@0.1.4

## 0.2.2

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
  - @nebutra/3d-pipeline@0.1.2
  - @nebutra/audio-pipeline@0.1.2
  - @nebutra/content-store@0.1.2
  - @nebutra/event-log@0.1.2
  - @nebutra/generation-context@0.1.2
  - @nebutra/image-pipeline@0.1.2
  - @nebutra/play-loader@0.1.2
  - @nebutra/video-pipeline@0.1.2
  - @nebutra/voice-realtime@0.1.2
  - @nebutra/capability-kit@0.2.2
  - @nebutra/errors@0.1.2

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/3d-pipeline@0.1.1
  - @nebutra/audio-pipeline@0.1.1
  - @nebutra/capability-kit@0.2.1
  - @nebutra/content-store@0.1.1
  - @nebutra/errors@0.1.1
  - @nebutra/event-log@0.1.1
  - @nebutra/generation-context@0.1.1
  - @nebutra/image-pipeline@0.1.1
  - @nebutra/play-loader@0.1.1
  - @nebutra/video-pipeline@0.1.1
  - @nebutra/voice-realtime@0.1.1

## 0.2.0

### Minor Changes

- [`95bd633`](https://github.com/Nebutra/Nebutra-Sailor/commit/95bd6335a5703ee3f46e9e72ea79951bc64afa58) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add the Brand Genesis play product package with SKILL.md orchestration and deterministic local quickstart.
