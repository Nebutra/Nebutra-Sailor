import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./editor-store";

const doc = () => ({
  version: 2,
  viewport: { x: 0, y: 0, zoom: 1 },
  edges: {},
  nodes: {
    a: {
      id: "a",
      type: "image" as const,
      assetId: "a001",
      status: "completed" as const,
      createdBy: "import" as const,
      x: 10,
      y: 10,
      width: 100,
      height: 40,
    },
  },
});

const state = () => useEditorStore.getState();

describe("editor-store", () => {
  beforeEach(() => state().load("d", doc()));

  it("zoomAt keeps the cursor point fixed", () => {
    state().zoomAt(2, 100, 100);
    const vp = state().document?.viewport;
    expect(vp).toEqual({ zoom: 2, x: -100, y: -100 });
  });

  it("derive creates a queued child with a derived edge and never touches the source", () => {
    const id = state().derive({
      sourceId: "a",
      mode: "image",
      prompt: "colder",
      createdBy: "user",
    });
    const d = state().document;
    const child = d?.nodes[id as string];
    expect(child?.status).toBe("queued");
    expect(child?.sourceNodeIds).toEqual(["a"]);
    expect(child?.x).toBe(10 + 100 + 48);
    expect(Object.values(d?.edges ?? {})).toEqual([
      expect.objectContaining({ source: "a", target: id, kind: "derived" }),
    ]);
    expect(d?.nodes.a).toEqual(doc().nodes.a);
  });

  it("completeNode records the output and failNode keeps a terminal payload", () => {
    const id = state().derive({ mode: "image", createdBy: "agent" }) as string;
    state().completeNode(id, "a005", "j1");
    const n = state().document?.nodes[id];
    expect(n?.status).toBe("completed");
    expect(n?.type === "image" && n.outputs?.[0]?.assetId).toBe("a005");
    state().failNode(id, { type: "cancelled", message: "Stopped" });
    expect(state().document?.nodes[id]?.error?.type).toBe("cancelled");
  });

  it("deleteNodes drops the node, its edges and its selection", () => {
    const id = state().derive({ sourceId: "a", mode: "image", createdBy: "user" }) as string;
    state().select(["a"]);
    state().deleteNodes(["a"]);
    expect(state().document?.nodes.a).toBeUndefined();
    expect(state().document?.nodes[id]).toBeDefined();
    expect(Object.keys(state().document?.edges ?? {})).toHaveLength(0);
    expect(state().selection).toEqual([]);
  });
});
