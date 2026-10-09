/**
 * The /home hero chart: the real KCQ engine, headless (`createChartController`), on bars read
 * through the core market-data transport from the public read-only `/market/tdx` route.
 *
 * This module is the one lazy chunk allowed to load the chart core on public pages
 * (scripts/public-boundary.mjs PUBLIC_LOCAL_ALLOWLIST). It never touches auth, the workbench, the
 * Vue chart package, the Agent runtime or persistence.
 */
import {
  type ChartController,
  createChartController,
  type KLineData,
} from "@363045841yyt/klinechart-core/controllers";
import { createHttpMarketDataTransport } from "@363045841yyt/klinechart-core/market-data";
import { type Bar, HERO_FEED_PATH, HERO_INSTRUMENT, HERO_QUERY } from "./bars";

/** Read the hero bars; rejects on any transport or protocol failure (the caller falls back). */
export async function fetchLiveBars(origin: string, signal?: AbortSignal): Promise<Bar[]> {
  const transport = createHttpMarketDataTransport({
    baseUrl: origin + HERO_FEED_PATH,
    sourceLabel: HERO_QUERY.sourceId,
  });
  const series = await transport.fetchBars({ ...HERO_QUERY, instrument: HERO_INSTRUMENT }, signal);
  const bars = series.items.map(({ timestamp, open, high, low, close, volume }) => ({
    timestamp,
    open,
    high,
    low,
    close,
    volume: volume ?? 0,
  }));
  if (bars.length < 2) throw new Error("The feed returned too few bars");
  return bars;
}

/** One candle in chart-local CSS pixels: what the light field turns into emitters. */
export interface CandleGeometry {
  readonly x: number;
  readonly width: number;
  readonly open: number;
  readonly close: number;
  readonly high: number;
  readonly low: number;
  readonly up: boolean;
}

export interface ChartGeometry {
  readonly width: number;
  readonly height: number;
  readonly candles: readonly CandleGeometry[];
  readonly lastPriceY: number | null;
}

export interface HeroChart {
  readonly controller: ChartController;
  setBars(bars: readonly Bar[]): void;
  setMode(mode: "light" | "dark"): void;
  geometry(): ChartGeometry;
  /** Called after any viewport or data change, with fresh geometry. */
  onGeometry(listener: (geometry: ChartGeometry) => void): () => void;
  dispose(): Promise<void>;
}

const toKLine = (bars: readonly Bar[]): KLineData[] =>
  bars.map((bar) => ({ ...bar, symbol: HERO_INSTRUMENT.symbol }));

const MIN_K_WIDTH = 1;
const MAX_K_WIDTH = 24;

const POINTER_EVENTS = ["pointerdown", "pointermove", "pointerup", "pointerleave", "pointercancel"] as const;

export async function mountHeroChart(
  container: HTMLDivElement,
  options: { bars: readonly Bar[]; mode: "light" | "dark" },
): Promise<HeroChart> {
  // The engine's own scaffold scrolls its axis hosts with the content; build the layout the Vue
  // binding uses instead: a scroller for the plot, the price axis fixed beside it.
  const doc = container.ownerDocument;
  const scroller = doc.createElement("div");
  scroller.className = "hero-engine-scroller";
  const content = doc.createElement("div");
  content.className = "scroll-content";
  const canvasLayer = doc.createElement("div");
  canvasLayer.className = "hero-engine-canvas";
  // The time axis is not shown: its labels are not localised yet, and the header states the period.
  const xAxisCanvas = doc.createElement("canvas");
  xAxisCanvas.hidden = true;
  const rightAxisLayer = doc.createElement("div");
  rightAxisLayer.className = "hero-engine-price-axis";
  canvasLayer.append(xAxisCanvas);
  content.append(canvasLayer);
  scroller.append(content);
  container.append(scroller, rightAxisLayer);

  const controller = await createChartController({
    container: scroller,
    canvasLayer,
    rightAxisLayer,
    xAxisCanvas,
    data: toKLine(options.bars),
    theme: options.mode,
    rightAxisWidth: 0,
    minKWidth: MIN_K_WIDTH,
    maxKWidth: MAX_K_WIDTH,
    priceLabelWidth: 64,
    bottomAxisHeight: 0,
    initialZoomLevel: 1,
    settings: {
      theme: options.mode,
      showGridLines: true,
      showVolumePriceMarkers: false,
      showLastPriceCountdown: false,
      mainLeftAxisDisplaySetting: "none",
      isAsiaMarket: true,
    },
  });

  /** Fit every bar into the plot: kWidth + its 0.6 gap per bar (engine zoom.ts mapping). */
  const fit = () => {
    const { plotWidth } = controller.viewport.peek();
    const count = Math.max(1, controller.data.peek().length);
    const levels = controller.getZoomLevelCount();
    const kWidth = Math.min(MAX_K_WIDTH, Math.max(MIN_K_WIDTH, plotWidth / (count * 1.6)));
    const level = 1 + Math.floor(((kWidth - MIN_K_WIDTH) / (MAX_K_WIDTH - MIN_K_WIDTH)) * (levels - 1));
    controller.zoomToLevel(Math.max(1, level));
    controller.scrollToRight();
  };
  fit();
  const refit = new ResizeObserver(() => fit());
  refit.observe(container);

  const forward = (event: PointerEvent) => controller.handlePointerEvent(event);
  const onScroll = () => controller.handleScrollEvent();
  for (const type of POINTER_EVENTS) scroller.addEventListener(type, forward);
  scroller.addEventListener("scroll", onScroll, { passive: true });

  const geometry = (): ChartGeometry => {
    const viewport = controller.viewport.peek();
    const data = controller.data.peek();
    const candles: CandleGeometry[] = [];
    const from = Math.max(0, viewport.visibleFrom);
    const to = Math.min(data.length, viewport.visibleTo);
    for (let index = from; index < to; index++) {
      const bar = data[index]!;
      const x = controller.getXAtLogicalIndex(index);
      if (x === null) continue;
      candles.push({
        x,
        width: viewport.kWidth,
        open: controller.priceToY("main", bar.open),
        close: controller.priceToY("main", bar.close),
        high: controller.priceToY("main", bar.high),
        low: controller.priceToY("main", bar.low),
        up: bar.close >= bar.open,
      });
    }
    const last = data.at(-1);
    return {
      width: viewport.plotWidth,
      height: viewport.plotHeight,
      candles,
      lastPriceY: last ? controller.priceToY("main", last.close) : null,
    };
  };

  const listeners = new Set<(geometry: ChartGeometry) => void>();
  let queued = 0;
  const notify = () => {
    if (queued) return;
    // Coordinates are valid once the frame that applied the change has been drawn.
    queued = requestAnimationFrame(() => {
      queued = 0;
      const next = geometry();
      for (const listener of listeners) listener(next);
    });
  };
  const unsubscribe = [controller.viewport.subscribe(notify), controller.data.subscribe(notify)];

  return {
    controller,
    setBars(bars) {
      controller.setData(toKLine(bars));
      fit();
    },
    setMode(mode) {
      controller.setTheme(mode);
    },
    geometry,
    onGeometry(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose() {
      cancelAnimationFrame(queued);
      refit.disconnect();
      for (const stop of unsubscribe) stop();
      for (const type of POINTER_EVENTS) scroller.removeEventListener(type, forward);
      scroller.removeEventListener("scroll", onScroll);
      await controller.dispose();
      scroller.remove();
      rightAxisLayer.remove();
    },
  };
}
