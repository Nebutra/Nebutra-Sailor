# audio-pipeline Capability Map

## Depends On

- `sandbox-runtime`
- `generation-context`

## Decision Matrix

| Decision | Scope | Landing |
| --- | --- | --- |
| SKIP | Runtime orchestration and prompt generation | Runtime/tool layers |
| WRAP | Music/SFX engines and loudness sidecars | Adapter ports |
| PORT | License-aware audio API and zero-config WAV fallback | `packages/ai/audio-pipeline` |

## Boundary

Every generated asset carries license metadata. Commercial mode rejects unknown
provider license state.
