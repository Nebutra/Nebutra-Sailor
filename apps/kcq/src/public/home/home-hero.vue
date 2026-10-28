<!-- 首屏解释图表与 AI 的关系，提供工作台和操作演示入口；保留现有真实行情与光影展示。 -->
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
  <PageHero ref="hero" class="home-hero" :heading="t('home.heading')" :lede="t('home.hero.lede')">
    <template #actions>
      <a class="button button-primary" :href="APP_PATH">
        {{ t("home.hero.primary") }}
        <KcqIcon class="button-arrow" name="arrow" />
      </a>
      <a class="button button-quiet" href="#agent">{{ t("home.hero.demo") }}</a>
    </template>
    <template #note>{{ t("home.hero.micro") }}</template>
    <template #artifact>
      <HeroChart @shown="onShown" />
    </template>
  </PageHero>
</template>
<style scoped>
.home-hero {
  padding-top: var(--klc-space-40);
}
.home-hero :deep(.page-hero-copy) {
  gap: var(--klc-space-16);
}
.home-hero :deep(.page-hero-heading) {
  white-space: pre-line;
}
.home-hero :deep(.page-hero-lede) {
  max-width: 44rem;
}
.home-hero :deep(.page-hero-note) {
  margin-top: 0;
}
@media (min-width: 1024px) {
  .home-hero {
    padding-top: var(--klc-space-64);
  }
}
</style>
