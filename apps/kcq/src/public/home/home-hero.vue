<!--
  Hero (restraint benchmark §4 row 1, founder option A): one idea. The deck's sentence as the H1
  (≤ 3 lines at 1440), the sub, two ways in ("Open the workstation", "Embed the chart") and one
  microcopy line; nothing above the headline. GitHub lives in the nav star button and the final CTA.
  Below the text, one live chart frame across the container that breaks the fold: the page's one
  signature motion lives inside it, the light field's candle glyph unfolding into live candles.
  The layout and the entrance are the shared page opening (components/page-hero.vue); the later
  handoff to the live chart is one GSAP timeline (motion/hero-timeline.ts).
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import PageHero from "../components/page-hero.vue";
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
const hero = ref<InstanceType<typeof PageHero> | null>(null);
let timeline: HeroTimeline | undefined;
let pending: boolean | undefined;
let disposed = false;
const pick = (selector: string) => hero.value?.root?.querySelector(selector) ?? null;
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
  <PageHero ref="hero" :heading="t('home.heading')" :lede="t('home.hero.lede')">
    <template #actions>
      <a class="button button-primary" :href="APP_PATH">
        {{ t("home.hero.primary") }}
        <KcqIcon class="button-arrow" name="arrow" />
      </a>
      <a class="button button-quiet" href="#developers">{{ t("home.hero.embed") }}</a>
    </template>
    <template #note>{{ t("home.hero.micro") }}</template>
    <template #artifact>
      <HeroChart @shown="onShown" />
    </template>
  </PageHero>
</template>
