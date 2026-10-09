<!--
  01 Hero (landing-benchmark §3.1 "show the running product"; §5: left-aligned, no blob). The page's
  one signature motion lives here: the light field's glyph unfolding into live candles, choreographed
  by one GSAP timeline (motion/hero-timeline.ts). First paint is the prerendered text, CTA and poster. The eyebrow is the live market line (research C1): last close and change of
  the instrument the chart below draws, rolling digit by digit on each update (NumberFlow, which
  prerenders the formatted value and announces the whole number, not digit fragments). The figures
  flash the market colour for one beat when they change (C5); reduced motion keeps the colour only.
-->
<script setup lang="ts">
import NumberFlow from "@number-flow/vue";
import facts from "virtual:kcq-facts";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { LINKS } from "../links";
import { APP_PATH } from "../routes";
import { useMarketFeed } from "../state/use-market-feed";
import { usePublicLocale } from "../state/use-public-locale";
import HeroChart from "./hero/hero-chart.vue";
import { createHeroTimeline, type HeroTimeline } from "./motion/hero-timeline";

const { t } = useI18n();
const { intl } = usePublicLocale();
const feed = useMarketFeed();
const quote = feed.quote;
const direction = computed(() => (quote.value && quote.value.change < 0 ? "down" : "up"));
const PRICE = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
const PERCENT = { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" } as const;

/** One beat of market colour when the last price moves (--klc-motion-flash). */
const flash = ref<"up" | "down" | null>(null);
let flashTimer = 0;
watch(
  () => quote.value?.last,
  (next, previous) => {
    if (next === undefined || previous === undefined || next === previous) return;
    flash.value = next > previous ? "up" : "down";
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => (flash.value = null), 500);
  },
);

/** The hero's one GSAP timeline (motion/hero-timeline.ts); the chart's handoff resumes it. */
const root = ref<HTMLElement>();
const productReady = ref(false);
let timeline: HeroTimeline | undefined;
let disposed = false;
const pick = (selector: string) => root.value?.querySelector(selector) ?? null;
onMounted(async () => {
  const created = await createHeroTimeline(() => ({
    eyebrow: pick(".hero-quote"),
    heading: pick(".hero-heading"),
    lede: pick(".hero-lede"),
    actions: pick(".hero-actions"),
    chartHost: pick(".hero-chart-host"),
    field: pick(".hero-field"),
    poster: pick(".hero-poster"),
    cue: pick(".hero-cue"),
  })).catch(() => undefined);
  if (disposed) created?.revert();
  else timeline = created;
});
onBeforeUnmount(() => {
  disposed = true;
  timeline?.revert();
});
async function onShown(withField: boolean) {
  productReady.value = true;
  // The cue renders with the product, then the timeline brings both in.
  await Promise.resolve();
  timeline?.product(withField);
}
</script>
<template>
  <section id="hero" ref="root" class="band hero" aria-labelledby="hero-heading">
    <div class="container hero-grid">
      <div class="hero-copy">
        <p v-if="quote" class="hero-quote" :data-status="feed.status.value" :data-flash="flash ?? undefined">
          <span class="status-dot" aria-hidden="true" />
          <span class="t-meta hero-quote-symbol">{{ t("home.hero.quoteLabel") }}</span>
          <span class="t-num hero-quote-price">
            <NumberFlow :value="quote.last" :locales="intl" :format="PRICE" />
          </span>
          <span class="t-num hero-quote-change" :data-direction="direction">
            <svg class="hero-quote-mark" viewBox="0 0 8 8" width="8" height="8" aria-hidden="true">
              <path :d="direction === 'up' ? 'M4 1 7.5 7h-7Z' : 'M4 7 .5 1h7Z'" />
            </svg>
            <NumberFlow :value="quote.changePercent / 100" :locales="intl" :format="PERCENT" />
          </span>
          <span class="t-meta hero-quote-source">GOTDX · {{ quote.date }}</span>
        </p>
        <h1 id="hero-heading" class="t-display hero-heading">{{ t("home.heading") }}</h1>
        <p class="t-lede hero-lede">{{ t("home.hero.lede") }}</p>
        <div class="hero-actions">
          <a class="button button-primary" :href="APP_PATH">
            {{ t("home.hero.primary") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
          <a class="button button-quiet" href="#developers">{{ t("home.hero.embed") }}</a>
          <a class="hero-github" :href="LINKS.github" rel="noopener">
            {{ t("home.hero.github") }}
            <KcqIcon name="external" :size="14" />
          </a>
        </div>
        <p class="hero-micro t-copy">{{ t("home.hero.micro") }}</p>
      </div>
      <HeroChart class="hero-instrument" @shown="onShown" />
    </div>
    <div class="container hero-cue-row">
      <a v-if="productReady" class="hero-cue t-meta" href="#agent">
        <span class="hero-cue-line" aria-hidden="true" />{{ t("nav.agent") }}
      </a>
    </div>
  </section>
</template>
<style scoped>
.hero {
  padding-block: var(--klc-space-32) var(--klc-space-64);
}
@media (min-width: 1024px) {
  .hero {
    padding-block: var(--klc-space-48) var(--klc-space-96);
  }
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-48);
}
/* From xl the instrument rises beside the copy (landing-benchmark §3.1: the running product in
   the first view); below that it sits under the copy at full width. */
@media (min-width: 1280px) {
  .hero-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--kcq-column-gap);
    align-items: center;
  }
  .hero-copy {
    grid-column: 1 / span 5;
    padding-right: var(--klc-space-24);
  }
  .hero-instrument {
    grid-column: 6 / span 7;
  }

}
.hero-copy {
  display: grid;
  gap: var(--klc-space-24);
  max-width: 50rem;
}
.hero-quote {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-self: start;
  gap: var(--klc-space-4) var(--klc-space-12);
  min-height: var(--klc-density-default);
  padding: var(--klc-space-4) var(--klc-space-12);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
  background: var(--kcq-surface);
  transition: background-color var(--klc-motion-flash) var(--klc-motion-ease-out);
}
.hero-quote[data-flash="up"] {
  background: color-mix(in oklab, var(--kcq-up) 16%, var(--kcq-surface));
  transition-duration: 0ms;
}
.hero-quote[data-flash="down"] {
  background: color-mix(in oklab, var(--kcq-down) 16%, var(--kcq-surface));
  transition-duration: 0ms;
}
.hero-quote-price {
  font-size: var(--klc-text-label-16-font-size);
  line-height: var(--klc-text-label-16-line-height);
  color: var(--kcq-ink);
}
/* The sign and the triangle carry direction; colour only repeats it (CP 8). Market colours are
   below 4.5:1 as text on light presets, so the figures stay ink and the shape takes the colour. */
.hero-quote-change {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-4);
  font-size: var(--klc-text-label-14-font-size);
  color: var(--kcq-ink);
}
.hero-quote-mark {
  fill: var(--kcq-up);
  /* Optical: sit on the digits' cap height, not the line box (research J4). */
  translate: 0 -0.5px;
}
.hero-quote-change[data-direction="down"] .hero-quote-mark {
  fill: var(--kcq-down);
}
@media (max-width: 479px) {
  .hero-quote-source {
    display: none;
  }
}
.hero-heading {
  max-width: 20ch;
  font-size: var(--klc-text-48-font-size);
  line-height: var(--klc-text-48-line-height);
}
:lang(zh-Hans) .hero-heading {
  max-width: 13em;
}
.hero-lede {
  max-width: 38rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-12);
}
.hero-actions {
  align-items: center;
}
.hero-github {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-4);
  min-height: var(--klc-density-comfortable);
  padding-inline: var(--klc-space-8);
  color: var(--kcq-ink);
  font-size: var(--klc-text-label-14-font-size);
  font-weight: var(--klc-text-label-14-font-weight);
  text-decoration: none;
}
@media (hover: hover) and (pointer: fine) {
  .hero-github:hover {
    color: var(--kcq-accent-text);
  }
}
.hero-micro {
  margin-top: calc(-1 * var(--klc-space-12));
}
/* The scroll cue: a candle wick pointing at the next section, arriving with the product. */
.hero-cue-row {
  min-height: var(--klc-density-comfortable);
  margin-top: var(--klc-space-32);
}
.hero-cue {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-12);
  min-height: var(--klc-density-comfortable);
  color: var(--kcq-ink-2);
  text-decoration: none;
}
.hero-cue-line {
  width: 1px;
  height: var(--klc-space-24);
  background: linear-gradient(var(--kcq-accent), transparent);
}
@media (hover: hover) and (pointer: fine) {
  .hero-cue:hover {
    color: var(--kcq-ink);
  }
}
</style>
