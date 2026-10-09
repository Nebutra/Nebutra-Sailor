import { PARA_VIDEO_MODELS, paraVideoAutoModel } from "@nebutra/billing/prices";
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
  /** What the origin renders when no duration is given — the quote must start from the same. */
  defaultDuration?: number;
  resolutions?: readonly string[];
  aspects?: readonly string[];
}

export const AUTO_MODEL = "Auto";

const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"] as const;
const IMAGE_ASPECTS = ["16:9", "4:3", "1:1", "3:4", "9:16"] as const;
/**
 * Video models come from @nebutra/billing/prices — the table the gateway charges from, which a
 * Python test holds equal to the origin's registry (ids, durations, resolutions, defaults). So the
 * picker offers exactly what can be priced and run, under the id the origin expects; there is no
 * second copy here to drift. Only the on-screen name is ours.
 */
const VIDEO_ASPECTS = ["16:9", "9:16", "1:1", "4:3"] as const;
const VIDEO_LABELS: Record<string, string> = {
  "wan-2.7": "万相",
  "seedance-2.5": "Seedance",
  "kling-3": "可灵",
  "veo-3.1": "Google Veo",
  "minimax-h3": "MiniMax 海螺",
};

const VIDEO_MODELS: readonly ModelInfo[] = Object.values(PARA_VIDEO_MODELS).map((m) => ({
  id: m.id,
  label: VIDEO_LABELS[m.id] ?? m.label,
  tag: m.label,
  live: m.status === "available",
  durations: m.durations,
  defaultDuration: m.defaultDuration,
  resolutions: m.resolutions,
  aspects: VIDEO_ASPECTS,
}));

const autoVideo = paraVideoAutoModel();
const AUTO_VIDEO: ModelInfo = {
  id: AUTO_MODEL,
  label: "自动",
  live: true,
  durations: autoVideo?.durations ?? [5],
  ...(autoVideo ? { defaultDuration: autoVideo.defaultDuration } : {}),
  resolutions: autoVideo?.resolutions ?? ["720P"],
  aspects: VIDEO_ASPECTS,
};

/**
 * The roster by mode. Live today: Qwen Image (DashScope) and Wan 2.7 (DashScope video); the rest
 * is the planned roster, shown so the picker reads as the product will, never selectable. "Auto"
 * resolves at the gateway to the best live model and is pinned before charging.
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
  video: [AUTO_VIDEO, ...VIDEO_MODELS],
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
