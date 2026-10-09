<!--
  Nav (landing-benchmark §6.0): wordmark, in-page sections, benchmark, GitHub, locale and theme,
  one CTA into /app. Section links exist only on /home; other pages link back to them.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { APP_PATH, publicPath, type PublicLocale } from "../routes";
import BrandMark from "./brand-mark.vue";
import LocaleSwitch from "./locale-switch.vue";
import ThemeControl from "./theme-control.vue";

const props = defineProps<{ locale: PublicLocale; onHome: boolean; github: string }>();
const { t } = useI18n();
const home = computed(() => publicPath("home", props.locale));
const sections = computed(() =>
  (["agent", "rendering", "developers", "community"] as const).map((id) => ({
    id,
    href: props.onHome ? `#${id}` : `${home.value}#${id}`,
  })),
);
</script>
<template>
  <header class="site-header">
    <div class="container site-header-row">
      <RouterLink class="site-home" :to="home" :aria-label="t('nav.home')">
        <BrandMark />
      </RouterLink>
      <nav class="site-nav" :aria-label="t('nav.label')">
        <ul>
          <li v-for="item in sections" :key="item.id">
            <a :href="item.href">{{ t(`nav.${item.id}`) }}</a>
          </li>
          <li>
            <RouterLink :to="publicPath('benchmark', props.locale)">{{ t("nav.benchmark") }}</RouterLink>
          </li>
          <li>
            <a :href="props.github" rel="noopener">{{ t("nav.github") }}</a>
          </li>
        </ul>
      </nav>
      <div class="site-tools">
        <LocaleSwitch :locale="props.locale" />
        <ThemeControl variant="cycle" />
        <a class="button button-primary site-cta" :href="APP_PATH">{{ t("nav.app") }}</a>
      </div>
    </div>
  </header>
</template>
<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--klc-z-index-sticky);
  background: var(--kcq-page);
  border-bottom: 1px solid var(--kcq-rule);
}
.site-header-row {
  display: flex;
  align-items: center;
  gap: var(--klc-space-24);
  height: var(--kcq-header-height);
}
.site-home {
  display: inline-flex;
  min-height: var(--klc-density-comfortable);
  align-items: center;
  text-decoration: none;
}
.site-nav {
  display: none;
}
.site-nav ul {
  display: flex;
  gap: var(--klc-space-4);
}
.site-nav a {
  display: inline-flex;
  align-items: center;
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-8);
  border-radius: var(--klc-radius-sm);
  color: var(--kcq-ink-2);
  text-decoration: none;
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  letter-spacing: var(--klc-text-label-14-letter-spacing);
  font-weight: var(--klc-text-label-14-font-weight);
}
@media (hover: hover) and (pointer: fine) {
  .site-nav a:hover {
    color: var(--kcq-ink);
  }
}
.site-tools {
  display: flex;
  align-items: center;
  gap: var(--klc-space-4);
  margin-left: auto;
}
.site-cta {
  margin-left: var(--klc-space-8);
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-12);
}
@media (min-width: 1024px) {
  .site-nav {
    display: block;
  }
}
@media (max-width: 479px) {
  .site-cta {
    display: none;
  }
}
</style>
