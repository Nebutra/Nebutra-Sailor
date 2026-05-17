// =============================================================================
// @nebutra/knowledge-rag — InMemory vector store (default, zero-config)
// =============================================================================
// Storage mechanics + tenant isolation are delegated to the neutral
// `@nebutra/tenant-store` lower layer (composite-key partition, tenant-checked
// reads/writes/deletes). This class only adds vector-specific behaviour
// (similarity scan, delete-by-doc). queryByVector NEVER reads outside the
// requested tenant — guaranteed structurally by InMemoryTenantStore.
// =============================================================================

import { InMemoryTenantStore } from "@nebutra/tenant-store";
import { cosineSimilarity } from "../scoring";
import type { KnowledgeChunk, VectorStore } from "../types";

export class InMemoryVectorStore implements VectorStore {
  readonly name = "in-memory";
  private readonly base = new InMemoryTenantStore<KnowledgeChunk>();

  async upsert(chunks: KnowledgeChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.base.write(chunk.tenantId, chunk.id, chunk);
    }
  }

  async queryByVector(
    tenantId: string,
    vector: readonly number[],
    topK: number,
  ): Promise<Array<{ chunk: KnowledgeChunk; score: number }>> {
    const chunks = await this.base.listByTenant(tenantId);
    const scored = chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(vector, chunk.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(0, topK));
  }

  async deleteByDoc(docId: string, tenantId: string): Promise<number> {
    const chunks = await this.base.listByTenant(tenantId);
    let removed = 0;
    for (const chunk of chunks) {
      if (chunk.docId === docId && (await this.base.delete(tenantId, chunk.id))) {
        removed++;
      }
    }
    return removed;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async health(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: `in-memory: ${this.base.size()} chunk(s)` };
  }
}
