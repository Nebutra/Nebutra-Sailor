/**
 * @nebutra/graph-model — neutral structural DAG contract.
 *
 * The minimal shape every node-graph feature shares: positioned nodes, plain
 * directed edges, and the two pure traversals (`inboundEdges`, `hasCycleFrom`)
 * plus the `wouldCreateCycle` guard used by interactive editors. Domain
 * packages (`@nebutra/reel`) specialize these types; the generic
 * `@nebutra/ui` node-graph editor depends on this contract — neither depends
 * on the other.
 */

/** A positioned graph node. Domain nodes extend this. */
export interface GraphNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** A directed edge. Domain edges extend this (e.g. add an input-port tag). */
export interface GraphEdge {
  readonly from: string;
  readonly to: string;
}

/** A structural graph; `N`/`E` carry the domain specialization. */
export interface Graph<N extends GraphNode = GraphNode, E extends GraphEdge = GraphEdge> {
  readonly nodes: readonly N[];
  readonly edges: readonly E[];
}

/** Edges whose target is `nodeId`. Preserves the concrete edge subtype. */
export function inboundEdges<E extends GraphEdge>(
  edges: readonly E[],
  nodeId: string,
): readonly E[] {
  return edges.filter((e) => e.to === nodeId);
}

/** Detect a cycle reachable from `nodeId` (depth-first, edge-following). */
export function hasCycleFrom(edges: readonly GraphEdge[], nodeId: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
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
 * Would adding `from → to` make the graph cyclic? Pure: never mutates the
 * passed `edges`. The canonical guard for interactive edge creation.
 */
export function wouldCreateCycle(edges: readonly GraphEdge[], from: string, to: string): boolean {
  return hasCycleFrom([...edges, { from, to }], from);
}
