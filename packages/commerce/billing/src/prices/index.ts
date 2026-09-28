// =============================================================================
// Per-action credit prices — what a product's own UI quotes and its server charges
// =============================================================================
// Pure and browser-safe, like ../links: a canvas shows "✦10" before Generate from
// the same table the gateway deducts from, so the quote and the charge cannot drift
// into two numbers. A deployment may reprice on the server (env overrides live next
// to the charge); this is the default both sides start from.
// =============================================================================

export type ParaGenerationMode = "image" | "text" | "video" | "audio";

/**
 * Para credits sell at 1,000 for USD 9.99 (ops/nebutra/offers.json): one credit is about
 * a cent, an image USD 0.10. Video and audio are priced although no provider generates
 * them yet, so the first one to land cannot ship free by accident.
 */
export const PARA_CREDITS_PER_OUTPUT: Readonly<Record<ParaGenerationMode, number>> = {
  image: 10,
  text: 1,
  video: 100,
  audio: 20,
};

/** Credits one Para generation costs: per output, times the outputs asked for. */
export function paraGenerationCredits(mode: ParaGenerationMode, count = 1): number {
  return PARA_CREDITS_PER_OUTPUT[mode] * count;
}
