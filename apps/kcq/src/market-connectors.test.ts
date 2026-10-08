/** Managed endpoints survive the source dialog and old browser defaults. */
import { MarketDataProviderRegistry } from "@363045841yyt/klinechart-core/market-data";
import { scopedPersistenceName } from "@363045841yyt/klinechart-core/persistence-scope";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeMarketConnectors } from "./market-connectors";

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}
afterEach(() => vi.unstubAllGlobals());

describe("production market connectors", () => {
  it("uses same-origin transports even when the source dialog clears an override", async () => {
    const registry = new MarketDataProviderRegistry();
    initializeMarketConnectors("https://kcq.nebutra.com", memoryStorage(), registry);
    expect(registry.getAll().map((provider) => provider.source.id)).toEqual([
      "gotdx",
      "tradingview",
    ]);
    registry.setConfig("gotdx", { baseUrl: undefined });
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { items: [] }, requestId: "test" })));
    vi.stubGlobal("fetch", fetch);
    await registry.getRequired("gotdx").catalog?.search({ keyword: "600519", limit: 3 });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://kcq.nebutra.com/market/tdx/api/v1/market-data/instruments/search",
    );
    expect(registry.getRequired("tradingview").source.defaultBaseUrl).toBe(
      "https://kcq.nebutra.com/market/python",
    );
  });

  it("migrates scoped localhost defaults while preserving source choices and custom endpoints", () => {
    const storage = memoryStorage();
    const key = scopedPersistenceName("klinechart.aggregation-sources");
    storage.setItem(
      key,
      JSON.stringify({
        known: ["gotdx", "tradingview"],
        enabled: ["gotdx"],
        baseUrls: { gotdx: "http://127.0.0.1:8080", tradingview: "https://my-data.example" },
      }),
    );
    storage.setItem("other-workspace", "untouched");
    initializeMarketConnectors(
      "https://kcq.nebutra.com",
      storage,
      new MarketDataProviderRegistry(),
    );
    const stored = JSON.parse(storage.getItem(key) ?? "null");
    expect(stored.baseUrls).toEqual({
      gotdx: "https://kcq.nebutra.com/market/tdx",
      tradingview: "https://my-data.example",
    });
    expect(stored.enabled).toEqual(["gotdx"]);
    expect(storage.getItem("other-workspace")).toBe("untouched");
  });

  it("leaves corrupt preferences intact without breaking chart startup", () => {
    const storage = memoryStorage();
    const key = scopedPersistenceName("klinechart.aggregation-sources");
    storage.setItem(key, "broken-json");
    expect(() =>
      initializeMarketConnectors(
        "https://kcq.nebutra.com",
        storage,
        new MarketDataProviderRegistry(),
      ),
    ).not.toThrow();
    expect(storage.getItem(key)).toBe("broken-json");
  });
});
