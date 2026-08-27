# @nebutra/3d-pipeline

Status: WIP — Not yet integrated into any production app.

`@nebutra/3d-pipeline` is the BrandContext-first mesh capability surface. The
zero-config path writes a valid minimal glTF mesh and a preview SVG so examples
and tests run without GPU/model credentials. Model-backed mesh generation,
retopology, UV, and Blender automation are sidecar ports.

It does not own prompt orchestration, Thread/Turn/Item state, model provider
routing, or approval lifecycle.

## Commands

```bash
pnpm 3d:doctor
pnpm 3d:debug
pnpm 3d:preview
pnpm 3d:export
```
