# @nebutra/cinema

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
  - @nebutra/graph-model@0.2.2

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/capability-kit@0.2.1
  - @nebutra/graph-model@0.2.1

## 0.2.0

### Minor Changes

- [`fbff7c8`](https://github.com/Nebutra/Nebutra-Sailor/commit/fbff7c8dd89575ba21abbcaf85f3fea5be703b4a) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Capability absorption — codename `cinema` (clean-room; source MIT, no
  license gate).

  New `@nebutra/cinema`: the differentiated agentic film-production IP from a
  research video pipeline, re-expressed as pure, dependency-injected
  orchestration on Sailor primitives:
  - `buildCameraTree` / `resolveContinuityChain` — acyclic, root-anchored
    camera-continuity tree (cross-shot temporal continuity); acyclic invariant
    reuses `@nebutra/graph-model` (no re-derived cycle detection).
  - `selectBestFrame` — consistency-ranked best-frame pick; fails loud if the
    injected ranker breaches its candidate contract.
  - `compressNovel` / `extractScenes` — novel→compressed→scene segmentation;
    RAG retrieval injected (pairs with `@nebutra/knowledge-rag`, not a hard dep).
  - `runFilmPipeline` — film-director composition (idea→script→shots→cameras→
    render), every stage injected.
  - `CinemaError` extends `@nebutra/capability-kit` `CapabilityError`.

  Infrastructure (media DAG, storyboard split, agent loop, generation
  registry, queue, tenancy) is SKIP/WRAP on existing packages — ≥80 % already
  covered (Kill-Criteria honoured). `@nebutra/tts` and `@nebutra/video-compose`
  are scheduled follow-on increments. 11/11 tests, typecheck clean; fully
  unit-testable with no network/model/tenant coupling. See
  docs/capabilities/cinema/.

### Patch Changes

- Updated dependencies [[`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704), [`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b)]:
  - @nebutra/capability-kit@0.2.0
  - @nebutra/graph-model@0.2.0
