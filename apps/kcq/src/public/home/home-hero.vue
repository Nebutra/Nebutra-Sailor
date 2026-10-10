<!--
  Hero (restraint benchmark §4 row 1, founder option A): one idea. The deck's sentence as the H1
  (≤ 3 lines at 1440), the sub, two ways in ("Open the workstation", "Embed the chart") and one
  microcopy line; nothing above the headline. GitHub lives in the nav star button and the final CTA.
  Below the text, one live chart frame across the container that breaks the fold: the page's one
  signature motion lives inside it, the light field's candle glyph unfolding into live candles.
  The entrance (≈ 1s, CSS `.enter-*` in public.css) reveals the headline through a mask, then the sub, the actions,
  the microcopy and the frame; the later handoff to the live chart is one GSAP timeline
  (motion/hero-timeline.ts). It needs no script and never blocks input; reduced motion shows all.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { APP_PATH } from "../routes";
import HeroChart from "./hero/hero-chart.vue";
import { createHeroTimeline, type HeroTimeline } from "./motion/hero-timeline";

const { t } = useI18n();

/**
 * The hero's one GSAP timeline (motion/hero-timeline.ts), created after load on idle, like the
 * chart itself (hero-chart.vue): the prerendered text has painted by then, so the timeline skips
 * the text part anyway, and GSAP stays off the first view's network. It is ready long before the
 * chart's handoff, which needs the engine chunk; if not, the handoff waits for it.
 */
const root = ref<HTMLElement>();
let timeline: HeroTimeline | undefined;
let pending: boolean | undefined;
let disposed = false;
const pick = (selector: string) => root.value?.querySelector(selector) ?? null;
async function create() {
  const created = await createHeroTimeline(() => ({
    chartHost: pick(".hero-chart-host"),
    field: pick(".hero-field"),
    poster: pick(".hero-poster"),
  })).catch(() => undefined);
  if (disposed) return created?.revert();
  timeline = created;
  if (pending !== undefined) timeline?.product(pending);
}
onMounted(() => {
  const idle = () =>
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(() => void create(), { timeout: 1500 })
      : window.setTimeout(() => void create(), 600);
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
});
onBeforeUnmount(() => {
  disposed = true;
  timeline?.revert();
});
function onShown(withField: boolean) {
  if (timeline) timeline.product(withField);
  else pending = withField;
}
</script>
<template>
  <section id="hero" ref="root" class="band hero" aria-labelledby="hero-heading">
    <div class="container">
      <div class="hero-copy">
        <h1 id="hero-heading" class="t-display hero-heading enter-mask">{{ t("home.heading") }}</h1>
        <p class="t-lede hero-lede enter-rise">{{ t("home.hero.lede") }}</p>
        <div class="hero-actions enter-rise">
          <a class="button button-primary" :href="APP_PATH">
            {{ t("home.hero.primary") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
          <a class="button button-quiet" href="#developers">{{ t("home.hero.embed") }}</a>
        </div>
        <p class="hero-micro t-meta enter-rise">{{ t("home.hero.micro") }}</p>
      </div>
      <HeroChart class="hero-instrument enter-settle" @shown="onShown" />
    </div>
  </section>
</template>
<style scoped>
.hero {
  padding-block: var(--klc-space-48) var(--kcq-band-space);
}
@media (min-width: 1024px) {
  .hero {
    padding-top: var(--klc-space-96);
  }
}
.hero-copy {
  display: grid;
  justify-items: start;
  gap: var(--klc-space-24);
}
/* About 760px: the deck's sentence in three lines at 56px (two lines of Han at 48px). */
.hero-heading {
  max-width: 47.5rem;
}
.hero-lede {
  max-width: 37.5rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-8);
}
.hero-micro {
  margin-top: calc(-1 * var(--klc-space-12));
}
.hero-instrument {
  margin-top: var(--klc-space-48);
}
/* The entrance sequence (public.css `.enter-*`): headline, then 120 / 190 / 260ms for the copy,
   300ms for the frame; about a second in all. */
.hero-lede {
  --enter-delay: 120ms;
}
.hero-actions {
  --enter-delay: 190ms;
}
.hero-micro {
  --enter-delay: 260ms;
}
.hero-instrument {
  --enter-delay: 300ms;
}
</style>
