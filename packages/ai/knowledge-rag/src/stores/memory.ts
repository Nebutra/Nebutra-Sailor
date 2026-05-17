// =============================================================================
// @nebutra/knowledge-rag — InMemory vector store (default, zero-config)
// =============================================================================
// Tenant isolation is enforced at the data-structure level: chunks are bucketed
// by tenantId, and queryByVector NEVER reads outside the requested tenant.
// =============================================================================

import { cosineSimilarity } from "../scoring";
import type { KnowledgeChunk, VectorStore } from "../types";

export class InMemoryVectorStore implements VectorStore {
  readonly name = "in-memory";
  /** tenantId → (chunkId → chunk). Hard partition by tenant. */
  private readonly byTenant = new Map<string, Map<string, KnowledgeChunk>>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async upsert(chunks: KnowledgeChunk[]): Promise<void> {
    for (const chunk of chunks) {
      let bucket = this.byTenant.get(chunk.tenantId);
      if (!bucket) {
        bucket = new Map();
        this.byTenant.set(chunk.tenantId, bucket);
      }
      bucket.set(chunk.id, chunk);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async queryByVector(
    tenantId: string,
    vector: readonly number[],
    topK: number,
  ): Promise<Array<{ chunk: KnowledgeChunk; score: number }>> {
    const bucket = this.byTenant.get(tenantId);
    if (!bucket) return [];
    const scored: Array<{ chunk: KnowledgeChunk; score: number }> = [];
    for (const chunk of bucket.values()) {
      // Defence in depth: skip anything not matching the requested tenant.
      if (chunk.tenantId !== tenantId) continue;
      scored.push({ chunk, score: cosineSimilarity(vector, chunk.embedding) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(0, topK));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async deleteByDoc(docId: string, tenantId: string): Promise<number> {
    const bucket = this.byTenant.get(tenantId);
    if (!bucket) return 0;
    let removed = 0;
    for (const [id, chunk] of bucket) {
      if (chunk.docId === docId && chunk.tenantId === tenantId) {
        bucket.delete(id);
        removed++;
      }
    }
    return removed;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async health(): Promise<{ ok: boolean; detail: string }> {
    const tenants = this.byTenant.size;
    let chunks = 0;
    for (const b of this.byTenant.values()) chunks += b.size;
    return { ok: true, detail: `in-memory: ${tenants} tenant(s), ${chunks} chunk(s)` };
  }
}
