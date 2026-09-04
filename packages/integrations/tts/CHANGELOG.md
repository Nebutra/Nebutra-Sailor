# @nebutra/tts

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @nebutra/capability-kit@2.0.0
  - @nebutra/provider-factory@2.0.0

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
  - @nebutra/capability-kit@0.2.2
  - @nebutra/provider-factory@0.2.2

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/capability-kit@0.2.1
  - @nebutra/provider-factory@0.2.1

## 0.2.0

### Minor Changes

- [`6c92e1f`](https://github.com/Nebutra/Nebutra-Sailor/commit/6c92e1f8535fbbe4dff6af071781ec031e224c44) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - `cinema` follow-on — the two video-pipeline gaps (PORT, delivered).
  - **New `@nebutra/tts`**: provider-agnostic narration synthesis. Deterministic
    zero-config mock default (active); ElevenLabs/OpenAI/Volces selected via the
    shared `@nebutra/provider-factory`, fail-loud stubs until landed. Multi-tenant
    by request (`tenantId` mandatory). `TtsError` extends `@nebutra/capability-kit`.
  - **New `@nebutra/video-compose`**: pure `composeTimeline` edit-decision-list
    builder (concat + crossfade math, unit-testable with no ffmpeg) +
    `VideoCompositor` provider abstraction (zero-config mock; ffmpeg adapter is a
    documented fail-loud stub). `VideoComposeError` extends capability-kit.

  Both reuse the governance layers extracted earlier (provider-factory,
  capability-kit). 9/9 + 9/9 tests, typecheck clean. Completes the `cinema`
  codename net-PORT surface (cinema + tts + video-compose). See
  docs/capabilities/cinema/.

### Patch Changes

- Updated dependencies [[`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704)]:
  - @nebutra/provider-factory@0.2.0
  - @nebutra/capability-kit@0.2.0
