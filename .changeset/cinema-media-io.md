---
"@nebutra/tts": minor
"@nebutra/video-compose": minor
---

`cinema` follow-on — the two video-pipeline gaps (PORT, delivered).

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
