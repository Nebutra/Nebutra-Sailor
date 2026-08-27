/**
 * Pure mapping layer between a neutral `@nebutra/graph-model` graph and the
 * `@xyflow/react` view model. Framework-free on purpose: no React, no DOM,
 * no domain types — every function is a referentially-transparent transform,
 * generic over the caller's node/edge specialization.
 *
 * Domain knowledge (how to build an edge from a connection, an edge's stable
 * identity) is INJECTED, so this library never depends on `@nebutra/reel` or
 * any feature package. The graph is the source of truth; xyflow shapes are
 * derived; gestures are translated back into a *new* immutable graph with all
 * non-structural fields preserved.
 */

import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import { wouldCreateCycle } from "@nebutra/graph-model";

/** Stable, collision-free identity for an edge (injected per domain). */
export type EdgeIdentity<E extends GraphEdge> = (edge: E) => string;

/** Build a domain edge from an xyflow connection, or reject it (null). */
export type MakeEdge<E extends GraphEdge> = (
  from: string,
  to: string,
  targetHandle: string | null,
) => E | null;

/** xyflow node shape we consume/produce (structurally compatible). */
export interface FlowNode<N extends GraphNode> {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { node: N };
}

/** xyflow edge shape we consume/produce (structurally compatible). */
export interface FlowEdge<E extends GraphEdge> {
  id: string;
  source: string;
  target: string;
  targetHandle?: string | null;
  data: { edge: E };
}

/** xyflow's connection payload (source/target may be null mid-drag). */
export interface FlowConnection {
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export type AddEdgeResult<G> = { ok: true; graph: G } | { ok: false; reason: string };

/** Single custom xyflow node `type` key — one renderer for every node. */
export const GRAPH_NODE_FLOW_TYPE = "graph-node" as const;

/** Graph → xyflow view model. Pure; allocates fresh arrays. */
export function graphToFlow<N extends GraphNode, E extends GraphEdge>(
  graph: Graph<N, E>,
  edgeIdentity: EdgeIdentity<E>,
): { nodes: FlowNode<N>[]; edges: FlowEdge<E>[] } {
  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    type: GRAPH_NODE_FLOW_TYPE,
    position: { x: n.x, y: n.y },
    data: { node: n },
  }));
  const edges = graph.edges.map((e) => ({
    id: edgeIdentity(e),
    source: e.from,
    target: e.to,
    data: { edge: e },
  }));
  return { nodes, edges };
}

/**
 * Apply xyflow node positions back onto the graph. Returns a *new* graph;
 * the input and its `nodes` array are never mutated. Non-structural fields
 * (anything besides `nodes`/`edges`) are preserved by spread.
 */
export function applyNodePositions<N extends GraphNode, E extends GraphEdge, G extends Graph<N, E>>(
  graph: G,
  flowNodes: readonly FlowNode<N>[],
): G {
  const posById = new Map(flowNodes.map((n) => [n.id, n.position] as const));
  const nodes = graph.nodes.map((n) => {
    const pos = posById.get(n.id);
    if (!pos || (pos.x === n.x && pos.y === n.y)) return n;
    return { ...n, x: pos.x, y: pos.y };
  });
  return { ...graph, nodes };
}

/**
 * Attempt to add a connection as a domain edge. Rejected (with a
 * human-readable hint) on missing endpoints, self-loop, duplicate, a domain
 * `makeEdge` veto, or when it would make the graph cyclic — enforced via the
 * neutral `@nebutra/graph-model` guard so the UI can never persist a non-DAG.
 */
export function tryAddEdge<N extends GraphNode, E extends GraphEdge, G extends Graph<N, E>>(
  graph: G,
  connection: FlowConnection,
  opts: { makeEdge: MakeEdge<E>; edgeIdentity: EdgeIdentity<E> },
): AddEdgeResult<G> {
  if (!connection.source || !connection.target) {
    return { ok: false, reason: "Connection needs both a source and a target node." };
  }
  if (connection.source === connection.target) {
    return { ok: false, reason: "A node cannot connect to itself." };
  }
  const candidate = opts.makeEdge(connection.source, connection.target, connection.targetHandle);
  if (!candidate) {
    return { ok: false, reason: "That connection is not allowed between these nodes." };
  }
  const candidateId = opts.edgeIdentity(candidate);
  if (graph.edges.some((e) => opts.edgeIdentity(e) === candidateId)) {
    return { ok: false, reason: "That connection already exists between these nodes." };
  }
  if (wouldCreateCycle(graph.edges, candidate.from, candidate.to)) {
    return {
      ok: false,
      reason: "That connection would create a cycle. The graph must stay acyclic (DAG).",
    };
  }
  return { ok: true, graph: { ...graph, edges: [...graph.edges, candidate] } };
}

/** Remove a node and every edge incident to it. Returns a new graph. */
export function removeNode<N extends GraphNode, E extends GraphEdge, G extends Graph<N, E>>(
  graph: G,
  nodeId: string,
): G {
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
  };
}

/** Remove one edge identified by its injected stable identity. */
export function removeFlowEdge<N extends GraphNode, E extends GraphEdge, G extends Graph<N, E>>(
  graph: G,
  flowEdgeId: string,
  edgeIdentity: EdgeIdentity<E>,
): G {
  return {
    ...graph,
    edges: graph.edges.filter((e) => edgeIdentity(e) !== flowEdgeId),
  };
}
