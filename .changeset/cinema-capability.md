---
"@nebutra/cinema": minor
---

Capability absorption — codename `cinema` (clean-room; source MIT, no
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
