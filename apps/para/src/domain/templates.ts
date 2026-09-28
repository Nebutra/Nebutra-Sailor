import { NODE_SIZE, sizeForAspect } from "./nodes";
import type { Edge, GeneratorMode, Viewport, WorkspaceNode } from "./types";

/**
 * Canvas templates — the four quick starts on an empty canvas, and the `?template=<id>` contract
 * with Home (a tile links to `/p/<project>/w/<workspace>?template=<id>`).
 *
 * LibTV's pattern (synthesis §7): a "tool" is not a page, it is a pre-built graph that lands on the
 * one canvas. A template here is exactly that — nodes and edges built once into an empty document,
 * after which the param is dropped from the URL so a reload never builds it twice.
 */

export const TEMPLATE_IDS = [
  "story-script",
  "character-sheet",
  "frame-to-video",
  "text-to-video",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  /** Which mode the card's icon plate stands for. */
  mode: GeneratorMode;
  /** Modes the graph needs; a template whose modes the origin cannot run is not offered. */
  needs: readonly GeneratorMode[];
}

export const TEMPLATES: readonly TemplateMeta[] = [
  { id: "story-script", name: "故事脚本生成", mode: "text", needs: ["text"] },
  { id: "character-sheet", name: "角色三视图", mode: "image", needs: ["image"] },
  {
    id: "frame-to-video",
    name: "首帧生视频",
    mode: "video",
    needs: ["image", "video"],
  },
  { id: "text-to-video", name: "文生视频", mode: "video", needs: ["video"] },
];

export function parseTemplate(value: string | null | undefined): TemplateId | null {
  return TEMPLATE_IDS.includes(value as TemplateId) ? (value as TemplateId) : null;
}

/** Templates whose every node the origin can generate. */
export function availableTemplates(modes: readonly GeneratorMode[]): TemplateMeta[] {
  return TEMPLATES.filter((t) => t.needs.every((m) => modes.includes(m)));
}

export function templateHref(projectId: string, workspaceId: string, id: TemplateId): string {
  return `/p/${projectId}/w/${workspaceId}?template=${id}`;
}

export interface TemplateGraph {
  nodes: WorkspaceNode[];
  edges: Edge[];
  /** The node to select and focus once built. */
  focusId: string;
}

const GAP = 80;

/**
 * Build a template's graph centred on the part of the canvas the viewport shows. `newId` is injected
 * so tests get stable ids and the store gets its own sequence.
 */
export function buildTemplate(
  id: TemplateId,
  newId: (prefix?: string) => string,
  viewport: Viewport = { x: 0, y: 0, zoom: 1 },
  stage: { width: number; height: number } = { width: 1200, height: 700 },
): TemplateGraph {
  const cx = (stage.width / 2 - viewport.x) / viewport.zoom;
  const cy = (stage.height / 2 - viewport.y) / viewport.zoom;
  const base = { status: "configured" as const, createdBy: "template" as const };

  switch (id) {
    case "story-script": {
      const size = { width: 400, height: 280 };
      const node: WorkspaceNode = {
        ...base,
        id: newId(),
        type: "text",
        title: "故事脚本",
        text: "",
        x: Math.round(cx - size.width / 2),
        y: Math.round(cy - size.height / 2),
        ...size,
        generator: {
          mode: "text",
          model: "Auto",
          count: 1,
          prompt:
            "根据一句话创意写一个 60 秒短片脚本：分 6 个镜头，每个镜头写清画面、景别、运镜和台词。创意：",
        },
      };
      return { nodes: [node], edges: [], focusId: node.id };
    }

    case "character-sheet": {
      const size = sizeForAspect("image", "3:4");
      const character =
        "同一位角色：二十岁出头的女侠，黑色长发高束马尾，月白色交领长衫配青色束腰，腰间佩一柄细长直剑，神情冷静。纯灰色背景，全身站姿，影棚柔光，写实电影质感";
      const views: Array<[string, string]> = [
        ["正面", "正面视角"],
        ["侧面", "左侧面视角，身体朝向画面左侧"],
        ["背面", "背面视角，可见马尾与剑鞘"],
      ];
      const total = views.length * size.width + (views.length - 1) * GAP;
      const left = Math.round(cx - total / 2);
      const nodes: WorkspaceNode[] = views.map(([title, angle], i) => ({
        ...base,
        id: newId(),
        type: "image",
        title,
        x: left + i * (size.width + GAP),
        y: Math.round(cy - size.height / 2),
        ...size,
        generator: {
          mode: "image",
          model: "Auto",
          count: 1,
          prompt: `${character}，${angle}`,
          params: { aspect: "3:4" },
        },
      }));
      return { nodes, edges: [], focusId: (nodes[0] as WorkspaceNode).id };
    }

    case "frame-to-video": {
      const frame = sizeForAspect("image", "3:4");
      const video = { width: 560, height: 315 };
      const total = frame.width + GAP * 1.5 + video.width;
      const left = Math.round(cx - total / 2);
      const first: WorkspaceNode = {
        ...base,
        id: newId(),
        type: "image",
        title: "首帧",
        x: left,
        y: Math.round(cy - frame.height / 2),
        ...frame,
        generator: {
          mode: "image",
          model: "Auto",
          count: 1,
          prompt: "竹林深处，两位身着古装的武者相对而立，起势待发，晨雾，电影感构图",
          params: { aspect: "3:4" },
        },
      };
      const clip: WorkspaceNode = {
        ...base,
        id: newId(),
        type: "video",
        title: "视频",
        x: left + frame.width + GAP * 1.5,
        // Tops aligned, as LibTV lays the pair out: the wire then curves up into the video.
        y: Math.round(cy - frame.height / 2),
        ...video,
        sourceNodeIds: [first.id],
        generator: {
          mode: "video",
          model: "Auto",
          count: 1,
          prompt: "两人同时出招，衣袂翻飞，竹叶被气流卷起，镜头缓慢环绕",
          params: { aspect: "16:9", resolution: "720P", duration: 5 },
          references: [{ kind: "node", id: first.id }],
        },
      };
      const edge: Edge = { id: newId("e"), source: first.id, target: clip.id, kind: "reference" };
      return { nodes: [first, clip], edges: [edge], focusId: first.id };
    }

    case "text-to-video": {
      const size = NODE_SIZE.video;
      const node: WorkspaceNode = {
        ...base,
        status: "empty",
        id: newId(),
        type: "video",
        title: "视频",
        x: Math.round(cx - size.width / 2),
        y: Math.round(cy - size.height / 2),
        ...size,
        generator: {
          mode: "video",
          model: "Auto",
          count: 1,
          params: { aspect: "16:9", resolution: "720P", duration: 5 },
        },
      };
      return { nodes: [node], edges: [], focusId: node.id };
    }
  }
}
