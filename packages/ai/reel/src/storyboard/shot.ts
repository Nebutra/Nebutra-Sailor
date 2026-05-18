/**
 * Shot model + the two correctness primitives absorbed verbatim in spirit:
 *
 *  - `isSameShotId`: numeric-tolerant equality. The source narrowed this from
 *    fuzzy token matching to strict equality with a pure-numeric tolerance —
 *    keeping that is what stops one shot's reference images bleeding into
 *    another (the `debug13-b` class of bug).
 *  - the `storyboard[-img]-{nodeId}-shot-{shotId}` source-id scheme: async
 *    generation results must route back to the exact originating shot.
 */

export const SIMPLE_NUMERIC_SHOT_ID_RE = /^-?\d+(?:\.\d+)?$/;

export interface Shot {
  readonly id: string;
  readonly sceneIndex: number;
  readonly prompt: string;
  readonly description: string;
  readonly model?: string;
  readonly ratio?: string;
  readonly resolution?: string;
  readonly duration?: number;
  readonly status: "draft" | "generating" | "done" | "error";
  readonly outputEnabled: boolean;
  readonly selectedImageIndex: number;
  /** Ring buffer of prior outputs (newest last), capped. */
  readonly outputHistory: readonly string[];
  readonly outputHistoryCursor: number;
  /** Per-shot reference images — isolated; never inherited across shots. */
  readonly referenceImages: readonly string[];
}

export type StoryboardTransition = "cut" | "fade" | "match";

export interface StoryboardScene extends Shot {
  readonly durationS: number;
  readonly transition: StoryboardTransition;
  readonly musicCue?: string;
  readonly voiceCue?: string;
}

export interface StoryboardPlan<TIntent = unknown> {
  readonly id: string;
  readonly tenantId: string;
  readonly brandId: string;
  readonly intent: TIntent;
  readonly scenes: readonly StoryboardScene[];
  readonly totalDurationS: number;
}

export const MAX_STORYBOARD_OUTPUT_HISTORY = 20;

export function normalizeShotId(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Strict equality, with a tolerance only when BOTH ids are pure-numeric. */
export function isSameShotId(a: unknown, b: unknown): boolean {
  const rawA = normalizeShotId(a);
  const rawB = normalizeShotId(b);
  if (!rawA || !rawB) return false;
  if (rawA === rawB) return true;
  if (!SIMPLE_NUMERIC_SHOT_ID_RE.test(rawA) || !SIMPLE_NUMERIC_SHOT_ID_RE.test(rawB)) {
    return false;
  }
  const numA = Number(rawA);
  const numB = Number(rawB);
  if (!Number.isFinite(numA) || !Number.isFinite(numB)) return false;
  return Math.abs(numA - numB) < 1e-6;
}

export function makeShotFocusKey(nodeId: string, shotId: string): string {
  return `${encodeURIComponent(String(nodeId))}::${encodeURIComponent(String(shotId))}`;
}

/** `storyboard[-img]-{nodeId}-shot-{shotId}` */
export function buildShotSourceId(nodeId: string, shotId: string, imageMode = false): string {
  return `storyboard${imageMode ? "-img" : ""}-${nodeId}-shot-${shotId}`;
}

export function parseShotSourceId(
  sourceId: string | null | undefined,
): { nodeId: string; shotId: string; imageMode: boolean } | null {
  if (!sourceId || typeof sourceId !== "string") return null;
  if (!sourceId.startsWith("storyboard-") || !sourceId.includes("-shot-")) {
    return null;
  }
  const parts = sourceId.split("-shot-");
  if (parts.length !== 2) return null;
  const shotId = parts[1] ?? "";
  const head = parts[0] ?? "";
  const imageMode = head.startsWith("storyboard-img-");
  const nodeId = imageMode
    ? head.slice("storyboard-img-".length)
    : head.slice("storyboard-".length);
  if (!nodeId || !shotId) return null;
  return { nodeId, shotId, imageMode };
}

/** Append an output, holding the ring at the cap and parking the cursor at the newest. */
export function pushOutputHistory(shot: Shot, outputUrl: string): Shot {
  const next = [...shot.outputHistory, outputUrl].slice(-MAX_STORYBOARD_OUTPUT_HISTORY);
  return { ...shot, outputHistory: next, outputHistoryCursor: next.length - 1 };
}

export function storyboardTotalDuration(
  scenes: readonly Pick<StoryboardScene, "durationS">[],
): number {
  return scenes.reduce((sum, scene) => sum + scene.durationS, 0);
}
