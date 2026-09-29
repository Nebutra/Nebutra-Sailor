import { type ParaGenerationOptions, paraGenerationCredits } from "@nebutra/billing/prices";
import type { GeneratorMode } from "./types";

const ALL_MODES: readonly GeneratorMode[] = ["image", "video", "text", "audio"];

/**
 * What the generation origin can actually produce (backends/python/ai `para.generate`): image
 * (DashScope Qwen-Image), video (the model registry — Wan 2.7 live today), text, and audio
 * (Qwen3-TTS). Which video models are live is the origin's call: GET /api/v1/para/models.
 */
const LIVE_MODES: readonly GeneratorMode[] = ALL_MODES;

export function generatableModes(_gatewayMode: boolean): readonly GeneratorMode[] {
  return LIVE_MODES;
}

/**
 * The credits the gateway will deduct for this generation — the same table it charges from.
 * Video is per second of the chosen model: pass `{ model, durationSeconds, resolution }`
 * (duration as a number or "5s"); both sides snap it to what the model accepts.
 */
export function generationCost(
  mode: GeneratorMode,
  count = 1,
  opts: ParaGenerationOptions = {},
): number {
  return paraGenerationCredits(mode, count, opts);
}
