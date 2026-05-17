import { describe, expect, it, vi } from "vitest";
import { KnowledgeRagError } from "../errors";
import type { KnowledgeChunk } from "../types";
import { type PgvectorExecutor, PgvectorStore } from "./pgvector";

function chunk(id: string, tenantId: string, dim: number): KnowledgeChunk {
  return {
    id,
    docId: id.split("::")[0]!,
    tenantId,
    text: "hello",
    ordinal: 0,
    embedding: new Array(dim).fill(0.1),
    meta: { k: "v" },
  };
}

describe("PgvectorStore", () => {
  it("throws a suggestion when no executor is given", () => {
    // @ts-expect-error intentionally invalid
    expect(() => new PgvectorStore({})).toThrowError(KnowledgeRagError);
  });

  it("upsert parameterises tenant_id and vector literal", async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const exec: PgvectorExecutor = {
      query: vi.fn(async (sql, params) => {
        calls.push({ sql, params });
        return [];
      }),
    };
    const store = new PgvectorStore({ executor: exec, embeddingDim: 4 });
    await store.upsert([chunk("d::0", "org_a", 4)]);
    expect(calls[0]!.sql).toContain("INSERT INTO knowledge_rag_chunk");
    expect(calls[0]!.params[2]).toBe("org_a");
    expect(calls[0]!.params[5]).toBe("[0.1,0.1,0.1,0.1]");
  });

  it("queryByVector always includes a tenant_id predicate", async () => {
    const exec: PgvectorExecutor = {
      query: vi.fn(async () => [
        {
          id: "d::0",
          doc_id: "d",
          tenant_id: "org_a",
          text: "x",
          ordinal: 0,
          meta: "{}",
          distance: 0.2,
        },
      ]),
    };
    const store = new PgvectorStore({ executor: exec, embeddingDim: 2 });
    const out = await store.queryByVector("org_a", [0.1, 0.2], 5);
    expect((exec.query as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toContain(
      "WHERE tenant_id = $1",
    );
    expect(out[0]!.chunk.tenantId).toBe("org_a");
    expect(out[0]!.score).toBeCloseTo(0.8);
  });

  it("rejects a dimension mismatch with a fix suggestion", async () => {
    const exec: PgvectorExecutor = { query: vi.fn(async () => []) };
    const store = new PgvectorStore({ executor: exec, embeddingDim: 4 });
    await expect(store.queryByVector("org_a", [0.1, 0.2], 3)).rejects.toThrowError(/dim/i);
  });

  it("deleteByDoc scopes by docId AND tenantId", async () => {
    const exec: PgvectorExecutor = {
      query: vi.fn(async () => [{ count: 3 }]),
    };
    const store = new PgvectorStore({ executor: exec });
    const n = await store.deleteByDoc("d", "org_a");
    expect(n).toBe(3);
    const sql = (exec.query as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(sql).toContain("doc_id = $1 AND tenant_id = $2");
  });

  it("health reports unreachable instead of throwing", async () => {
    const exec: PgvectorExecutor = {
      query: vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    };
    const store = new PgvectorStore({ executor: exec });
    const h = await store.health();
    expect(h.ok).toBe(false);
    expect(h.detail).toMatch(/unreachable/i);
  });

  it("health ok when reachable", async () => {
    const exec: PgvectorExecutor = { query: vi.fn(async () => []) };
    const store = new PgvectorStore({ executor: exec });
    expect((await store.health()).ok).toBe(true);
  });
});
