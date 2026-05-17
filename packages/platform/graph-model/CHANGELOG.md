# @nebutra/graph-model

## 0.2.0

### Minor Changes

- [`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Dependency-direction governance: generic UI no longer depends on a feature.

  - **New `@nebutra/graph-model`**: neutral structural DAG contract
    (`GraphNode`/`GraphEdge`/`Graph` + `inboundEdges`/`hasCycleFrom`/
    `wouldCreateCycle`).
  - **`@nebutra/ui` `NodeGraphCanvas` is now generic** over `graph-model`;
    domain bits (`edgeIdentity`, `makeEdge`, `renderNode`) are injected props.
    It no longer depends on `@nebutra/reel`. **Breaking for direct consumers**:
    use `<ReelCanvas>` from the new `@nebutra/reel-canvas` for the reel-bound
    editor.
  - **New `@nebutra/reel/canvas` subpath**: composition layer binding the
    generic editor to reel (depends on `@nebutra/ui` + `@nebutra/reel`).
  - **`@nebutra/reel`**: `ReelNode`/`ReelEdge` now extend the generic types;
    `inboundEdges`/`hasCycleFrom` delegate to graph-model with unchanged
    signatures — public contract preserved (25/25 reel tests green).

  Dependency direction is now always specific → generic. See
  `docs/capabilities/canvas/ANTI_PATTERNS.md` §7.
