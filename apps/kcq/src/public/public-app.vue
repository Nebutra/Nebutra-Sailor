<!-- Public layout: head metadata, nav, footer and a way into the app. No auth or chart runtime. -->
<script setup lang="ts">
import { useHead } from "@unhead/vue";
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterView, useRoute } from "vue-router";
import SiteFooter from "./components/site-footer.vue";
import SiteHeader from "./components/site-header.vue";
import { notFoundHead, publicHead } from "./head";
import { DEFAULT_PUBLIC_LOCALE } from "./routes";

const route = useRoute();
const { t } = useI18n();
const page = computed(() => route.meta.page ?? "home");
const locale = computed(() => route.meta.locale ?? DEFAULT_PUBLIC_LOCALE);
useHead(
  computed(() =>
    page.value === "notFound" ? notFoundHead(locale.value) : publicHead(page.value, locale.value),
  ),
);
</script>
<template>
  <a class="skip-link" href="#main">{{ t("nav.skip") }}</a>
  <SiteHeader :locale="locale" :on-home="page === 'home'" :github="facts.upstream" />
  <RouterView />
  <SiteFooter :locale="locale" />
</template>
