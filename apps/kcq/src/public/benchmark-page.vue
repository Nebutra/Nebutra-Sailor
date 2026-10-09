<!-- Placeholder for the public benchmark (research/benchmark-plan.md): methodology first, raw data downloadable. -->
<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
  <main class="public-main">
    <h1>{{ t("benchmark.heading") }}</h1>
    <p>{{ t("benchmark.pending") }}</p>
  </main>
</template>
