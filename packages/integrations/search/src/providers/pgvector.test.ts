import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PgvectorDbAdapter, PgvectorSqlClient } from "../types";
import { PgvectorProvider } from "./pgvector";

// The whole point of this suite: the pgvector provider must reach Postgres
// only through the `db` adapter the host injects — never a `pg.Pool` (or
// any other connection) of its own. A hard dependency on a real database
// client here would also make this package unpublishable: it is public
// (npm), and @nebutra/db (this monorepo's own database package) is
// deliberately private — see tests/architecture/release-surface.test.ts
// "does not publish packages with private runtime workspace dependencies".
const poolSpy = vi.fn();

vi.mock("pg", () => {
  class Pool {
    constructor(...args: unknown[]) {
      poolSpy(...args);
    }
  }
  return { Pool, default: { Pool } };
});

function fakeClient(): PgvectorSqlClient {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  };
}

function fakeAdapter(): {
  adapter: PgvectorDbAdapter;
  getSystemDb: ReturnType<typeof vi.fn>;
  getTenantDb: ReturnType<typeof vi.fn>;
  systemClient: PgvectorSqlClient;
} {
  const systemClient = fakeClient();
  const getSystemDb = vi.fn(() => systemClient);
  const getTenantDb = vi.fn((_tenantId: string) => fakeClient());
  return { adapter: { getSystemDb, getTenantDb }, getSystemDb, getTenantDb, systemClient };
}

describe("PgvectorProvider", () => {
  beforeEach(() => {
    poolSpy.mockClear();
  });

  it("throws instead of running unconfigured — `db` is required", () => {
    // @ts-expect-error — deliberately omitting the required `db` adapter
    expect(() => new PgvectorProvider({ provider: "pgvector" })).toThrow(/db.*required/i);
  });

  it("never constructs its own pg.Pool across index/search/delete", async () => {
    const { adapter } = fakeAdapter();
    const provider = new PgvectorProvider({ provider: "pgvector", db: adapter });
    await provider.indexDocument("docs", { id: "1", tenantId: "org_1", title: "hello" });
    await provider.search("docs", { query: "hello", tenantId: "org_1" });
    await provider.deleteDocument("docs", "1", "org_1");
    await provider.deleteByFilter("docs", { tenantId: "org_1", status: "archived" });

    expect(poolSpy).not.toHaveBeenCalled();
  });

  it("routes a tenant-scoped write through db.getTenantDb(tenantId)", async () => {
    const { adapter, getTenantDb } = fakeAdapter();
    const provider = new PgvectorProvider({ provider: "pgvector", db: adapter });
    await provider.indexDocument("docs", { id: "1", tenantId: "org_1", title: "hello" });

    expect(getTenantDb).toHaveBeenCalledWith("org_1");
  });

  it("routes a tenant-scoped search through db.getTenantDb(tenantId)", async () => {
    const { adapter, getTenantDb } = fakeAdapter();
    const provider = new PgvectorProvider({ provider: "pgvector", db: adapter });
    await provider.search("docs", { query: "hello", tenantId: "org_1" });

    expect(getTenantDb).toHaveBeenCalledWith("org_1");
  });

  it("falls back to db.getSystemDb() when no tenantId is present", async () => {
    const { adapter, getSystemDb, getTenantDb } = fakeAdapter();
    const provider = new PgvectorProvider({ provider: "pgvector", db: adapter });
    await provider.indexDocument("docs", { id: "1", title: "hello" });

    expect(getTenantDb).not.toHaveBeenCalled();
    expect(getSystemDb).toHaveBeenCalled();
  });

  it("bootstraps the table/extension through db.getSystemDb(), not a tenant client", async () => {
    const { adapter, getSystemDb, getTenantDb, systemClient } = fakeAdapter();
    const provider = new PgvectorProvider({ provider: "pgvector", db: adapter });
    await provider.createIndex("docs", {});

    expect(getSystemDb).toHaveBeenCalled();
    expect(getTenantDb).not.toHaveBeenCalled();
    expect(systemClient.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("CREATE EXTENSION IF NOT EXISTS vector"),
    );
  });
});
