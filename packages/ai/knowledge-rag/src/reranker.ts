// =============================================================================
// @nebutra/knowledge-rag — Rerankers
// =============================================================================
// The Reranker interface is the seam for a cross-encoder / LLM reranker. The
// default IdentityReranker preserves blended order (zero-config, no network).
// A LexicalOverlapReranker provides a lightweight, dependency-free boost based
// on query/term overlap — useful before a real cross-encoder is wired in.
// =============================================================================

import type { RankedChunk, Reranker } from "./types";

/** No-op reranker — keeps the hybrid-blended order. */
export class IdentityReranker implements Reranker {
  readonly name = "identity";
  // eslint-disable-next-line @typescript-eslint/require-await
  async rerank(_query: string, candidates: RankedChunk[]): Promise<RankedChunk[]> {
    return candidates;
  }
}

/**
 * Re-orders candidates by blending the hybrid score with lexical
 * query-term coverage. Deterministic, no external calls.
 */
export class LexicalOverlapReranker implements Reranker {
  readonly name = "lexical-overlap";
  private readonly weight: number;

  constructor(weight = 0.3) {
    this.weight = Math.min(1, Math.max(0, weight));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async rerank(query: string, candidates: RankedChunk[]): Promise<RankedChunk[]> {
    const terms = new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    );
    if (terms.size === 0) return candidates;
    const rescored = candidates.map((c) => {
      const text = c.chunk.text.toLowerCase();
      let hit = 0;
      for (const t of terms) if (text.includes(t)) hit++;
      const coverage = hit / terms.size;
      const blended = (1 - this.weight) * c.score + this.weight * coverage;
      return { ...c, score: blended };
    });
    rescored.sort((a, b) => b.score - a.score);
    return rescored;
  }
}
