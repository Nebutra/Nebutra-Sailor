/**
 * @nebutra/reel/canvas — reel binding for the generic node-graph editor.
 *
 * Composition layer: depends on `@nebutra/ui` (generic editor) and
 * the reel domain model. The generic editor depends on neither — dependency
 * direction is specific → generic.
 */

export {
  DEFAULT_INPUT_TYPE,
  REEL_NODE_LABEL,
  reelEdgeIdentity,
  reelMakeEdge,
  withReelTimestamp,
} from "./binding";
export { ReelCanvas, type ReelCanvasProps } from "./reel-canvas";
