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
  image: ["Auto", "Nano Banana 2", "GPT Image 2"],
  video: ["Auto", "Seedance 2.5", "Kling 3"],
  text: ["Auto"],
  audio: ["Auto"],
};

export const AUTO_MODEL = "Auto";

/** The model to keep for `mode`: the current one when it is still valid, otherwise Auto. */
export function reconcileModel(mode: GeneratorMode, model: string | undefined): string {
  return model && MODELS_BY_MODE[mode].includes(model) ? model : AUTO_MODEL;
}
