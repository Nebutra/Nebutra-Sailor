import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClickHouseProvider } from "../providers/clickhouse";
import type { MeterDefinition } from "../types";

// =============================================================================
// LIVE integration test — skipped unless CLICKHOUSE_INTEGRATION=true
// =============================================================================
// Requires:
//   CLICKHOUSE_INTEGRATION=true
//   CLICKHOUSE_URL=http://localhost:8123
//   CLICKHOUSE_DATABASE=nebutra_metering_test (recommended)
// =============================================================================

const isEnabled = process.env.CLICKHOUSE_INTEGRATION === "true";
const describeIf = isEnabled ? describe : describe.skip;

const API_CALLS: MeterDefinition = {
  id: "api_calls_int",
  name: "API Calls (integration)",
  type: "counter",
  unit: "requests",
  aggregation: "sum",
};

describeIf("ClickHouseProvider [integration]", () => {
  let provider: ClickHouseProvider;
  const tenantId = `int_${Date.now()}`;

  beforeAll(async () => {
    provider = new ClickHouseProvider({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
      database: process.env.CLICKHOUSE_DATABASE ?? "nebutra_metering_test",
    });
    await provider.defineMeter(API_CALLS);
  });

  afterAll(async () => {
    if (provider) await provider.close();
  });

  it("ingests, flushes, and reads back usage", async () => {
    await provider.ingest({
      meterId: API_CALLS.id,
      tenantId,
      value: 7,
      timestamp: new Date().toISOString(),
    });
    await provider.flush();

    const usage = await provider.getUsage(tenantId, API_CALLS.id, "daily");
    expect(usage).not.toBeNull();
    expect(usage?.value).toBeGreaterThanOrEqual(7);
  });

  it("setQuota + getQuota round-trip", async () => {
    await provider.setQuota(tenantId, API_CALLS.id, 1000, "monthly");
    const quota = await provider.getQuota(tenantId, API_CALLS.id, "monthly");
    expect(quota?.limit).toBe(1000);
  });
});
