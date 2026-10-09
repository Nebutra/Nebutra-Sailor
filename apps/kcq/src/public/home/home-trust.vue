<!--
  Trust and BYOK (landing-benchmark §6.9): what happens to keys (apps/kcq/BYOK.md), what this page
  connects to, where the data comes from, and the investment disclaimer.
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import { useI18n } from "vue-i18n";

const { t, tm, rt } = useI18n();
</script>
<template>
  <section class="section" aria-labelledby="trust-heading">
    <div class="container">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">08</span>{{ t("home.trust.eyebrow") }}</p>
      <div class="section-head">
        <h2 id="trust-heading" class="t-heading">{{ t("home.trust.heading") }}</h2>
      </div>
      <ul class="trust-points">
        <li v-for="(point, index) in tm('home.trust.points')" :key="index">
          <h3 class="t-label">{{ rt(point.title) }}</h3>
          <p class="t-copy">{{ rt(point.body, { brand: brand.name }) }}</p>
        </li>
      </ul>
      <p class="disclaimer t-copy">{{ t("home.trust.disclaimer") }}</p>
    </div>
  </section>
</template>
<style scoped>
.trust-points {
  display: grid;
  gap: var(--klc-space-24) var(--kcq-column-gap);
  margin-top: var(--klc-space-48);
}
.trust-points li {
  display: grid;
  gap: var(--klc-space-8);
  align-content: start;
  padding-top: var(--klc-space-16);
  border-top: 1px solid var(--kcq-rule);
}
.disclaimer {
  margin-top: var(--klc-space-48);
  padding: var(--klc-space-16);
  border: 1px solid var(--kcq-rule);
  max-width: 44rem;
}
@media (min-width: 768px) {
  .trust-points {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
