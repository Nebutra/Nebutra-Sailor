<!--
  The public benchmark (research/benchmark-plan.md): methodology first, raw data downloadable.
  Until a run is measured the page says so, and the chart area shows the chart's own no-data hatch
  (research I3) instead of a number.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, tm, rt } = useI18n();
</script>
<template>
  <main id="main" class="band benchmark">
    <div class="container benchmark-grid">
      <div class="section-head">
        <h1 class="t-heading">{{ t("benchmark.heading") }}</h1>
        <p class="t-lede">{{ t("benchmark.pending") }}</p>
        <ol class="benchmark-plan">
          <li v-for="(item, index) in tm('benchmark.plan')" :key="index" class="t-copy">
            <span class="t-num">{{ index + 1 }}</span>{{ rt(item) }}
          </li>
        </ol>
      </div>
      <figure class="benchmark-empty hatch ticks">
        <figcaption class="t-meta">{{ t("benchmark.empty") }}</figcaption>
        <span class="t-num benchmark-dash" aria-hidden="true">—<span class="unit">ms</span></span>
      </figure>
    </div>
  </main>
</template>
<style scoped>
.benchmark-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
  align-items: center;
}
.benchmark-plan {
  display: grid;
  gap: var(--klc-space-8);
  margin-top: var(--klc-space-8);
}
.benchmark-plan li {
  display: grid;
  grid-template-columns: var(--klc-space-24) minmax(0, 1fr);
}
.benchmark-plan .t-num {
  color: var(--kcq-accent-text);
}
.benchmark-empty {
  display: grid;
  place-items: center;
  gap: var(--klc-space-8);
  min-height: 18rem;
  margin: 0;
  border-radius: var(--klc-radius-md);
}
.benchmark-dash {
  font-size: var(--klc-text-48-font-size);
  line-height: 1;
  color: var(--kcq-ink-2);
}
@media (min-width: 1024px) {
  .benchmark-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .benchmark-grid > .section-head {
    grid-column: 1 / span 5;
  }
  .benchmark-empty {
    grid-column: 7 / span 6;
  }
}
</style>
