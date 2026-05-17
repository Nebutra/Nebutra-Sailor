import type { ReelGraph } from "@nebutra/reel";
import { describe, expect, it } from "vitest";
import {
  applyNodePositions,
  edgeId,
  flowEdgeToReel,
  reelToFlow,
  removeFlowEdge,
  removeNode,
  tryAddEdge,
} from "../node-graph-canvas-adapter";

/**
 * Pure-adapter contract tests. The adapter is the only place reel<->xyflow
 * mapping lives; it must be framework-free and never mutate the input graph.
 */

function sampleGraph(): ReelGraph {
  return {
    id: "g1",
    tenantId: "org_1",
    name: "Sample",
    nodes: [
      { id: "a", type: "text", x: 10, y: 20, settings: { prompt: "hi" } },
      { id: "b", type: "gen-image", x: 300, y: 40, settings: { model: "x" } },
      { id: "c", type: "analyze", x: 600, y: 60, settings: {} },
    ],
    edges: [
      { from: "a", to: "b", inputType: "prompt" },
      { from: "b", to: "c", inputType: "image" },
    ],
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("reelToFlow — mapping fidelity", () => {
  it("preserves id/type/x/y/settings on every node", () => {
    const { nodes } = reelToFlow(sampleGraph());
    expect(nodes).toHaveLength(3);
    const a = nodes.find((n) => n.id === "a");
    expect(a).toBeDefined();
    expect(a?.position).toEqual({ x: 10, y: 20 });
    expect(a?.data.reelType).toBe("text");
    expect(a?.data.settings).toEqual({ prompt: "hi" });
  });

  it("preserves inputType on every edge (data + targetHandle)", () => {
    const { edges } = reelToFlow(sampleGraph());
    expect(edges).toHaveLength(2);
    const e = edges.find((x) => x.source === "a" && x.target === "b");
    expect(e?.data?.inputType).toBe("prompt");
    expect(e?.targetHandle).toBe("prompt");
    expect(e?.id).toBe(edgeId("a", "b", "prompt"));
  });

  it("roundtrips a flow edge back to a reel edge preserving inputType", () => {
    const { edges } = reelToFlow(sampleGraph());
    const back = flowEdgeToReel(edges[0]);
    expect(back).toEqual({ from: "a", to: "b", inputType: "prompt" });
  });
});

describe("applyNodePositions — immutable position sync", () => {
  it("produces a new graph with updated x/y and does not mutate the original", () => {
    const original = sampleGraph();
    const snapshot = JSON.parse(JSON.stringify(original));
    const { nodes } = reelToFlow(original);
    const moved = nodes.map((n) => (n.id === "a" ? { ...n, position: { x: 999, y: 888 } } : n));

    const next = applyNodePositions(original, moved);

    expect(next).not.toBe(original);
    expect(next.nodes).not.toBe(original.nodes);
    const a = next.nodes.find((n) => n.id === "a");
    expect(a?.x).toBe(999);
    expect(a?.y).toBe(888);
    // settings/type untouched
    expect(a?.settings).toEqual({ prompt: "hi" });
    // original unmutated
    expect(JSON.parse(JSON.stringify(original))).toEqual(snapshot);
    expect(original.nodes[0].x).toBe(10);
  });

  it("bumps updatedAt to a fresh Date", () => {
    const original = sampleGraph();
    const { nodes } = reelToFlow(original);
    const next = applyNodePositions(original, nodes);
    expect(next.updatedAt).toBeInstanceOf(Date);
    expect(next.updatedAt).not.toBe(original.updatedAt);
  });
});

describe("tryAddEdge — acyclic guard", () => {
  it("accepts an acyclic edge and returns a new immutable graph", () => {
    const original = sampleGraph();
    // a -> c is acyclic given a->b->c
    const result = tryAddEdge(original, {
      source: "a",
      target: "c",
      sourceHandle: null,
      targetHandle: "context",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.graph).not.toBe(original);
      expect(result.graph.edges).toHaveLength(3);
      expect(result.graph.edges).toContainEqual({
        from: "a",
        to: "c",
        inputType: "context",
      });
      // original unmutated
      expect(original.edges).toHaveLength(2);
    }
  });

  it("rejects an edge that would introduce a cycle, with a human hint", () => {
    const original = sampleGraph();
    // c -> a closes the a->b->c->a loop
    const result = tryAddEdge(original, {
      source: "c",
      target: "a",
      sourceHandle: null,
      targetHandle: "prompt",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/cycle/i);
      expect(result.reason.length).toBeGreaterThan(10);
    }
    // graph unchanged
    expect(original.edges).toHaveLength(2);
  });

  it("rejects a self-loop", () => {
    const result = tryAddEdge(sampleGraph(), {
      source: "a",
      target: "a",
      sourceHandle: null,
      targetHandle: "prompt",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a connection with no source or target", () => {
    const result = tryAddEdge(sampleGraph(), {
      source: null,
      target: "b",
      sourceHandle: null,
      targetHandle: null,
    } as never);
    expect(result.ok).toBe(false);
  });

  it("is idempotent — adding an existing edge is rejected as duplicate", () => {
    const result = tryAddEdge(sampleGraph(), {
      source: "a",
      target: "b",
      sourceHandle: null,
      targetHandle: "prompt",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/exist/i);
  });
});

describe("removeNode / removeFlowEdge — immutable delete", () => {
  it("removes a node and its incident edges immutably", () => {
    const original = sampleGraph();
    const next = removeNode(original, "b");
    expect(next).not.toBe(original);
    expect(next.nodes.map((n) => n.id)).toEqual(["a", "c"]);
    // both edges touching b are gone
    expect(next.edges).toHaveLength(0);
    expect(original.nodes).toHaveLength(3);
  });

  it("removes a single edge by xyflow edge id immutably", () => {
    const original = sampleGraph();
    const id = edgeId("a", "b", "prompt");
    const next = removeFlowEdge(original, id);
    expect(next).not.toBe(original);
    expect(next.edges).toHaveLength(1);
    expect(next.edges[0]).toEqual({ from: "b", to: "c", inputType: "image" });
    expect(original.edges).toHaveLength(2);
  });
});
