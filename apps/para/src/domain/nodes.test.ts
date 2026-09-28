import { describe, expect, it } from "vitest";
import { nodeTitle, resolveReferences, sizeForAspect, wouldCycle } from "./nodes";
import type { WorkspaceDocument, WorkspaceNode } from "./types";

const node = (id: string, type: WorkspaceNode["type"], extra: Partial<WorkspaceNode> = {}) =>
  ({
    id,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    status: "completed",
    createdBy: "user",
    ...(type === "text" ? { text: "" } : {}),
    ...extra,
  }) as WorkspaceNode;

const doc = (nodes: WorkspaceNode[], edges: Array<[string, string]>): WorkspaceDocument => ({
  version: 2,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  edges: Object.fromEntries(
    edges.map(([s, t], i) => [`e${i}`, { id: `e${i}`, source: s, target: t, kind: "reference" }]),
  ),
});

const urls: Record<string, string> = { a1: "https://cdn/a1.png", a2: "https://cdn/a2.png" };
const urlOf = (id: string) => urls[id];

describe("references built from upstream nodes", () => {
  it("sends an upstream image's output URL as a node reference", () => {
    const d = doc(
      [node("img", "image", { assetId: "a1" }), node("vid", "video")],
      [["img", "vid"]],
    );
    expect(resolveReferences(d, "vid", urlOf)).toEqual([
      { kind: "node", id: "img", url: "https://cdn/a1.png" },
    ]);
  });

  it("skips upstream nodes that have no output yet, and text nodes", () => {
    const d = doc(
      [
        node("empty", "image"),
        node("txt", "text"),
        node("img", "image", { assetId: "a2" }),
        node("vid", "video"),
      ],
      [
        ["empty", "vid"],
        ["txt", "vid"],
        ["img", "vid"],
      ],
    );
    expect(resolveReferences(d, "vid", urlOf)).toEqual([
      { kind: "node", id: "img", url: "https://cdn/a2.png" },
    ]);
  });

  it("keeps asset and subject references and replaces stale node ones", () => {
    const d = doc(
      [
        node("img", "image", { assetId: "a1" }),
        node("vid", "video", {
          generator: {
            mode: "video",
            references: [
              { kind: "node", id: "gone" },
              { kind: "subject", id: "s1" },
            ],
          },
        }),
      ],
      [["img", "vid"]],
    );
    expect(resolveReferences(d, "vid", urlOf)).toEqual([
      { kind: "node", id: "img", url: "https://cdn/a1.png" },
      { kind: "subject", id: "s1" },
    ]);
  });

  it("returns nothing for a node with no inputs", () => {
    expect(resolveReferences(doc([node("vid", "video")], []), "vid", urlOf)).toEqual([]);
  });
});

describe("wiring rules", () => {
  it("detects self-loops and cycles", () => {
    const d = doc(
      [node("a", "image"), node("b", "video"), node("c", "video")],
      [
        ["a", "b"],
        ["b", "c"],
      ],
    );
    expect(wouldCycle(d, "a", "a")).toBe(true);
    expect(wouldCycle(d, "c", "a")).toBe(true);
    expect(wouldCycle(d, "a", "c")).toBe(false);
  });
});

describe("node vocabulary", () => {
  it("names a node by its title, else its type in Chinese", () => {
    expect(nodeTitle({ type: "image", title: "首帧" })).toBe("首帧");
    expect(nodeTitle({ type: "video" })).toBe("视频");
    expect(nodeTitle({ type: "text", title: "  " })).toBe("文本");
  });

  it("sizes media frames by aspect, long edge fixed", () => {
    expect(sizeForAspect("video", "16:9")).toEqual({ width: 480, height: 270 });
    expect(sizeForAspect("image", "3:4")).toEqual({ width: 270, height: 360 });
    expect(sizeForAspect("image", "bogus")).toEqual({ width: 360, height: 270 });
  });
});
