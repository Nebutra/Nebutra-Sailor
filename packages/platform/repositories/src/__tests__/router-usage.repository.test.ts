/**
 * The Router console's aggregates, against a real Prisma client.
 *
 * Three things have to be true or the console lies to a paying customer:
 *
 * 1. **The window is half-open.** `from` inclusive, `to` exclusive — otherwise
 *    a request on a boundary is counted in two consecutive months and the
 *    monthly totals do not add up to the yearly one.
 * 2. **Buckets are UTC.** The per-key daily cap the edge enforces resets at
 *    midnight UTC. A chart bucketed in the server's local time would show
 *    yesterday's spend against today's cap.
 * 3. **Money comes from `total_cost`, never from a re-derived price.** The
 *    ledger is what the customer was charged.
 */
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { monthToDateWindow, RouterUsageRepository } from "../router-usage.repository";
import { ROUTER_DDL } from "./router-schema";

const TENANT = "tenant_1";
const OTHER = "tenant_2";
const KEY_A = "key_a";
const KEY_B = "key_b";

interface Row {
  at: string;
  cost: number;
  model?: string;
  keyId?: string;
  prompt?: number;
  completion?: number;
  status?: number;
  tenantId?: string;
  product?: string;
}

describe("RouterUsageRepository (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;
  let repository: RouterUsageRepository;
  let seq = 0;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(ROUTER_DDL);
    repository = new RouterUsageRepository(database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    seq = 0;
    await database.prisma.$executeRawUnsafe("TRUNCATE usage_ledger_entries, api_keys");
    await database.prisma.$executeRawUnsafe(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, tenant_id) VALUES
         ('${KEY_A}', 'primary', 'h_a', 'sk-sailor-a', '${TENANT}'),
         ('${KEY_B}', 'batch',   'h_b', 'sk-sailor-b', '${TENANT}')`,
    );
  });

  async function seed(rows: Row[]): Promise<void> {
    for (const row of rows) {
      seq += 1;
      await database.prisma.usageLedgerEntry.create({
        data: {
          id: `ule_${seq}`,
          tenantId: row.tenantId ?? TENANT,
          idempotencyKey: `router:req_${seq}`,
          source: "API",
          type: "AI_TOKEN",
          resource: row.model ?? "gpt-x",
          quantity: BigInt(row.prompt ?? 0) + BigInt(row.completion ?? 0),
          unit: "token",
          unitCost: 0.000_001,
          totalCost: row.cost,
          currency: "USD",
          occurredAt: new Date(row.at),
          metadata: {
            product: row.product ?? "router",
            keyId: row.keyId ?? KEY_A,
            requestId: `req_${seq}`,
            promptTokens: row.prompt ?? 0,
            completionTokens: row.completion ?? 0,
            cachedPromptTokens: 0,
            cacheWriteTokens: 0,
            latencyMs: 120,
            status: row.status ?? 200,
          },
        },
      });
    }
  }

  const AUG = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-09-01T00:00:00Z") };

  describe("summary", () => {
    it("adds up cost, requests and tokens over the window", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 0.5, prompt: 100, completion: 20 },
        { at: "2026-08-03T10:00:00Z", cost: 0.25, prompt: 40, completion: 10 },
      ]);
      await expect(repository.summary({ tenantId: TENANT, ...AUG })).resolves.toEqual({
        totalCost: 0.75,
        promptTokens: 140,
        completionTokens: 30,
        totalTokens: 170,
        requestCount: 2,
        currency: "USD",
      });
    });

    it("includes the instant at `from` and excludes the instant at `to`", async () => {
      await seed([
        { at: "2026-08-01T00:00:00.000Z", cost: 1 },
        { at: "2026-08-31T23:59:59.999Z", cost: 2 },
        { at: "2026-09-01T00:00:00.000Z", cost: 4 },
        { at: "2026-07-31T23:59:59.999Z", cost: 8 },
      ]);
      const august = await repository.summary({ tenantId: TENANT, ...AUG });
      expect(august.totalCost).toBe(3);
      expect(august.requestCount).toBe(2);

      // The boundary row belongs to exactly one of the two windows.
      const september = await repository.summary({
        tenantId: TENANT,
        from: new Date("2026-09-01T00:00:00Z"),
        to: new Date("2026-10-01T00:00:00Z"),
      });
      expect(september.totalCost).toBe(4);
    });

    it("never counts another tenant's spend", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 1 },
        { at: "2026-08-02T10:00:00Z", cost: 99, tenantId: OTHER },
      ]);
      await expect(repository.summary({ tenantId: TENANT, ...AUG })).resolves.toMatchObject({
        totalCost: 1,
      });
    });

    it("ignores ledger rows that were not written by the Router", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 1 },
        { at: "2026-08-02T11:00:00Z", cost: 7, product: "gateway" },
      ]);
      await expect(repository.summary({ tenantId: TENANT, ...AUG })).resolves.toMatchObject({
        totalCost: 1,
        requestCount: 1,
      });
    });

    it("reports zeros rather than nulls for a tenant that has never called", async () => {
      await expect(repository.summary({ tenantId: TENANT, ...AUG })).resolves.toEqual({
        totalCost: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 0,
        currency: "USD",
      });
    });
  });

  describe("byModel", () => {
    it("groups by model, most expensive first", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 0.1, model: "cheap", prompt: 10 },
        { at: "2026-08-02T11:00:00Z", cost: 0.9, model: "dear", prompt: 20, completion: 5 },
        { at: "2026-08-02T12:00:00Z", cost: 0.4, model: "dear", prompt: 30 },
      ]);
      const rows = await repository.byModel({ tenantId: TENANT, ...AUG });
      expect(rows).toEqual([
        {
          model: "dear",
          cost: 1.3,
          requests: 2,
          promptTokens: 50,
          completionTokens: 5,
        },
        { model: "cheap", cost: 0.1, requests: 1, promptTokens: 10, completionTokens: 0 },
      ]);
    });
  });

  describe("byKey", () => {
    it("attributes spend to the key that made it, with its name", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 1, keyId: KEY_A },
        { at: "2026-08-02T11:00:00Z", cost: 2, keyId: KEY_B },
        { at: "2026-08-02T12:00:00Z", cost: 0.5, keyId: KEY_B },
      ]);
      const rows = await repository.byKey({ tenantId: TENANT, ...AUG });
      expect(rows).toEqual([
        { keyId: KEY_B, name: "batch", keyPrefix: "sk-sailor-b", cost: 2.5, requests: 2 },
        { keyId: KEY_A, name: "primary", keyPrefix: "sk-sailor-a", cost: 1, requests: 1 },
      ]);
    });

    it("still reports spend from a key that no longer exists", async () => {
      await seed([{ at: "2026-08-02T10:00:00Z", cost: 3, keyId: "key_gone" }]);
      await expect(repository.byKey({ tenantId: TENANT, ...AUG })).resolves.toEqual([
        { keyId: "key_gone", name: null, keyPrefix: null, cost: 3, requests: 1 },
      ]);
    });
  });

  describe("history", () => {
    it("buckets by UTC day, not by the server's local day", async () => {
      await seed([
        { at: "2026-08-02T00:00:00Z", cost: 1 },
        { at: "2026-08-02T23:59:59Z", cost: 2 },
        { at: "2026-08-03T00:00:00Z", cost: 4 },
      ]);
      const buckets = await repository.history({ tenantId: TENANT, ...AUG }, "day");
      expect(
        buckets.map((bucket) => [bucket.bucket.toISOString(), bucket.cost, bucket.requests]),
      ).toEqual([
        ["2026-08-02T00:00:00.000Z", 3, 2],
        ["2026-08-03T00:00:00.000Z", 4, 1],
      ]);
    });

    it("buckets by UTC hour when asked", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 1, prompt: 5, completion: 5 },
        { at: "2026-08-02T10:59:59Z", cost: 2, prompt: 1, completion: 1 },
        { at: "2026-08-02T11:00:00Z", cost: 4 },
      ]);
      const buckets = await repository.history({ tenantId: TENANT, ...AUG }, "hour");
      expect(
        buckets.map((bucket) => [bucket.bucket.toISOString(), bucket.cost, bucket.tokens]),
      ).toEqual([
        ["2026-08-02T10:00:00.000Z", 3, 12],
        ["2026-08-02T11:00:00.000Z", 4, 0],
      ]);
    });

    it("returns only the buckets that have data — gap filling is the caller's job", async () => {
      await seed([{ at: "2026-08-05T10:00:00Z", cost: 1 }]);
      const buckets = await repository.history({ tenantId: TENANT, ...AUG }, "day");
      expect(buckets).toHaveLength(1);
    });
  });

  describe("records", () => {
    it("returns the detail row the /usage table renders", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 0.5, model: "gpt-x", prompt: 100, completion: 20 },
      ]);
      const { rows } = await repository.records({ tenantId: TENANT, ...AUG });
      expect(rows[0]).toMatchObject({
        model: "gpt-x",
        keyId: KEY_A,
        requestId: "req_1",
        promptTokens: 100,
        completionTokens: 20,
        latencyMs: 120,
        status: 200,
        unit: "token",
        totalCost: 0.5,
        currency: "USD",
        type: "AI_TOKEN",
      });
    });

    it("pages newest first without repeating or dropping a row", async () => {
      await seed(
        Array.from({ length: 5 }, (_, i) => ({
          at: `2026-08-0${i + 1}T10:00:00Z`,
          cost: i + 1,
        })),
      );
      const first = await repository.records({ tenantId: TENANT, ...AUG, limit: 2 });
      expect(first.rows.map((row) => row.totalCost)).toEqual([5, 4]);
      expect(first.nextCursor).toBeTruthy();

      const second = await repository.records({
        tenantId: TENANT,
        ...AUG,
        limit: 2,
        cursor: first.nextCursor as string,
      });
      expect(second.rows.map((row) => row.totalCost)).toEqual([3, 2]);

      const third = await repository.records({
        tenantId: TENANT,
        ...AUG,
        limit: 2,
        cursor: second.nextCursor as string,
      });
      expect(third.rows.map((row) => row.totalCost)).toEqual([1]);
      expect(third.nextCursor).toBeNull();
    });

    it("filters by model, key and status", async () => {
      await seed([
        { at: "2026-08-02T10:00:00Z", cost: 1, model: "a", keyId: KEY_A, status: 200 },
        { at: "2026-08-02T11:00:00Z", cost: 2, model: "b", keyId: KEY_A, status: 200 },
        { at: "2026-08-02T12:00:00Z", cost: 3, model: "a", keyId: KEY_B, status: 402 },
      ]);
      await expect(
        repository.records({ tenantId: TENANT, ...AUG, model: "a" }),
      ).resolves.toMatchObject({ rows: [{ totalCost: 3 }, { totalCost: 1 }] });
      await expect(
        repository.records({ tenantId: TENANT, ...AUG, keyId: KEY_B }),
      ).resolves.toMatchObject({ rows: [{ totalCost: 3 }] });
      await expect(
        repository.records({ tenantId: TENANT, ...AUG, status: 402 }),
      ).resolves.toMatchObject({ rows: [{ totalCost: 3 }] });
    });
  });
});

describe("monthToDateWindow", () => {
  it("starts at the first instant of the UTC month, whatever the local zone", () => {
    const { from, to } = monthToDateWindow(new Date("2026-09-08T04:00:00Z"));
    expect(from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    // Exclusive end just past `now`, so the request being served still counts.
    expect(to.getTime()).toBe(new Date("2026-09-08T04:00:00Z").getTime() + 1);
  });

  it("does not roll into the previous month at the start of a UTC day", () => {
    const { from } = monthToDateWindow(new Date("2026-09-01T00:00:00.000Z"));
    expect(from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});
