/**
 * Pull-based input resolution.
 *
 * The source had no topological scheduler — execution is user-triggered per
 * node, and a node's inputs are pulled on demand by walking inbound edges and
 * reading each upstream node's last output envelope. We keep that model (it is
 * the correct one for an interactive studio) but make resolution a pure
 * function over a typed graph instead of a mutable React cache.
 */

import { mergeEnvelopes } from "./envelope";
import type { NodeIOEnvelope, ReelEdge, ReelGraph, ReelNode } from "./types";

/** Edges whose target is `nodeId`. */
export function inboundEdges(graph: ReelGraph, nodeId: string): readonly ReelEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}

/** Detect a cycle reachable from `nodeId` (depth-first, edge-following). */
export function hasCycleFrom(graph: ReelGraph, nodeId: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = adjacency.get(e.from) ?? [];
    list.push(e.to);
    adjacency.set(e.from, list);
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (walk(next)) return true;
    }
    visiting.delete(id);
    done.add(id);
    return false;
  };
  return walk(nodeId);
}

/**
 * Resolve the inputs of `targetNodeId`: for each input port, the merged
 * envelope of every upstream node's output feeding that port. Upstream nodes
 * with no output yet are skipped. Returns a `Map<inputType, NodeIOEnvelope>`.
 */
export function resolveNodeInputs(
  graph: ReelGraph,
  targetNodeId: string,
): Map<string, NodeIOEnvelope> {
  const byId = new Map<string, ReelNode>(graph.nodes.map((n) => [n.id, n]));
  const grouped = new Map<string, NodeIOEnvelope[]>();

  for (const edge of inboundEdges(graph, targetNodeId)) {
    const source = byId.get(edge.from);
    const envelope = source?.output;
    if (!envelope) continue;
    const list = grouped.get(edge.inputType) ?? [];
    // Stamp the routing target so downstream consumers can trust meta.
    list.push({
      ...envelope,
      meta: { ...envelope.meta, targetNodeId, inputType: edge.inputType },
    });
    grouped.set(edge.inputType, list);
  }

  const resolved = new Map<string, NodeIOEnvelope>();
  for (const [inputType, envelopes] of grouped) {
    const merged = mergeEnvelopes(envelopes);
    if (merged) resolved.set(inputType, merged);
  }
  return resolved;
}
