<!--
  The hero's time axis, in the page's language. The engine's own axis labels are fixed to Chinese
  month names, so the host draws the ticks from the engine's bar positions (public
  getXAtLogicalIndex via live-chart.ts): one tick at the first bar of each month, January as the
  year; when months collide the axis keeps every k-th one.
-->
<script setup lang="ts">
import { computed } from "vue";
import type { ChartGeometry } from "./live-chart";

const props = defineProps<{ geometry: ChartGeometry | null; locale: string; timeZone: string }>();
const MIN_GAP = 44;

const ticks = computed(() => {
  const geometry = props.geometry;
  if (!geometry) return [];
  const intl = props.locale === "zh" ? "zh-CN" : "en-US";
  const month = new Intl.DateTimeFormat(intl, { month: "short", timeZone: props.timeZone });
  const year = new Intl.DateTimeFormat(intl, { year: "numeric", timeZone: props.timeZone });
  const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: props.timeZone });
  const all: { x: number; label: string; year: boolean }[] = [];
  let previous = "";
  for (const candle of geometry.candles) {
    const current = key.format(candle.timestamp);
    if (current === previous) continue;
    const first = previous === "";
    previous = current;
    if (first || candle.x > geometry.width - MIN_GAP / 2) continue;
    const isYear = current.endsWith("-01");
    all.push({ x: candle.x, label: (isYear ? year : month).format(candle.timestamp), year: isYear });
  }
  // Every k-th month, the same k throughout, so a narrow chart thins the axis evenly.
  for (let step = 1; step <= all.length; step++) {
    const kept = all.filter((_, index) => (all.length - 1 - index) % step === 0);
    if (kept.every((tick, index) => index === 0 || tick.x - kept[index - 1]!.x >= MIN_GAP)) return kept;
  }
  return all.slice(-1);
});
</script>
<template>
  <div class="time-axis" aria-hidden="true">
    <span
      v-for="tick in ticks"
      :key="tick.x"
      class="time-tick t-num"
      :class="{ 'is-year': tick.year }"
      :style="{ transform: `translateX(${tick.x}px) translateX(-50%)` }"
    >
      {{ tick.label }}
    </span>
  </div>
</template>
<style scoped>
.time-axis {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: var(--klc-space-24);
  border-top: 1px solid var(--klc-color-axis-line, var(--kcq-rule));
  pointer-events: none;
}
.time-tick {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  padding-top: var(--klc-space-4);
  font-size: var(--klc-text-11-mono-font-size);
  line-height: var(--klc-text-11-mono-line-height);
  color: var(--klc-color-axis-text, var(--kcq-ink-2));
  white-space: nowrap;
}
.time-tick.is-year {
  color: var(--kcq-ink);
}
</style>
