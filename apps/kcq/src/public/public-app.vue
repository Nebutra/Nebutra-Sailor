<!--
  Public layout: head metadata, nav, the page, footer. No auth or chart runtime.
  The root is a full-height column (public.css #app) so the footer sits at the bottom edge on short
  pages. A 1px sentinel at the top of the document tells the header when content scrolls under it
  (IntersectionObserver, no scroll listener; research E1).
-->
<script setup lang="ts">
import { useHead } from "@unhead/vue";
import { useIntersectionObserver } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterView, useRoute } from "vue-router";
import SiteFooter from "./components/site-footer.vue";
import SiteHeader from "./components/site-header.vue";
import { notFoundHead, publicHead } from "./head";
import { useTheme } from "./state/use-theme";
import { usePublicLocale } from "./state/use-public-locale";

const route = useRoute();
const { t } = useI18n();
const { locale } = usePublicLocale();
const page = computed(() => route.meta.page ?? "home");
useHead(
  computed(() =>
    page.value === "notFound" ? notFoundHead(locale.value) : publicHead(page.value, locale.value),
  ),
);

const { hydrate } = useTheme();
onMounted(hydrate);

const scrolled = ref(false);
const sentinel = ref<HTMLElement>();
useIntersectionObserver(sentinel, ([entry]) => {
  scrolled.value = entry ? !entry.isIntersecting : false;
});
</script>
<template>
  <div ref="sentinel" class="scroll-sentinel" aria-hidden="true" />
  <a class="skip-link" href="#main">{{ t("nav.skip") }}</a>
  <SiteHeader :locale="locale" :on-home="page === 'home'" :scrolled="scrolled" />
  <RouterView />
  <SiteFooter :locale="locale" />
</template>
<style>
.scroll-sentinel {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
</style>
