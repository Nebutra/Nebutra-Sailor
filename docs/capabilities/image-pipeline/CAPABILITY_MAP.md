# image-pipeline Capability Map

## Depends On

- `sandbox-runtime`
- `content-store`
- `generation-context`

## Decision Matrix

| Decision | Scope | Landing |
| --- | --- | --- |
| SKIP | Thread/Turn/Item, prompt orchestration, model provider routing | Owned by runtime/gateway layers |
| WRAP | Local/remote image engines | Adapter ports and doctor checks |
| PORT | BrandContext-first image API and deterministic fallback assets | `packages/ai/image-pipeline` |

## Boundary

`BrandContext` is mandatory. The zero-config renderer writes real SVG assets;
model-backed workflows remain WIP adapter ports.
