/**
 * Consistency-ranked best-frame selection — ViMax-distinct IP, re-expressed.
 *
 * Generate N candidate frames, then have an MLLM rank them for character /
 * spatial / semantic consistency against the target description and pick the
 * best. The ranking is injected (a model call in production); this module
 * owns only the orchestration + validation invariants.
 */

import { CinemaError } from "./errors";

export interface FrameCandidate {
  readonly id: string;
  readonly uri: string;
}

/** Injected ranker: returns the winning candidate id + a human reason. */
export type RankFrames = (
  candidates: readonly FrameCandidate[],
  targetDescription: string,
) => Promise<{ bestId: string; reason: string }>;

export interface BestFrame {
  readonly best: FrameCandidate;
  readonly reason: string;
}

/**
 * Select the most consistent frame. Throws if there are no candidates or if
 * the ranker returns an id that is not among them (a model contract breach
 * must never silently pick the wrong frame).
 */
export async function selectBestFrame(
  candidates: readonly FrameCandidate[],
  targetDescription: string,
  rank: RankFrames,
): Promise<BestFrame> {
  if (candidates.length === 0) {
    throw new CinemaError("No candidate frames to select from.", {
      code: "CINEMA_NO_CANDIDATES",
      suggestion: "Generate at least one candidate frame before ranking.",
    });
  }
  const { bestId, reason } = await rank(candidates, targetDescription);
  const best = candidates.find((c) => c.id === bestId);
  if (!best) {
    throw new CinemaError(`Ranker chose "${bestId}", which is not among the candidates.`, {
      code: "CINEMA_RANKER_CONTRACT",
      suggestion:
        "The injected ranker must return one of the provided candidate ids; " +
        "constrain its output schema.",
    });
  }
  return { best, reason };
}
