# @nebutra/tts

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
