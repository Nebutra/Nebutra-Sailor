import { logger } from "@nebutra/logger";
import { Pool, type PoolClient } from "pg";
import type {
  IndexSettings,
  PgvectorConfig,
  SearchDocument,
  SearchHit,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "../types";

// =============================================================================
// pgvector Provider — Postgres + pgvector hybrid search
// =============================================================================
// Each index is one Postgres table:
//   <prefix>_<index> (id text PK, tenant_id text, doc jsonb,
//                    text tsvector, embedding vector(<dim>))
//
// Documents may carry an optional `_embedding: number[]` field — present →
// query can do cosine-distance vector search; absent → BM25 keyword search
// via tsvector + plainto_tsquery.
//
// Multi-tenancy: every row carries `tenant_id`; queries that pass
// `query.tenantId` add a WHERE clause. Without tenantId the query scans
// the whole table — appropriate for system-wide search but consumers must
// be aware.
// =============================================================================

const SAFE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIdentifier(name: string, kind: string): void {
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`[search:pgvector] Unsafe ${kind} name: ${name}`);
  }
}

interface DocWithEmbedding {
  _embedding?: number[];
}

export class PgvectorProvider implements SearchProvider {
  readonly name = "pgvector" as const;

  private pool: Pool;
  private embeddingDim: number;
  private tablePrefix: string;
  private bootstrappedTables = new Set<string>();
  private bootstrappedExtension = false;

  constructor(config?: PgvectorConfig) {
    const connectionString = config?.connectionString ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "[search:pgvector] DATABASE_URL not set and no `connectionString` passed in config.",
      );
    }
    this.pool = new Pool({ connectionString });
    this.embeddingDim = config?.embeddingDim ?? 1536;
    this.tablePrefix = config?.tablePrefix ?? "nebutra_search";
    assertSafeIdentifier(this.tablePrefix, "tablePrefix");

    logger.info("[search:pgvector] Provider initialised", {
      embeddingDim: this.embeddingDim,
      tablePrefix: this.tablePrefix,
    });
  }

  // ── Table & extension bootstrap ─────────────────────────────────────────

  private tableName(index: string): string {
    assertSafeIdentifier(index, "index");
    return `${this.tablePrefix}_${index}`;
  }

  private async ensureExtension(client: PoolClient): Promise<void> {
    if (this.bootstrappedExtension) return;
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      this.bootstrappedExtension = true;
    } catch (error) {
      logger.error(
        "[search:pgvector] CREATE EXTENSION vector failed — install the pgvector extension on your Postgres or grant CREATE EXTENSION rights",
        { error: error instanceof Error ? error.message : String(error) },
      );
      throw error;
    }
  }

  private async ensureTable(index: string): Promise<void> {
    if (this.bootstrappedTables.has(index)) return;
    const table = this.tableName(index);
    const client = await this.pool.connect();
    try {
      await this.ensureExtension(client);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id          TEXT PRIMARY KEY,
          tenant_id   TEXT,
          doc         JSONB NOT NULL,
          text        TSVECTOR,
          embedding   VECTOR(${this.embeddingDim}),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS ${table}_tenant_idx ON ${table} (tenant_id)`);
      await client.query(
        `CREATE INDEX IF NOT EXISTS ${table}_text_idx ON ${table} USING GIN (text)`,
      );
      // ivfflat needs ANALYZE for good performance; lists=100 is a reasonable default.
      await client.query(
        `CREATE INDEX IF NOT EXISTS ${table}_embed_idx ON ${table} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
      );
      this.bootstrappedTables.add(index);
    } finally {
      client.release();
    }
  }

  // ── Upsert ──────────────────────────────────────────────────────────────

  private extractText(doc: SearchDocument): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(doc)) {
      if (k === "_embedding" || k === "id" || k === "tenantId") continue;
      if (typeof v === "string") parts.push(v);
      else if (typeof v === "number" || typeof v === "boolean") parts.push(String(v));
    }
    return parts.join(" ");
  }

  private embeddingLiteral(embedding: number[] | undefined): string | null {
    if (!embedding || embedding.length === 0) return null;
    if (embedding.length !== this.embeddingDim) {
      throw new Error(
        `[search:pgvector] Embedding length ${embedding.length} ≠ configured dim ${this.embeddingDim}`,
      );
    }
    return `[${embedding.join(",")}]`;
  }

  async indexDocument<T extends SearchDocument>(index: string, doc: T): Promise<void> {
    await this.ensureTable(index);
    const table = this.tableName(index);
    const text = this.extractText(doc);
    const embedding = (doc as T & DocWithEmbedding)._embedding;

    await this.pool.query(
      `
      INSERT INTO ${table} (id, tenant_id, doc, text, embedding, updated_at)
      VALUES ($1, $2, $3::jsonb, to_tsvector('english', $4), $5::vector, NOW())
      ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        doc       = EXCLUDED.doc,
        text      = EXCLUDED.text,
        embedding = EXCLUDED.embedding,
        updated_at = NOW()
      `,
      [doc.id, doc.tenantId ?? null, JSON.stringify(doc), text, this.embeddingLiteral(embedding)],
    );
  }

  async indexDocuments<T extends SearchDocument>(index: string, docs: T[]): Promise<void> {
    if (docs.length === 0) return;
    // Simple sequential upsert; pg supports COPY for bulk but the API surface
    // is heavier. Sequential keeps the implementation small and predictable.
    for (const doc of docs) {
      await this.indexDocument(index, doc);
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────

  async search<T extends SearchDocument = SearchDocument>(
    index: string,
    query: SearchQuery,
  ): Promise<SearchResult<T>> {
    await this.ensureTable(index);
    const table = this.tableName(index);
    const start = Date.now();
    const page = query.page ?? 1;
    const hitsPerPage = Math.min(query.hitsPerPage ?? 20, 100);
    const offset = (page - 1) * hitsPerPage;

    // Embedding-aware: callers can pass `filters._embedding` as a vector
    // (encoded as comma-separated string) OR use plain text query for BM25.
    const embeddingFilter = query.filters?._embedding;
    const useVector = typeof embeddingFilter === "string" && embeddingFilter.startsWith("[");

    const whereParts: string[] = [];
    const params: unknown[] = [];
    let p = 0;

    if (query.tenantId) {
      params.push(query.tenantId);
      whereParts.push(`tenant_id = $${++p}`);
    }

    // Apply other simple equality filters from query.filters (skip _embedding).
    for (const [k, v] of Object.entries(query.filters ?? {})) {
      if (k === "_embedding") continue;
      assertSafeIdentifier(k, "filter key");
      params.push(v);
      whereParts.push(`(doc ->> '${k}') = $${++p}::text`);
    }

    let orderBy: string;
    let selectScore: string;

    if (useVector) {
      params.push(embeddingFilter);
      const embedParam = ++p;
      selectScore = `1 - (embedding <=> $${embedParam}::vector) AS score`;
      orderBy = `embedding <=> $${embedParam}::vector ASC`;
      whereParts.push(`embedding IS NOT NULL`);
    } else {
      params.push(query.query);
      const queryParam = ++p;
      selectScore = `ts_rank(text, plainto_tsquery('english', $${queryParam})) AS score`;
      orderBy = `score DESC`;
      whereParts.push(`text @@ plainto_tsquery('english', $${queryParam})`);
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${table} ${whereSql}`,
      params,
    );
    const totalHits = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(hitsPerPage, offset);
    const result = await this.pool.query<{ doc: T; score: number }>(
      `SELECT doc, ${selectScore} FROM ${table} ${whereSql} ORDER BY ${orderBy} LIMIT $${++p} OFFSET $${++p}`,
      params,
    );

    const hits: SearchHit<T>[] = result.rows.map((row) => ({
      doc: row.doc,
      score: Math.max(0, Math.min(1, Number(row.score) || 0)),
    }));

    return {
      hits,
      totalHits,
      processingTimeMs: Date.now() - start,
      page,
      hitsPerPage,
      totalPages: Math.max(1, Math.ceil(totalHits / hitsPerPage)),
    };
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async deleteDocument(index: string, docId: string, tenantId?: string): Promise<void> {
    await this.ensureTable(index);
    const table = this.tableName(index);
    if (tenantId) {
      await this.pool.query(`DELETE FROM ${table} WHERE id = $1 AND tenant_id = $2`, [
        docId,
        tenantId,
      ]);
    } else {
      await this.pool.query(`DELETE FROM ${table} WHERE id = $1`, [docId]);
    }
  }

  async deleteByFilter(
    index: string,
    filters: Record<string, string | number | boolean>,
  ): Promise<void> {
    await this.ensureTable(index);
    const table = this.tableName(index);
    const whereParts: string[] = [];
    const params: unknown[] = [];
    let p = 0;
    for (const [k, v] of Object.entries(filters)) {
      if (k === "tenantId") {
        params.push(v);
        whereParts.push(`tenant_id = $${++p}`);
        continue;
      }
      assertSafeIdentifier(k, "filter key");
      params.push(v);
      whereParts.push(`(doc ->> '${k}') = $${++p}::text`);
    }
    if (whereParts.length === 0) {
      throw new Error("[search:pgvector] deleteByFilter requires at least one filter");
    }
    await this.pool.query(`DELETE FROM ${table} WHERE ${whereParts.join(" AND ")}`, params);
  }

  // ── Index Management ────────────────────────────────────────────────────

  async createIndex(index: string, _settings: IndexSettings): Promise<void> {
    // pgvector doesn't have a separate "create index" concept beyond table
    // bootstrap; settings like searchableAttributes are implicit (everything
    // string-typed is concatenated into the tsvector by extractText()).
    await this.ensureTable(index);
  }

  async updateSettings(_index: string, _settings: IndexSettings): Promise<void> {
    // No-op: pgvector schema is fixed at table creation. Customize by editing
    // the table after bootstrap if needed (add columns, adjust GIN indexes).
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.bootstrappedTables.clear();
    this.bootstrappedExtension = false;
    logger.info("[search:pgvector] Provider closed");
  }
}
