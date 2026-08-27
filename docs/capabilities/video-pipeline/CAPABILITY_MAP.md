# video-pipeline Capability Map

## Depends On

- `image-pipeline`
- `sandbox-runtime`
- `generation-context`

## Decision Matrix

| Decision | Scope | Landing |
| --- | --- | --- |
| SKIP | Agent loop and sub-agent scheduling | Runtime layer |
| WRAP | Clip engines and composition sidecars | Adapter ports |
| PORT | Storyboard-first planning, cost, preview, composition manifests | `packages/ai/video-pipeline` |

## Boundary

No direct prompt-to-final-video API exists. A storyboard is planned first, then
rendered or previewed.
