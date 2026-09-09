import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import type { Edge, WorkspaceDocument, WorkspaceNode } from "@/domain/types";

/**
 * PARA's document expressed as a `@nebutra/graph-model` graph, so it can go through the shared
 * adapter in `@nebutra/ui` (React Flow mapping plus the cycle guard) rather than a second one.
 *
 * The mapping is nearly free: a `WorkspaceNode` already carries `id`, `x` and `y`, which is the
 * whole of `GraphNode`. Only the edge changes shape — the document says source/target, the graph
 * model says from/to — and the node travels along so the renderer can draw the real thing.
 */

export interface ParaGraphNode extends GraphNode {
  readonly node: WorkspaceNode;
}

export interface ParaGraphEdge extends GraphEdge {
  readonly id: string;
  readonly kind: Edge["kind"];
}

export type ParaGraph = Graph<ParaGraphNode, ParaGraphEdge>;

export function documentToGraph(doc: WorkspaceDocument): ParaGraph {
  return {
    nodes: Object.values(doc.nodes).map((node) => ({ id: node.id, x: node.x, y: node.y, node })),
    edges: Object.values(doc.edges).map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      kind: e.kind,
    })),
  };
}

/** An edge's stable identity, used for dedupe and removal by the shared adapter. */
export const paraEdgeIdentity = (edge: ParaGraphEdge): string => edge.id;

/**
 * Positions that came back from a drag. Returned as a plain record so the editor store can apply
 * them without the graph shape leaking into it.
 */
export function movedPositions(graph: ParaGraph): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of graph.nodes) out[n.id] = { x: n.x, y: n.y };
  return out;
}
