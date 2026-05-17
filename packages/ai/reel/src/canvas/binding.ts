/**
 * Pure reel ⇄ generic-graph binding. No React, no DOM — the reel-specific
 * knowledge (edge identity, how a connection becomes a ReelEdge, how a
 * ReelGraph mutation re-stamps `updatedAt`) lives here so it is unit-testable
 * and the generic `@nebutra/ui` editor stays domain-free.
 */

import type { ReelEdge, ReelGraph, ReelNodeType } from "../types";

/** Default input port when a connection arrives without a target handle. */
export const DEFAULT_INPUT_TYPE = "input" as const;

/**
 * Deterministic, collision-stable reel edge identity. Same triple → same id,
 * so xyflow reconciliation and reel persistence agree without an id store.
 */
export function reelEdgeIdentity(edge: ReelEdge): string {
  return `e:${edge.from}->${edge.to}:${edge.inputType}`;
}

/** Build a ReelEdge from an xyflow connection (target handle = input port). */
export function reelMakeEdge(from: string, to: string, targetHandle: string | null): ReelEdge {
  return { from, to, inputType: targetHandle ?? DEFAULT_INPUT_TYPE };
}

/** Human label per reel node type. */
export const REEL_NODE_LABEL: Record<ReelNodeType, string> = {
  text: "Text",
  image: "Image",
  "gen-image": "Generate Image",
  "gen-video": "Generate Video",
  storyboard: "Storyboard",
  analyze: "Analyze",
};

/**
 * Re-stamp `updatedAt` on a graph the generic editor produced. The editor
 * preserves all non-structural fields by spread but is domain-blind, so the
 * "a mutation bumps updatedAt" invariant is reasserted here.
 */
export function withReelTimestamp(graph: ReelGraph): ReelGraph {
  return { ...graph, updatedAt: new Date() };
}
