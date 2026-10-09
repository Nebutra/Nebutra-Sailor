<!--
  Markets and data (deck 5.4; research A1, B1, B4, F3). The named sources as a strip, and the real product as
  the visual: a capture of the workstation at the pinned build (scripts/capture-workstation.mjs),
  per colour mode, not a mock-up. Callouts are drawn in KCQ's own drawing language: a Cobalt leader
  from an anchor dot to a price-label chip. They draw in once when the shot is first seen
  (IntersectionObserver). Over the shot, a fine pointer gets the chart's crosshair as its hover
  light, written to CSS variables once per frame (no reactive re-render per move).
-->
<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";
import facts from "virtual:kcq-facts";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "../state/use-theme";
import shotDark1200 from "./workstation/workstation-dark-1200.webp";
import shotDark2400 from "./workstation/workstation-dark-2400.webp";
import shotLight1200 from "./workstation/workstation-light-1200.webp";
import shotLight2400 from "./workstation/workstation-light-2400.webp";

const { t, tm, rt } = useI18n();
const { mode, hydrated } = useTheme();
const shots = {
  dark: `${shotDark1200} 1200w, ${shotDark2400} 2400w`,
  light: `${shotLight1200} 1200w, ${shotLight2400} 2400w`,
};
const sizes = "(min-width: 1344px) 1280px, calc(100vw - 64px)";

/** Anchors and label points as fractions of the 1440 × 852 capture (CSS pixels). */
const CALLOUTS = [
  { id: "indicators", anchor: [0.083, 0.108], label: [0.3, 0.06] },
  { id: "drawing", anchor: [0.435, 0.607], label: [0.53, 0.5] },
  { id: "agent", anchor: [0.737, 0.8], label: [0.79, 0.68] },
] as const;

const frame = ref<HTMLElement>();
const seen = ref(false);
const { stop } = useIntersectionObserver(
  frame,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    seen.value = true;
    stop();
  },
  { threshold: 0.4 },
);

let queued = 0;
function onPointer(event: PointerEvent) {
  if (event.pointerType !== "mouse" || queued) return;
  const target = event.currentTarget as HTMLElement;
  queued = requestAnimationFrame(() => {
    queued = 0;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    target.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
}
</script>
<template>
  <section id="markets" class="band band-raised workstation" aria-labelledby="workstation-heading">
    <div class="container">
      <div class="workstation-head">
        <div class="section-head">
          <h2 id="workstation-heading" class="t-heading">{{ t("home.workstation.heading") }}</h2>
          <p class="t-lede">{{ t("home.workstation.body") }}</p>
        </div>
        <ul class="sources" :aria-label="t('home.workstation.sourcesLabel')">
          <li v-for="(source, index) in tm('home.workstation.sources')" :key="index" class="t-meta" translate="no">
            {{ rt(source) }}
          </li>
        </ul>
      </div>
      <figure ref="frame" class="shot" :data-seen="seen || undefined" @pointermove="onPointer">
        <picture>
          <source v-if="!hydrated" media="(prefers-color-scheme: dark)" :srcset="shots.dark" :sizes="sizes" />
          <img
            :srcset="hydrated ? shots[mode] : shots.light"
            :sizes="sizes"
            :src="shotLight1200"
            :alt="t('home.workstation.alt')"
            width="1440"
            height="852"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <span class="shot-crosshair" aria-hidden="true" />
        <svg class="shot-callouts" viewBox="0 0 1440 852" aria-hidden="true">
          <g v-for="(callout, index) in CALLOUTS" :key="callout.id" class="callout" :style="{ '--i': index }">
            <line
              class="callout-leader"
              :x1="callout.anchor[0] * 1440"
              :y1="callout.anchor[1] * 852"
              :x2="callout.label[0] * 1440"
              :y2="callout.label[1] * 852"
              pathLength="1"
            />
            <circle class="callout-anchor" :cx="callout.anchor[0] * 1440" :cy="callout.anchor[1] * 852" r="6" />
          </g>
        </svg>
        <span
          v-for="(callout, index) in CALLOUTS"
          :key="callout.id"
          class="callout-chip t-meta"
          :style="{ left: `${callout.label[0] * 100}%`, top: `${callout.label[1] * 100}%`, '--i': index }"
        >
          {{ t(`home.workstation.callouts.${callout.id}`) }}
        </span>
        <figcaption class="visually-hidden">{{ t("home.workstation.alt") }} {{ facts.version }}</figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.workstation-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--klc-space-24);
  margin-bottom: var(--klc-space-48);
}
/* The product window: one frame, a hairline and a soft lift; the capture itself is the content. */
/* The source strip (deck 5.4): named feeds as a quiet row of ticks, like a symbol bar. */
.sources {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8);
}
.sources li {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-12);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
  color: var(--kcq-ink);
  text-transform: none;
}
.sources li::before {
  content: "";
  width: var(--klc-space-4);
  height: var(--klc-space-4);
  border-radius: var(--klc-radius-full);
  background: var(--kcq-up);
}
.sources li:last-child::before {
  background: var(--kcq-accent);
}
.shot {
  position: relative;
  margin: 0;
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-lg);
  overflow: hidden;
  background: var(--klc-color-chart-background);
  box-shadow: var(--klc-elevation-3);
}
.shot img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
/* The chart's crosshair as the hover light (research F3), fine pointers only. */
.shot-crosshair {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background:
    linear-gradient(var(--kcq-accent), var(--kcq-accent)) 0 var(--my, 50%) / 100% 1px no-repeat,
    linear-gradient(var(--kcq-accent), var(--kcq-accent)) var(--mx, 50%) 0 / 1px 100% no-repeat,
    radial-gradient(circle 14rem at var(--mx, 50%) var(--my, 50%), var(--kcq-accent-wash), transparent);
  mix-blend-mode: normal;
  transition: opacity var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .shot:hover .shot-crosshair {
    opacity: 0.55;
  }
}
.shot-callouts {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.callout-leader {
  stroke: var(--kcq-accent);
  stroke-width: 2;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.callout-anchor {
  fill: var(--klc-color-chart-background);
  stroke: var(--kcq-accent);
  stroke-width: 2.5;
  opacity: 0;
}
.callout-chip {
  position: absolute;
  translate: -50% -50%;
  padding: var(--klc-space-4) var(--klc-space-8);
  border-radius: var(--klc-radius-xs);
  background: var(--kcq-accent);
  color: #fff;
  text-transform: none;
  letter-spacing: 0;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
}
/* Once-reveal when first seen: anchor, then leader, then label, staggered per callout. */
.shot[data-seen] .callout-anchor,
.shot[data-seen] .callout-chip {
  opacity: 1;
  transition: opacity var(--klc-motion-dur-base) var(--klc-motion-ease-out);
  transition-delay: calc(var(--i) * 90ms + 120ms);
}
.shot[data-seen] .callout-anchor {
  transition-delay: calc(var(--i) * 90ms);
}
.shot[data-seen] .callout-leader {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 420ms var(--klc-motion-ease-out);
  transition-delay: calc(var(--i) * 90ms + 60ms);
}
/* Phones: the full window is too small to read, so show the chart and its toolbar at legible size. */
@media (max-width: 767px) {
  .shot img {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    object-position: left top;
  }
  .shot-callouts,
  .callout-chip {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .callout-leader {
    stroke-dashoffset: 0;
  }
  .callout-anchor,
  .callout-chip {
    opacity: 1;
  }
}
</style>
