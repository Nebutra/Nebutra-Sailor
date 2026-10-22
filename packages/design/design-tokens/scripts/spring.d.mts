export interface SpringParams {
  stiffness: number;
  damping: number;
  mass?: number;
}

export interface NormalizedSpring {
  stiffness: number;
  damping: number;
  mass: number;
}

export declare const MAX_SETTLE_SECONDS: number;
export declare const REST_DELTA: number;
export declare const DEFAULT_LINEAR_SAMPLES: number;

/** Throws RangeError for non-physical parameters; fills in `mass: 1`. */
export declare function normalizeSpring(params: SpringParams): NormalizedSpring;
/** ζ: below 1 the spring overshoots, at 1 it is critically damped. */
export declare function dampingRatio(params: SpringParams): number;
/** ω₀ in rad/s. */
export declare function naturalFrequency(params: SpringParams): number;
/** Peak excursion past the target as a fraction of the travel. */
export declare function springOvershoot(params: SpringParams): number;
/** Position at `t` seconds, 0 → 1 from rest. May exceed 1 while overshooting. */
export declare function springValue(params: SpringParams, t: number): number;
export declare function springSettleSeconds(params: SpringParams, restDelta?: number): number;
export declare function springSettleMs(params: SpringParams, restDelta?: number): number;
export declare function sampleSpring(
  params: SpringParams,
  samples?: number,
): { durationMs: number; points: number[] };
/** The curve as a CSS `linear()` easing function. */
export declare function springToLinear(params: SpringParams, samples?: number): string;

export interface SpringDerivation {
  name: string;
  durationMs: number;
  easing: string;
}
/** Mutates the merged DTCG tree in place; returns the derivation log. */
export declare function deriveSpring(tokens: unknown): SpringDerivation[];
