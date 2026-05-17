/**
 * Core: envelope contract (exact v1.0 rules), pull-based input resolution,
 * cycle detection, tenant-isolated persistence, persist-then-return mutation.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildEnvelope,
  hasCycleFrom,
  isEnvelopeValid,
  mergeEnvelopes,
  resolveNodeInputs,
} from "../index";
import { applyNodeOutput } from "../service";
import { InMemoryReelGraphStore } from "../store/memory";
import { NODE_IO_ENVELOPE_VERSION, type ReelGraph, type ReelNode } from "../types";

describe("NODE_IO_ENVELOPE v1.0", () => {
  it("builds a kind-discriminated, valid envelope", () => {
    const e = buildEnvelope({
      sourceNodeId: "n1",
      sourceNodeType: "gen-image",
      inputType: "default",
      media: [{ type: "image", url: "data:image/png;base64,AA" }],
      text: ["a caption"],
    });
    expect(e.version).toBe(NODE_IO_ENVELOPE_VERSION);
    expect(e.kind).toBe("mixed");
    expect(isEnvelopeValid(e)).toBe(true);
  });

  it("enforces exact validity rules", () => {
    expect(isEnvelopeValid({ version: "1.0", text: [], media: [], meta: {} })).toBe(true);
    expect(isEnvelopeValid({ version: "2.0", text: [], media: [], meta: {} })).toBe(false);
    expect(isEnvelopeValid({ version: "1.0", text: [1], media: [], meta: {} })).toBe(false);
    expect(
      isEnvelopeValid({ version: "1.0", text: [], media: [{ type: "image" }], meta: {} }),
    ).toBe(false);
    expect(isEnvelopeValid({ version: "1.0", text: [], media: [], meta: null })).toBe(false);
  });

  it("sniffs media kind from url when type is absent", () => {
    const e = buildEnvelope({
      sourceNodeId: "n",
      sourceNodeType: "gen-video",
      inputType: "default",
      media: [{ url: "https://x.test/clip.mp4" }],
    });
    expect(e.media[0]?.type).toBe("video");
    expect(e.kind).toBe("media");
  });

  it("merges envelopes feeding one port in producer order", () => {
    const a = buildEnvelope({
      sourceNodeId: "a",
      sourceNodeType: "text",
      inputType: "p",
      text: ["A"],
    });
    const b = buildEnvelope({
      sourceNodeId: "b",
      sourceNodeType: "text",
      inputType: "p",
      text: ["B"],
    });
    const merged = mergeEnvelopes([a, b]);
    expect(merged?.text).toEqual(["A", "B"]);
    expect(merged?.meta.sourceNodeId).toBe("a");
  });
});

function graph(nodes: ReelNode[], edges: ReelGraph["edges"]): ReelGraph {
  return { id: "g", tenantId: "org", name: "g", nodes, edges, updatedAt: new Date() };
}

describe("graph resolution", () => {
  it("pulls upstream outputs grouped by input port", () => {
    const up: ReelNode = {
      id: "u",
      type: "gen-image",
      x: 0,
      y: 0,
      settings: {},
      output: buildEnvelope({
        sourceNodeId: "u",
        sourceNodeType: "gen-image",
        inputType: "default",
        media: [{ type: "image", url: "data:,x" }],
      }),
    };
    const down: ReelNode = { id: "d", type: "analyze", x: 1, y: 1, settings: {} };
    const g = graph([up, down], [{ from: "u", to: "d", inputType: "ref" }]);

    const inputs = resolveNodeInputs(g, "d");
    expect(inputs.get("ref")?.media[0]?.url).toBe("data:,x");
    expect(inputs.get("ref")?.meta.targetNodeId).toBe("d");
    expect(inputs.get("ref")?.meta.inputType).toBe("ref");
  });

  it("skips upstream nodes that have not produced output", () => {
    const up: ReelNode = { id: "u", type: "text", x: 0, y: 0, settings: {} };
    const down: ReelNode = { id: "d", type: "analyze", x: 1, y: 1, settings: {} };
    const g = graph([up, down], [{ from: "u", to: "d", inputType: "in" }]);
    expect(resolveNodeInputs(g, "d").size).toBe(0);
  });

  it("detects cycles", () => {
    const g = graph(
      [
        { id: "a", type: "text", x: 0, y: 0, settings: {} },
        { id: "b", type: "text", x: 0, y: 0, settings: {} },
      ],
      [
        { from: "a", to: "b", inputType: "i" },
        { from: "b", to: "a", inputType: "i" },
      ],
    );
    expect(hasCycleFrom(g, "a")).toBe(true);
  });
});

describe("applyNodeOutput", () => {
  let store: InMemoryReelGraphStore;
  beforeEach(() => {
    store = new InMemoryReelGraphStore();
  });

  it("persists the node output before returning, tenant-scoped", async () => {
    await store.create("org_1", "g1", "g1");
    await store.save("org_1", "g1", [{ id: "n1", type: "text", x: 0, y: 0, settings: {} }], []);
    const env = buildEnvelope({
      sourceNodeId: "n1",
      sourceNodeType: "text",
      inputType: "default",
      text: ["hello"],
    });

    const { node } = await applyNodeOutput(store, "org_1", "g1", "n1", env);
    expect(node.output?.text).toEqual(["hello"]);

    const reloaded = await store.get("org_1", "g1");
    expect(reloaded?.nodes[0]?.output?.text).toEqual(["hello"]);
    // Tenant isolation: other tenant cannot see this graph.
    expect(await store.get("org_2", "g1")).toBeNull();
  });

  it("rejects output for an unknown node", async () => {
    await store.create("org_1", "g1", "g1");
    const env = buildEnvelope({
      sourceNodeId: "x",
      sourceNodeType: "text",
      inputType: "default",
    });
    await expect(applyNodeOutput(store, "org_1", "g1", "ghost", env)).rejects.toThrow("not found");
  });
});
