import { describe, expect, it } from "vitest";
import {
  decodeIssuedKey,
  decodeKeyList,
  decodeUsageByKey,
  decodeUsageHistory,
  decodeUsageRecords,
  decodeUsageSummary,
  decodeWallet,
  usageExportHref,
} from "@/lib/console-api";

/**
 * The decoders are the console's boundary. Their job is to make a wrong shape
 * fail loudly here rather than quietly three renders later, and to keep "we do
 * not know" (`null`) distinct from "it is zero".
 */

describe("decodeUsageSummary", () => {
  it("reads the route's shape", () => {
    expect(
      decodeUsageSummary({
        window: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-08T00:00:00.000Z" },
        totalCost: 4.125,
        totalTokens: 91_204,
        promptTokens: 80_000,
        completionTokens: 11_204,
        requestCount: 42,
        currency: "USD",
      }),
    ).toMatchObject({ totalCost: 4.125, requestCount: 42, currency: "USD" });
  });

  it("survives a body that is not the body", () => {
    const decoded = decodeUsageSummary(null);
    expect(decoded.totalCost).toBe(0);
    expect(decoded.currency).toBe("USD");
    expect(decoded.window).toEqual({ from: "", to: "" });
  });

  it("reads a Prisma decimal that arrived as a string", () => {
    expect(decodeUsageSummary({ totalCost: "0.004200" }).totalCost).toBeCloseTo(0.0042);
  });
});

describe("decodeUsageRecords", () => {
  it("keeps an unpriced row's unit cost null instead of calling it free", () => {
    const page = decodeUsageRecords({
      rows: [
        {
          id: "led_1",
          occurredAt: "2026-09-08T14:00:00.000Z",
          model: "gpt-5",
          keyId: "key_1",
          requestId: "req_1",
          promptTokens: 12,
          completionTokens: 30,
          cachedPromptTokens: 0,
          cacheWriteTokens: 0,
          latencyMs: 812,
          status: 200,
          unitCost: null,
          totalCost: 0.0004,
          currency: "USD",
        },
      ],
      nextCursor: null,
    });
    expect(page.rows[0]?.unitCost).toBeNull();
    expect(page.rows[0]?.totalCost).toBeCloseTo(0.0004);
    expect(page.nextCursor).toBeNull();
  });

  it("returns an empty page for a body with no rows array", () => {
    expect(decodeUsageRecords({})).toEqual({ rows: [], nextCursor: null });
  });
});

describe("decodeUsageHistory", () => {
  it("keeps zero buckets, so a gap reads as `nothing spent`", () => {
    const history = decodeUsageHistory({
      window: { from: "a", to: "b" },
      granularity: "hour",
      buckets: [
        { bucket: "2026-09-08T13:00:00.000Z", cost: 0, requests: 0, tokens: 0 },
        { bucket: "2026-09-08T14:00:00.000Z", cost: 0.5, requests: 2, tokens: 90 },
      ],
    });
    expect(history.granularity).toBe("hour");
    expect(history.buckets).toHaveLength(2);
  });

  it("falls back to daily for an unknown granularity", () => {
    expect(decodeUsageHistory({ granularity: "fortnight" }).granularity).toBe("day");
  });
});

describe("decodeUsageByKey", () => {
  it("keeps a deleted key's spend, with a null name rather than a fabricated one", () => {
    const rows = decodeUsageByKey({
      rows: [{ keyId: "key_gone", name: null, keyPrefix: null, cost: 1.5, requests: 3 }],
    });
    expect(rows[0]).toMatchObject({ keyId: "key_gone", name: null, keyPrefix: null, cost: 1.5 });
  });
});

describe("decodeKeyList", () => {
  const row = {
    id: "key_1",
    name: "prod",
    keyPrefix: "sk-sailor-ab",
    scopes: ["models:*"],
    status: "disabled",
    rateLimitRps: 10,
    saveLogs: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    lastUsedAt: null,
    expiresAt: null,
    limits: { total: null, daily: 5 },
    cost: { daily: 1.25, total: 9.5 },
  };

  it("reads a row whole", () => {
    expect(decodeKeyList({ keys: [row] })[0]).toEqual({
      ...row,
      status: "disabled",
    });
  });

  it("clamps an unknown status rather than rendering it raw", () => {
    expect(decodeKeyList({ keys: [{ ...row, status: "on-fire" }] })[0]?.status).toBe("active");
  });

  it("gives an absent list an empty array, not undefined", () => {
    expect(decodeKeyList({})).toEqual([]);
    expect(decodeKeyList(null)).toEqual([]);
  });

  it("carries the one-time plaintext off a create response", () => {
    expect(decodeIssuedKey({ ...row, fullKey: "sk-sailor-secret" }).fullKey).toBe(
      "sk-sailor-secret",
    );
  });
});

describe("decodeWallet", () => {
  it("defaults the currency but never the balance's precision", () => {
    expect(decodeWallet({ balance: 12.345678 })).toEqual({ balance: 12.345678, currency: "USD" });
  });
});

describe("usageExportHref", () => {
  it("carries the same filters the table is showing", () => {
    const href = usageExportHref({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-08T00:00:00.000Z",
      model: "gpt-5",
      keyId: null,
    });
    expect(href).toContain("/api/console/v1/usage/export?");
    expect(href).toContain("model=gpt-5");
    expect(href).not.toContain("keyId");
  });
});
