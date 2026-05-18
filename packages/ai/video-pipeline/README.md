# @nebutra/video-pipeline

Status: WIP — Not yet integrated into any production app.

`@nebutra/video-pipeline` is the storyboard-first video capability surface.
Every render call requires BrandContext and a storyboard. The zero-config path
writes deterministic JSON preview/composition manifests; model-backed clip
generation and ffmpeg composition are sidecar ports.

It does not own prompt orchestration, Thread/Turn/Item state, model provider
routing, or approval lifecycle.

## Commands

```bash
pnpm video:doctor
pnpm video:debug
pnpm video:cost
pnpm video:preview
```
