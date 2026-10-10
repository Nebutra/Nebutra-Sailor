<!--
  Locale switch: real links to the other locale's URL (crawlable, reciprocal with hreflang), and a
  click persists the explicit choice so detection never overrides it (fork ADR 0003).
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute } from "vue-router";
import { browserStorage, storeLocale } from "../locale";
import { PUBLIC_LOCALE_IDS, PUBLIC_LOCALES, type PublicLocale, publicPath } from "../routes";

const props = defineProps<{ locale: PublicLocale }>();
const { t } = useI18n();
const route = useRoute();
const SHORT: Record<PublicLocale, string> = { en: "EN", zh: "中文" };
const items = computed(() =>
  PUBLIC_LOCALE_IDS.map((id) => ({
    id,
    short: SHORT[id],
    label: PUBLIC_LOCALES[id].label,
    lang: PUBLIC_LOCALES[id].htmlLang,
    to: publicPath(route.meta.page === "benchmark" ? "benchmark" : "home", id),
  })),
);
</script>
<template>
  <ul class="locale-switch" :aria-label="t('nav.language')">
    <li v-for="item in items" :key="item.id">
      <RouterLink
        :to="item.to"
        :hreflang="item.lang"
        :lang="item.lang"
        :aria-current="item.id === props.locale ? 'true' : undefined"
        :title="item.label"
        @click="storeLocale(browserStorage(), item.id)"
      >
        {{ item.short }}
      </RouterLink>
    </li>
  </ul>
</template>
<style scoped>
.locale-switch {
  display: flex;
  align-items: center;
}
.locale-switch a {
  display: inline-grid;
  place-items: center;
  min-width: var(--klc-density-comfortable);
  min-height: var(--klc-density-comfortable);
  padding-inline: var(--klc-space-4);
  border-radius: var(--klc-radius-sm);
  color: var(--kcq-ink-2);
  text-decoration: none;
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
}
.locale-switch a:active {
  transform: scale(var(--kcq-press-icon));
}
.locale-switch a[aria-current="true"] {
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  .locale-switch a:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
@media (pointer: coarse) {
  .locale-switch a {
    min-width: var(--klc-density-hit-target-touch);
    min-height: var(--klc-density-hit-target-touch);
  }
}
</style>
