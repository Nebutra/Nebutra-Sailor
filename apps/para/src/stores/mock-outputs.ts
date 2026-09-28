import type { Asset, WorkspaceNode } from "@/domain/types";

/**
 * What the mock scheduler "generates". Mock mode exists for the golden screens and for working on
 * the shell without an origin; its outputs should read as the product's real outputs would — a
 * photograph on an image node, a script in a text node — not as placeholder gradients.
 *
 * Picks are deterministic (by title, then by a counter) so a screenshot run is reproducible.
 */

const BY_TITLE: Record<string, string> = {
  首帧: "/mock/canvas/duel-frame.webp",
  正面: "/mock/canvas/hero-front.webp",
  侧面: "/mock/canvas/hero-side.webp",
  背面: "/mock/canvas/hero-back.webp",
};

const SCENES = [
  "/mock/canvas/scene-coast.webp",
  "/mock/canvas/scene-city.webp",
  "/mock/canvas/duel-frame.webp",
  "/mock/canvas/scene-desert.webp",
];

let counter = 0;

export function mockOutputUrl(node: WorkspaceNode, upstreamUrl?: string): string {
  if (node.title && BY_TITLE[node.title]) return BY_TITLE[node.title] as string;
  // A video made from a first frame starts on that frame; its poster is the frame.
  if (node.type === "video" && upstreamUrl) return upstreamUrl;
  const url = SCENES[counter % SCENES.length] as string;
  counter += 1;
  return url;
}

export function mockOutputAsset(
  node: WorkspaceNode,
  jobId: string,
  where: { projectId: string | null; workspaceId: string | null },
  upstreamUrl?: string,
): Asset {
  const url = mockOutputUrl(node, upstreamUrl);
  const aspect =
    node.width >= node.height * 1.5 ? "16:9" : node.width >= node.height ? "4:3" : "9:16";
  return {
    id: `a-gen-${jobId}`,
    type: node.type === "video" ? "video" : node.type === "audio" ? "audio" : "image",
    url,
    label: node.generator?.prompt?.split("\n")[0]?.slice(0, 80) || node.title || jobId,
    aspect,
    scope: "account",
    origin: "generated",
    jobId,
    ...(where.workspaceId ? { workspaceId: where.workspaceId } : {}),
    ...(where.projectId ? { projectId: where.projectId } : {}),
    createdAt: new Date().toISOString(),
  };
}

/** A text node's mock output: a short script shaped like what the text seat returns. */
export function mockText(prompt: string | undefined): string {
  const idea = prompt?.split("：").pop()?.trim() || "竹林对决";
  return [
    `《${idea.slice(0, 12) || "竹林对决"}》60 秒短片脚本`,
    "",
    "镜头 1｜远景｜晨雾中的竹林，镜头缓慢推进。",
    "镜头 2｜中景｜白衣女侠驻足，按剑回身。",
    "镜头 3｜特写｜对手的眼神，竹叶落在剑锋上。",
    "镜头 4｜全景｜两人同时出招，衣袂翻飞。",
    "镜头 5｜慢动作｜剑光交错，竹叶被气流卷起。",
    "镜头 6｜远景｜雾散，只剩一人收剑而立。",
  ].join("\n");
}
