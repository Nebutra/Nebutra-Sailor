// =============================================================================
// @nebutra/knowledge-rag — Scoring math
// =============================================================================
// Pure functions: cosine similarity, min-max normalisation, weighted hybrid
// blend of the vector and keyword retrieval legs.
// =============================================================================

import { KnowledgeRagError } from "./errors";

/**
 * Cosine similarity in [-1, 1]. Returns 0 for a zero-magnitude vector
 * (never NaN). Throws on dimension mismatch.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new KnowledgeRagError(`Vector dimension mismatch: ${a.length} vs ${b.length}`, {
      code: "E_DIM_MISMATCH",
      suggestion:
        "Ensure all chunks were embedded with the same embedder/model as the query. Re-ingest after switching embedder.",
    });
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Min-max normalise to [0, 1]. All-equal input → all 1 (avoids divide by
 * zero and keeps every candidate eligible). Empty input → empty.
 */
export function normalizeScores(scores: readonly number[]): number[] {
  if (scores.length === 0) return [];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of scores) {
    if (s < min) min = s;
    if (s > max) max = s;
  }
  const range = max - min;
  if (range === 0) return scores.map(() => 1);
  return scores.map((s) => (s - min) / range);
}

/** Clamp a number into [lo, hi]. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Weighted hybrid blend. `vectorWeight` is clamped to [0, 1]; the keyword
 * leg receives `1 - vectorWeight`.
 */
export function hybridBlend(
  vectorScore: number,
  keywordScore: number,
  vectorWeight: number,
): number {
  const w = clamp(vectorWeight, 0, 1);
  return w * vectorScore + (1 - w) * keywordScore;
}
