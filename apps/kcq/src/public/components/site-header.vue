<!--
  Nav (landing-benchmark §6.0; research E1, E2, E4, §3 Nav):
  - transparent over the first band, then the page ground with a 1px hairline once content scrolls
    under it (no backdrop blur over the live field);
  - on /home, the section in view is `aria-current="location"` and a 2px Cobalt bar slides under it
    (the one sliding indicator on the page: it shows where you are; it jumps under reduced motion);
  - one small true count: GitHub stars (a dated build-time snapshot, research E2);
  - the market-feed dot shares the hero's feed state (it only appears once the hero starts it).
-->
<script setup lang="ts">
import { useIntersectionObserver, useResizeObserver } from "@vueuse/core";
import facts from "virtual:kcq-facts";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute } from "vue-router";
import activity from "../home/community/activity.json";
import { APP_PATH, publicPath, type PublicLocale } from "../routes";
import { useMarketFeed } from "../state/use-market-feed";
import BrandMark from "./brand-mark.vue";
import KcqIcon from "./kcq-icon.vue";
import LocaleSwitch from "./locale-switch.vue";
import ThemeControl from "./theme-control.vue";

const props = defineProps<{ locale: PublicLocale; onHome: boolean; scrolled: boolean }>();
const { t } = useI18n();
const route = useRoute();
const home = computed(() => publicPath("home", props.locale));
const SECTIONS = ["agent", "rendering", "developers", "community"] as const;
type SectionId = (typeof SECTIONS)[number];
const sections = computed(() =>
  SECTIONS.map((id) => ({
    id,
    href: props.onHome ? `#${id}` : `${home.value}#${id}`,
  })),
);

/** Every band on /home has an id; the active one is the band crossing the viewport's middle. */
const targets = shallowRef<HTMLElement[]>([]);
const active = ref<SectionId | null>(null);
function collectTargets() {
  targets.value = props.onHome
    ? [...document.querySelectorAll<HTMLElement>("main > section[id]")]
    : [];
  if (!props.onHome) active.value = null;
}
onMounted(collectTargets);
watch(() => route.fullPath, () => nextTick(collectTargets));
useIntersectionObserver(
  targets,
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      active.value = (SECTIONS as readonly string[]).includes(id) ? (id as SectionId) : null;
    }
  },
  { rootMargin: "-45% 0px -50% 0px" },
);

/** The indicator follows the active link's box; recomputed when the nav reflows. */
const list = ref<HTMLElement>();
const indicator = ref({ x: 0, width: 0 });
function place() {
  const link = active.value
    ? list.value?.querySelector<HTMLElement>(`[data-section="${active.value}"]`)
    : null;
  if (link) indicator.value = { x: link.offsetLeft, width: link.offsetWidth };
}
watch(active, () => nextTick(place));
useResizeObserver(list, place);

const feed = useMarketFeed();
const lastBar = computed(() => feed.quote.value?.date ?? "");
const feedLabel = computed(() =>
  t(`nav.feed.${feed.status.value === "idle" ? "connecting" : feed.status.value}`, { date: lastBar.value }),
);
</script>
<template>
  <header class="site-header" :data-scrolled="props.scrolled || undefined">
    <div class="container site-header-row">
      <RouterLink class="site-home" :to="home" :aria-label="t('nav.home')">
        <BrandMark />
      </RouterLink>
      <nav class="site-nav" :aria-label="t('nav.label')">
        <ul ref="list">
          <li v-for="item in sections" :key="item.id">
            <a
              :href="item.href"
              :data-section="item.id"
              :aria-current="active === item.id ? 'location' : undefined"
            >
              {{ t(`nav.${item.id}`) }}
            </a>
          </li>
          <li>
            <RouterLink :to="publicPath('benchmark', props.locale)">{{ t("nav.benchmark") }}</RouterLink>
          </li>
          <li>
            <a
              :href="facts.upstream"
              rel="noopener"
              :title="t('nav.stars', { stars: activity.stars, date: activity.fetchedAt.slice(0, 10) })"
            >
              {{ t("nav.github") }}<sup class="nav-count t-num">★{{ activity.stars }}</sup>
            </a>
          </li>
        </ul>
        <span
          class="nav-indicator"
          aria-hidden="true"
          :data-visible="active ? '' : undefined"
          :style="{ '--x': `${indicator.x}px`, '--w': indicator.width }"
        />
      </nav>
      <div class="site-tools">
        <span
          v-if="feed.status.value !== 'idle'"
          class="site-feed t-meta"
          :data-status="feed.status.value"
          :title="feedLabel"
        >
          <span class="status-dot" />
          <span class="visually-hidden">{{ feedLabel }}</span>
        </span>
        <LocaleSwitch :locale="props.locale" />
        <ThemeControl variant="cycle" />
        <a class="button button-primary site-cta" :href="APP_PATH">
          {{ t("nav.app") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
      </div>
    </div>
  </header>
</template>
<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--klc-z-index-sticky);
  background: transparent;
  transition-property: background-color, box-shadow;
  transition-duration: var(--klc-motion-dur-base);
  transition-timing-function: var(--klc-motion-ease-out);
}
.site-header[data-scrolled] {
  background: var(--kcq-page);
  box-shadow: 0 1px 0 var(--kcq-rule);
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
  position: relative;
  display: none;
  align-self: stretch;
}
.site-nav ul {
  display: flex;
  align-items: center;
  height: 100%;
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
  transition: color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
.site-nav a[aria-current="location"] {
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  .site-nav a:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
/* Basement-style count: small, tabular, tertiary, nudged to the cap height (research E2, J4). */
.nav-count {
  margin-left: 0.2em;
  font-size: var(--klc-text-11-mono-font-size);
  line-height: 1;
  color: var(--kcq-ink-2);
  translate: 0 -0.15em;
}
.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 1px;
  height: 2px;
  background: var(--kcq-accent);
  /* Position and length are both transform, so the slide never triggers layout (CP 32). */
  transform: translateX(var(--x)) scaleX(var(--w));
  transform-origin: left center;
  opacity: 0;
  transition:
    transform var(--klc-motion-dur-slow) var(--klc-motion-ease-in-out),
    opacity var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
.nav-indicator[data-visible] {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .nav-indicator {
    transition: opacity var(--klc-motion-dur-fast) linear;
  }
}
.site-tools {
  display: flex;
  align-items: center;
  gap: var(--klc-space-4);
  margin-left: auto;
}
.site-feed {
  display: inline-grid;
  place-items: center;
  width: var(--klc-density-default);
  height: var(--klc-density-default);
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
