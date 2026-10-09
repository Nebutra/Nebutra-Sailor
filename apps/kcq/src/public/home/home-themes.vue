<!--
  Theme presets, live (landing-benchmark §6.6; design §5 preset card): the same 40 real bars drawn
  as a lightweight SVG with each preset's generated colours (virtual:kcq-presets), so the switcher
  shows the token system, not a swatch. Cobalt draws the moving average (ADR 0007).
-->
<script setup lang="ts">
import presets from "virtual:kcq-presets";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { CACHED_BARS, movingAverage } from "./hero/bars";

type PresetId = keyof typeof presets;
const { t } = useI18n();
const PRESETS = Object.keys(presets) as PresetId[];
const MODES = ["light", "dark"] as const;
const preset = ref<PresetId>(PRESETS[0]!);
const mode = ref<(typeof MODES)[number]>("dark");
const palette = computed(() => presets[preset.value][mode.value]);

const COUNT = 40;
const W = 480;
const H = 270;
const PAD = { top: 16, right: 56, bottom: 16, left: 12 };
const series = CACHED_BARS.slice(-COUNT);
const ma = movingAverage(CACHED_BARS, 10).slice(-COUNT);
const low = Math.min(...series.map((bar) => bar.low));
const high = Math.max(...series.map((bar) => bar.high));
const step = (W - PAD.left - PAD.right) / COUNT;
const y = (price: number) => PAD.top + ((high - price) / (high - low)) * (H - PAD.top - PAD.bottom);
const x = (index: number) => PAD.left + step * (index + 0.5);
const candles = series.map((bar, index) => ({
  x: x(index),
  high: y(bar.high),
  low: y(bar.low),
  top: y(Math.max(bar.open, bar.close)),
  height: Math.max(1, Math.abs(y(bar.open) - y(bar.close))),
  up: bar.close >= bar.open,
}));
const body = Math.max(2, Math.floor(step * 0.62));
const maPath = ma
  .map((value, index) => (value === null ? "" : `${index && ma[index - 1] !== null ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`))
  .join("");
const ticks = [0.15, 0.5, 0.85].map((f) => {
  const price = high - (high - low) * f;
  return { y: y(price), label: price.toFixed(0) };
});

function onKey(event: KeyboardEvent, list: readonly string[], current: string, set: (value: string) => void) {
  const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!delta) return;
  event.preventDefault();
  const next = (list.indexOf(current) + delta + list.length) % list.length;
  set(list[next]!);
  (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
}
</script>
<template>
  <section class="section" aria-labelledby="themes-heading">
    <div class="container themes-grid">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">05</span>{{ t("home.themes.eyebrow") }}</p>
      <div class="section-head themes-head">
        <h2 id="themes-heading" class="t-heading">{{ t("home.themes.heading") }}</h2>
        <p class="t-lede">{{ t("home.themes.body") }}</p>
        <div
          class="preset-list"
          role="radiogroup"
          :aria-label="t('home.themes.eyebrow')"
          @keydown="onKey($event, PRESETS, preset, (v) => (preset = v as PresetId))"
        >
          <button
            v-for="id in PRESETS"
            :key="id"
            type="button"
            role="radio"
            class="preset"
            :aria-checked="preset === id"
            :tabindex="preset === id ? 0 : -1"
            @click="preset = id"
          >
            <span class="preset-swatch" :style="{ background: presets[id][mode].background, borderColor: presets[id][mode].border }">
              <span :style="{ background: presets[id][mode].up }" />
              <span :style="{ background: presets[id][mode].down }" />
            </span>
            <span class="t-label" translate="no">{{ t(`home.themes.presets.${id}`) }}</span>
          </button>
        </div>
        <div
          class="mode-switch"
          role="radiogroup"
          :aria-label="t('home.themes.mode')"
          @keydown="onKey($event, MODES, mode, (v) => (mode = v as (typeof MODES)[number]))"
        >
          <button
            v-for="item in MODES"
            :key="item"
            type="button"
            role="radio"
            class="mode-option t-label"
            :aria-checked="mode === item"
            :tabindex="mode === item ? 0 : -1"
            @click="mode = item"
          >
            {{ t(`home.themes.modes.${item}`) }}
          </button>
        </div>
      </div>
      <figure class="preview" :style="{ background: palette.background, borderColor: palette.border }">
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t('home.themes.preview', { preset: t(`home.themes.presets.${preset}`), mode: t(`home.themes.modes.${mode}`), count: COUNT })">
          <line
            v-for="tick in ticks"
            :key="tick.label"
            :x1="PAD.left"
            :x2="W - PAD.right + 8"
            :y1="tick.y"
            :y2="tick.y"
            :stroke="palette.grid"
            stroke-width="1"
          />
          <text
            v-for="tick in ticks"
            :key="`l${tick.label}`"
            :x="W - PAD.right + 14"
            :y="tick.y + 4"
            :fill="palette.axis"
            class="preview-axis"
          >{{ tick.label }}</text>
          <g v-for="(candle, index) in candles" :key="index" :fill="candle.up ? palette.up : palette.down" :stroke="candle.up ? palette.up : palette.down">
            <line :x1="candle.x" :x2="candle.x" :y1="candle.high" :y2="candle.low" stroke-width="1" />
            <rect :x="candle.x - body / 2" :y="candle.top" :width="body" :height="candle.height" stroke="none" />
          </g>
          <path :d="maPath" fill="none" :stroke="palette.accent" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
        <figcaption class="preview-caption" :style="{ color: palette.muted, borderColor: palette.border }">
          <span translate="no" :style="{ color: palette.text }">600519 · 1D</span>
          <span>{{ t("home.themes.ma") }}</span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.themes-grid {
  display: grid;
  --row-gap: var(--klc-space-48);
  gap: var(--row-gap) var(--kcq-column-gap);
}
.preset-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: var(--klc-space-8);
  margin-top: var(--klc-space-8);
}
.preset {
  display: flex;
  align-items: center;
  gap: var(--klc-space-12);
  min-height: var(--klc-density-touch);
  padding: var(--klc-space-8) var(--klc-space-12);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-md);
  background: var(--kcq-surface);
  color: var(--kcq-ink);
  cursor: pointer;
  text-align: left;
}
@media (hover: hover) and (pointer: fine) {
  .preset:hover {
    border-color: var(--kcq-rule-strong);
  }
}
/* Selection: a 2px Cobalt ring, ≥3:1 on every surface (design §5). */
.preset[aria-checked="true"] {
  border-color: var(--kcq-accent);
  box-shadow: inset 0 0 0 1px var(--kcq-accent);
}
.preset-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--klc-space-2);
  width: var(--klc-space-24);
  height: var(--klc-space-24);
  border: 1px solid;
  border-radius: var(--klc-radius-xs);
}
.preset-swatch span {
  width: var(--klc-space-4);
  height: var(--klc-space-12);
}
.mode-switch {
  display: inline-flex;
  justify-self: start;
  gap: var(--klc-space-2);
  padding: var(--klc-space-2);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-md);
}
.mode-option {
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-16);
  border: 0;
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
}
.mode-option[aria-checked="true"] {
  background: var(--kcq-control);
  color: var(--kcq-ink);
}
.preview {
  margin: 0;
  border: 1px solid;
  align-self: start;
}
.preview svg {
  width: 100%;
  height: auto;
}
.preview-axis {
  font-family: var(--kcq-font-mono);
  font-size: var(--klc-text-11-mono-font-size);
  font-variant-numeric: tabular-nums;
}
.preview-caption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--klc-space-8);
  padding: var(--klc-space-12) var(--klc-space-16);
  border-top: 1px solid;
  font-family: var(--kcq-font-mono);
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
}
@media (min-width: 1024px) {
  .themes-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .themes-head {
    grid-column: 1 / span 5;
  }
  .preview {
    grid-column: 6 / span 7;
  }
}
</style>
