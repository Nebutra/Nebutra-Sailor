<!--
  Hero (landing-benchmark §3.1 "show the running product"; §5: left-aligned, no blob, a headline
  only KCQ can claim). Text owns the first paint; the instrument below is the product itself.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import CopyCommand from "../components/copy-command.vue";
import KcqIcon from "../components/kcq-icon.vue";
import { APP_PATH } from "../routes";
import HeroChart from "./hero/hero-chart.vue";

const { t, tm, rt } = useI18n();
const chart = ref<InstanceType<typeof HeroChart>>();
defineExpose({ applyMode: () => chart.value?.applyMode() });
</script>
<template>
  <section class="hero" aria-labelledby="hero-heading">
    <div class="container hero-grid">
      <div class="hero-copy">
        <p class="t-meta">{{ t("home.hero.eyebrow", { version: facts.version }) }}</p>
        <h1 id="hero-heading" class="t-display hero-heading">{{ t("home.heading") }}</h1>
        <p class="t-lede hero-lede">{{ t("home.hero.lede", { tools: facts.tools.count }) }}</p>
        <div class="hero-actions">
          <a class="button button-primary" :href="APP_PATH">
            {{ t("home.hero.primary") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
          <CopyCommand command="pnpm add @363045841yyt/klinechart" :label="t('home.hero.copy')" :done="t('home.hero.copied')" />
        </div>
        <ul class="hero-facts t-meta">
          <li v-for="(fact, index) in tm('home.hero.facts')" :key="index">{{ rt(fact) }}</li>
        </ul>
      </div>
      <HeroChart ref="chart" class="hero-instrument" />
    </div>
  </section>
</template>
<style scoped>
.hero {
  padding-block: var(--klc-space-48) 0;
}
@media (min-width: 1024px) {
  .hero {
    padding-block: var(--klc-space-80) 0;
  }
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-48);
}
.hero-copy {
  display: grid;
  gap: var(--klc-space-24);
  max-width: 50rem;
}
.hero-heading {
  max-width: 14ch;
}
:lang(zh-Hans) .hero-heading {
  max-width: 12em;
}
.hero-lede {
  max-width: 38rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-12);
}
.hero-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8) var(--klc-space-24);
}
.hero-facts li {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
}
.hero-facts li::before {
  content: "";
  width: var(--klc-space-4);
  height: var(--klc-space-4);
  background: var(--kcq-accent);
}
</style>
