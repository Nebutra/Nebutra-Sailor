/**
 * Graph mutation service — reuses atelier-canvas's consistency primitives.
 *
 * Rather than re-implement a per-resource mutex and the persist-then-broadcast
 * ordering, we reuse `withCanvasLock` from `@nebutra/atelier-canvas`: it is a
 * generic per-`(tenant, resource-id)` serializer, and the invariant is the
 * same — persist the new graph state BEFORE returning so any realtime
 * broadcast the caller does is a pure optimization (a client that misses it
 * recovers identical state on reload).
 */

import { withCanvasLock } from "@nebutra/atelier-canvas";
import { logger } from "@nebutra/logger";
import type { NodeIOEnvelope, ReelGraph, ReelGraphStore, ReelNode } from "./types";

const log = logger.child({ module: "reel/service" });

/**
 * Record a node's produced output envelope and persist the graph. Serialized
 * per `(tenant, graph)`; creates the graph on first write. Returns the updated
 * node so the caller can broadcast it AFTER this resolves.
 */
export async function applyNodeOutput(
  store: ReelGraphStore,
  tenantId: string,
  graphId: string,
  nodeId: string,
  output: NodeIOEnvelope,
): Promise<{ node: ReelNode; graph: ReelGraph }> {
  return withCanvasLock(tenantId, graphId, async () => {
    const current =
      (await store.get(tenantId, graphId)) ?? (await store.create(tenantId, graphId, graphId));

    const target = current.nodes.find((n) => n.id === nodeId);
    if (!target) {
      throw new Error(`reel: node "${nodeId}" not found in graph "${graphId}"`);
    }

    const updatedNode: ReelNode = { ...target, output };
    const nextNodes = current.nodes.map((n) => (n.id === nodeId ? updatedNode : n));

    // Persist BEFORE returning — broadcast happens in the caller, after.
    const graph = await store.save(tenantId, graphId, nextNodes, current.edges);

    log.debug("applied node output", {
      tenantId,
      graphId,
      nodeId,
      kind: output.kind,
    });
    return { node: updatedNode, graph };
  });
}
