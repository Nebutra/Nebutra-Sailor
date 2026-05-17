# Capability Map — `cinema`

> Codename **`cinema`** · Kind **product** (clean-room) · License of source: **MIT** (no Kill-Criteria gate) ·
> `depends_on`: **`reel`**, **`agent-runtime`**, **`agents`**, **`graph-model`**, **`capability-kit`**, **`atelier-canvas`**, **`tenant-store`**

Absorption of an agentic multi-stage video-creation framework (Idea/Script/
Novel → video). Audit found Sailor already covered ~80 % of the *pipeline
infrastructure*; only the differentiated film-production IP is PORT.

## Three-tier matrix

| Capability | Decision | Where in Sailor |
|---|---|---|
| Typed generative-media DAG + `NODE_IO_ENVELOPE` | **SKIP** | `@nebutra/reel` |
| Script→shots / novel→shots storyboard split | **SKIP** | `@nebutra/reel/storyboard` `splitScriptIntoShots()` |
| Multi-agent orchestration (pipeline/broadcast/turn-loop) | **SKIP** | `@nebutra/agents` orchestrator + `@nebutra/agent-runtime` |
| LLM calling + fallback | **SKIP** | `@nebutra/agents` |
| Image/video generation **framework** (pluggable registry) | **WRAP** | `@nebutra/agents` generation registry — wire real Veo/Kling/FAL providers (additive, not PORT) |
| Canvas asset placement | **SKIP** | `@nebutra/atelier-canvas` |
| Render queue / asset storage / multi-tenancy | **SKIP** | `@nebutra/queue` · `@nebutra/uploads` · `@nebutra/tenant-store` |
| RAG retrieval for novel context | **SKIP/WRAP** | `@nebutra/knowledge-rag` (injected into cinema, not a hard dep) |
| **Camera-continuity tree** (cross-shot temporal continuity) | **PORT** | `@nebutra/cinema` `buildCameraTree`/`resolveContinuityChain` |
| **Consistency-ranked best-frame selection** | **PORT** | `@nebutra/cinema` `selectBestFrame` |
| **Novel→compressed→scene/event segmentation** | **PORT** | `@nebutra/cinema` `compressNovel`/`extractScenes` |
| **Film-director composition template** | **PORT** | `@nebutra/cinema` `runFilmPipeline` |
| TTS / narration audio | **PORT (done)** | `@nebutra/tts` — provider abstraction, zero-config mock, provider-factory selection |
| FFmpeg mux/concat/transitions | **PORT (done)** | `@nebutra/video-compose` — pure timeline/EDL builder + compositor abstraction |
| Multi-tenancy / auth (source has none) | **SKIP** | — |

**Net PORT (all delivered): `@nebutra/cinema` (differentiated IP) +
`@nebutra/tts` + `@nebutra/video-compose` (the two video-pipeline gaps).**
The video-pipeline *infrastructure* was ≥80 % covered → SKIP-heavy, not an
integral product PORT (Kill-Criteria honoured).

## Delivered

| Package | Tests |
|---|---|
| `@nebutra/cinema` | 11/11 (camera tree incl. acyclic-guard via graph-model, best-frame, novel-segment, film-director) |
| `@nebutra/tts` | 9/9 (deterministic mock, provider resolution, fail-loud stubs) |
| `@nebutra/video-compose` | 9/9 (pure timeline/crossfade math, mock compositor) |

Everything in `@nebutra/cinema` is dependency-injected (no model/IO/tenant
coupling) — unit-testable and tenant-agnostic by construction. The real
model wiring is the caller's `@nebutra/agents` instance.
