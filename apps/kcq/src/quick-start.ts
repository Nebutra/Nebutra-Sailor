import type { ChartController } from "@363045841yyt/klinechart-core";
import {
  type MarketDataProvider,
  marketDataProviderRegistry,
} from "@363045841yyt/klinechart-core/market-data";
import type { KcqActivationPayload } from "@nebutra/analytics/events";
import { shallowRef } from "vue";

export const MARKET_SHORTCUTS = [
  {
    id: "cn",
    label: "A 股 · 贵州茅台",
    source: "gotdx",
    symbol: "600519",
    exchange: "SH",
    market: "CN",
    period: "daily",
  },
  {
    id: "crypto",
    label: "加密 · BTC / USDT",
    source: "binance",
    symbol: "BTCUSDT",
    exchange: "BINANCE",
    market: "crypto",
    period: "daily",
  },
  {
    id: "us",
    label: "美股 · Apple",
    source: "tradingview",
    symbol: "AAPL",
    exchange: "NASDAQ",
    market: "US",
    period: "daily",
  },
] as const;
export type MarketShortcutId = (typeof MARKET_SHORTCUTS)[number]["id"];

export function createQuickStart({
  getController,
  getProvider = (id) => marketDataProviderRegistry.get(id),
  track,
}: {
  getController: () => ChartController | null;
  getProvider?: (id: string) => Pick<MarketDataProvider, "catalog"> | undefined;
  track: (event: KcqActivationPayload) => unknown;
}) {
  const loading = shallowRef(false);
  const error = shallowRef("");
  let pending: AbortController | undefined;
  let generation = 0;
  function cancel() {
    generation++;
    pending?.abort();
    pending = undefined;
    loading.value = false;
    error.value = "";
  }
  async function select(id: MarketShortcutId) {
    const chart = getController();
    if (!chart || chart.data.peek().length || chart.dataLoading.peek()) return;
    const initialSymbols = chart.symbols.peek();
    if (initialSymbols.some((spec) => spec.symbol.trim())) return;
    cancel();
    const preset = MARKET_SHORTCUTS.find((item) => item.id === id);
    if (!preset) return;
    const request = new AbortController();
    pending = request;
    const current = generation;
    loading.value = true;
    error.value = "";
    void track({ action: "preset_selected", preset: id });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, 12_000);
    const isCurrent = () =>
      current === generation &&
      chart === getController() &&
      chart.symbols.peek() === initialSymbols &&
      chart.data.peek().length === 0;
    try {
      const provider = getProvider(preset.source);
      if (!provider?.catalog) throw new Error("Unavailable catalog");
      // Race the signal as custom providers may not implement cancellation themselves.
      const cancelled = new Promise<never>((_, reject) =>
        request.signal.addEventListener("abort", () => reject(new Error("Aborted")), {
          once: true,
        }),
      );
      const items = await Promise.race([
        provider.catalog.search({ keyword: preset.symbol, limit: 10, signal: request.signal }),
        cancelled,
      ]);
      if (!isCurrent() || request.signal.aborted) return;
      const instrument = items.find(
        (item) =>
          item.sourceId === preset.source &&
          item.symbol === preset.symbol &&
          item.exchange === preset.exchange &&
          item.capabilities.bars?.periods.includes(preset.period) &&
          item.capabilities.bars.adjustments.includes("none"),
      );
      if (!instrument) {
        error.value = "未找到可用商品，请重试或从工具栏搜索。";
        void track({ action: "preset_failed", preset: id });
        return;
      }
      chart.setSymbols([
        {
          id: instrument.id,
          instrument,
          symbol: instrument.symbol,
          market: instrument.sessionId ?? preset.market,
          exchange: instrument.exchange,
          source: instrument.sourceId,
          period: preset.period,
          adjust: "none",
        },
      ]);
    } catch {
      if (!isCurrent()) return;
      error.value = timedOut
        ? "行情搜索超时，请重试或更换市场。"
        : "行情搜索暂不可用，请重试或从工具栏搜索。";
      void track({ action: "preset_failed", preset: id });
    } finally {
      clearTimeout(timer);
      if (current === generation) {
        pending = undefined;
        loading.value = false;
      }
    }
  }
  return { loading, error, select, cancel };
}
