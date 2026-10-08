import { describe, expect, it, vi } from "vitest";
import { TwelveDataAdapter } from "./twelve-data.js";

describe("Twelve Data server adapter", () => {
  it("uses a header key and normalizes sorted UTC bars with an exclusive cursor", async () => {
    const upstream = vi.fn<typeof fetch>(async () =>
      Response.json({
        status: "ok",
        values: [
          { datetime: "2026-10-08", open: "2", high: "3", low: "1", close: "2.5", volume: "40" },
          { datetime: "2026-10-07", open: "1", high: "2", low: "1", close: "2", volume: "20" },
        ],
      }),
    );
    const adapter = new TwelveDataAdapter(upstream);
    const data = await adapter.bars("secret-key", {
      instrument: { id: "AAPL@NASDAQ", symbol: "AAPL", exchange: "NASDAQ" },
      period: "daily",
      adjustment: "none",
      barAggregation: "original",
      limit: 5,
      beforeTimestamp: Date.parse("2026-10-08T00:00:00Z"),
    });
    expect(data.items).toEqual([
      {
        timestamp: Date.parse("2026-10-07T00:00:00Z"),
        open: 1,
        high: 2,
        low: 1,
        close: 2,
        volume: 20,
      },
    ]);
    const call = upstream.mock.calls[0];
    if (!call) throw new Error("missing provider request");
    const [url, options] = call;
    expect(String(url)).not.toContain("secret-key");
    expect(new Headers(options?.headers).get("Authorization")).toBe("apikey secret-key");
    expect(new URL(String(url)).searchParams.get("timezone")).toBe("UTC");
  });
  it("preserves the US daily exchange date in UTC timestamps", async () => {
    const adapter = new TwelveDataAdapter(async () =>
      Response.json({
        meta: { exchange_timezone: "America/New_York" },
        values: [{ datetime: "2026-10-07", open: "1", high: "2", low: "1", close: "2" }],
      }),
    );
    const data = await adapter.bars("key", {
      instrument: { id: "AAPL", symbol: "AAPL", exchange: "NASDAQ" },
      period: "daily",
      adjustment: "none",
      barAggregation: "original",
      limit: 1,
    });
    expect(data.items[0]?.timestamp).toBe(Date.parse("2026-10-07T04:00:00Z"));
  });
  it.each([
    401, 403, 429, 500,
  ])("redacts upstream errors (%i), with no platform fallback", async (status) => {
    const upstream = vi.fn<typeof fetch>(async () =>
      Response.json({ status: "error", message: "secret-key", code: status }),
    );
    await expect(new TwelveDataAdapter(upstream).probe("secret-key")).rejects.toThrow(/行情源/);
    expect(upstream).toHaveBeenCalledOnce();
  });
  it("rejects unadvertised capabilities before spending provider quota", async () => {
    const upstream = vi.fn<typeof fetch>();
    await expect(
      new TwelveDataAdapter(upstream).bars("key", {
        instrument: { id: "AAPL", symbol: "AAPL", exchange: "NASDAQ" },
        period: "daily",
        adjustment: "none",
        barAggregation: "heikinAshi",
        limit: 5,
      }),
    ).rejects.toThrow("不支持");
    expect(upstream).not.toHaveBeenCalled();
  });
});
