<!--
  Footer (restraint benchmark §4 Footer): it continues the final CTA's dark ground, so the page has
  one closing slab, not another band. The brand and credit, a sitemap by audience, then one quiet
  bar: the legal line, the live market-feed status (moved from the nav), the language switch and
  the theme control (both moved from the nav). No decoration: no wordmark watermark; the build hash
  and the llms.txt view are in the sitemap and the docs (/docs, apps/kcq-docs) instead.
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { docsPath, LINKS } from "../links";
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
      { label: t("footer.investors"), href: publicPath("investors", props.locale), route: true },
      { label: t("footer.changelog"), href: docsPath(props.locale, "changelog") },
      { label: brand.name, href: nebutra, external: true },
    ],
  },
  {
    heading: t("footer.developers"),
    links: [
      { label: t("footer.readme"), href: docsPath(props.locale) },
      { label: t("footer.architecture"), href: docsPath(props.locale, "architecture") },
      { label: "npm", href: LINKS.npm, external: true },
    ],
  },
  {
    heading: t("footer.agent"),
    links: [
      { label: t("footer.registry", { tools: facts.tools.count }), href: docsPath(props.locale, "agent/tools") },
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
  <footer class="site-footer" data-theme="dark">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <BrandMark :endorsed="t('footer.endorsement')" />
          <p class="t-copy">{{ t("footer.credit") }}</p>
        </div>
        <nav v-for="column in columns" :key="column.heading" class="footer-column" :aria-label="column.heading">
          <p class="footer-heading">{{ column.heading }}</p>
          <ul>
            <li v-for="link in column.links" :key="link.href">
              <RouterLink v-if="link.route" class="footer-link" :to="link.href">{{ link.label }}</RouterLink>
              <a v-else class="footer-link" :href="link.href" :rel="link.external ? 'noopener' : undefined">{{ link.label }}</a>
            </li>
          </ul>
        </nav>
      </div>
      <div class="footer-bar">
        <p class="footer-legal">{{ t("footer.legal") }}</p>
        <div class="footer-tools">
          <p class="footer-feed" :data-status="feed.status.value === 'idle' ? undefined : feed.status.value" aria-live="polite">
            <span class="status-dot" aria-hidden="true" />{{ feedLabel }}
          </p>
          <LocaleSwitch :locale="props.locale" />
          <ThemeControl variant="segmented" />
        </div>
      </div>
    </div>
  </footer>
</template>
<style scoped>
.site-footer {
  padding-block: var(--klc-space-64) var(--klc-space-48);
  background: var(--kcq-page);
  color: var(--kcq-ink);
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
.footer-column {
  display: grid;
  gap: var(--klc-space-8);
  align-content: start;
}
.footer-heading {
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  font-weight: var(--klc-text-label-14-font-weight);
  color: var(--kcq-ink);
}
.footer-column ul {
  display: grid;
}
.footer-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--klc-density-default);
  color: var(--kcq-ink-2);
  text-decoration-line: underline;
  text-decoration-thickness: max(0.06em, 1px);
  text-underline-offset: 0.3em;
  text-decoration-color: transparent;
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
  transition:
    color var(--klc-motion-dur-fast) var(--klc-motion-ease-out),
    text-decoration-color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
@media (pointer: coarse) {
  .footer-link {
    min-height: var(--klc-density-comfortable);
  }
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
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  color: var(--kcq-ink-2);
}
.footer-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-8) var(--klc-space-16);
}
.footer-feed {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  color: var(--kcq-ink-2);
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
