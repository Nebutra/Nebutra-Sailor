<!--
  The chart the agent is working on, reacting to each completed call (research §3 Agent): the real
  last 60 daily bars of 600519; after `instruments_query_name` the CSI 300 result appears as a
  chip, after `comparison_create` the real CSI 300 closes draw in, rebased to 600519's first close,
  and after `drawing_create` a Cobalt horizontal line marks the last close with a price-label chip,
  in the chart's own drawing language. Labels are HTML over the SVG so they stay crisp at any size.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePublicLocale } from "../../state/use-public-locale";
import { CACHED_BARS } from "../hero/bars";
import comparison from "./comparison-bars.json";
import { useReplay } from "./replay";

const { t } = useI18n();
const { intl } = usePublicLocale();
const replay = useReplay()!;

const COUNT = 60;
const W = 600;
const H = 320;
const PAD = { top: 24, right: 72, bottom: 20, left: 8 };
const bars = CACHED_BARS.slice(-COUNT);
const closes = new Map(comparison.bars as [number, number | null][]);
const base = closes.get(bars[0]!.timestamp) ?? null;
/** CSI 300 rebased to 600519's first close in the window, so both share the price axis. */
const rebased = bars.map((bar) => {
  const close = closes.get(bar.timestamp);
  return base && close ? (close / base) * bars[0]!.close : null;
});
const values = [...bars.flatMap((bar) => [bar.high, bar.low]), ...rebased.filter((v): v is number => v !== null)];
const high = Math.max(...values);
const low = Math.min(...values);
const step = (W - PAD.left - PAD.right) / COUNT;
const x = (index: number) => PAD.left + step * (index + 0.5);
const y = (price: number) => PAD.top + ((high - price) / (high - low)) * (H - PAD.top - PAD.bottom);
const body = Math.max(2, Math.floor(step * 0.6));
const candles = bars.map((bar, index) => ({
  x: x(index),
  high: y(bar.high),
  low: y(bar.low),
  top: y(Math.max(bar.open, bar.close)),
  height: Math.max(1, Math.abs(y(bar.open) - y(bar.close))),
  up: bar.close >= bar.open,
}));
const comparisonPath = rebased
  .map((value, index) =>
    value === null ? "" : `${index && rebased[index - 1] !== null ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`,
  )
  .join("");
const lastClose = bars.at(-1)!.close;
const lastY = y(lastClose);
const comparisonEnd = rebased.at(-1) ?? rebased.findLast((v) => v !== null) ?? lastClose;
const grid = [0.2, 0.5, 0.8].map((f) => PAD.top + (H - PAD.top - PAD.bottom) * f);
const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(2)}%`;

const done = computed(() => replay.step.value);
const price = computed(() =>
  new Intl.NumberFormat(intl.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(lastClose),
);
</script>
<template>
  <figure
    class="agent-chart"
    :data-done="done"
    role="img"
    :aria-label="t('home.agent.chart.label', { done, total: replay.total })"
  >
    <svg :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <line v-for="gy in grid" :key="gy" class="agent-grid" :x1="0" :x2="W" :y1="gy" :y2="gy" />
      <g v-for="(candle, index) in candles" :key="index" :class="candle.up ? 'is-up' : 'is-down'">
        <line class="agent-wick" :x1="candle.x" :x2="candle.x" :y1="candle.high" :y2="candle.low" />
        <rect class="agent-body" :x="candle.x - body / 2" :y="candle.top" :width="body" :height="candle.height" />
      </g>
      <path class="agent-comparison" :d="comparisonPath" pathLength="1" :data-on="done >= 4 || undefined" />
      <line
        class="agent-drawing"
        :x1="PAD.left"
        :x2="W - PAD.right + 6"
        :y1="lastY"
        :y2="lastY"
        pathLength="1"
        :data-on="done >= 2 || undefined"
      />
    </svg>
    <span class="agent-chip agent-pane t-meta" :data-on="done >= 1 || undefined">main · 600519</span>
    <span class="agent-chip agent-search t-meta" :data-on="done >= 3 || undefined">{{ t("home.agent.chart.search") }}</span>
    <span
      class="agent-chip agent-comparison-label t-meta"
      :data-on="done >= 4 || undefined"
      :style="{ top: pct(y(comparisonEnd), H) }"
    >{{ t("home.agent.chart.comparison") }}</span>
    <span
      class="agent-price t-num"
      :data-on="done >= 2 || undefined"
      :style="{ top: pct(lastY, H) }"
      :title="t('home.agent.chart.drawing')"
    >{{ price }}</span>
  </figure>
</template>
<style scoped>
.agent-chart {
  position: relative;
  margin: 0;
  aspect-ratio: 600 / 320;
  background: var(--klc-color-chart-background);
}
.agent-chart svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.agent-grid {
  stroke: var(--kcq-grid);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.agent-wick {
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.is-up .agent-wick {
  stroke: var(--kcq-up);
}
.is-up .agent-body {
  fill: var(--kcq-up);
}
.is-down .agent-wick {
  stroke: var(--kcq-down);
}
.is-down .agent-body {
  fill: var(--kcq-down);
}
/* Lines draw in along their own length (pathLength = 1), only when the call completes. */
.agent-comparison,
.agent-drawing {
  fill: none;
  /* Uniform scale (aspect-ratio above), so the dash runs along pathLength without non-scaling-stroke. */
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 700ms var(--klc-motion-ease-out);
}
.agent-comparison {
  stroke: var(--kcq-ink-2);
  stroke-width: 2;
}
.agent-drawing {
  stroke: var(--kcq-accent);
  stroke-width: 2;
}
.agent-comparison[data-on],
.agent-drawing[data-on] {
  stroke-dashoffset: 0;
}
.agent-chip,
.agent-price {
  position: absolute;
  opacity: 0;
  translate: 0 4px;
  transition:
    opacity var(--klc-motion-dur-base) var(--klc-motion-ease-out),
    translate var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.agent-chip[data-on],
.agent-price[data-on] {
  opacity: 1;
  translate: 0 0;
}
.agent-chip {
  padding: var(--klc-space-2) var(--klc-space-8);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-xs);
  background: color-mix(in oklab, var(--klc-color-chart-background) 86%, transparent);
  color: var(--kcq-ink);
  text-transform: none;
  letter-spacing: 0;
  white-space: nowrap;
}
.agent-pane {
  top: var(--klc-space-8);
  left: var(--klc-space-8);
}
.agent-search {
  top: var(--klc-space-8);
  left: calc(var(--klc-space-8) + 9.5rem);
  border-color: var(--kcq-accent);
}
.agent-comparison-label {
  right: 13%;
  margin-top: calc(-1 * var(--klc-space-24));
  color: var(--kcq-ink-2);
}
/* The price-label chip of a KCQ horizontal-line drawing, on the right axis. */
.agent-price {
  right: var(--klc-space-4);
  translate: 0 -50%;
  padding: var(--klc-space-2) var(--klc-space-4);
  border-radius: var(--klc-radius-xs);
  background: var(--kcq-accent-strong);
  color: #fff;
  font-size: var(--klc-text-11-mono-font-size);
  line-height: var(--klc-text-11-mono-line-height);
}
.agent-price[data-on] {
  translate: 0 -50%;
}
@media (max-width: 479px) {
  .agent-search {
    top: calc(var(--klc-space-8) + var(--klc-space-24));
    left: var(--klc-space-8);
  }
}
</style>
