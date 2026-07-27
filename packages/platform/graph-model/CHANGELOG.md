# @nebutra/graph-model

## 0.2.2

### Patch Changes

- Ship the MIT LICENSE file these packages have always declared but never included.

  Every one of these declares `"license": "MIT"` in its manifest, and npm shows
  that on the registry page — but the tarball carried no licence text at all.
  MIT's own terms require the notice to accompany "all copies or substantial
  portions of the Software", so a consumer vendoring one of these packages had
  nothing to comply with.

  No code changes. This is the licence text only, published so the tarballs
  match what the manifests have been claiming.

  `tests/architecture/release-surface.test.ts` now asserts the LICENSE _file_
  exists and is MIT, not just the manifest _field_ — the field-only check is how
  this went unnoticed, and is also how `create-sailor` shipped the full AGPL-3.0
  text under an MIT declaration for its entire published history.

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

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
