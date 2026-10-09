<!--
  Footer (landing-benchmark §6.10): the endorsed lockup "KLineChartQuant by Nebutra", product and
  project links, reciprocal locale links and the full theme control.
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import facts from "virtual:kcq-facts";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { APP_PATH, publicPath, type PublicLocale } from "../routes";
import BrandMark from "./brand-mark.vue";
import LocaleSwitch from "./locale-switch.vue";
import ThemeControl from "./theme-control.vue";

const props = defineProps<{ locale: PublicLocale }>();
const { t } = useI18n();
const nebutra = `https://${brand.domains.landing}`;
</script>
<template>
  <footer class="site-footer">
    <div class="container site-footer-grid">
      <div class="site-footer-brand">
        <BrandMark :endorsed="t('footer.endorsement', { brand: brand.name })" />
        <p class="t-copy">{{ t("footer.credit") }}</p>
      </div>
      <nav class="site-footer-links" :aria-label="t('footer.product')">
        <h2 class="t-meta">{{ t("footer.product") }}</h2>
        <ul>
          <li><a :href="APP_PATH">{{ t("footer.workstation") }}</a></li>
          <li>
            <RouterLink :to="publicPath('benchmark', props.locale)">{{ t("footer.benchmark") }}</RouterLink>
          </li>
          <li><a :href="nebutra" rel="noopener">{{ brand.name }}</a></li>
        </ul>
      </nav>
      <nav class="site-footer-links" :aria-label="t('footer.project')">
        <h2 class="t-meta">{{ t("footer.project") }}</h2>
        <ul>
          <li><a :href="facts.upstream" rel="noopener">{{ t("footer.github") }}</a></li>
          <li><a :href="`${facts.upstream}#readme`" rel="noopener">{{ t("footer.readme") }}</a></li>
          <li><a :href="`${facts.upstream}/blob/main/LICENSE`" rel="noopener">{{ t("footer.license") }}</a></li>
        </ul>
      </nav>
      <div class="site-footer-tools">
        <LocaleSwitch :locale="props.locale" />
        <ThemeControl variant="segmented" />
      </div>
    </div>
  </footer>
</template>
<style scoped>
.site-footer {
  margin-top: var(--kcq-section-space);
  padding-block: var(--klc-space-48) var(--klc-space-64);
  border-top: 1px solid var(--kcq-rule);
}
.site-footer-grid {
  display: grid;
  gap: var(--klc-space-32) var(--kcq-column-gap);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.site-footer-brand {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--klc-space-12);
  align-content: start;
}
.site-footer-links {
  display: grid;
  gap: var(--klc-space-12);
  align-content: start;
}
.site-footer-links ul {
  display: grid;
  gap: var(--klc-space-4);
}
.site-footer-links a {
  display: inline-flex;
  align-items: center;
  min-height: var(--klc-density-default);
  color: var(--kcq-ink);
  text-decoration: none;
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
}
@media (hover: hover) and (pointer: fine) {
  .site-footer-links a:hover {
    color: var(--kcq-accent-text);
  }
}
.site-footer-tools {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--klc-space-16);
}
@media (min-width: 1024px) {
  .site-footer-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .site-footer-brand {
    grid-column: 1 / span 5;
  }
  .site-footer-links:nth-of-type(1) {
    grid-column: 7 / span 2;
  }
  .site-footer-links:nth-of-type(2) {
    grid-column: 9 / span 2;
  }
  .site-footer-tools {
    grid-column: 11 / span 2;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-start;
  }
}
</style>
