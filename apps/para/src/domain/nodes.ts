import type {
  GeneratorMode,
  GeneratorReference,
  GeneratorState,
  WorkspaceDocument,
  WorkspaceNode,
} from "./types";

/**
 * What a node is called and how big it starts — the canvas vocabulary, in one place.
 *
 * LibTV names a fresh node by its type (文本 / 图片 / 视频 / 音频) in a small label above the frame,
 * and lets a template or the user rename it ("首帧"). The frame itself is sized by what it holds:
 * a video is wide, a script card is tall enough to read.
 */

export const NODE_TYPE_LABEL: Record<WorkspaceNode["type"], string> = {
  text: "文本",
  image: "图片",
  video: "视频",
  audio: "音频",
};

export function nodeTitle(node: Pick<WorkspaceNode, "type" | "title">): string {
  return node.title?.trim() || NODE_TYPE_LABEL[node.type];
}

export const NODE_SIZE: Record<GeneratorMode, { width: number; height: number }> = {
  text: { width: 340, height: 220 },
  image: { width: 360, height: 270 },
  video: { width: 480, height: 270 },
  audio: { width: 360, height: 120 },
};

export const ASPECTS = ["16:9", "4:3", "1:1", "3:4", "9:16"] as const;
export type Aspect = (typeof ASPECTS)[number];

/** Frame size for a media node at `aspect`, keeping the long edge the canvas default. */
export function sizeForAspect(
  mode: "image" | "video",
  aspect: string,
): { width: number; height: number } {
  const [w, h] = aspect.split(":").map(Number);
  if (!w || !h) return NODE_SIZE[mode];
  const long = mode === "video" ? 480 : 360;
  return w >= h
    ? { width: long, height: Math.round((long * h) / w) }
    : { width: Math.round((long * w) / h), height: long };
}

/** The generator a node would run with when it has none of its own yet. */
export function generatorOf(node: WorkspaceNode): GeneratorState {
  return (
    node.generator ?? {
      mode: node.type === "text" ? "text" : node.type,
      model: "Auto",
      count: 1,
    }
  );
}

/** Nodes wired into `nodeId`, in edge order. */
export function upstreamNodes(doc: WorkspaceDocument, nodeId: string): WorkspaceNode[] {
  const out: WorkspaceNode[] = [];
  for (const edge of Object.values(doc.edges)) {
    if (edge.target !== nodeId) continue;
    const source = doc.nodes[edge.source];
    if (source && !out.includes(source)) out.push(source);
  }
  return out;
}

/**
 * The references a job for `nodeId` sends: every upstream media node that has an output, with the
 * URL of that output. An image wired into a video node arrives at the origin as its first frame.
 *
 * Upstream nodes without an output are skipped rather than sent as bare ids — the origin cannot read
 * an image that does not exist yet, and a reference it cannot resolve fails the job after admission.
 * Non-node references the draft already carries (assets, subjects) are kept as they are.
 */
export function resolveReferences(
  doc: WorkspaceDocument,
  nodeId: string,
  urlOf: (assetId: string) => string | undefined,
): GeneratorReference[] {
  const node = doc.nodes[nodeId];
  const kept = (node?.generator?.references ?? []).filter((r) => r.kind !== "node");
  const wired: GeneratorReference[] = [];
  for (const up of upstreamNodes(doc, nodeId)) {
    if (up.type === "text" || !up.assetId) continue;
    const url = urlOf(up.assetId);
    if (url) wired.push({ kind: "node", id: up.id, url });
  }
  return [...wired, ...kept];
}

/** Would adding source → target close a loop? Wires are drawn by hand now, so this is checked. */
export function wouldCycle(doc: WorkspaceDocument, source: string, target: string): boolean {
  if (source === target) return true;
  const seen = new Set<string>();
  const stack = [target];
  while (stack.length) {
    const id = stack.pop() as string;
    if (id === source) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of Object.values(doc.edges)) if (e.source === id) stack.push(e.target);
  }
  return false;
}
