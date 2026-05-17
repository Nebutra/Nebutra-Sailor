---
"@nebutra/graph-model": minor
"@nebutra/reel-canvas": minor
"@nebutra/ui": minor
"@nebutra/reel": patch
---

Dependency-direction governance: generic UI no longer depends on a feature.

- **New `@nebutra/graph-model`**: neutral structural DAG contract
  (`GraphNode`/`GraphEdge`/`Graph` + `inboundEdges`/`hasCycleFrom`/
  `wouldCreateCycle`).
- **`@nebutra/ui` `NodeGraphCanvas` is now generic** over `graph-model`;
  domain bits (`edgeIdentity`, `makeEdge`, `renderNode`) are injected props.
  It no longer depends on `@nebutra/reel`. **Breaking for direct consumers**:
  use `<ReelCanvas>` from the new `@nebutra/reel-canvas` for the reel-bound
  editor.
- **New `@nebutra/reel-canvas`**: composition layer binding the generic
  editor to reel (depends on `@nebutra/ui` + `@nebutra/reel`).
- **`@nebutra/reel`**: `ReelNode`/`ReelEdge` now extend the generic types;
  `inboundEdges`/`hasCycleFrom` delegate to graph-model with unchanged
  signatures — public contract preserved (25/25 reel tests green).

Dependency direction is now always specific → generic. See
`docs/capabilities/canvas/ANTI_PATTERNS.md` §7.
