<!--
  The hero instrument (landing-benchmark §6.1; design §6 vgpu selection):
  - First paint is a prerendered poster of the field's opening frame: the KCQ glyph as the only
    light. It is the LCP image and stays as the fallback without WebGPU.
  - On idle, the real KCQ engine mounts (live-chart.ts, lazy) with bars from /market/tdx; if the
    feed fails, cached real bars show with a "Delayed" label.
  - With WebGPU and motion allowed, the light field (field/renderer.ts, lazy) unfolds the glyph
    into the live candles, then the crisp chart fades in over the dimmed field. The visitor's
    crosshair is one more light. Pause stops the field.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "../../use-theme";
import posterDark800 from "./poster/poster-dark-800.webp";
import posterDark1600 from "./poster/poster-dark-1600.webp";
import posterLight800 from "./poster/poster-light-800.webp";
import posterLight1600 from "./poster/poster-light-1600.webp";
import { type Bar, CACHED_BARS, quoteOf } from "./bars";
import KcqIcon from "../../components/kcq-icon.vue";
import type { HeroChart } from "./live-chart";
import type { HeroField } from "../field/renderer";

const { t, locale } = useI18n();
const { mode } = useTheme();

type Status = "connecting" | "live" | "delayed";
const status = ref<Status>("connecting");
const bars = shallowRef<readonly Bar[]>(CACHED_BARS);
const quote = computed(() => quoteOf(bars.value));
const chartShown = ref(false);
const fieldState = ref<"off" | "on">("off");
const paused = ref(false);

const panel = ref<HTMLElement>();
const chartHost = ref<HTMLDivElement>();
const chartMount = ref<HTMLDivElement>();
const fieldCanvas = ref<HTMLCanvasElement>();

const posters = {
  dark: `${posterDark800} 800w, ${posterDark1600} 1600w`,
  light: `${posterLight800} 800w, ${posterLight1600} 1600w`,
};
const posterSizes = "(min-width: 1344px) 1280px, calc(100vw - 32px)";
/** After hydration the explicit theme wins over the system one the <picture> media follows. */
const posterSrcset = computed(() => posters[mode.value]);
const hydrated = ref(false);

const price = (value: number) =>
  new Intl.NumberFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const signed = (value: number, digits = 2) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
const direction = computed(() => (quote.value && quote.value.change < 0 ? "down" : "up"));
const statusNote = computed(() =>
  status.value === "live"
    ? t("home.chart.liveNote")
    : t(status.value === "delayed" ? "home.chart.delayedNote" : "home.chart.connectingNote", {
        date: quote.value?.date ?? "",
      }),
);

let chart: HeroChart | undefined;
let field: HeroField | null = null;
let refreshTimer = 0;
let disposed = false;
const cleanups: (() => void)[] = [];

/** Read the generated tokens the field needs, as linear colours, from the live cascade. */
async function readLook() {
  const { hexToLinear } = await import("../field/field-shapes");
  const style = getComputedStyle(panel.value!);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    palette: {
      up: hexToLinear(token("--klc-color-candle-up-body")),
      down: hexToLinear(token("--klc-color-candle-down-body")),
      accent: hexToLinear(token("--klc-brand-accent")),
    },
    ground: hexToLinear(token("--klc-color-chart-background")),
    mode: mode.value,
  };
}

function fieldAllowed(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return (
    "gpu" in navigator &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    connection?.saveData !== true
  );
}

/** Live bars from the read-only feed; on failure the cached bars stay and say "Delayed". */
async function loadLive(liveChart: typeof import("./live-chart")): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    bars.value = await liveChart.fetchLiveBars(window.location.origin, controller.signal);
    status.value = "live";
    chart?.setBars(bars.value);
    return true;
  } catch {
    status.value = "delayed";
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function start() {
  const [liveChart, fieldModule] = await Promise.all([
    import("./live-chart"),
    fieldAllowed() ? import("../field/renderer") : Promise.resolve(null),
  ]);
  if (disposed || !chartMount.value) return;
  const fieldReady = fieldModule
    ? readLook()
        .then((look) => fieldModule.createHeroField(fieldCanvas.value!, look))
        .catch(() => null)
    : Promise.resolve(null);
  const live = loadLive(liveChart);
  // The cached bars are real; the chart mounts on them at once and the live bars replace them.
  chart = await liveChart.mountHeroChart(chartMount.value, { bars: bars.value, mode: mode.value });
  // Let a fast feed land before the unfold, so the light opens onto today's bars.
  await Promise.race([live, wait(2500)]);
  field = await fieldReady;
  if (disposed) return;
  if (field) {
    fieldState.value = "on";
    field.setPaused(paused.value);
    cleanups.push(chart.onGeometry((geometry) => field?.setGeometry(geometry)));
    field.setGeometry(chart.geometry());
    await field.unfold();
  }
  chartShown.value = true;
  scheduleRefresh(liveChart);
}

function scheduleRefresh(liveChart: typeof import("./live-chart")) {
  refreshTimer = window.setInterval(async () => {
    if (document.hidden || !chart) return;
    try {
      const next = await liveChart.fetchLiveBars(window.location.origin);
      bars.value = next;
      status.value = "live";
      chart.setBars(next);
    } catch {
      // Keep the last good bars; the label already says what they are.
    }
  }, 60_000);
}

function onPointer(event: PointerEvent) {
  if (!field || !chartHost.value) return;
  const rect = chartHost.value.getBoundingClientRect();
  field.setPointer([event.clientX - rect.left, event.clientY - rect.top]);
}
function onPointerLeave() {
  field?.setPointer(null);
}
function togglePause() {
  paused.value = !paused.value;
  field?.setPaused(paused.value);
}

onMounted(() => {
  hydrated.value = true;
  const idle = (callback: () => void) =>
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(callback, { timeout: 2500 })
      : window.setTimeout(callback, 1200);
  // After load and idle: the poster and text own the first paint (web.dev optimize-lcp).
  // A short grace after load keeps the engine chunk off the first-paint network.
  const begin = () =>
    window.setTimeout(() => idle(() => void start().catch(() => (status.value = "delayed"))), 1200);
  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
});

onBeforeUnmount(() => {
  disposed = true;
  window.clearInterval(refreshTimer);
  for (const cleanup of cleanups) cleanup();
  field?.dispose();
  void chart?.dispose();
});

defineExpose({
  /** Theme flips reach the canvas engine and the field (they read tokens, not CSS). */
  async applyMode() {
    chart?.setMode(mode.value);
    if (field) field.setLook(await readLook());
  },
});
</script>
<template>
  <figure
    ref="panel"
    class="hero-chart"
    :data-status="status"
    :data-field="fieldState"
    :data-chart="chartShown ? 'shown' : 'pending'"
    :aria-label="t('home.chart.region', { name: t('home.chart.name') })"
  >
    <header class="hero-chart-bar">
      <p class="hero-chart-instrument">
        <span class="t-num">600519</span>
        <span>{{ t("home.chart.name") }}</span>
        <span class="t-meta">{{ t("home.chart.period") }} · GOTDX</span>
      </p>
      <p class="hero-chart-quote" aria-live="polite">
        <span class="hero-status t-meta" :data-status="status">
          <span class="hero-status-dot" aria-hidden="true" />
          {{ t(`home.chart.${status}`) }}
        </span>
        <template v-if="quote">
          <span class="t-num hero-last">{{ price(quote.last) }}</span>
          <span class="t-num hero-change" :data-direction="direction">
            <svg class="hero-change-mark" viewBox="0 0 8 8" width="8" height="8" aria-hidden="true">
              <path :d="direction === 'up' ? 'M4 1 7.5 7h-7Z' : 'M4 7 .5 1h7Z'" />
            </svg>
            {{ signed(quote.change) }} ({{ signed(quote.changePercent) }}%)
          </span>
        </template>
      </p>
    </header>
    <div class="hero-chart-body">
      <picture class="hero-poster">
        <source v-if="!hydrated" media="(prefers-color-scheme: dark)" :srcset="posters.dark" :sizes="posterSizes" />
        <img
          :srcset="hydrated ? posterSrcset : posters.light"
          :sizes="posterSizes"
          :src="posterLight1600"
          alt=""
          width="1600"
          height="700"
          fetchpriority="high"
          decoding="async"
        />
      </picture>
      <canvas ref="fieldCanvas" class="hero-field" aria-hidden="true" />
      <div
        ref="chartHost"
        class="hero-chart-host"
        @pointermove="onPointer"
        @pointerleave="onPointerLeave"
      >
        <!-- The engine takes over this element's position and overflow (mountChartDom). -->
        <div ref="chartMount" class="hero-chart-mount" />
      </div>
    </div>
    <figcaption class="hero-chart-foot">
      <span class="t-copy">{{ statusNote }}</span>
      <span class="hero-field-control">
        <span class="t-copy hero-field-note">{{ fieldState === "on" ? t("home.chart.field") : t("home.chart.fieldOff") }}</span>
        <button
          v-if="fieldState === 'on'"
          type="button"
          class="button button-quiet hero-pause"
          :aria-pressed="paused"
          @click="togglePause"
        >
          <KcqIcon :name="paused ? 'play' : 'pause'" />
          {{ paused ? t("home.chart.play") : t("home.chart.pause") }}
        </button>
      </span>
    </figcaption>
  </figure>
</template>
<style scoped>
.hero-chart {
  min-width: 0;
  margin: 0;
  border: 1px solid var(--kcq-rule);
  background: var(--klc-color-chart-background);
}
.hero-chart-bar,
.hero-chart-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--klc-space-8) var(--klc-space-16);
  padding: var(--klc-space-12) var(--klc-space-16);
}
.hero-chart-bar {
  border-bottom: 1px solid var(--kcq-rule);
}
.hero-chart-foot {
  border-top: 1px solid var(--kcq-rule);
}
.hero-chart-instrument,
.hero-chart-quote {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--klc-space-12);
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  font-weight: var(--klc-text-label-14-font-weight);
}
.hero-status {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
}
.hero-status-dot {
  width: var(--klc-space-8);
  height: var(--klc-space-8);
  border-radius: var(--klc-radius-full);
  background: var(--kcq-ink-2);
}
.hero-status[data-status="live"] .hero-status-dot {
  background: var(--kcq-up);
}
.hero-status[data-status="delayed"] .hero-status-dot {
  background: var(--klc-color-ui-warning);
}
.hero-last {
  font-size: var(--klc-text-label-16-font-size);
  line-height: var(--klc-text-label-16-line-height);
  color: var(--kcq-ink);
}
/* The sign and the triangle carry direction; colour only repeats it (CP 8). Market colours are
   below 4.5:1 as text on light presets, so the figures stay ink and the shape takes the colour. */
.hero-change {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-4);
  color: var(--kcq-ink);
}
.hero-change-mark {
  fill: var(--kcq-up);
}
.hero-change[data-direction="down"] .hero-change-mark {
  fill: var(--kcq-down);
}
.hero-chart-body {
  position: relative;
  height: clamp(20rem, 40vw, 34rem);
  overflow: hidden;
}
.hero-poster,
.hero-poster img,
.hero-field,
.hero-chart-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* Same mapping as field-shapes.ts glyphFrame(): the mark never moves when the field takes over. */
.hero-poster img {
  object-fit: cover;
  object-position: right center;
}
.hero-field {
  opacity: 0;
}
.hero-chart-host {
  opacity: 0;
  touch-action: pan-y;
}
.hero-chart-mount {
  position: relative;
  width: 100%;
  height: 100%;
}
.hero-chart-mount :deep(.hero-engine-scroller) {
  position: absolute;
  inset: 0;
  overflow: hidden;
  scrollbar-width: none;
}
.hero-chart-mount :deep(.hero-engine-canvas) {
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.hero-chart-mount :deep(.hero-engine-price-axis) {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--klc-space-64);
  z-index: 2;
}
/* The canvas legend's units are not localised yet; the panel header carries the quote. */
.hero-chart-mount :deep(.klc-legend-root) {
  display: none;
}
/* Field on: it replaces the poster (same opening frame), then dims under the chart. */
.hero-chart[data-field="on"] .hero-field {
  opacity: 1;
}
.hero-chart[data-field="on"] .hero-poster {
  visibility: hidden;
}
.hero-chart[data-chart="shown"] .hero-chart-host {
  opacity: 1;
  transition: opacity var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
.hero-chart[data-chart="shown"] .hero-field {
  opacity: 0.45;
  transition: opacity var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
.hero-chart[data-chart="shown"][data-field="off"] .hero-poster {
  opacity: 0.35;
  transition: opacity var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
.hero-field-control {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-12);
}
.hero-pause {
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-12);
}
@media (max-width: 767px) {
  .hero-field-note {
    display: none;
  }
}
</style>
