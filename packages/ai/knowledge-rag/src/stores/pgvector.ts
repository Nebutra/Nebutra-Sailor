// =============================================================================
// @nebutra/knowledge-rag — pgvector store (interface-only, opt-in)
// =============================================================================
// This is the production store shape. It is NOT exercised by unit tests and
// does NOT run migrations. The Prisma model + DDL live in the package README.
//
// Every query is parameterised by tenantId and MUST include a
// `WHERE tenant_id = $tenantId` predicate — cross-tenant leakage via pgvector
// is a security defect, identical to the in-memory contract.
//
// To activate: supply a Prisma client (or pg pool) that exposes a
// `$queryRaw`-style executor and apply the README migration.
// =============================================================================

import { KnowledgeRagError } from "../errors";
import type { KnowledgeChunk, VectorStore } from "../types";

export interface PgvectorExecutor {
  /** Tagged-template raw query, e.g. Prisma's `$queryRaw`. */
  query<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
}

export interface PgvectorStoreOptions {
  executor: PgvectorExecutor;
  /** Table name. Default: "knowledge_rag_chunk". */
  table?: string;
  /** Embedding dimension the table column was created with. Default 1536. */
  embeddingDim?: number;
}

export class PgvectorStore implements VectorStore {
  readonly name = "pgvector";
  private readonly exec: PgvectorExecutor;
  private readonly table: string;
  private readonly dim: number;

  constructor(options: PgvectorStoreOptions) {
    if (!options?.executor) {
      throw new KnowledgeRagError("PgvectorStore requires an `executor`", {
        code: "E_PGVECTOR_CONFIG",
        suggestion:
          "Pass a Prisma client wrapper exposing query(sql, params). See the pgvector section of the @nebutra/knowledge-rag README, or use InMemoryVectorStore for zero-config.",
      });
    }
    this.exec = options.executor;
    this.table = options.table ?? "knowledge_rag_chunk";
    this.dim = options.embeddingDim ?? 1536;
  }

  private vecLiteral(v: readonly number[]): string {
    if (v.length !== this.dim) {
      throw new KnowledgeRagError(`Embedding dim ${v.length} != table dim ${this.dim}`, {
        code: "E_PGVECTOR_DIM",
        suggestion: `Recreate the table with vector(${v.length}) or use an embedder producing ${this.dim}-d vectors.`,
      });
    }
    return `[${v.join(",")}]`;
  }

  async upsert(chunks: KnowledgeChunk[]): Promise<void> {
    for (const c of chunks) {
      await this.exec.query(
        `INSERT INTO ${this.table}
           (id, doc_id, tenant_id, text, ordinal, embedding, meta)
         VALUES ($1,$2,$3,$4,$5,$6::vector,$7)
         ON CONFLICT (id) DO UPDATE SET
           text=EXCLUDED.text, embedding=EXCLUDED.embedding, meta=EXCLUDED.meta`,
        [
          c.id,
          c.docId,
          c.tenantId,
          c.text,
          c.ordinal,
          this.vecLiteral(c.embedding),
          JSON.stringify(c.meta),
        ],
      );
    }
  }

  async queryByVector(
    tenantId: string,
    vector: readonly number[],
    topK: number,
  ): Promise<Array<{ chunk: KnowledgeChunk; score: number }>> {
    // tenant_id predicate is mandatory and first — never query without it.
    const rows = await this.exec.query<{
      id: string;
      doc_id: string;
      tenant_id: string;
      text: string;
      ordinal: number;
      meta: unknown;
      distance: number;
    }>(
      `SELECT id, doc_id, tenant_id, text, ordinal, meta,
              (embedding <=> $2::vector) AS distance
         FROM ${this.table}
        WHERE tenant_id = $1
        ORDER BY embedding <=> $2::vector
        LIMIT $3`,
      [tenantId, this.vecLiteral(vector), Math.max(0, topK)],
    );
    return rows.map((r) => ({
      score: 1 - r.distance, // cosine distance → similarity
      chunk: {
        id: r.id,
        docId: r.doc_id,
        tenantId: r.tenant_id,
        text: r.text,
        ordinal: r.ordinal,
        embedding: [],
        meta: (typeof r.meta === "string" ? JSON.parse(r.meta) : r.meta) ?? {},
      },
    }));
  }

  async deleteByDoc(docId: string, tenantId: string): Promise<number> {
    const rows = await this.exec.query<{ count: number }>(
      `WITH d AS (
         DELETE FROM ${this.table}
          WHERE doc_id = $1 AND tenant_id = $2 RETURNING 1
       ) SELECT COUNT(*)::int AS count FROM d`,
      [docId, tenantId],
    );
    return rows[0]?.count ?? 0;
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    try {
      await this.exec.query("SELECT 1", []);
      return { ok: true, detail: `pgvector: table ${this.table} reachable` };
    } catch (err) {
      return {
        ok: false,
        detail: `pgvector unreachable: ${(err as Error)?.message ?? String(err)}`,
      };
    }
  }
}
