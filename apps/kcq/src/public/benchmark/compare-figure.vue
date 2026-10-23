<!--
  The comparison figure: one row per library and backend, main-thread time per frame on one shared
  millisecond axis, least first. The bar is the mean; a hairline spans the fastest and slowest round,
  so the noise is on the figure, not in a footnote. A radiogroup switches the visible-bar tier; rows
  re-rank with a FLIP move and the bars morph on the same axis. KCQ rows carry the accent, every other
  library the secondary ink. A product frame in the page's colour mode, like every frame on /home.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReveal } from "../home/motion/use-reveal";
import { PUBLIC_LOCALES } from "../routes";
import { usePublicLocale } from "../state/use-public-locale";
import { axisTicks, COMPARE_RUN, type CompareRow, roundRange, tierRows } from "./compare-run";

const { t } = useI18n();
const { locale } = usePublicLocale();
const tiers = COMPARE_RUN.configuration.visibleBars;
// The largest tier opens the figure: the most bars on screen is the case a chart engine is for.
const tier = ref(Math.max(...tiers));
const rows = computed(() => tierRows(COMPARE_RUN, tier.value));
const ticks = axisTicks(COMPARE_RUN);
const axisMax = ticks[ticks.length - 1];
const figure = ref<HTMLElement>();
const { state } = useReveal(figure);

const count = (value: number) => value.toLocaleString(PUBLIC_LOCALES[locale.value].htmlLang);
const ms = (value: number) => value.toFixed(2);
/** A row's bar and round range as fractions of the axis, for the CSS. */
function geometry(row: CompareRow, index: number) {
  const { low, high } = roundRange(row.scenario);
  return {
    "--i": index,
    "--share": row.scenario.mainThreadMsPerFrame / axisMax,
    "--low": low / axisMax,
    "--high": high / axisMax,
  };
}

/** Arrow, Home and End move the selection inside the radiogroup (WAI-ARIA radio pattern). */
function onKey(event: KeyboardEvent) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  const current = tiers.indexOf(tier.value);
  const index =
    event.key === "Home" ? 0 : event.key === "End" ? tiers.length - 1 : (current + (step ?? 0) + tiers.length) % tiers.length;
  tier.value = tiers[index];
  const group = event.currentTarget as HTMLElement;
  group.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
}
</script>
<template>
  <figure
    ref="figure"
    class="compare product-frame"
    :data-reveal="state"
    :style="{ '--ticks': axisMax }"
  >
    <div class="compare-head">
      <figcaption class="compare-caption">
        <span class="t-label">{{ t("benchmark.figure.caption") }}</span>
        <span class="t-ui compare-hint">{{ t("benchmark.figure.lower") }}</span>
      </figcaption>
      <div class="tier-switch" role="radiogroup" :aria-label="t('benchmark.figure.tiers')" @keydown="onKey">
        <button
          v-for="value in tiers"
          :key="value"
          type="button"
          role="radio"
          class="tier-option t-ui t-num"
          :aria-checked="tier === value"
          :tabindex="tier === value ? 0 : -1"
          @click="tier = value"
        >
          {{ t("benchmark.figure.tier", { count: count(value) }) }}
        </button>
      </div>
    </div>
    <TransitionGroup tag="ol" name="compare-row" class="compare-rows">
      <li
        v-for="(row, index) in rows"
        :key="row.subject.id"
        class="compare-row reveal-item"
        :data-kcq="row.kcq || undefined"
        :style="geometry(row, index)"
      >
        <span class="row-name">
          <span class="row-library">{{ row.subject.library }}</span>
          <span class="row-renderer t-ui">{{ row.subject.renderer }}</span>
        </span>
        <span class="row-track" aria-hidden="true"><span class="row-fill" /><span class="row-range" /></span>
        <span class="row-value t-num">{{ ms(row.scenario.mainThreadMsPerFrame) }}<span class="row-unit">ms</span></span>
      </li>
    </TransitionGroup>
    <div class="compare-axis t-ui t-num" aria-hidden="true">
      <span class="axis-ticks">
        <span v-for="tick in ticks" :key="tick" class="axis-tick" :style="{ '--at': tick / axisMax }">{{ tick }}</span>
      </span>
    </div>
    <p class="compare-note t-ui">
      {{
        t("benchmark.figure.note", {
          frames: count(COMPARE_RUN.configuration.sampleFrames),
          rounds: COMPARE_RUN.configuration.rounds,
          budget: COMPARE_RUN.configuration.refreshIntervalMs.toFixed(1),
        })
      }}
    </p>
  </figure>
</template>
<style scoped>
.compare {
  --name-column: 15rem;
  --value-column: 5.5rem;
  display: grid;
  gap: var(--klc-space-24);
  padding: var(--klc-space-24);
}
@media (min-width: 768px) {
  .compare {
    padding: var(--klc-space-32) var(--klc-space-40);
  }
}
.compare-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--klc-space-16);
}
.compare-caption {
  display: grid;
  gap: var(--klc-space-2);
}
.compare-hint,
.compare-note {
  color: var(--kcq-ink-2);
}

/* The tier switch: the footer theme control's segmented grammar, with text instead of icons. */
.tier-switch {
  display: inline-flex;
  gap: var(--klc-space-2);
  padding: var(--klc-space-2);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
}
.tier-option {
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-12);
  border: 0;
  border-radius: var(--klc-radius-full);
  background: transparent;
  color: var(--kcq-ink-2);
  white-space: nowrap;
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.tier-option:active {
  transform: scale(var(--kcq-press));
}
@media (hover: hover) and (pointer: fine) {
  .tier-option:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
.tier-option[aria-checked="true"] {
  color: var(--kcq-ink);
  background: var(--kcq-control);
}
@media (pointer: coarse) {
  .tier-option {
    min-height: var(--klc-density-hit-target-touch);
  }
}

/* Rows: name · track · value on one grid, so every track shares one axis. Phones put the name
   above its track. */
.compare-rows {
  position: relative;
  display: grid;
  gap: var(--klc-space-12);
}
.compare-row {
  --reveal-y: 8px;
  --reveal-stagger: 60ms;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--value-column);
  grid-template-areas: "name name" "track value";
  align-items: center;
  column-gap: var(--klc-space-16);
  row-gap: var(--klc-space-4);
}
@media (min-width: 768px) {
  .compare-row {
    grid-template-columns: var(--name-column) minmax(0, 1fr) var(--value-column);
    grid-template-areas: "name track value";
  }
}
.row-name {
  grid-area: name;
  display: flex;
  align-items: baseline;
  gap: var(--klc-space-8);
  min-width: 0;
  color: var(--kcq-ink-2);
}
.row-library {
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  font-weight: var(--klc-text-label-14-font-weight);
  white-space: nowrap;
}
.row-renderer {
  white-space: nowrap;
  color: var(--kcq-ink-2);
}
[data-kcq] .row-library {
  color: var(--kcq-ink);
}
[data-kcq] .row-renderer {
  color: var(--kcq-accent-text);
}
/* The track carries the millisecond grid: one hairline per tick, so stacked tracks read as a plot. */
.row-track {
  grid-area: track;
  position: relative;
  height: var(--klc-space-32);
  background-image: linear-gradient(to right, var(--kcq-grid) 1px, transparent 1px);
  background-size: calc(100% / var(--ticks)) 100%;
  box-shadow: inset -1px 0 0 var(--kcq-grid);
}
.row-fill {
  position: absolute;
  inset: var(--klc-space-8) 0;
  border-radius: 0 var(--klc-radius-sm) var(--klc-radius-sm) 0;
  background: color-mix(in oklab, var(--kcq-ink-2) 55%, transparent);
  transform: scaleX(var(--share));
  transform-origin: left center;
  transition: transform var(--kcq-motion-long) var(--klc-motion-ease-out);
  transition-delay: calc(var(--i, 0) * 40ms);
}
[data-kcq] .row-fill {
  background: var(--kcq-accent);
}
/* Entrance: armed rows hold their bars at zero, then grow them in rank order once seen. */
[data-reveal="armed"] .row-fill {
  transform: scaleX(0);
}
[data-reveal="shown"] .row-fill {
  transition-delay: calc(var(--i, 0) * var(--reveal-stagger) + var(--kcq-motion-medium) / 2);
}
/* The round range: a hairline with end caps from the fastest to the slowest round, over the bar. */
.row-range {
  position: absolute;
  top: 50%;
  left: calc(var(--low) * 100%);
  width: calc((var(--high) - var(--low)) * 100%);
  height: var(--klc-space-12);
  translate: 0 -50%;
  background:
    linear-gradient(var(--kcq-ink), var(--kcq-ink)) left center / 1px 100% no-repeat,
    linear-gradient(var(--kcq-ink), var(--kcq-ink)) right center / 1px 100% no-repeat,
    linear-gradient(var(--kcq-ink), var(--kcq-ink)) center / 100% 1px no-repeat;
  opacity: 0.7;
  transition-property: left, width, opacity;
  transition-duration: var(--kcq-motion-long), var(--kcq-motion-long), var(--kcq-motion-medium);
  transition-timing-function: var(--klc-motion-ease-out);
}
[data-reveal="armed"] .row-range {
  opacity: 0;
}
[data-reveal="shown"] .row-range {
  transition-delay: calc(var(--i, 0) * var(--reveal-stagger) + var(--kcq-motion-long));
}
.row-value {
  grid-area: value;
  justify-self: end;
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  color: var(--kcq-ink-2);
}
[data-kcq] .row-value {
  color: var(--kcq-ink);
}
.row-unit {
  margin-inline-start: var(--klc-space-2);
  color: var(--kcq-ink-2);
}
/* Re-ranking on a tier change: rows glide to their new place. */
.compare-row-move {
  transition: transform var(--kcq-motion-medium) var(--klc-motion-ease-out);
}

/* The axis: tick labels under the track column only. */
.compare-axis {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--value-column);
  column-gap: var(--klc-space-16);
  margin-top: calc(-1 * var(--klc-space-16));
  color: var(--kcq-ink-2);
}
@media (min-width: 768px) {
  .compare-axis {
    grid-template-columns: var(--name-column) minmax(0, 1fr) var(--value-column);
  }
  .axis-ticks {
    grid-column: 2;
  }
}
.axis-ticks {
  position: relative;
  height: var(--klc-space-16);
}
.axis-tick {
  position: absolute;
  left: calc(var(--at) * 100%);
  translate: -50% 0;
}
.axis-tick:first-child {
  translate: 0 0;
}
</style>
