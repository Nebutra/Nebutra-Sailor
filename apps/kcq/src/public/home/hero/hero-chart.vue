<!--
  The hero instrument (landing-benchmark §6.1; design §6 vgpu selection):
  - First paint is a prerendered poster of the field's opening frame: the KCQ glyph as the only
    light. It is the LCP image and stays as the fallback without WebGPU.
  - On idle, the real KCQ engine mounts (live-chart.ts, lazy) on the shared market feed
    (state/use-market-feed.ts): cached real bars at once, live bars from /market/tdx when they land.
  - With WebGPU and motion allowed, the light field (field/renderer.ts, lazy) unfolds the glyph
    into the live candles, then the crisp chart fades in over the dimmed field. The visitor's
    crosshair is one more light. The status chip says why the field is on or off and is the pause
    control (WCAG 2.2.2), a 24px icon in the frame's corner. Older history fades into the frame.
  - The frame keeps one fixed dark chart surface in both page themes (restraint benchmark rule 4,
    the Vela technique): the product reads as one object, and the light reads on its own ground.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../../components/kcq-icon.vue";
import { useMarketFeed } from "../../state/use-market-feed";
import { usePublicLocale } from "../../state/use-public-locale";
import type { HeroField } from "../field/renderer";
import { type Bar, tradingDate } from "./bars";
import cachedSeries from "./cached-bars.json";
import HeroTimeAxis from "./hero-time-axis.vue";
import type { ChartGeometry, HeroChart } from "./live-chart";
// Inlined: the poster is the hero's LCP image, so it paints with the HTML. One size, the 800px
// frame (2 KB): it is a soft glow on the dark ground, held only until the light or the chart takes
// over, and every byte of a data URI is a byte of the document every visitor downloads first.
import posterDark800 from "./poster/poster-dark-800.webp?inline";

const emit = defineEmits<{ shown: [withField: boolean] }>();
const { t } = useI18n();
const { locale, intl } = usePublicLocale();
/** The frame is always the dark chart surface, whatever the page theme. */
const MODE = "dark" as const;
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
    mode: MODE,
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
  chart = await liveChart.mountHeroChart(chartMount.value, { bars: feed.bars.value, mode: MODE });
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

// Every later feed update reaches the engine. Page theme flips do not: the frame stays dark.
watch(feed.bars, (bars) => chart?.setBars(bars));

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
    class="hero-chart product-frame"
    data-theme="dark"
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
        <span class="hero-chart-period">{{ t("home.chart.period") }} · GOTDX</span>
      </p>
      <p class="hero-status" :data-status="statusKey" aria-live="polite">
        <span class="status-dot" aria-hidden="true" />
        {{ t(`home.chart.${statusKey}`) }}
        <span class="visually-hidden">{{ statusNote }}</span>
      </p>
      <button
        v-if="fieldState === 'on'"
        type="button"
        class="hero-pause"
        :aria-pressed="paused"
        :aria-label="`${paused ? t('home.chart.play') : t('home.chart.pause')} · ${t('home.chart.field.on')}`"
        :title="paused ? t('home.chart.play') : t('home.chart.pause')"
        @click="togglePause"
      >
        <KcqIcon :name="paused ? 'play' : 'pause'" :size="14" />
      </button>
    </header>
    <div class="hero-chart-body">
      <picture class="hero-poster">
        <img
          :src="posterDark800"
          alt=""
          width="800"
          height="350"
          fetchpriority="high"
          decoding="sync"
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
        <p v-else-if="chartShown" class="hero-hint">{{ t("home.chart.hint") }}</p>
      </div>
    </div>
  </figure>
</template>
<style scoped>
.hero-chart-bar {
  display: flex;
  align-items: center;
  gap: var(--klc-space-16);
  min-height: var(--klc-space-48);
  padding: var(--klc-space-8) var(--klc-space-12) var(--klc-space-8) var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
}
/* One line always: the status word changes length ("Connecting…" → "Live"), the bar never
   re-wraps (that re-wrap was a measured layout shift). The instrument name truncates instead. */
.hero-chart-instrument {
  display: flex;
  align-items: baseline;
  gap: var(--klc-space-12);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  font-weight: var(--klc-text-label-14-font-weight);
}
.hero-chart-period,
.hero-status,
.hero-hint {
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  font-weight: 400;
  color: var(--kcq-ink-2);
}
.hero-status {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--klc-space-8);
  margin-left: auto;
  white-space: nowrap;
}
/* The light's pause control (WCAG 2.2.2): a 24px icon in the frame's corner. */
.hero-pause {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--klc-space-24);
  height: var(--klc-space-24);
  padding: 0;
  border: 0;
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.hero-pause:active {
  transform: scale(var(--kcq-press-icon));
}
@media (hover: hover) and (pointer: fine) {
  .hero-pause:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
@media (pointer: coarse) {
  .hero-pause {
    width: var(--klc-density-hit-target-touch);
    height: var(--klc-density-hit-target-touch);
    margin-block: calc(-1 * var(--klc-space-8));
  }
}
.hero-chart-body {
  position: relative;
  height: clamp(20rem, 38vw, 32rem);
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
/* Older history dissolves into the frame; the latest bars stay sharp (research B3). */
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
  border-radius: var(--klc-radius-sm);
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
/* Restrained light (FIELD_REST / POSTER_REST in motion/hero-timeline.ts): a desaturated glow,
   so the plot never takes on the candles' red or green and the candles read on the bare surface. */
.hero-chart[data-chart="shown"] .hero-field {
  opacity: 0.16;
  filter: saturate(0.25);
}
.hero-chart[data-chart="shown"][data-field="off"] .hero-poster {
  opacity: 0.14;
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
</style>
