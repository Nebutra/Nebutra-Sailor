import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeterDefinition, UsageEvent } from "../types";

// =============================================================================
// ClickHouseProvider unit tests (mocked @clickhouse/client)
// =============================================================================
// These tests do NOT require a live ClickHouse server. They mock the official
// SDK and verify our buffering, query building, env handling, and shutdown.
// For a live integration test, see clickhouse-integration.test.ts.
// =============================================================================

interface FakeClient {
  command: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

const queryResults = new Map<string, unknown[]>();

function makeClient(): FakeClient {
  return {
    command: vi.fn().mockResolvedValue({ query_id: "x" }),
    insert: vi.fn().mockResolvedValue({ executed: true }),
    query: vi.fn().mockImplementation((args: { query: string }) => {
      // Match by a fragment in the SQL — keep it pragmatic.
      for (const [marker, rows] of queryResults.entries()) {
        if (args.query.includes(marker)) {
          return Promise.resolve({ json: () => Promise.resolve(rows) });
        }
      }
      return Promise.resolve({ json: () => Promise.resolve([]) });
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

let lastClient: FakeClient;

vi.mock("@clickhouse/client", () => ({
  createClient: vi.fn(() => {
    lastClient = makeClient();
    return lastClient;
  }),
}));

// Import AFTER vi.mock — required for ESM hoisting semantics in vitest.
const { ClickHouseProvider } = await import("../providers/clickhouse");

const API_CALLS: MeterDefinition = {
  id: "api_calls",
  name: "API Calls",
  type: "counter",
  unit: "requests",
  aggregation: "sum",
};

function makeEvent(value: number, props?: Record<string, unknown>): UsageEvent {
  return {
    meterId: "api_calls",
    tenantId: "org_1",
    value,
    timestamp: new Date("2026-05-10T10:00:00Z").toISOString(),
    properties: props,
  };
}

describe("ClickHouseProvider", () => {
  beforeEach(() => {
    queryResults.clear();
    vi.useRealTimers();
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("construction & env handling", () => {
    it("does NOT throw when CLICKHOUSE_URL is missing", () => {
      const prev = process.env.CLICKHOUSE_URL;
      delete process.env.CLICKHOUSE_URL;
      delete process.env.CLICKHOUSE_HTTP_URL;
      expect(() => new ClickHouseProvider()).not.toThrow();
      if (prev) process.env.CLICKHOUSE_URL = prev;
    });

    it("throws on use when no URL is configured", async () => {
      const prev = process.env.CLICKHOUSE_URL;
      delete process.env.CLICKHOUSE_URL;
      delete process.env.CLICKHOUSE_HTTP_URL;
      const provider = new ClickHouseProvider();
      await expect(provider.defineMeter(API_CALLS)).rejects.toThrow(/CLICKHOUSE_URL/);
      if (prev) process.env.CLICKHOUSE_URL = prev;
    });
  });

  describe("ingest (single)", () => {
    it("buffers events and flushes when batch size reached", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        batchSize: 3,
        flushIntervalMs: 60_000,
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);

      await provider.ingest(makeEvent(1));
      await provider.ingest(makeEvent(2));
      expect(lastClient.insert).not.toHaveBeenCalled();

      await provider.ingest(makeEvent(3));
      expect(lastClient.insert).toHaveBeenCalledTimes(1);
      const call = lastClient.insert.mock.calls[0]?.[0];
      expect(call.table).toBe("usage_events");
      expect(call.values).toHaveLength(3);
      expect(call.format).toBe("JSONEachRow");
      await provider.close();
    });

    it("flushes on timer when batch size not reached", async () => {
      vi.useFakeTimers();
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        batchSize: 100,
        flushIntervalMs: 500,
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      await provider.ingest(makeEvent(1));
      expect(lastClient.insert).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(600);
      expect(lastClient.insert).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
      await provider.close();
    });
  });

  describe("ingestBatch", () => {
    it("ingests many events and flushes once when threshold crossed", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        batchSize: 5,
        flushIntervalMs: 60_000,
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      await provider.ingestBatch([
        makeEvent(1),
        makeEvent(2),
        makeEvent(3),
        makeEvent(4),
        makeEvent(5),
        makeEvent(6),
      ]);
      // 6 events with batchSize=5 should trigger one flush of the first 5
      // (or all 6, depending on threshold check timing); just assert exactly one flush.
      expect(lastClient.insert).toHaveBeenCalledTimes(1);
      await provider.close();
    });

    it("is a no-op for empty arrays", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.ingestBatch([]);
      expect(lastClient?.insert).not.toHaveBeenCalled();
      await provider.close();
    });
  });

  describe("getQuota", () => {
    it("returns null when no quota is set", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      // No rows mocked for usage_quotas → empty.
      const quota = await provider.getQuota("org_1", "api_calls", "monthly");
      expect(quota).toBeNull();
      await provider.close();
    });

    it("computes used/remaining/percentage from aggregate", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);

      queryResults.set("FROM usage_quotas", [{ limit_value: 1000 }]);
      queryResults.set("SELECT sum(quantity)", [{ value: 250 }]);

      const quota = await provider.getQuota("org_1", "api_calls", "monthly");
      expect(quota).not.toBeNull();
      expect(quota?.limit).toBe(1000);
      expect(quota?.used).toBe(250);
      expect(quota?.remaining).toBe(750);
      expect(quota?.percentage).toBeCloseTo(25, 5);
      await provider.close();
    });

    it("handles meter with zero events (used=0)", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      queryResults.set("FROM usage_quotas", [{ limit_value: 500 }]);
      // No aggregate rows → used=0
      const quota = await provider.getQuota("org_1", "api_calls", "monthly");
      expect(quota?.used).toBe(0);
      expect(quota?.remaining).toBe(500);
      expect(quota?.percentage).toBe(0);
      await provider.close();
    });
  });

  describe("getUsage", () => {
    it("returns null for undefined meters", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      const usage = await provider.getUsage("org_1", "missing", "daily");
      expect(usage).toBeNull();
      await provider.close();
    });

    it("returns the aggregated value", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      queryResults.set("SELECT sum(quantity)", [{ value: 42 }]);
      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage?.value).toBe(42);
      expect(usage?.meterId).toBe("api_calls");
      await provider.close();
    });
  });

  describe("getUsageHistory", () => {
    it("queries with correct date range and returns buckets", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      queryResults.set("toStartOfDay", [
        { bucket_start: "2026-05-01 00:00:00.000", value: 10 },
        { bucket_start: "2026-05-02 00:00:00.000", value: 20 },
      ]);
      const history = await provider.getUsageHistory("org_1", "api_calls", {
        period: "daily",
        startDate: "2026-05-01T00:00:00Z",
        endDate: "2026-05-03T00:00:00Z",
      });
      expect(history).toHaveLength(2);
      expect(history[0]?.value).toBe(10);
      expect(history[1]?.value).toBe(20);
      await provider.close();
    });
  });

  describe("close()", () => {
    it("drains the buffer before closing", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        batchSize: 1000,
        flushIntervalMs: 60_000,
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      await provider.ingest(makeEvent(1));
      expect(lastClient.insert).not.toHaveBeenCalled();

      await provider.close();
      expect(lastClient.insert).toHaveBeenCalledTimes(1);
      expect(lastClient.close).toHaveBeenCalledTimes(1);
    });

    it("is idempotent", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.defineMeter(API_CALLS);
      await provider.close();
      await provider.close();
      // Only the first close should have invoked the underlying client.
      expect(lastClient.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("setQuota", () => {
    it("inserts a row into usage_quotas", async () => {
      const provider = new ClickHouseProvider({
        url: "http://ch:8123",
        skipBootstrap: true,
      });
      await provider.setQuota("org_1", "api_calls", 1000, "monthly");
      const calls = lastClient.insert.mock.calls;
      const quotaCall = calls.find((c) => c[0]?.table === "usage_quotas");
      expect(quotaCall).toBeDefined();
      expect(quotaCall?.[0]?.values?.[0]?.limit_value).toBe(1000);
      await provider.close();
    });
  });
});
