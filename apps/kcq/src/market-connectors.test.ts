/** Managed endpoints survive the source dialog and old browser defaults. */
import {
  type InstrumentDescriptor,
  MarketDataProviderRegistry,
} from "@363045841yyt/klinechart-core/market-data";
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
      "binance",
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

  it("streams live bars from the same-origin connector with the resolved instrument", () => {
    const registry = new MarketDataProviderRegistry();
    initializeMarketConnectors("https://kcq.nebutra.com", memoryStorage(), registry);
    const urls: string[] = [];
    vi.stubGlobal(
      "EventSource",
      class {
        onopen = null;
        onerror = null;
        onmessage = null;
        constructor(url: string) {
          urls.push(url);
        }
        close() {}
      },
    );
    const stream = registry.getRequired("gotdx").liveBars?.createStream({
      symbol: "000001",
      period: "5min",
      barAggregation: "original",
      instrumentId: "gotdx:SZ:000001",
    });
    stream?.connect();
    stream?.destroy();
    expect(urls).toEqual([
      "https://kcq.nebutra.com/market/tdx/api/v1/market-data/sources/gotdx/stream?symbol=000001&period=5min&barAggregation=original&instrumentId=gotdx%3ASZ%3A000001",
    ]);
  });

  it("keeps Binance trade history and streams on the hosted endpoint after resetting overrides", async () => {
    const registry = new MarketDataProviderRegistry();
    initializeMarketConnectors("https://kcq.nebutra.com", memoryStorage(), registry);
    registry.setConfig("binance", { baseUrl: undefined });
    const provider = registry.getRequired("binance");
    expect(provider.source.defaultBaseUrl).toBe("https://kcq.nebutra.com/market/binance");
    expect(provider.trades).toBeDefined();
    const instrument: InstrumentDescriptor = {
      id: "binance:spot:BTCUSDT",
      sourceId: "binance",
      symbol: "BTCUSDT",
      name: "BTCUSDT",
      assetClass: "crypto",
      exchange: "BINANCE",
      capabilities: { trades: { raw: true, live: true } },
    };
    const range = { from: 1000, to: 2000 };
    const batch = {
      range,
      complete: true,
      items: [{ tradeId: "123", timestamp: 1500, price: "60000.00", size: "0.01", side: "buy" }],
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: batch, requestId: "test" })));
    vi.stubGlobal("fetch", fetch);
    expect(
      await provider.trades?.fetch({ instrument, range, signal: new AbortController().signal }),
    ).toEqual(batch);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://kcq.nebutra.com/market/binance/api/v1/market-data/trades/range",
    );
    const urls: string[] = [];
    vi.stubGlobal(
      "EventSource",
      class {
        onopen = null;
        onerror = null;
        onmessage = null;
        constructor(url: string) {
          urls.push(url);
        }
        close() {}
      },
    );
    const stream = provider.liveBars?.createStream({
      symbol: "BTCUSDT",
      period: "1min",
      barAggregation: "original",
    });
    stream?.connect();
    stream?.destroy();
    const trades = provider.trades?.connect(instrument);
    trades?.close();
    expect(urls).toEqual([
      "https://kcq.nebutra.com/market/binance/api/v1/market-data/sources/binance/stream?symbol=BTCUSDT&period=1min&barAggregation=original",
      "https://kcq.nebutra.com/market/binance/api/v1/market-data/sources/binance/trades/stream?symbol=BTCUSDT&kind=aggregated",
    ]);
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
