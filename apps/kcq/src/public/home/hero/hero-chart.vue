<!--
  The hero instrument (landing-benchmark §6.1; design §6 vgpu selection):
  - First paint is a prerendered poster of the field's opening frame: the KCQ glyph as the only
    light. It is the LCP image and stays as the fallback without WebGPU.
  - On idle, the real KCQ engine mounts (live-chart.ts, lazy) on the shared market feed
    (state/use-market-feed.ts): cached real bars at once, live bars from /market/tdx when they land.
  - With WebGPU and motion allowed, the light field (field/renderer.ts, lazy) unfolds the glyph
    into the live candles, then the crisp chart fades in over the dimmed field. The visitor's
    crosshair is one more light. The status chip says why the field is on or off and is the pause
    control (WCAG 2.2.2). Older history fades into the page (research B3: the past dissolves).
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../../components/kcq-icon.vue";
import { useMarketFeed } from "../../state/use-market-feed";
import { usePublicLocale } from "../../state/use-public-locale";
import { useTheme } from "../../state/use-theme";
import type { HeroField } from "../field/renderer";
import { type Bar, tradingDate } from "./bars";
import cachedSeries from "./cached-bars.json";
import HeroTimeAxis from "./hero-time-axis.vue";
import type { ChartGeometry, HeroChart } from "./live-chart";
import posterDark800 from "./poster/poster-dark-800.webp";
import posterDark1600 from "./poster/poster-dark-1600.webp";
import posterLight800 from "./poster/poster-light-800.webp";
import posterLight1600 from "./poster/poster-light-1600.webp";

const emit = defineEmits<{ shown: [withField: boolean] }>();
const { t } = useI18n();
const { locale, intl } = usePublicLocale();
const { mode, hydrated } = useTheme();
const feed = useMarketFeed();
const summaryId = useId();

/** Why the light field is in the state it is in; the chip says it in words. */
type FieldState = "pending" | "on" | "gpu" | "motion" | "data";
const fieldState = ref<FieldState>("pending");
const chartShown = ref(false);
const paused = ref(false);
const geometry = shallowRef<ChartGeometry | null>(null);
const hover = shallowRef<Bar | null>(null);

const panel = ref<HTMLElement>();
const chartHost = ref<HTMLDivElement>();
const chartMount = ref<HTMLDivElement>();
const fieldCanvas = ref<HTMLCanvasElement>();

const posters = {
  dark: `${posterDark800} 800w, ${posterDark1600} 1600w`,
  light: `${posterLight800} 800w, ${posterLight1600} 1600w`,
};
const posterSizes = "(min-width: 1344px) 760px, (min-width: 1280px) 58vw, calc(100vw - 32px)";
/** After hydration the explicit theme wins over the system one the <picture> media follows. */
const posterSrcset = computed(() => posters[mode.value]);

const price = (value: number) =>
  new Intl.NumberFormat(intl.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const compact = (value: number) =>
  new Intl.NumberFormat(intl.value, { notation: "compact", maximumFractionDigits: 2 }).format(value);
const statusKey = computed(() => (feed.status.value === "idle" ? "connecting" : feed.status.value));
const statusNote = computed(() =>
  feed.status.value === "live"
    ? t("home.chart.liveNote")
    : t(feed.status.value === "delayed" ? "home.chart.delayedNote" : "home.chart.connectingNote", {
        date: feed.quote.value?.date ?? "",
      }),
);

let chart: HeroChart | undefined;
let field: HeroField | null = null;
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

/** The field runs only with WebGPU, motion allowed and no data-saver hint (design §6). */
function fieldBlocker(): Exclude<FieldState, "pending" | "on"> | null {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!("gpu" in navigator)) return "gpu";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "motion";
  if (connection?.saveData === true) return "data";
  return null;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function start() {
  const blocker = fieldBlocker();
  if (blocker) fieldState.value = blocker;
  const live = feed.start();
  const [liveChart, fieldModule] = await Promise.all([
    import("./live-chart"),
    blocker ? Promise.resolve(null) : import("../field/renderer"),
  ]);
  if (disposed || !chartMount.value) return;
  const fieldReady = fieldModule
    ? readLook()
        .then((look) => fieldModule.createHeroField(fieldCanvas.value!, look))
        .catch(() => null)
    : Promise.resolve(null);
  // The cached bars are real; the chart mounts on them at once and the live bars replace them.
  chart = await liveChart.mountHeroChart(chartMount.value, { bars: feed.bars.value, mode: mode.value });
  cleanups.push(chart.onGeometry((next) => (geometry.value = next)));
  geometry.value = chart.geometry();
  // Let a fast feed land before the unfold, so the light opens onto today's bars.
  await Promise.race([live, wait(2500)]);
  field = await fieldReady;
  if (disposed) return;
  if (field) {
    fieldState.value = "on";
    field.setPaused(paused.value);
    cleanups.push(chart.onGeometry((next) => field?.setGeometry(next)));
    field.setGeometry(chart.geometry());
    await field.unfold();
  } else if (fieldState.value === "pending") {
    fieldState.value = "gpu";
  }
  chartShown.value = true;
  // The hero timeline (motion/hero-timeline.ts) owns the handoff animation from here.
  emit("shown", fieldState.value === "on");
}

// Every later feed update reaches the engine; theme flips reach the engine and the field (both read
// tokens, not CSS).
watch(feed.bars, (bars) => chart?.setBars(bars));
watch(mode, async () => {
  chart?.setMode(mode.value);
  if (field) field.setLook(await readLook());
});

function onPointer(event: PointerEvent) {
  if (!chartHost.value) return;
  const rect = chartHost.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  hover.value = chart && x < (geometry.value?.width ?? 0) ? chart.barAt(x) : null;
  field?.setPointer([x, event.clientY - rect.top]);
}
function onPointerLeave() {
  hover.value = null;
  field?.setPointer(null);
}
function togglePause() {
  paused.value = !paused.value;
  field?.setPaused(paused.value);
}

onMounted(() => {
  const idle = (callback: () => void) =>
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(callback, { timeout: 2500 })
      : window.setTimeout(callback, 1200);
  // After load and idle: the poster and text own the first paint (web.dev optimize-lcp).
  // A short grace after load keeps the engine chunk off the first-paint network.
  const begin = () => window.setTimeout(() => idle(() => void start().catch(() => undefined)), 1200);
  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
});

onBeforeUnmount(() => {
  disposed = true;
  for (const cleanup of cleanups) cleanup();
  field?.dispose();
  void chart?.dispose();
});
</script>
<template>
  <figure
    ref="panel"
    class="hero-chart"
    :data-status="feed.status.value"
    :data-field="fieldState === 'on' ? 'on' : 'off'"
    :data-chart="chartShown ? 'shown' : 'pending'"
    :aria-label="t('home.chart.region', { name: t('home.chart.name') })"
    :aria-describedby="summaryId"
  >
    <p :id="summaryId" class="visually-hidden">{{ t("home.chart.summary") }}</p>
    <header class="hero-chart-bar">
      <p class="hero-chart-instrument">
        <span class="t-num">600519</span>
        <span>{{ t("home.chart.name") }}</span>
        <span class="t-meta">{{ t("home.chart.period") }} · GOTDX</span>
      </p>
      <p class="hero-status t-meta" :data-status="statusKey" aria-live="polite">
        <span class="status-dot" aria-hidden="true" />
        {{ t(`home.chart.${statusKey}`) }}
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
        aria-hidden="true"
        @pointermove="onPointer"
        @pointerleave="onPointerLeave"
      >
        <!-- The engine takes over this element's position and overflow (mountChartDom). -->
        <div ref="chartMount" class="hero-chart-mount" />
        <HeroTimeAxis :geometry="geometry" :locale="locale" :time-zone="cachedSeries.timezone" />
        <p v-if="hover" class="hero-legend t-num">
          <span>{{ tradingDate(hover.timestamp) }}</span>
          <span><abbr :title="t('home.chart.legend.open')">{{ t("home.chart.legend.o") }}</abbr> {{ price(hover.open) }}</span>
          <span><abbr :title="t('home.chart.legend.high')">{{ t("home.chart.legend.h") }}</abbr> {{ price(hover.high) }}</span>
          <span><abbr :title="t('home.chart.legend.low')">{{ t("home.chart.legend.l") }}</abbr> {{ price(hover.low) }}</span>
          <span><abbr :title="t('home.chart.legend.close')">{{ t("home.chart.legend.c") }}</abbr> {{ price(hover.close) }}</span>
          <span><abbr :title="t('home.chart.legend.volume')">{{ t("home.chart.legend.v") }}</abbr> {{ compact(hover.volume) }}</span>
        </p>
        <p v-else-if="chartShown" class="hero-hint t-meta">{{ t("home.chart.hint") }}</p>
      </div>
    </div>
    <figcaption class="hero-chart-foot">
      <span class="t-copy hero-note">{{ statusNote }}</span>
      <span class="hero-field-chip t-meta" :data-field="fieldState">
        <span class="hero-field-dot" aria-hidden="true" />
        {{ t(`home.chart.field.${fieldState}`) }}
        <button
          v-if="fieldState === 'on'"
          type="button"
          class="hero-pause"
          :aria-pressed="paused"
          :aria-label="paused ? t('home.chart.play') : t('home.chart.pause')"
          :title="paused ? t('home.chart.play') : t('home.chart.pause')"
          @click="togglePause"
        >
          <KcqIcon :name="paused ? 'play' : 'pause'" :size="14" />
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
  border-radius: var(--klc-radius-md);
  overflow: hidden;
  background: var(--klc-color-chart-background);
  box-shadow: var(--klc-elevation-2);
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
/* Older history dissolves into the page; the latest bars stay sharp (research B3). */
.hero-field,
.hero-chart-mount :deep(.hero-engine-scroller) {
  mask-image: linear-gradient(to right, transparent, #000 16%);
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
  inset: 0 0 var(--klc-space-24);
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
  bottom: var(--klc-space-24);
  width: var(--klc-space-64);
  z-index: 2;
}
/* The engine's DOM legend uses fixed Chinese units; the localised hover legend replaces it. */
.hero-chart-mount :deep(.klc-legend-root) {
  display: none;
}
.hero-legend {
  position: absolute;
  top: var(--klc-space-8);
  left: var(--klc-space-12);
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-4) var(--klc-space-12);
  max-width: calc(100% - var(--klc-space-64) - var(--klc-space-24));
  margin: 0;
  padding: var(--klc-space-4) var(--klc-space-8);
  border-radius: var(--klc-radius-xs);
  background: color-mix(in oklab, var(--klc-color-chart-background) 88%, transparent);
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  color: var(--kcq-ink);
  pointer-events: none;
}
.hero-legend abbr {
  color: var(--kcq-ink-2);
  text-decoration: none;
}
/* Field on: it replaces the poster (same opening frame), then dims under the chart. */
.hero-chart[data-field="on"] .hero-field {
  opacity: 1;
}
.hero-chart[data-field="on"] .hero-poster {
  visibility: hidden;
}
/* End states only; the hero timeline (GSAP) animates the handoff, so no CSS transition here
   (one owner per property). Reduced motion lands on these directly. */
.hero-chart[data-chart="shown"] .hero-chart-host {
  opacity: 1;
}
.hero-chart[data-chart="shown"] .hero-field {
  opacity: 0.45;
}
.hero-chart[data-chart="shown"][data-field="off"] .hero-poster {
  opacity: 0.35;
}
.hero-hint {
  position: absolute;
  bottom: calc(var(--klc-space-24) + var(--klc-space-8));
  left: var(--klc-space-12);
  margin: 0;
  pointer-events: none;
}
@media (hover: none) {
  .hero-hint {
    display: none;
  }
}
/* The field's state in words, and its pause control (WCAG 2.2.2): one chip, not a sentence. */
.hero-field-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  min-height: var(--klc-density-default);
  padding-left: var(--klc-space-8);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
  text-transform: none;
  letter-spacing: 0;
}
.hero-field-chip:not(:has(button)) {
  padding-right: var(--klc-space-12);
}
.hero-field-dot {
  width: var(--klc-space-8);
  height: var(--klc-space-8);
  border-radius: var(--klc-radius-full);
  border: 1.5px solid var(--kcq-ink-2);
}
.hero-field-chip[data-field="on"] .hero-field-dot {
  border: 0;
  background: var(--kcq-accent);
  box-shadow: 0 0 0 3px var(--kcq-accent-wash);
}
.hero-pause {
  display: inline-grid;
  place-items: center;
  width: var(--klc-density-default);
  height: calc(var(--klc-density-default) - 2px);
  padding: 0;
  border: 0;
  border-left: 1px solid var(--kcq-rule);
  border-radius: 0 var(--klc-radius-full) var(--klc-radius-full) 0;
  background: transparent;
  color: var(--kcq-ink);
  cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .hero-pause:hover {
    background: var(--kcq-hover);
  }
}
@media (max-width: 767px) {
  .hero-note {
    display: none;
  }
}
</style>
