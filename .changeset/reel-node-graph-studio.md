---
"@nebutra/reel": minor
"@nebutra/feature-flags": patch
---

Add the Reel node-graph + storyboard generative-media capability.

- `@nebutra/reel`: new package — a typed node+edge graph with the absorbed
  **NODE_IO_ENVELOPE v1.0** contract kept exactly (versioned, type-erased
  inter-node payload), pull-based input resolution, cycle detection, and a
  tenant-scoped `ReelGraphStore`. Sibling of `@nebutra/atelier-canvas`
  (free placement) — reuses its `withCanvasLock` + persist-then-broadcast
  primitives, not its schema.
- `@nebutra/reel/transport`: unified http-json / http-sse / ws-stream
  executor + per-model capability schema + pre-flight contract validator,
  server-side and dependency-injected.
- `@nebutra/reel/storyboard`: script/novel/custom + table-summary split
  prompts (re-expressed; output contract preserved), numeric-tolerant shot
  identity, the result-routing scheme, and the output-history ring; split
  decoupled via an injected completion fn.
- `@nebutra/feature-flags`: new `FLAGS.REEL_STUDIO` (off by default).

A flag-gated `/reel` demo route in `apps/web` exercises script → shots →
typed node graph end-to-end with the mock provider (no AI key required).
