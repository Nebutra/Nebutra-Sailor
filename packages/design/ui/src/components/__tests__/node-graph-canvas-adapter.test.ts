import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import { describe, expect, it } from "vitest";
import {
  applyNodePositions,
  graphToFlow,
  removeFlowEdge,
  removeNode,
  tryAddEdge,
} from "../node-graph-canvas-adapter";

/** Tiny domain specialization to prove the adapter is fully generic. */
interface TNode extends GraphNode {
  readonly label: string;
}
interface TEdge extends GraphEdge {
  readonly port: string;
}
interface TGraph extends Graph<TNode, TEdge> {
  readonly id: string;
  readonly extra: string;
}

const edgeIdentity = (e: TEdge) => `${e.from}->${e.to}:${e.port}`;
const makeEdge = (from: string, to: string, h: string | null): TEdge | null => ({
  from,
  to,
  port: h ?? "in",
});

const base: TGraph = {
  id: "g",
  extra: "keep-me",
  nodes: [
    { id: "a", x: 0, y: 0, label: "A" },
    { id: "b", x: 10, y: 10, label: "B" },
  ],
  edges: [{ from: "a", to: "b", port: "in" }],
};

describe("graphToFlow", () => {
  it("maps nodes/edges and carries the domain node + edge through data", () => {
    const { nodes, edges } = graphToFlow(base, edgeIdentity);
    expect(nodes[0]).toMatchObject({ id: "a", position: { x: 0, y: 0 } });
    expect(nodes[0]?.data.node.label).toBe("A");
    expect(edges[0]).toMatchObject({ id: "a->b:in", source: "a", target: "b" });
    expect(edges[0]?.data.edge.port).toBe("in");
  });
});

describe("applyNodePositions", () => {
  it("returns a new graph, preserves non-structural fields, no mutation", () => {
    const moved = graphToFlow(base, edgeIdentity).nodes.map((n) =>
      n.id === "a" ? { ...n, position: { x: 99, y: 88 } } : n,
    );
    const next = applyNodePositions(base, moved);
    expect(next).not.toBe(base);
    expect(next.id).toBe("g");
    expect(next.extra).toBe("keep-me");
    expect(next.nodes.find((n) => n.id === "a")).toMatchObject({ x: 99, y: 88, label: "A" });
    expect(base.nodes.find((n) => n.id === "a")).toMatchObject({ x: 0, y: 0 });
  });
});

describe("tryAddEdge", () => {
  it("rejects missing endpoints / self-loop / duplicate", () => {
    expect(
      tryAddEdge(
        base,
        { source: null, target: "b", sourceHandle: null, targetHandle: null },
        {
          makeEdge,
          edgeIdentity,
        },
      ).ok,
    ).toBe(false);
    expect(
      tryAddEdge(
        base,
        { source: "a", target: "a", sourceHandle: null, targetHandle: null },
        {
          makeEdge,
          edgeIdentity,
        },
      ).ok,
    ).toBe(false);
    expect(
      tryAddEdge(
        base,
        { source: "a", target: "b", sourceHandle: null, targetHandle: "in" },
        { makeEdge, edgeIdentity },
      ).ok,
    ).toBe(false);
  });

  it("honours a makeEdge veto", () => {
    const r = tryAddEdge(
      base,
      { source: "b", target: "a", sourceHandle: null, targetHandle: null },
      { makeEdge: () => null, edgeIdentity },
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a cycle-creating edge but accepts an acyclic one", () => {
    const cyclic = tryAddEdge(
      base,
      { source: "b", target: "a", sourceHandle: null, targetHandle: null },
      { makeEdge, edgeIdentity },
    );
    expect(cyclic.ok).toBe(false);

    const withC: TGraph = {
      ...base,
      nodes: [...base.nodes, { id: "c", x: 0, y: 0, label: "C" }],
    };
    const acyclic = tryAddEdge(
      withC,
      { source: "b", target: "c", sourceHandle: null, targetHandle: null },
      { makeEdge, edgeIdentity },
    );
    expect(acyclic.ok).toBe(true);
    if (acyclic.ok) expect(acyclic.graph.edges).toHaveLength(2);
  });
});

describe("removeNode / removeFlowEdge", () => {
  it("removeNode drops the node and incident edges, preserves fields", () => {
    const next = removeNode(base, "a");
    expect(next.nodes.map((n) => n.id)).toEqual(["b"]);
    expect(next.edges).toHaveLength(0);
    expect(next.extra).toBe("keep-me");
  });
  it("removeFlowEdge drops the matching edge by identity", () => {
    const next = removeFlowEdge(base, "a->b:in", edgeIdentity);
    expect(next.edges).toHaveLength(0);
  });
});
