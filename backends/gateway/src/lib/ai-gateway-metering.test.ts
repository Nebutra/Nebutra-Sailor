import type { MeteringProvider } from "@nebutra/metering";
import { describe, expect, it, vi } from "vitest";
import { createAiGatewayIngestUsage } from "./ai-gateway-metering.js";

function createMeteringProvider(): MeteringProvider {
  return {
    name: "memory",
    defineMeter: vi.fn(async () => undefined),
    ingest: vi.fn(async () => undefined),
    ingestBatch: vi.fn(async () => undefined),
    getUsage: vi.fn(),
    getUsageHistory: vi.fn(),
    getQuota: vi.fn(),
    setQuota: vi.fn(),
    getBreakdown: vi.fn(),
    checkThreshold: vi.fn(),
    close: vi.fn(),
  };
}

describe("createAiGatewayIngestUsage", () => {
  it("defines the AI tokens meter once and records worker usage events", async () => {
    const metering = createMeteringProvider();
    const getMetering = vi.fn(async () => metering);
    const ingestUsage = createAiGatewayIngestUsage({ getMetering });

    await ingestUsage({
      meterId: "ignored_by_helper",
      tenantId: "org_alpha",
      value: 123,
      idempotencyKey: "req_123",
      properties: { model: "gpt-5-mini" },
    });
    await ingestUsage({
      meterId: "ai_tokens",
      tenantId: "org_alpha",
      value: 25,
      idempotencyKey: "req_124",
    });

    expect(getMetering).toHaveBeenCalledTimes(2);
    expect(metering.defineMeter).toHaveBeenCalledTimes(1);
    expect(metering.defineMeter).toHaveBeenCalledWith(expect.objectContaining({ id: "ai_tokens" }));
    expect(metering.ingest).toHaveBeenCalledTimes(2);
    expect(metering.ingest).toHaveBeenNthCalledWith(1, {
      meterId: "ai_tokens",
      tenantId: "org_alpha",
      value: 123,
      idempotencyKey: "req_123",
      properties: { model: "gpt-5-mini" },
    });
  });

  it("retries meter definition after a failed define attempt", async () => {
    const metering = createMeteringProvider();
    vi.mocked(metering.defineMeter)
      .mockRejectedValueOnce(new Error("clickhouse unavailable"))
      .mockResolvedValueOnce(undefined);
    const ingestUsage = createAiGatewayIngestUsage({ getMetering: async () => metering });

    await expect(
      ingestUsage({
        meterId: "ai_tokens",
        tenantId: "org_alpha",
        value: 10,
      }),
    ).rejects.toThrow("clickhouse unavailable");

    await ingestUsage({
      meterId: "ai_tokens",
      tenantId: "org_alpha",
      value: 10,
    });

    expect(metering.defineMeter).toHaveBeenCalledTimes(2);
    expect(metering.ingest).toHaveBeenCalledTimes(1);
  });
});
