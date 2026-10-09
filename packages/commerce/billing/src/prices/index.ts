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
 * a cent, an image USD 0.10. Video is priced per second per model (PARA_VIDEO_MODELS);
 * its entry here is one default clip of the default model (Wan 2.7, 720P, 5 s × 13), for
 * callers that only know the mode.
 */
export const PARA_CREDITS_PER_OUTPUT: Readonly<Record<ParaGenerationMode, number>> = {
  image: 10,
  text: 1,
  video: 65,
  audio: 20,
};

// ── Video: per model, per second, per resolution ─────────────────────────────
// Competitors price video by the clip and by the second (Seko per clip, Seedance 9 积分/秒 —
// research/competitors/seko/business/jobs.md). We charge per second per model, from each
// vendor's list price with a margin of about 1.5×, at 1 credit ≈ USD 0.01.

export type ParaVideoResolution = "480P" | "720P" | "1080P";

export interface ParaVideoModelPrice {
  id: string;
  label: string;
  /** `planned` models are shown as coming soon and are never charged or run. */
  status: "available" | "planned";
  /** Whole seconds the model accepts. A request snaps to the nearest (ties go up). */
  durations: readonly number[];
  defaultDuration: number;
  resolutions: readonly ParaVideoResolution[];
  defaultResolution: ParaVideoResolution;
  /** Credits per second of output at each resolution; null while the model is planned. */
  creditsPerSecond: Readonly<Partial<Record<ParaVideoResolution, number>>> | null;
}

const span = (lo: number, hi: number): number[] =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/**
 * Mirrors backends/python/ai/providers/video/registry.py — the origin generates from that
 * table, the gateway charges from this one, and the origin's test suite fails when their
 * durations, resolutions or defaults disagree. Change them together.
 */
export const PARA_VIDEO_MODELS: Readonly<Record<string, ParaVideoModelPrice>> = {
  "wan-2.7": {
    id: "wan-2.7",
    label: "Wan 2.7",
    status: "available",
    durations: span(2, 15),
    defaultDuration: 5,
    resolutions: ["720P", "1080P"],
    defaultResolution: "720P",
    // Bailian list price (model market, wan2.7-t2v / wan2.7-i2v, read 2026-09-28): 0.6 CNY/s
    // at 720P, 1.0 CNY/s at 1080P → ≈ USD 0.084 / 0.141 per second at 7.1 CNY/USD.
    creditsPerSecond: { "720P": 13, "1080P": 21 },
  },
  "seedance-2.5": {
    id: "seedance-2.5",
    label: "Seedance 2.5",
    status: "planned",
    durations: span(4, 30),
    defaultDuration: 5,
    resolutions: ["480P", "720P"],
    defaultResolution: "720P",
    creditsPerSecond: null,
  },
  "kling-3": {
    id: "kling-3",
    label: "Kling 3.0",
    status: "planned",
    durations: span(3, 15),
    defaultDuration: 5,
    resolutions: ["1080P"],
    defaultResolution: "1080P",
    creditsPerSecond: null,
  },
  "veo-3.1": {
    id: "veo-3.1",
    label: "Veo 3.1",
    status: "planned",
    durations: [4, 6, 8],
    defaultDuration: 6,
    resolutions: ["720P", "1080P"],
    defaultResolution: "720P",
    creditsPerSecond: null,
  },
  "minimax-h3": {
    id: "minimax-h3",
    label: "MiniMax H3",
    status: "planned",
    durations: span(5, 15),
    defaultDuration: 5,
    resolutions: ["480P", "720P", "1080P"],
    defaultResolution: "720P",
    creditsPerSecond: null,
  },
};

/** "Auto" runs the first available model in this order (same order as the origin's). */
export const PARA_VIDEO_AUTO_ORDER: readonly string[] = [
  "seedance-2.5",
  "kling-3",
  "veo-3.1",
  "minimax-h3",
  "wan-2.7",
];

/** Rate a quote falls back to when it cannot name a priced model (unknown id, planned). */
export const PARA_VIDEO_FALLBACK_CREDITS_PER_SECOND = 20;

/**
 * Parse a duration strictly: a finite number, or a string of digits with an optional
 * fractional part and an optional trailing "s" ("5", "5s", "7.5s"). Anything else is
 * null — the caller then uses the model's default rather than guessing.
 */
export function parseDurationSeconds(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  // Trim first and cap the length, so the pattern has no two whitespace runs to split input
  // between — `\s*s?\s*$` backtracked polynomially on long whitespace (CodeQL js/polynomial-redos).
  const text = value.trim();
  if (text.length > 16) return null;
  const match = /^(\d+(?:\.\d+)?) ?s?$/i.exec(text);
  return match ? Number(match[1]) : null;
}

/** Nearest allowed value, ties going up — the same rule as the origin's `snap_duration`. */
function snap(allowed: readonly number[], seconds: number): number {
  let best = allowed[0] as number;
  for (const d of allowed) {
    const delta = Math.abs(d - seconds);
    const bestDelta = Math.abs(best - seconds);
    if (delta < bestDelta || (delta === bestDelta && d > best)) best = d;
  }
  return best;
}

function normalizeResolution(model: ParaVideoModelPrice, value: unknown): ParaVideoResolution {
  let text = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (text && !text.endsWith("P")) text = `${text}P`;
  return (model.resolutions as readonly string[]).includes(text)
    ? (text as ParaVideoResolution)
    : model.defaultResolution;
}

/** The model "Auto" means here: the first available, priced model in the auto order. */
export function paraVideoAutoModel(): ParaVideoModelPrice | null {
  for (const id of PARA_VIDEO_AUTO_ORDER) {
    const model = PARA_VIDEO_MODELS[id];
    if (model?.status === "available" && model.creditsPerSecond) return model;
  }
  return null;
}

export interface ParaVideoQuote {
  model: ParaVideoModelPrice;
  durationSeconds: number;
  resolution: ParaVideoResolution;
  creditsPerSecond: number;
}

export interface ParaVideoQuoteInput {
  /** PARA model id, or "Auto" / undefined. */
  model?: string | undefined;
  /** Seconds per clip: a number or "5s". Snapped to the model's durations. */
  durationSeconds?: unknown;
  /** "480P" | "720P" | "1080P"; anything else is the model's default. */
  resolution?: unknown;
}

/**
 * What one clip costs per second, with duration and resolution snapped to what the model
 * accepts — exactly what the origin will run. Null when the model is unknown, planned or
 * unpriced: such a job must be refused, not charged.
 */
export function paraVideoQuote(input: ParaVideoQuoteInput = {}): ParaVideoQuote | null {
  const model =
    input.model === undefined || input.model === "" || input.model === "Auto"
      ? paraVideoAutoModel()
      : (PARA_VIDEO_MODELS[input.model] ?? null);
  if (!model || model.status !== "available" || !model.creditsPerSecond) return null;
  const resolution = normalizeResolution(model, input.resolution);
  const rate = model.creditsPerSecond[resolution];
  if (rate === undefined) return null;
  const parsed = parseDurationSeconds(input.durationSeconds);
  return {
    model,
    durationSeconds: parsed === null ? model.defaultDuration : snap(model.durations, parsed),
    resolution,
    creditsPerSecond: rate,
  };
}

export type ParaGenerationOptions = ParaVideoQuoteInput;

/**
 * Credits one Para generation costs: per output, times the outputs asked for. Video is
 * credits per second × seconds × outputs for its model. A model with no price (planned,
 * unknown) quotes at the fallback rate so a screen can still show a number — the gateway
 * refuses those jobs rather than charging them (`paraVideoQuote` → null).
 */
export function paraGenerationCredits(
  mode: ParaGenerationMode,
  count = 1,
  opts: ParaGenerationOptions = {},
): number {
  if (mode !== "video") return PARA_CREDITS_PER_OUTPUT[mode] * count;
  const quote = paraVideoQuote(opts);
  if (quote) return quote.creditsPerSecond * quote.durationSeconds * count;
  const seconds = parseDurationSeconds(opts.durationSeconds);
  const clamped = seconds === null ? 5 : Math.max(1, Math.round(seconds));
  return PARA_VIDEO_FALLBACK_CREDITS_PER_SECOND * clamped * count;
}
