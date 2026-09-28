import { paraGenerationCredits } from "@nebutra/billing/prices";
import type { GeneratorMode } from "./types";

const ALL_MODES: readonly GeneratorMode[] = ["image", "video", "text", "audio"];

/**
 * What the generation origin can actually produce (backends/python/ai `para.generate`): image and
 * text. Video and audio fail closed there with `unsupported_mode`, so offering them would sell a
 * button that can only error. The mock adapter fakes every mode, which the golden screens use.
 */
const LIVE_MODES: readonly GeneratorMode[] = ["image", "text"];

export function generatableModes(gatewayMode: boolean): readonly GeneratorMode[] {
  return gatewayMode ? LIVE_MODES : ALL_MODES;
}

/** The credits the gateway will deduct for this generation — the same table it charges from. */
export function generationCost(mode: GeneratorMode, count = 1): number {
  return paraGenerationCredits(mode, count);
}
