/**
 * Orchestration maths for the stagger timeline.
 *
 * A timeline is a playhead (ms) and a list of items, each with its own start
 * delay. Every item's pose is a pure function of `playhead - delay`, which is
 * what lets the playhead be dragged: scrubbing never has to replay anything, it
 * just asks each item where it would be at that moment.
 */

import { type SpringParams, springValue } from "./spring";

export function staggerDelays(count: number, gapMs: number): number[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`count must be a non-negative integer, got ${count}`);
  }
  if (!Number.isFinite(gapMs) || gapMs < 0) {
    throw new RangeError(`gap must be >= 0, got ${gapMs}`);
  }
  return Array.from({ length: count }, (_, i) => i * gapMs);
}

/** When the last item has settled. */
export function timelineDurationMs(count: number, gapMs: number, itemMs: number): number {
  return count === 0 ? 0 : (count - 1) * gapMs + itemMs;
}

/** Spring progress of one item at the playhead: 0 before it starts, 1 at rest. */
function progress(playheadMs: number, delayMs: number, params: SpringParams): number {
  return springValue(params, Math.max(0, playheadMs - delayMs) / 1000);
}

/** Remaining travel, in the same unit as `distance`. Negative while overshooting. */
export function itemOffset(
  playheadMs: number,
  delayMs: number,
  params: SpringParams,
  distance: number,
): number {
  return distance * (1 - progress(playheadMs, delayMs, params));
}

/** Opacity follows the spring but never leaves [0, 1] when it overshoots. */
export function itemOpacity(playheadMs: number, delayMs: number, params: SpringParams): number {
  return Math.min(1, Math.max(0, progress(playheadMs, delayMs, params)));
}

/** Wall-clock playhead after `elapsedMs` of real time at a playback speed. */
export function advancePlayhead(playheadMs: number, elapsedMs: number, speed: number): number {
  return playheadMs + elapsedMs * speed;
}
