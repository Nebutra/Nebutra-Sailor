import { describe, expect, it } from "vitest";
import { hasCycleFrom, inboundEdges, wouldCreateCycle } from "../index";

const edges = [
  { from: "a", to: "b" },
  { from: "b", to: "c" },
  { from: "a", to: "c" },
];

describe("inboundEdges", () => {
  it("returns only edges whose target is the node", () => {
    expect(inboundEdges(edges, "c")).toEqual([
      { from: "b", to: "c" },
      { from: "a", to: "c" },
    ]);
  });
  it("returns empty for a source-only node", () => {
    expect(inboundEdges(edges, "a")).toEqual([]);
  });
  it("preserves the concrete edge subtype", () => {
    const typed = [{ from: "a", to: "b", inputType: "ctx" }];
    expect(inboundEdges(typed, "b")[0]?.inputType).toBe("ctx");
  });
});

describe("hasCycleFrom", () => {
  it("is false for an acyclic graph", () => {
    expect(hasCycleFrom(edges, "a")).toBe(false);
  });
  it("detects a direct cycle", () => {
    expect(
      hasCycleFrom(
        [
          { from: "a", to: "b" },
          { from: "b", to: "a" },
        ],
        "a",
      ),
    ).toBe(true);
  });
  it("detects an indirect cycle", () => {
    expect(
      hasCycleFrom(
        [
          { from: "a", to: "b" },
          { from: "b", to: "c" },
          { from: "c", to: "a" },
        ],
        "a",
      ),
    ).toBe(true);
  });
  it("is false starting from a node not on the cycle", () => {
    expect(
      hasCycleFrom(
        [
          { from: "b", to: "c" },
          { from: "c", to: "b" },
        ],
        "a",
      ),
    ).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  it("rejects an edge that closes a loop", () => {
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });
  it("accepts an edge that keeps the graph acyclic", () => {
    expect(wouldCreateCycle(edges, "c", "d")).toBe(false);
  });
  it("does not mutate the input edges array", () => {
    const input = [{ from: "a", to: "b" }];
    wouldCreateCycle(input, "b", "a");
    expect(input).toEqual([{ from: "a", to: "b" }]);
  });
});
