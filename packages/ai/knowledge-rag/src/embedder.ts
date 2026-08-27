// =============================================================================
// @nebutra/knowledge-rag — Embedders
// =============================================================================
// - LocalHashEmbedder: deterministic, zero-config, NO network. Hashed
//   bag-of-words (+ char bigrams) into a fixed-dim space, L2-normalised.
//   Real (non-mock) signal: shared tokens raise cosine similarity, so
//   semantically-overlapping texts genuinely cluster.
// - ProviderEmbedder: wraps @nebutra/agents `embedMany()` (Vercel AI SDK
//   fallback chain) when real embeddings are configured.
// =============================================================================

import { embedTextLocal } from "@nebutra/local-embedding";
import { KnowledgeRagError } from "./errors";
import type { Embedder } from "./types";

export class LocalHashEmbedder implements Embedder {
  readonly name = "local-hash";
  private readonly dim: number;

  constructor(dim = 256) {
    if (!Number.isInteger(dim) || dim <= 0) {
      throw new KnowledgeRagError(`Invalid embedding dimension: ${dim}`, {
        code: "E_EMBED_DIM",
        suggestion: "Pass a positive integer dimension, e.g. new LocalHashEmbedder(256).",
      });
    }
    this.dim = dim;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => embedTextLocal(text, { dimensions: this.dim }));
  }
}

/**
 * Wraps the Sailor provider abstraction (`@nebutra/agents` → Vercel AI SDK
 * `embedMany`, with the LLM_EMBEDDING_FALLBACK_CHAIN). Imported lazily so the
 * zero-config path never requires the AI SDK at module load.
 */
export class ProviderEmbedder implements Embedder {
  readonly name = "nebutra-agents";
  private readonly model: string | undefined;

  constructor(model?: string) {
    this.model = model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const { embedMany } = await import("@nebutra/agents");
      const result = await embedMany(texts, this.model ? { model: this.model } : {});
      const embeddings = (result as { embeddings: number[][] }).embeddings;
      if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
        throw new KnowledgeRagError("Provider returned an unexpected embedding shape", {
          code: "E_EMBED_SHAPE",
          suggestion:
            "Verify the embedding model in @nebutra/agents config; or omit a custom embedder to fall back to LocalHashEmbedder.",
        });
      }
      return embeddings;
    } catch (err) {
      if (err instanceof KnowledgeRagError) throw err;
      throw new KnowledgeRagError(
        `Provider embedding failed: ${(err as Error)?.message ?? String(err)}`,
        {
          code: "E_EMBED_PROVIDER",
          cause: err,
          suggestion:
            "Set OPENAI_API_KEY (or OPENROUTER_API_KEY) for @nebutra/agents, or use the zero-config LocalHashEmbedder (default).",
        },
      );
    }
  }
}
