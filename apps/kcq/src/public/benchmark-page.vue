<!-- Placeholder for the public benchmark (research/benchmark-plan.md): methodology first, raw data downloadable. -->
<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
  <main id="main" class="container page-stub">
    <h1 class="t-heading">{{ t("benchmark.heading") }}</h1>
    <p class="t-lede">{{ t("benchmark.pending") }}</p>
  </main>
</template>
<style scoped>
.page-stub {
  display: grid;
  gap: var(--klc-space-16);
  padding-block: var(--klc-space-96) 0;
}
</style>
