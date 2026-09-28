import { logger } from "@nebutra/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PgvectorDbAdapter, PgvectorSqlClient } from "../types";
import { PgvectorProvider } from "./pgvector";

// The whole point of this suite: the pgvector provider should reach Postgres
// through the `db` adapter the host injects, not a `pg.Pool` of its own — a
// hard dependency on a real database client here would also make this
// package unpublishable: it is public (npm), and @nebutra/db (this
// monorepo's own database package) is deliberately private — see
// tests/architecture/release-surface.test.ts "does not publish packages
// with private runtime workspace dependencies". Omitting `db` is a
// deprecated backward-compat fallback (pre-3.1 behaviour): it DOES
// construct its own pg.Pool, and that path is covered separately below.
const poolSpy = vi.fn();
const poolQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const poolOn = vi.fn();
const poolEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => {
  class Pool {
    constructor(...args: unknown[]) {
      poolSpy(...args);
    }
    query(...args: unknown[]) {
      return poolQuery(...args);
    }
    on(...args: unknown[]) {
      return poolOn(...args);
    }
    end(...args: unknown[]) {
      return poolEnd(...args);
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

describe("PgvectorProvider — db adapter injected (preferred)", () => {
  beforeEach(() => {
    poolSpy.mockClear();
    poolQuery.mockClear();
    poolOn.mockClear();
    poolEnd.mockClear();
  });

  it("never constructs its own pg.Pool across index/search/delete", async () => {
    const { adapter } = fakeAdapter();
    const provider = new PgvectorProvider({ provider: "pgvector", db: adapter });
    await provider.indexDocument("docs", { id: "1", tenantId: "org_1", title: "hello" });
    await provider.search("docs", { query: "hello", tenantId: "org_1" });
    await provider.deleteDocument("docs", "1", "org_1");
    await provider.deleteByFilter("docs", { tenantId: "org_1", status: "archived" });
    await provider.close();

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

describe("PgvectorProvider — no db given (deprecated pg.Pool fallback)", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    poolSpy.mockClear();
    poolQuery.mockClear();
    poolOn.mockClear();
    poolEnd.mockClear();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("throws when there is no db, no connectionString, and no DATABASE_URL", () => {
    expect(() => new PgvectorProvider({ provider: "pgvector" })).toThrow(
      /no.*db.*adapter.*connectionString/is,
    );
    expect(poolSpy).not.toHaveBeenCalled();
  });

  it("constructs its own pg.Pool from `connectionString` for backward compatibility, and logs a deprecation warning", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    try {
      const provider = new PgvectorProvider({
        provider: "pgvector",
        connectionString: "postgres://test/db",
      });
      await provider.createIndex("docs", {});

      expect(poolSpy).toHaveBeenCalledWith({ connectionString: "postgres://test/db" });
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining("CREATE EXTENSION IF NOT EXISTS vector"),
        [],
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/deprecated/i));

      await provider.close();
      expect(poolEnd).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("constructs its own pg.Pool from DATABASE_URL when connectionString is also omitted", () => {
    process.env.DATABASE_URL = "postgres://from-env/db";
    new PgvectorProvider({ provider: "pgvector" });

    expect(poolSpy).toHaveBeenCalledWith({ connectionString: "postgres://from-env/db" });
  });
});
