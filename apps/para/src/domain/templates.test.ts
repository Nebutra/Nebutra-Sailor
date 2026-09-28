import { describe, expect, it } from "vitest";
import {
  availableTemplates,
  buildTemplate,
  parseTemplate,
  TEMPLATE_IDS,
  templateHref,
} from "./templates";

const ids = () => {
  let n = 0;
  return (prefix = "n") => `${prefix}${n++}`;
};

describe("template param", () => {
  it("accepts exactly the four template ids", () => {
    for (const id of TEMPLATE_IDS) expect(parseTemplate(id)).toBe(id);
    expect(parseTemplate("frame-to-video ")).toBeNull();
    expect(parseTemplate("image")).toBeNull();
    expect(parseTemplate(null)).toBeNull();
    expect(parseTemplate(undefined)).toBeNull();
  });

  it("links a workspace with the template in the query", () => {
    expect(templateHref("p1", "w1", "character-sheet")).toBe("/p/p1/w/w1?template=character-sheet");
  });

  it("offers only templates whose every node the origin can run", () => {
    expect(availableTemplates(["image", "text"]).map((t) => t.id)).toEqual([
      "story-script",
      "character-sheet",
    ]);
    expect(availableTemplates(["image", "video", "text", "audio"])).toHaveLength(4);
  });
});

describe("template graphs", () => {
  it("story-script is one text node with a script prompt", () => {
    const g = buildTemplate("story-script", ids());
    expect(g.nodes).toHaveLength(1);
    expect(g.edges).toHaveLength(0);
    const [n] = g.nodes;
    expect(n?.type).toBe("text");
    expect(n?.generator?.mode).toBe("text");
    expect(n?.generator?.prompt).toContain("脚本");
    expect(g.focusId).toBe(n?.id);
  });

  it("character-sheet is three image nodes in a row sharing one character", () => {
    const g = buildTemplate("character-sheet", ids());
    expect(g.nodes.map((n) => n.title)).toEqual(["正面", "侧面", "背面"]);
    expect(new Set(g.nodes.map((n) => n.y)).size).toBe(1);
    const xs = g.nodes.map((n) => n.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    const prompts = g.nodes.map((n) => n.generator?.prompt ?? "");
    const shared = prompts[0]?.split("，").slice(0, 3).join("，") ?? "";
    for (const p of prompts) expect(p.startsWith(shared)).toBe(true);
  });

  it("frame-to-video wires 首帧 into 视频 and references it as the first frame", () => {
    const g = buildTemplate("frame-to-video", ids());
    const [frame, video] = g.nodes;
    expect(frame?.type).toBe("image");
    expect(frame?.title).toBe("首帧");
    expect(video?.type).toBe("video");
    expect(video?.title).toBe("视频");
    expect(g.edges).toEqual([
      { id: expect.any(String), source: frame?.id, target: video?.id, kind: "reference" },
    ]);
    expect(video?.generator?.references).toEqual([{ kind: "node", id: frame?.id }]);
    expect(video?.generator?.params?.duration).toBe(5);
    expect((frame?.x ?? 0) + (frame?.width ?? 0)).toBeLessThan(video?.x ?? 0);
  });

  it("text-to-video is one empty video node", () => {
    const g = buildTemplate("text-to-video", ids());
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0]?.type).toBe("video");
    expect(g.nodes[0]?.status).toBe("empty");
  });

  it("centres the graph on what the viewport shows", () => {
    const g = buildTemplate(
      "story-script",
      ids(),
      { x: -1000, y: -500, zoom: 1 },
      { width: 1200, height: 800 },
    );
    const n = g.nodes[0];
    expect((n?.x ?? 0) + (n?.width ?? 0) / 2).toBe(1600);
    expect((n?.y ?? 0) + (n?.height ?? 0) / 2).toBe(900);
  });
});
