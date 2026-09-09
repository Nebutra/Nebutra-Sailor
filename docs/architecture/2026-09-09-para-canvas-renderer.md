# PARA Canvas Renderer — Adopt, Do Not Build

- **Date**: 2026-09-09
- **Status**: Accepted
- **Owner**: tseka_luk
- **Related**:
  - [Competitive product cartography](./2026-09-08-competitive-product-cartography.md)
  - [Product intelligence phase](./2026-09-08-product-intelligence-phase.md)
  - `docs/product-intelligence/canvas.md`
  - `packages/design/ui/src/components/node-graph-canvas.tsx`

---

## Context

`apps/para` shipped a hand-written canvas: a `div` under a CSS transform, 734 lines, giving pan,
zoom, select, move, delete and drop. It renders no edges even though the document stores them, has
no undo history, no marquee selection, no spatial index or viewport culling, and two keyboard
shortcuts. Going further down that road means writing an undo stack, a spatial index, snapping,
marquee, pointer-capture handling across trackpad, touch and pen, and the accessibility that a
`div` does not give you for free.

The question raised was whether to build a canvas library of our own.

## Decision

**Adopt, do not build.** PARA renders its canvas with `NodeGraphCanvas` from `@nebutra/ui`, which
already wraps `@xyflow/react` (React Flow, MIT) over the `@nebutra/graph-model` node/edge contract.

The hand-written canvas is replaced, not extended.

## Why

**The evidence points at a node-graph engine specifically.** Of the six competitors mapped in pass 1,
three use a canvas library and it splits by product shape: Lovart uses tldraw, a whiteboard and
drawing engine; LibTV and Seko use React Flow, a node-graph engine. PARA is a node graph — typed
nodes, derivation edges, task state on the node — so it is React Flow's shape, not tldraw's. Two of
the three, on the matching shape (tier B, and A for "adopt something").

**It already exists here.** `@nebutra/ui` ships `NodeGraphCanvas` plus a framework-free adapter
(`graphToFlow`, `applyNodePositions`, `tryAddEdge`, cycle rejection via `@nebutra/graph-model`).
Hand-writing a second canvas inside `apps/para` was a straight breach of one canonical
implementation per domain; the repo had the answer and PARA did not use it.

**What is ours stays ours.** The renderer draws nodes the caller supplies. Node-as-generator, the
derivation edge, the approval gate, job status on the node — every PARA-specific decision from
`docs/product-intelligence/` lives in a custom node component and in the document model, untouched
by this choice. Adopting a renderer does not cede the product.

**The posture matches the repo's own.** ADR 2026-08-03 states the rule for Carina: dock, do not
replace; wrap existing primitives rather than rebuilding them. Carina earns its exception because it
isolates untrusted code — a sovereignty argument. A canvas renderer has no equivalent argument.

## Consequences

- `apps/para` loses its hand-written `CanvasView` transform layer and gains edges, marquee
  selection, viewport culling, minimap and connection handles for free.
- Node placement stops being duplicated: `apps/para` and `backends/gateway` should use
  `findNextPosition` from `@nebutra/atelier-canvas` rather than each carrying a `placeChild`.
- The document model must map to `@nebutra/graph-model`'s `GraphNode` / `GraphEdge`. PARA's node
  already carries `id`, position and size, so this is an adapter, not a rewrite.
- `@nebutra/ui` gains a real second consumer, which will expose whatever the reel binding did not.

## When to revisit

Build our own only when React Flow is structurally unable to express what PARA needs. Two concrete
tripwires, both testable rather than speculative:

1. A workspace routinely holds enough nodes that DOM rendering stops holding 60fps and the answer
   is a WebGL or canvas-2d renderer.
2. The spatial model stops being a directed acyclic graph — free-form nesting, infinite zoom levels
   of detail, or a timeline that is not expressible as nodes and edges.

Neither is true today. Until one is, the cost is thousands of lines of solved problems and none of
it is what makes PARA different.
