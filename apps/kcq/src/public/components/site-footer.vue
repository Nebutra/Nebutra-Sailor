<!--
  Footer (research H2, H3, H5, E6): an inverted band that continues the final CTA's dark ground.
  A sitemap by audience, then a status line that is live (the hero's market feed) and checkable
  (the pinned commit), the site-mode switch (Human = this page, Agent = /llms.txt), locale and the
  full theme control, and the wordmark set large and cropped by the page edge, like a candle cut off
  at the chart's right margin.
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { LINKS } from "../links";
import { APP_PATH, publicPath, type PublicLocale } from "../routes";
import { useMarketFeed } from "../state/use-market-feed";
import BrandMark from "./brand-mark.vue";
import LocaleSwitch from "./locale-switch.vue";
import ThemeControl from "./theme-control.vue";

const props = defineProps<{ locale: PublicLocale }>();
const { t } = useI18n();
const nebutra = `https://${brand.domains.landing}`;
const feed = useMarketFeed();
const feedLabel = computed(() =>
  feed.status.value === "idle"
    ? t("footer.feedIdle")
    : t(`nav.feed.${feed.status.value}`, { date: feed.quote.value?.date ?? "" }),
);
type Link = { label: string; href: string; route?: boolean; external?: boolean };
const columns = computed<{ heading: string; links: Link[] }[]>(() => [
  {
    heading: t("footer.product"),
    links: [
      { label: t("footer.workstation"), href: APP_PATH },
      { label: t("footer.benchmark"), href: publicPath("benchmark", props.locale), route: true },
      { label: t("footer.changelog"), href: LINKS.releases, external: true },
      { label: brand.name, href: nebutra, external: true },
    ],
  },
  {
    heading: t("footer.developers"),
    links: [
      { label: t("footer.readme"), href: LINKS.readme, external: true },
      { label: t("footer.architecture"), href: LINKS.architecture, external: true },
      { label: "npm", href: LINKS.npm, external: true },
    ],
  },
  {
    heading: t("footer.agent"),
    links: [
      { label: t("footer.registry", { tools: facts.tools.count }), href: facts.tools.href, external: true },
      { label: "llms.txt", href: LINKS.llms },
    ],
  },
  {
    heading: t("footer.community"),
    links: [
      { label: "GitHub", href: LINKS.github, external: true },
      { label: "Telegram", href: LINKS.telegram, external: true },
      { label: t("footer.qq"), href: LINKS.qq, external: true },
    ],
  },
]);
</script>
<template>
  <footer class="site-footer band band-inverted" data-theme="dark">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <BrandMark :endorsed="t('footer.endorsement', { brand: brand.name })" />
          <p class="t-copy">{{ t("footer.credit") }}</p>
          <p class="footer-status t-meta">
            <span class="footer-feed" :data-status="feed.status.value === 'idle' ? undefined : feed.status.value">
              <span class="status-dot" />{{ feedLabel }}
            </span>
            <a :href="LINKS.commit" rel="noopener" translate="no">{{ t("footer.built", { commit: facts.commit.slice(0, 8) }) }}</a>
          </p>
        </div>
        <nav v-for="column in columns" :key="column.heading" class="footer-column" :aria-label="column.heading">
          <h2 class="t-meta">{{ column.heading }}</h2>
          <ul>
            <li v-for="link in column.links" :key="link.href">
              <RouterLink v-if="link.route" class="footer-link" :to="link.href">{{ link.label }}</RouterLink>
              <a v-else class="footer-link" :href="link.href" :rel="link.external ? 'noopener' : undefined">{{ link.label }}</a>
            </li>
          </ul>
        </nav>
      </div>
      <div class="footer-bar">
        <p class="t-copy footer-legal">{{ t("footer.legal") }}</p>
        <div class="footer-tools">
          <nav class="site-mode" :aria-label="t('footer.mode')">
            <span class="site-mode-item" aria-current="page">{{ t("footer.human") }}</span>
            <a class="site-mode-item" :href="LINKS.llms" :title="t('footer.agentTitle')">{{ t("footer.agentMode") }}</a>
          </nav>
          <LocaleSwitch :locale="props.locale" />
          <ThemeControl variant="segmented" />
        </div>
      </div>
    </div>
    <p class="footer-wordmark" aria-hidden="true" translate="no">KLineChartQuant</p>
  </footer>
</template>
<style scoped>
.site-footer {
  padding-bottom: 0;
  overflow: hidden;
}
.footer-grid {
  display: grid;
  gap: var(--klc-space-40) var(--kcq-column-gap);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.footer-brand {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--klc-space-12);
  align-content: start;
}
.footer-status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8) var(--klc-space-16);
  padding-top: var(--klc-space-8);
  text-transform: none;
}
.footer-feed {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
}
.footer-status a {
  color: var(--kcq-ink-2);
}
.footer-column {
  display: grid;
  gap: var(--klc-space-12);
  align-content: start;
}
.footer-column ul {
  display: grid;
  gap: var(--klc-space-2);
}
/* Basement's link: the underline is a rounded 1px rule that fades in (research F2). */
.footer-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--klc-density-default);
  color: var(--kcq-ink-soft);
  text-decoration-line: underline;
  text-decoration-thickness: max(0.06em, 1px);
  text-underline-offset: 0.3em;
  text-decoration-color: transparent;
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
  transition:
    color var(--klc-motion-dur-slow) var(--klc-motion-ease-out),
    text-decoration-color var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .footer-link:hover {
    color: var(--kcq-ink);
    text-decoration-color: color-mix(in oklab, currentColor 50%, transparent);
  }
}
.footer-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--klc-space-16) var(--klc-space-24);
  margin-top: var(--klc-space-64);
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
.footer-legal {
  max-width: 40rem;
}
.footer-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-12);
}
.site-mode {
  display: inline-flex;
  padding: var(--klc-space-2);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
  font-family: var(--kcq-font-mono);
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.site-mode-item {
  display: inline-grid;
  place-items: center;
  min-height: var(--klc-density-compact);
  padding-inline: var(--klc-space-12);
  border-radius: var(--klc-radius-full);
  color: var(--kcq-ink-2);
  text-decoration: none;
}
.site-mode-item[aria-current="page"] {
  background: var(--kcq-control);
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  a.site-mode-item:hover {
    color: var(--kcq-accent-text);
  }
}
@media (pointer: coarse) {
  .site-mode-item {
    min-height: var(--klc-density-hit-target-touch);
  }
}
/* The wordmark, cropped by the page's bottom edge (research H5). */
.footer-wordmark {
  margin: var(--klc-space-48) 0 0;
  padding-inline: var(--kcq-gutter);
  font-family: var(--kcq-font-display);
  font-weight: 600;
  font-size: 12.6vw;
  line-height: 0.74;
  letter-spacing: -0.05em;
  white-space: nowrap;
  text-align: center;
  color: transparent;
  background: linear-gradient(to bottom, var(--kcq-rule-strong), color-mix(in oklab, var(--kcq-rule) 40%, transparent));
  background-clip: text;
  -webkit-background-clip: text;
  user-select: none;
  translate: 0 18%;
}
@media (min-width: 1024px) {
  .footer-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .footer-brand {
    grid-column: 1 / span 4;
  }
  .footer-column {
    grid-column: span 2;
  }
}
</style>
