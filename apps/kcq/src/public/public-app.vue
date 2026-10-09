<!-- Public layout: head metadata, the locale switch and a way into the app. No auth or chart runtime. -->
<script setup lang="ts">
import { useHead } from "@unhead/vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { publicHead } from "./head";
import { browserStorage, storeLocale } from "./locale";
import {
  APP_PATH,
  DEFAULT_PUBLIC_LOCALE,
  PUBLIC_LOCALE_IDS,
  PUBLIC_LOCALES,
  type PublicLocale,
  publicPath,
} from "./routes";

const route = useRoute();
const { t } = useI18n();
const page = computed(() => route.meta.page ?? "home");
const locale = computed(() => route.meta.locale ?? DEFAULT_PUBLIC_LOCALE);
useHead(computed(() => publicHead(page.value, locale.value)));
const languages = computed(() =>
  PUBLIC_LOCALE_IDS.map((id) => ({
    id,
    label: PUBLIC_LOCALES[id].label,
    lang: PUBLIC_LOCALES[id].htmlLang,
    to: publicPath(page.value, id),
  })),
);
/** An explicit choice outranks browser-language detection on later visits. */
function choose(id: PublicLocale) {
  storeLocale(browserStorage(), id);
}
</script>
<template>
  <header class="public-header">
    <nav class="public-nav" :aria-label="t('nav.label')">
      <a class="public-app-link" :href="APP_PATH">{{ t("nav.app") }}</a>
      <ul class="public-locales" :aria-label="t('nav.language')">
        <li v-for="item in languages" :key="item.id">
          <RouterLink :to="item.to" :hreflang="item.lang" :lang="item.lang" @click="choose(item.id)">
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </header>
  <RouterView />
</template>
