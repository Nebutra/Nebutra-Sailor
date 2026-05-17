/**
 * Pure mapping layer between the typed `@nebutra/reel` graph model and the
 * `@xyflow/react` view model. Framework-free on purpose: no React, no DOM —
 * every function is a referentially-transparent transform so the rules
 * (immutability, acyclic-only edges) are unit-testable in isolation.
 *
 * The reel model is the source of truth. xyflow shapes are derived; user
 * gestures are translated back into a *new* immutable `ReelGraph`.
 */

import type { ReelEdge, ReelGraph, ReelNode, ReelNodeType } from "@nebutra/reel";
import { hasCycleFrom } from "@nebutra/reel";

/** Data carried on each xyflow node — mirrors the reel node, never the truth. */
export interface FlowNodeData extends Record<string, unknown> {
  readonly reelType: ReelNodeType;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly hasOutput: boolean;
}

/** Data carried on each xyflow edge. `inputType` is the load-bearing field. */
export interface FlowEdgeData extends Record<string, unknown> {
  readonly inputType: string;
}

/** Minimal xyflow node shape we consume/produce (structurally compatible). */
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FlowNodeData;
}

/** Minimal xyflow edge shape we consume/produce (structurally compatible). */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: FlowEdgeData;
}

/** xyflow's connection payload (source/target may be null mid-drag). */
export interface FlowConnection {
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export type AddEdgeResult = { ok: true; graph: ReelGraph } | { ok: false; reason: string };

/** xyflow node `type` key — single custom renderer for every reel node type. */
export const REEL_NODE_FLOW_TYPE = "reel" as const;

/** Default input port name when a connection has no explicit target handle. */
export const DEFAULT_INPUT_TYPE = "input" as const;

/**
 * Deterministic, collision-stable edge id. Same triple → same id, so xyflow
 * reconciliation and reel persistence agree without a separate id store.
 */
export function edgeId(from: string, to: string, inputType: string): string {
  return `e:${from}->${to}:${inputType}`;
}

/** ReelGraph → xyflow view model. Pure; allocates fresh arrays. */
export function reelToFlow(graph: ReelGraph): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  const nodes: FlowNode[] = graph.nodes.map((n: ReelNode) => ({
    id: n.id,
    type: REEL_NODE_FLOW_TYPE,
    position: { x: n.x, y: n.y },
    data: {
      reelType: n.type,
      settings: n.settings,
      hasOutput: n.output !== undefined,
    },
  }));

  const edges: FlowEdge[] = graph.edges.map((e: ReelEdge) => ({
    id: edgeId(e.from, e.to, e.inputType),
    source: e.from,
    target: e.to,
    targetHandle: e.inputType,
    data: { inputType: e.inputType },
  }));

  return { nodes, edges };
}

/** A single xyflow edge → reel edge. Pure inverse of the edge half above. */
export function flowEdgeToReel(edge: FlowEdge): ReelEdge {
  return {
    from: edge.source,
    to: edge.target,
    inputType: edge.data?.inputType ?? edge.targetHandle ?? DEFAULT_INPUT_TYPE,
  };
}

/**
 * Apply xyflow node positions back onto the reel graph. Returns a *new*
 * graph; the input and its `nodes` array are never mutated. Nodes absent
 * from `flowNodes` keep their previous coordinates.
 */
export function applyNodePositions(graph: ReelGraph, flowNodes: readonly FlowNode[]): ReelGraph {
  const posById = new Map<string, { x: number; y: number }>(
    flowNodes.map((n) => [n.id, n.position]),
  );

  const nextNodes: ReelNode[] = graph.nodes.map((n) => {
    const pos = posById.get(n.id);
    if (!pos || (pos.x === n.x && pos.y === n.y)) return n;
    return { ...n, x: pos.x, y: pos.y };
  });

  return { ...graph, nodes: nextNodes, updatedAt: new Date() };
}

function connectionToReelEdge(c: FlowConnection): ReelEdge | null {
  if (!c.source || !c.target) return null;
  return {
    from: c.source,
    to: c.target,
    inputType: c.targetHandle ?? DEFAULT_INPUT_TYPE,
  };
}

/**
 * Attempt to add the connection as a reel edge. Rejected (with a
 * human-readable hint) when source/target are missing, on a self-loop, on a
 * duplicate, or when the edge would make the graph cyclic — enforced via
 * reel's own `hasCycleFrom` so the UI can never persist an invalid DAG.
 */
export function tryAddEdge(graph: ReelGraph, connection: FlowConnection): AddEdgeResult {
  const candidate = connectionToReelEdge(connection);
  if (!candidate) {
    return {
      ok: false,
      reason: "Connection needs both a source and a target node.",
    };
  }

  if (candidate.from === candidate.to) {
    return { ok: false, reason: "A node cannot connect to itself." };
  }

  const isDuplicate = graph.edges.some(
    (e) =>
      e.from === candidate.from && e.to === candidate.to && e.inputType === candidate.inputType,
  );
  if (isDuplicate) {
    return {
      ok: false,
      reason: "That connection already exists between these nodes.",
    };
  }

  const probe: ReelGraph = { ...graph, edges: [...graph.edges, candidate] };
  if (hasCycleFrom(probe, candidate.from)) {
    return {
      ok: false,
      reason: "That connection would create a cycle. A reel graph must stay acyclic (DAG).",
    };
  }

  return { ok: true, graph: probe };
}

/** Remove a node and every edge incident to it. Returns a new graph. */
export function removeNode(graph: ReelGraph, nodeId: string): ReelGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    updatedAt: new Date(),
  };
}

/** Remove one edge identified by its deterministic xyflow edge id. */
export function removeFlowEdge(graph: ReelGraph, flowEdgeId: string): ReelGraph {
  return {
    ...graph,
    edges: graph.edges.filter((e) => edgeId(e.from, e.to, e.inputType) !== flowEdgeId),
    updatedAt: new Date(),
  };
}
