<!--
  The rendering claim, checkable (research F5): real 600519 candles drawn into a Canvas2D strip at
  this screen's device pixel ratio, and a loupe that magnifies the actual device pixels under it
  (drawImage with smoothing off; no readback from the GPU). "Snapped" lands every wick and edge on
  a device pixel the way the engine does; "Unsnapped" shifts them half a device pixel, and the
  loupe shows each wick smear into two grey columns. Drag the lens, or focus it and use the arrows.
  It draws only while visible, and only on change: there is no animation loop.
-->
<script setup lang="ts">
import { useElementVisibility, useResizeObserver } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { usePublicLocale } from "../../state/use-public-locale";
import { useTheme } from "../../state/use-theme";
import { CACHED_BARS } from "../hero/bars";

const { t } = useI18n();
const { mode } = useTheme();
const { locale } = usePublicLocale();
/** Han text takes the full-width colon with no space after it; Latin, the colon and a space. */
const colon = computed(() => (locale.value === "zh" ? "：" : ": "));
const root = ref<HTMLElement>();
const strip = ref<HTMLCanvasElement>();
const lens = ref<HTMLCanvasElement>();
const visible = useElementVisibility(root);

const snapped = ref(true);
const dpr = ref(1);
/** Lens centre in strip CSS pixels. */
const at = ref({ x: 0, y: 0 });
const size = ref({ width: 0, height: 0 });
const LENS = 144;
/** Device pixels across the lens: few enough that each one is a visible cell. */
const CELLS = 12;
const BARS = CACHED_BARS.slice(-28);

function colors() {
  const style = getComputedStyle(root.value!);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    ground: token("--klc-color-chart-background"),
    grid: token("--klc-color-grid-major"),
    up: token("--klc-color-candle-up-body"),
    down: token("--klc-color-candle-down-body"),
  };
}

/** Engine-style drawing in device pixels; `shift` is 0 (snapped) or 0.5 device px (unsnapped). */
function drawStrip() {
  const canvas = strip.value;
  if (!canvas || !size.value.width) return;
  const ratio = dpr.value;
  const width = Math.round(size.value.width * ratio);
  const height = Math.round(size.value.height * ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const c = colors();
  const shift = snapped.value ? 0 : 0.5;
  const snap = (value: number) => (snapped.value ? Math.round(value) : value) + shift;
  ctx.fillStyle = c.ground;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = c.grid;
  for (const f of [0.25, 0.5, 0.75]) ctx.fillRect(0, snap(height * f), width, 1);
  const low = Math.min(...BARS.map((bar) => bar.low));
  const high = Math.max(...BARS.map((bar) => bar.high));
  const pad = 12 * ratio;
  const y = (price: number) => pad + ((high - price) / (high - low)) * (height - pad * 2);
  const step = width / BARS.length;
  const body = Math.max(3, Math.round(step * 0.56));
  BARS.forEach((bar, index) => {
    const centre = step * (index + 0.5);
    ctx.fillStyle = bar.close >= bar.open ? c.up : c.down;
    // One device pixel wide wick, the engine's crisp-line rule.
    ctx.fillRect(snap(centre), snap(y(bar.high)), 1, Math.max(1, y(bar.low) - y(bar.high)));
    const top = y(Math.max(bar.open, bar.close));
    ctx.fillRect(snap(centre - body / 2 + 0.5), snap(top), body, Math.max(1, Math.round(Math.abs(y(bar.open) - y(bar.close)))));
  });
  drawLens();
}

function drawLens() {
  const source = strip.value;
  const target = lens.value;
  if (!source || !target) return;
  const ratio = dpr.value;
  const px = Math.round(LENS * ratio);
  target.width = px;
  target.height = px;
  const ctx = target.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const sx = Math.round(at.value.x * ratio - CELLS / 2);
  const sy = Math.round(at.value.y * ratio - CELLS / 2);
  ctx.fillStyle = colors().ground;
  ctx.fillRect(0, 0, px, px);
  ctx.drawImage(source, sx, sy, CELLS, CELLS, 0, 0, px, px);
  // The device-pixel grid, so a smear reads as two half-filled cells.
  const cell = px / CELLS;
  ctx.fillStyle = mode.value === "dark" ? "rgb(255 255 255 / 0.08)" : "rgb(0 0 0 / 0.08)";
  for (let i = 1; i < CELLS; i++) {
    ctx.fillRect(Math.round(i * cell), 0, 1, px);
    ctx.fillRect(0, Math.round(i * cell), px, 1);
  }
}

/** Keep the whole lens inside the stage. */
function clampTo(x: number, y: number) {
  const half = LENS / 2 + 4;
  at.value = {
    x: Math.min(size.value.width - half, Math.max(half, x)),
    y: Math.min(size.value.height - half, Math.max(half, y)),
  };
}

let dragging = false;
function onDown(event: PointerEvent) {
  dragging = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  onMove(event);
}
function onMove(event: PointerEvent) {
  if (!dragging || !strip.value) return;
  const rect = strip.value.getBoundingClientRect();
  clampTo(event.clientX - rect.left, event.clientY - rect.top);
}
function onUp() {
  dragging = false;
}
function onKey(event: KeyboardEvent) {
  const step = event.shiftKey ? 16 : 2;
  const delta = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }[event.key];
  if (!delta) return;
  event.preventDefault();
  clampTo(at.value.x + delta[0]!, at.value.y + delta[1]!);
}

/** Start on the longest wick the lens can sit on fully: the most telling pixels. */
function placeOnCandle() {
  const step = size.value.width / BARS.length;
  const low = Math.min(...BARS.map((item) => item.low));
  const high = Math.max(...BARS.map((item) => item.high));
  const pad = 12;
  const y = (price: number) => pad + ((high - price) / (high - low)) * (size.value.height - pad * 2);
  const half = LENS / 2 + 4;
  // Where the wick meets the body: one column of wick, the body's edge just below it.
  const target = (index: number) => {
    const bar = BARS[index]!;
    return { x: step * (index + 0.5), y: (y(bar.high) + y(Math.max(bar.open, bar.close))) / 2 + 2 };
  };
  const reachable = BARS.map((bar, index) => ({ bar, index, at: target(index) })).filter(
    ({ at: point }) =>
      point.x >= half && point.x <= size.value.width - half && point.y >= half && point.y <= size.value.height - half,
  );
  const pool = reachable.length ? reachable : BARS.map((bar, index) => ({ bar, index, at: target(index) }));
  const best = pool.reduce((a, b) => (b.bar.high - b.bar.low > a.bar.high - a.bar.low ? b : a));
  clampTo(best.at.x, best.at.y);
}

let placed = false;
useResizeObserver(strip, () => {
  const canvas = strip.value;
  if (!canvas || !canvas.clientWidth) return;
  size.value = { width: canvas.clientWidth, height: canvas.clientHeight };
  // Placed from the first real layout, not from the canvas's default size at mount.
  if (!placed) {
    placeOnCandle();
    placed = true;
  } else {
    clampTo(at.value.x, at.value.y);
  }
  if (visible.value) drawStrip();
});

onMounted(() => {
  dpr.value = window.devicePixelRatio || 1;
});

watch([visible, snapped, mode], () => visible.value && drawStrip(), { flush: "post" });
watch(at, () => visible.value && drawLens());
</script>
<template>
  <figure ref="root" class="loupe">
    <div class="loupe-stage" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <canvas ref="strip" class="loupe-strip" aria-hidden="true" />
      <button
        type="button"
        class="loupe-lens"
        :style="{ '--x': `${at.x}px`, '--y': `${at.y}px` }"
        :aria-label="`${t('home.rendering.loupe.label')}. ${t('home.rendering.loupe.hint')}`"
        @keydown="onKey"
      >
        <canvas ref="lens" aria-hidden="true" />
      </button>
    </div>
    <figcaption class="loupe-bar t-copy">
      <!-- One text toggle: the alignment the strip is drawn with. -->
      <button type="button" role="switch" class="loupe-toggle" :aria-checked="snapped" @click="snapped = !snapped">
        {{ t("home.rendering.loupe.toggle") }}{{ colon }}<span class="loupe-state">{{ snapped ? t("home.rendering.loupe.on") : t("home.rendering.loupe.off") }}</span>
      </button>
      <span aria-live="polite">{{ snapped ? t("home.rendering.loupe.onNote") : t("home.rendering.loupe.offNote") }}</span>
    </figcaption>
  </figure>
</template>
<style scoped>
.loupe {
  display: grid;
  gap: var(--klc-space-12);
  max-width: 56rem;
  margin-bottom: 0;
  margin-inline: 0;
}
.loupe-stage {
  position: relative;
  height: 16rem;
  border-radius: var(--klc-radius-lg);
  overflow: hidden;
  background: var(--klc-color-chart-background);
  touch-action: none;
  cursor: crosshair;
}
.loupe-strip {
  width: 100%;
  height: 100%;
}
.loupe-lens {
  position: absolute;
  top: 0;
  left: 0;
  width: 9rem;
  height: 9rem;
  padding: 0;
  border: 1px solid var(--kcq-ink-2);
  border-radius: var(--klc-radius-full);
  overflow: hidden;
  background: var(--klc-color-chart-background);
  transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%));
  cursor: grab;
}
.loupe-lens:active {
  cursor: grabbing;
}
.loupe-lens canvas {
  width: 100%;
  height: 100%;
}
.loupe-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--klc-space-4) var(--klc-space-16);
}
.loupe-toggle {
  min-height: var(--klc-density-default);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--kcq-ink);
  font-size: inherit;
  line-height: inherit;
  cursor: pointer;
}
@media (pointer: coarse) {
  .loupe-toggle {
    min-height: var(--klc-density-comfortable);
  }
}
.loupe-state {
  color: var(--kcq-accent-text);
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  text-decoration-color: color-mix(in oklab, currentColor 40%, transparent);
}
</style>
