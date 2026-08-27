# voice-realtime Capability Map

## Depends On

- `audio-pipeline`
- `generation-context`

## Decision Matrix

| Decision | Scope | Landing |
| --- | --- | --- |
| SKIP | Thread ownership and conversational state machine | Runtime layer |
| WRAP | Realtime transport, STT, and TTS sidecars | Adapter ports |
| PORT | Voice session contract, narration synthesis, enrollment metadata | `packages/ai/voice-realtime` |

## Boundary

Voice sessions reference a runtime thread id but do not import or own the
runtime. Realtime transport is sidecar-backed.
