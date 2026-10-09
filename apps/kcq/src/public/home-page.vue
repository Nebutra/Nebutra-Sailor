<!-- Placeholder for the landing (fork task 10-09-frontend-design-system §6 sections plug in here). -->
<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
  <main class="public-main">
    <h1>{{ t("home.heading") }}</h1>
  </main>
</template>
