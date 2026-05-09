import { beforeEach, describe, expect, it } from "vitest";
import { MemoryProvider } from "../providers/memory";
import type { MeterDefinition, UsageEvent } from "../types";

const API_CALLS_METER: MeterDefinition = {
  id: "api_calls",
  name: "API Calls",
  type: "counter",
  unit: "requests",
  aggregation: "sum",
};

const AI_TOKENS_METER: MeterDefinition = {
  id: "ai_tokens",
  name: "AI Tokens",
  type: "counter",
  unit: "tokens",
  aggregation: "sum",
};

function makeEvent(
  meterId: string,
  tenantId: string,
  value: number,
  properties?: Record<string, unknown>,
): UsageEvent {
  return {
    meterId,
    tenantId,
    value,
    timestamp: new Date().toISOString(),
    properties,
  };
}

describe("MemoryProvider", () => {
  let provider: MemoryProvider;

  beforeEach(() => {
    provider = new MemoryProvider();
  });

  describe("defineMeter", () => {
    it("registers a meter definition", async () => {
      await provider.defineMeter(API_CALLS_METER);
      // Meter should now be queryable
      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage).not.toBeNull();
      expect(usage?.value).toBe(0);
    });
  });

  describe("ingest", () => {
    it("stores a usage event", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.ingest(makeEvent("api_calls", "org_1", 1));

      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage?.value).toBe(1);
    });

    it("sums counter values", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.ingest(makeEvent("api_calls", "org_1", 5));
      await provider.ingest(makeEvent("api_calls", "org_1", 3));
      await provider.ingest(makeEvent("api_calls", "org_1", 7));

      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage?.value).toBe(15);
    });

    it("isolates tenants", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.ingest(makeEvent("api_calls", "org_1", 10));
      await provider.ingest(makeEvent("api_calls", "org_2", 20));

      const usage1 = await provider.getUsage("org_1", "api_calls", "daily");
      const usage2 = await provider.getUsage("org_2", "api_calls", "daily");
      expect(usage1?.value).toBe(10);
      expect(usage2?.value).toBe(20);
    });

    it("isolates meters", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.defineMeter(AI_TOKENS_METER);
      await provider.ingest(makeEvent("api_calls", "org_1", 5));
      await provider.ingest(makeEvent("ai_tokens", "org_1", 1000));

      const apiUsage = await provider.getUsage("org_1", "api_calls", "daily");
      const aiUsage = await provider.getUsage("org_1", "ai_tokens", "daily");
      expect(apiUsage?.value).toBe(5);
      expect(aiUsage?.value).toBe(1000);
    });
  });

  describe("ingestBatch", () => {
    it("ingests multiple events at once", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.ingestBatch([
        makeEvent("api_calls", "org_1", 1),
        makeEvent("api_calls", "org_1", 2),
        makeEvent("api_calls", "org_1", 3),
      ]);

      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage?.value).toBe(6);
    });
  });

  describe("getUsage", () => {
    it("returns null for undefined meters", async () => {
      const usage = await provider.getUsage("org_1", "nonexistent", "daily");
      expect(usage).toBeNull();
    });

    it("returns zero for meters with no events", async () => {
      await provider.defineMeter(API_CALLS_METER);
      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage?.value).toBe(0);
    });

    it("includes period boundaries in response", async () => {
      await provider.defineMeter(API_CALLS_METER);
      const usage = await provider.getUsage("org_1", "api_calls", "daily");
      expect(usage?.periodStart).toBeDefined();
      expect(usage?.periodEnd).toBeDefined();
    });
  });

  describe("quota management", () => {
    it("sets and retrieves quotas", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.setQuota("org_1", "api_calls", 1000, "monthly");

      const quota = await provider.getQuota("org_1", "api_calls", "monthly");
      expect(quota).not.toBeNull();
      expect(quota?.limit).toBe(1000);
      expect(quota?.used).toBe(0);
      expect(quota?.remaining).toBe(1000);
      expect(quota?.percentage).toBe(0);
    });

    it("tracks usage against quota", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.setQuota("org_1", "api_calls", 100, "daily");
      await provider.ingest(makeEvent("api_calls", "org_1", 60));

      const quota = await provider.getQuota("org_1", "api_calls", "daily");
      expect(quota?.used).toBe(60);
      expect(quota?.remaining).toBe(40);
      expect(quota?.percentage).toBe(60);
    });

    it("returns null for unset quotas", async () => {
      const quota = await provider.getQuota("org_1", "api_calls", "daily");
      expect(quota).toBeNull();
    });
  });

  describe("threshold alerting", () => {
    it("triggers alert when usage exceeds threshold", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.setQuota("org_1", "api_calls", 100, "daily");
      await provider.ingest(makeEvent("api_calls", "org_1", 85));

      const alert = await provider.checkThreshold("org_1", "api_calls", 0.8, "daily");
      expect(alert).not.toBeNull();
      expect(alert?.threshold).toBe(0.8);
      expect(alert?.currentUsage).toBe(85);
      expect(alert?.limit).toBe(100);
    });

    it("does not trigger when below threshold", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.setQuota("org_1", "api_calls", 100, "daily");
      await provider.ingest(makeEvent("api_calls", "org_1", 50));

      const alert = await provider.checkThreshold("org_1", "api_calls", 0.8, "daily");
      expect(alert).toBeNull();
    });

    it("returns null when no quota exists", async () => {
      const alert = await provider.checkThreshold("org_1", "api_calls", 0.8, "daily");
      expect(alert).toBeNull();
    });
  });

  describe("breakdown", () => {
    it("breaks down usage by dimension", async () => {
      await provider.defineMeter(API_CALLS_METER);
      await provider.ingest(makeEvent("api_calls", "org_1", 5, { endpoint: "/api/chat" }));
      await provider.ingest(makeEvent("api_calls", "org_1", 3, { endpoint: "/api/chat" }));
      await provider.ingest(makeEvent("api_calls", "org_1", 2, { endpoint: "/api/embed" }));

      const breakdown = await provider.getBreakdown("org_1", "api_calls", "endpoint", "daily");
      expect(breakdown["/api/chat"]).toBe(8);
      expect(breakdown["/api/embed"]).toBe(2);
    });

    it("returns empty for undefined meters", async () => {
      const breakdown = await provider.getBreakdown("org_1", "nonexistent", "endpoint", "daily");
      expect(breakdown).toEqual({});
    });
  });

  describe("close", () => {
    it("resolves without error", async () => {
      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
