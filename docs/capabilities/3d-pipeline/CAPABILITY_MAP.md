# 3d-pipeline Capability Map

## Depends On

- `image-pipeline`
- `sandbox-runtime`
- `generation-context`

## Decision Matrix

| Decision | Scope | Landing |
| --- | --- | --- |
| SKIP | Runtime orchestration and provider routing | Runtime/gateway layers |
| WRAP | Mesh engines, retopology, export sidecars | Adapter ports |
| PORT | BrandContext-first mesh API, glTF fallback, preview/export metadata | `packages/ai/3d-pipeline` |

## Boundary

The zero-config path writes a valid glTF document and preview SVG. High-quality
mesh generation remains sidecar-backed.
