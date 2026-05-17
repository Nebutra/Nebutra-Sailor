import { describe, expect, it } from "vitest";
import type { ReelEdge, ReelGraph } from "../../types";
import { DEFAULT_INPUT_TYPE, reelEdgeIdentity, reelMakeEdge, withReelTimestamp } from "../binding";

describe("reelEdgeIdentity", () => {
  it("is deterministic and triple-stable", () => {
    const e: ReelEdge = { from: "a", to: "b", inputType: "ctx" };
    expect(reelEdgeIdentity(e)).toBe("e:a->b:ctx");
    expect(reelEdgeIdentity({ ...e })).toBe(reelEdgeIdentity(e));
  });
  it("distinguishes edges that differ only by input port", () => {
    expect(reelEdgeIdentity({ from: "a", to: "b", inputType: "x" })).not.toBe(
      reelEdgeIdentity({ from: "a", to: "b", inputType: "y" }),
    );
  });
});

describe("reelMakeEdge", () => {
  it("uses the target handle as the input port", () => {
    expect(reelMakeEdge("a", "b", "prompt")).toEqual({
      from: "a",
      to: "b",
      inputType: "prompt",
    });
  });
  it("falls back to the default input port when no handle", () => {
    expect(reelMakeEdge("a", "b", null).inputType).toBe(DEFAULT_INPUT_TYPE);
  });
});

describe("withReelTimestamp", () => {
  it("returns a new graph with a bumped updatedAt, preserving all else", () => {
    const old = new Date("2020-01-01T00:00:00.000Z");
    const graph: ReelGraph = {
      id: "g",
      tenantId: "org_1",
      name: "G",
      nodes: [{ id: "a", type: "text", x: 0, y: 0, settings: {} }],
      edges: [],
      updatedAt: old,
    };
    const next = withReelTimestamp(graph);
    expect(next).not.toBe(graph);
    expect(next.id).toBe("g");
    expect(next.tenantId).toBe("org_1");
    expect(next.nodes).toBe(graph.nodes);
    expect(next.updatedAt.getTime()).toBeGreaterThanOrEqual(old.getTime());
  });
});
