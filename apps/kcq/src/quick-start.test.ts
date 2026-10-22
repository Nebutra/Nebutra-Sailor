import type { ChartController, SymbolSpec } from "@363045841yyt/klinechart-core";
import type { InstrumentDescriptor } from "@363045841yyt/klinechart-core/market-data";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createQuickStart } from "./quick-start";

const instrument: InstrumentDescriptor = {
  id: "gotdx:stock:1:600519",
  sourceId: "gotdx",
  symbol: "600519",
  name: "贵州茅台",
  assetClass: "stock",
  exchange: "SH",
  sessionId: "CN",
  providerRef: { market: 1 },
  capabilities: { bars: { periods: ["daily"], adjustments: ["none"] } },
};

function setup(search = vi.fn().mockResolvedValue([instrument])) {
  let symbols: readonly SymbolSpec[] = [];
  let data: readonly unknown[] = [];
  const chart = {
    symbols: { peek: () => symbols },
    data: { peek: () => data },
    dataLoading: { peek: () => false },
    setSymbols: vi.fn(),
  } as unknown as ChartController;
  const track = vi.fn();
  const getProvider = vi.fn(() => ({ catalog: { search } }));
  const flow = createQuickStart({
    getController: () => chart,
    getProvider,
    track,
  });
  return {
    flow,
    chart,
    search,
    track,
    getProvider,
    setSymbols: (value: readonly SymbolSpec[]) => {
      symbols = value;
    },
    setData: () => {
      data = [{}];
    },
  };
}
afterEach(() => vi.useRealTimers());

describe("first chart shortcuts", () => {
  it("uses the exact live catalog descriptor, including its provider routing", async () => {
    const { flow, chart, search } = setup();
    await flow.select("cn");
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ keyword: "600519", limit: 10 }));
    expect(chart.setSymbols).toHaveBeenCalledWith([
      {
        id: instrument.id,
        instrument,
        symbol: "600519",
        market: "CN",
        exchange: "SH",
        source: "gotdx",
        period: "daily",
        adjust: "none",
      },
    ]);
  });

  it("does not replace a saved chart or launch on a loading chart", async () => {
    const { flow, setSymbols, chart, search } = setup();
    setSymbols([{ symbol: "MY-SAVED-SYMBOL", market: "US" }]);
    await flow.select("cn");
    expect(search).not.toHaveBeenCalled();
    setSymbols([]);
    vi.spyOn(chart.dataLoading, "peek").mockReturnValue(true);
    await flow.select("cn");
    expect(search).not.toHaveBeenCalled();
  });

  it("ignores results after a toolbar selection, cancellation, or chart teardown", async () => {
    let resolve!: (items: InstrumentDescriptor[]) => void;
    const search = vi.fn(
      () =>
        new Promise<InstrumentDescriptor[]>((done) => {
          resolve = done;
        }),
    );
    const { flow, chart, setSymbols } = setup(search);
    const pending = flow.select("cn");
    setSymbols([{ symbol: "AAPL", market: "US" }]);
    resolve([instrument]);
    await pending;
    expect(chart.setSymbols).not.toHaveBeenCalled();
    setSymbols([]);
    const cancelled = flow.select("cn");
    flow.cancel();
    resolve([instrument]);
    await cancelled;
    expect(chart.setSymbols).not.toHaveBeenCalled();
    expect(flow.loading.value).toBe(false);
  });

  it("never substitutes a similarly named instrument and allows an explicit retry", async () => {
    const { flow, chart, search, track } = setup(
      vi.fn().mockResolvedValue([{ ...instrument, symbol: "6005190" }]),
    );
    await flow.select("cn");
    expect(chart.setSymbols).not.toHaveBeenCalled();
    expect(flow.error.value).toContain("未找到");
    expect(track).toHaveBeenCalledWith({ action: "preset_failed", preset: "cn" });
    search.mockResolvedValue([instrument]);
    await flow.select("cn");
    expect(chart.setSymbols).toHaveBeenCalledOnce();
    expect(flow.error.value).toBe("");
  });

  it("aborts a slow catalog request and does not expose raw upstream errors", async () => {
    vi.useFakeTimers();
    const search = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<InstrumentDescriptor[]>((_done, reject) =>
          signal.addEventListener("abort", () => reject(new Error("secret upstream URL"))),
        ),
    );
    const { flow } = setup(search);
    const pending = flow.select("cn");
    await vi.advanceTimersByTimeAsync(12_000);
    await pending;
    expect(flow.loading.value).toBe(false);
    expect(flow.error.value).toContain("超时");
    expect(flow.error.value).not.toContain("secret");
  });

  it("rejects ambiguous exchanges and unsupported bar periods", async () => {
    const { flow, chart } = setup(
      vi.fn().mockResolvedValue([
        { ...instrument, sourceId: "tradingview", symbol: "AAPL", exchange: "LSE" },
        {
          ...instrument,
          sourceId: "tradingview",
          symbol: "AAPL",
          exchange: "NASDAQ",
          capabilities: { bars: { periods: ["1min"], adjustments: ["none"] } },
        },
      ]),
    );
    await flow.select("us");
    expect(chart.setSymbols).not.toHaveBeenCalled();
  });
});
