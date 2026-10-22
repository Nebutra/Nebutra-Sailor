/**
 * The spring, as the Motion pages use it.
 *
 * The physics is not written here. `scripts/spring.mjs` in the token package is
 * the one definition — the token build derives `--spring-*-easing` from it and
 * this file re-exports it, so the curve drawn on the page, the curve the Lab
 * hands out as `linear()`, and the curve in the stylesheet cannot disagree. What
 * this file adds is presentation: slider limits, the plotted path, and a
 * sentence for how a spring feels.
 */

import {
  dampingRatio,
  naturalFrequency,
  sampleSpring,
  springOvershoot,
  springSettleMs,
  springToLinear,
  springValue,
} from "@nebutra/design-tokens/scripts/spring.mjs";

export {
  dampingRatio,
  naturalFrequency,
  sampleSpring,
  springOvershoot,
  springSettleMs,
  springToLinear,
  springValue,
};

export interface SpringParams {
  stiffness: number;
  damping: number;
  mass: number;
}

/** The presets the token source ships, in the order the pages list them. */
export const PRESET_NAMES = ["snappy", "smooth", "bouncy"] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

/**
 * Slider ranges for the tuner. These bound user input, not tokens: wide enough
 * to reach a stiff, an overdamped and a wobbling spring, narrow enough that
 * every position is a physically meaningful, non-degenerate spring.
 */
export const SPRING_LIMITS = {
  stiffness: { min: 20, max: 1000, step: 1 },
  damping: { min: 1, max: 80, step: 0.5 },
  mass: { min: 0.2, max: 5, step: 0.1 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampSpring(params: SpringParams): SpringParams {
  const { stiffness, damping, mass } = SPRING_LIMITS;
  return {
    stiffness: clamp(params.stiffness, stiffness.min, stiffness.max),
    damping: clamp(params.damping, damping.min, damping.max),
    mass: clamp(params.mass, mass.min, mass.max),
  };
}

export interface CurveSize {
  width: number;
  height: number;
  padding: number;
}

export interface SpringCurve {
  /** SVG path data for the response curve. */
  d: string;
  /** y of value 0 (the start) and of value 1 (the target), in plot coordinates. */
  zeroY: number;
  targetY: number;
  /** y of the highest point reached — above `targetY` only when it overshoots. */
  peakY: number;
  peak: number;
  durationMs: number;
  /** x of the first and last sample. */
  x0: number;
  x1: number;
}

const trim = (value: number): string => String(Number(value.toFixed(1)));

/**
 * The response curve fitted to a box. The vertical domain grows to hold the
 * overshoot, so a bouncy spring shows its peak instead of being clipped at the
 * target line.
 */
export function springCurve(params: SpringParams, size: CurveSize, samples = 80): SpringCurve {
  const durationMs = springSettleMs(params);
  const seconds = durationMs / 1000;
  const values = Array.from({ length: samples }, (_, i) =>
    springValue(params, (i / (samples - 1)) * seconds),
  );
  const peak = Math.max(...values);
  const domain = Math.max(1, peak);
  const plotW = size.width - size.padding * 2;
  const plotH = size.height - size.padding * 2;
  const x = (i: number) => size.padding + (i / (samples - 1)) * plotW;
  const y = (v: number) => size.height - size.padding - (v / domain) * plotH;

  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${trim(x(i))},${trim(y(v))}`).join(" ");
  return {
    d,
    zeroY: y(0),
    targetY: y(1),
    peakY: y(peak),
    peak,
    durationMs,
    x0: x(0),
    x1: x(samples - 1),
  };
}

/** One sentence on how the spring feels, from its damping ratio. */
export function describeFeel(params: SpringParams): string {
  const zeta = dampingRatio(params);
  if (zeta < 0.5) return "Bouncy: rings several times before it settles.";
  if (zeta < 0.95) return "Snappy: a small overshoot, then home.";
  if (zeta <= 1.05) return "Critically damped: no overshoot, the fastest settle without a bounce.";
  return "Overdamped: no overshoot, but sluggish — it creeps in.";
}

/** True when the spring crosses its target on the way in. */
export function overshoots(params: SpringParams): boolean {
  return springOvershoot(params) > 0.0005;
}
