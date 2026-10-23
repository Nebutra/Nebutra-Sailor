<!-- The 404 body (nginx error_page): one sentence of where you are, one way forward into /app. -->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute } from "vue-router";
import { glyphPath } from "./brand/glyph";
import KcqIcon from "./components/kcq-icon.vue";
import PageHero from "./components/page-hero.vue";
import { APP_PATH, DEFAULT_PUBLIC_LOCALE, publicPath } from "./routes";

const { t } = useI18n();
const route = useRoute();
const home = computed(() => publicPath("home", route.meta.locale ?? DEFAULT_PUBLIC_LOCALE));
const path = glyphPath();
</script>
<template>
  <main id="main">
    <PageHero :heading="t('notFound.heading')" :lede="t('notFound.body')">
      <template #kicker>
        <svg class="not-found-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path :d="path" />
        </svg>
        <p class="t-meta t-num">404</p>
      </template>
      <template #actions>
        <a class="button button-primary" :href="APP_PATH">
          {{ t("notFound.primary") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
        <RouterLink class="button button-quiet" :to="home">{{ t("notFound.secondary") }}</RouterLink>
      </template>
    </PageHero>
  </main>
</template>
<style scoped>
.not-found-glyph {
  width: var(--klc-space-48);
  height: var(--klc-space-48);
  fill: var(--kcq-accent);
}
</style>
