import type { GeneratorMode } from "./types";

/**
 * Which models each mode can use, what each one can do, and the rule that keeps mode and model
 * agreeing.
 *
 * Everything the canvas knows about models goes through `modelsFor(mode)`. Today it is a static
 * table; the live registry (`GET /api/v1/para/models`, models by mode with their capabilities) will
 * replace the table behind the same accessor, so the picker and the 高级设置 options never hardcode
 * a model, a duration or a resolution themselves.
 *
 * This lives in the domain rather than in the panel because a store that can hold "video" plus an
 * image model is the defect — a component-level guard is bypassed by the next caller, and the
 * impossible pair then travels to the origin, which rejects it after it has been paid for. "Auto"
 * is valid in every mode, so it is always the safe fallback.
 */

export interface ModelInfo {
  /** The origin's model id, sent as-is. */
  id: string;
  /** What the picker shows. */
  label: string;
  /** The small vendor/version tag on the chip ("SD 2.5"). */
  tag?: string;
  /**
   * Whether a seat serves it today. Planned models are listed — the roster is part of the product —
   * but greyed out with 即将上线, and neither the picker nor the store will hold one.
   */
  live: boolean;
  /** Seconds the model can render (video). */
  durations?: readonly number[];
  resolutions?: readonly string[];
  aspects?: readonly string[];
}

export const AUTO_MODEL = "Auto";

const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"] as const;
const IMAGE_ASPECTS = ["16:9", "4:3", "1:1", "3:4", "9:16"] as const;
const VIDEO_RESOLUTIONS = ["480P", "720P", "1080P"] as const;
const VIDEO_ASPECTS = ["16:9", "1:1", "9:16"] as const;

const video = (
  id: string,
  label: string,
  tag: string,
  live: boolean,
  durations: readonly number[] = [5, 10],
  resolutions: readonly string[] = VIDEO_RESOLUTIONS,
): ModelInfo => ({ id, label, tag, live, durations, resolutions, aspects: VIDEO_ASPECTS });

/**
 * The mock implementation of the registry — the shape `GET /api/v1/para/models` will return. Live
 * today: Qwen Image (DashScope, backends/python/ai/providers/image/dashscope.py) and Wan (DashScope
 * video). The rest is the planned roster, shown so the picker reads as the product will, never
 * selectable. "Auto" resolves to the mode's default live seat at the origin.
 * TODO(integration): replace STATIC_MODELS with the registry response; keep `modelsFor` as the seam.
 */
const STATIC_MODELS: Record<GeneratorMode, readonly ModelInfo[]> = {
  image: [
    {
      id: AUTO_MODEL,
      label: "自动",
      live: true,
      resolutions: IMAGE_RESOLUTIONS,
      aspects: IMAGE_ASPECTS,
    },
    {
      id: "qwen-image-2.0",
      label: "Qwen Image",
      tag: "2.0",
      live: true,
      resolutions: IMAGE_RESOLUTIONS,
      aspects: IMAGE_ASPECTS,
    },
  ],
  video: [
    video(AUTO_MODEL, "自动", "", true),
    video("wan2.5", "万相", "Wan 2.5", true),
    video("Seedance 2.5", "Seedance", "SD 2.5", false, [5, 10], ["480P", "720P", "1080P"]),
    video("Kling 3", "可灵", "Kling 3", false, [5, 10], ["720P", "1080P"]),
    video("veo-3", "Google Veo", "Veo 3", false, [8], ["720P", "1080P"]),
    video("hailuo-02", "MiniMax 海螺", "Hailuo 02", false, [6, 10], ["768P", "1080P"]),
  ],
  text: [{ id: AUTO_MODEL, label: "自动", live: true }],
  audio: [{ id: AUTO_MODEL, label: "自动", live: true }],
};

/** Every model `mode` can use, Auto first. The single accessor the canvas reads. */
export function modelsFor(mode: GeneratorMode): readonly ModelInfo[] {
  return STATIC_MODELS[mode];
}

/** The model row for `id` in `mode`, falling back to Auto. */
export function modelInfo(mode: GeneratorMode, id: string | undefined): ModelInfo {
  const list = modelsFor(mode);
  return list.find((m) => m.id === id) ?? (list[0] as ModelInfo);
}

/** Ids per mode, planned ones included — kept for callers that only need membership. */
export const MODELS_BY_MODE: Record<GeneratorMode, readonly string[]> = {
  image: modelsFor("image").map((m) => m.id),
  video: modelsFor("video").map((m) => m.id),
  text: modelsFor("text").map((m) => m.id),
  audio: modelsFor("audio").map((m) => m.id),
};

/** What a model is called on screen; the id is what travels to the origin. */
export function modelLabel(model: string | undefined): string {
  const id = model ?? AUTO_MODEL;
  for (const list of Object.values(STATIC_MODELS)) {
    const hit = list.find((m) => m.id === id);
    if (hit) return hit.label;
  }
  return id;
}

/**
 * The model a starter card advertises for `mode`: the first named seat, not "Auto". Undefined when
 * the mode only has Auto, in which case the card shows no tag rather than the word 自动.
 */
export function featuredModel(mode: GeneratorMode): ModelInfo | undefined {
  return modelsFor(mode).find((m) => m.id !== AUTO_MODEL && m.live);
}

/** The model to keep for `mode`: the current one when it is live for that mode, otherwise Auto. */
export function reconcileModel(mode: GeneratorMode, model: string | undefined): string {
  return model && modelsFor(mode).some((m) => m.id === model && m.live) ? model : AUTO_MODEL;
}
