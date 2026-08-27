/**
 * @nebutra/reel — typed node-graph dataflow for generative-media production.
 *
 * Core export: the graph model + NODE_IO_ENVELOPE v1.0 contract + pull-based
 * input resolution + tenant-scoped persistence. Sibling of
 * `@nebutra/atelier-canvas` (free placement); both build on the shared
 * `@nebutra/tenant-store` lower layer, not on each other. Transport and
 * storyboard live under subpaths.
 */

export {
  type BuildEnvelopeInput,
  buildEnvelope,
  isEnvelopeValid,
  mergeEnvelopes,
  normalizeMediaKind,
} from "./envelope";
export { hasCycleFrom, inboundEdges, resolveNodeInputs } from "./graph";
export { applyNodeOutput } from "./service";
export { InMemoryReelGraphStore } from "./store/memory";
export {
  NODE_IO_ENVELOPE_VERSION,
  type NodeIOEnvelope,
  type ReelEdge,
  type ReelGraph,
  type ReelGraphStore,
  type ReelMediaItem,
  type ReelMediaKind,
  type ReelNode,
  type ReelNodeType,
} from "./types";
