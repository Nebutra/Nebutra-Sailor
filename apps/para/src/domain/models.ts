import type { GeneratorMode } from "./types";

/**
 * Which models each mode can use, and the rule that keeps the two fields agreeing.
 *
 * This lives in the domain rather than in the panel because a store that can hold "video" plus
 * "GPT Image 2" is the defect — a component-level guard is bypassed by the next caller, and the
 * impossible pair then travels all the way to the origin, which rejects it after it has been paid
 * for. "Auto" is valid in every mode, so it is always the safe fallback.
 */
export const MODELS_BY_MODE: Record<GeneratorMode, readonly string[]> = {
  // Values are the origin's model ids, sent as-is: the image seat is DashScope Qwen-Image
  // (backends/python/ai/providers/image/dashscope.py), and "Auto" resolves to its default there.
  // Names of models no seat serves ("Nano Banana 2", "GPT Image 2") were listed here and would have
  // reached DashScope verbatim, to be rejected after the credits were taken.
  image: ["Auto", "qwen-image-2.0"],
  // No video seat exists; the gateway build hides video (domain/generation.ts). Mock mode only.
  video: ["Auto", "Seedance 2.5", "Kling 3"],
  text: ["Auto"],
  audio: ["Auto"],
};

export const AUTO_MODEL = "Auto";

const MODEL_LABELS: Record<string, string> = {
  "qwen-image-2.0": "Qwen Image 2.0",
};

/** What a model is called on screen; the id is what travels to the origin. */
export function modelLabel(model: string | undefined): string {
  if (!model) return AUTO_MODEL;
  return MODEL_LABELS[model] ?? model;
}

/** The model to keep for `mode`: the current one when it is still valid, otherwise Auto. */
export function reconcileModel(mode: GeneratorMode, model: string | undefined): string {
  return model && MODELS_BY_MODE[mode].includes(model) ? model : AUTO_MODEL;
}
