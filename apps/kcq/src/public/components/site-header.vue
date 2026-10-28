<!-- 公共导航：工作台始终可进入；窄屏以可滚动的第二行保留章节与文档导航。 -->
<script setup lang="ts">
import { useIntersectionObserver, useResizeObserver } from "@vueuse/core";
import facts from "virtual:kcq-facts";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute } from "vue-router";
import activity from "../home/community/activity.json";
import { docsPath } from "../links";
import { APP_PATH, publicPath, type PublicLocale } from "../routes";
import BrandMark from "./brand-mark.vue";
import KcqIcon from "./kcq-icon.vue";

const props = defineProps<{ locale: PublicLocale; onHome: boolean; scrolled: boolean }>();
const { t } = useI18n();
const route = useRoute();
const home = computed(() => publicPath("home", props.locale));
const SECTIONS = ["markets", "agent", "developers"] as const;
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
const starsLabel = computed(() =>
  t("nav.stars", { stars: activity.stars, date: activity.fetchedAt.slice(0, 10) }),
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
            <a :href="docsPath(props.locale)">{{ t("nav.docs") }}</a>
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
        <a class="button button-quiet site-github" :href="facts.upstream" rel="noopener" :title="starsLabel">
          {{ t("nav.github") }}
          <span class="site-stars t-num" aria-hidden="true">
            <KcqIcon name="star" :size="12" />{{ activity.stars }}
          </span>
          <span class="visually-hidden">{{ starsLabel }}</span>
        </a>
        <a class="button button-primary site-cta" :href="APP_PATH">
          {{ t("nav.app") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
      </div>
    </div>
  </header>
</template>
<style scoped>
/* Always opaque: at rest it sits on the page ground, so it looks the same as transparent, and
   content can never show through it while the scroll observer is late (a busy main thread delays
   IntersectionObserver callbacks). Only the hairline depends on scroll state. */
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--klc-z-index-sticky);
  background: var(--kcq-page);
  box-shadow: 0 1px 0 transparent;
  transition: box-shadow var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.site-header[data-scrolled] {
  box-shadow: 0 1px 0 var(--kcq-rule);
}
.site-header-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: var(--klc-space-64) var(--klc-density-hit-target-touch);
  align-items: center;
  column-gap: var(--klc-space-8);
  height: var(--kcq-header-height);
}
.site-home {
  grid-column: 1;
  grid-row: 1;
  display: inline-flex;
  min-height: var(--klc-density-comfortable);
  align-items: center;
  text-decoration: none;
}
.site-nav {
  grid-column: 1 / -1;
  grid-row: 2;
  position: relative;
  min-width: 0;
  align-self: stretch;
  overflow-x: auto;
  scrollbar-width: none;
}
.site-nav ul {
  display: flex;
  align-items: center;
  height: 100%;
  width: max-content;
  min-width: 100%;
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
  transition-property: color, background-color;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.site-nav a[aria-current] {
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  .site-nav a:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
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
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: var(--klc-space-8);
  margin-left: auto;
}
/* The GitHub star button: label, then the dated count in a pill (as a symbol's last price). */
.site-github,
.site-cta {
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-12);
}
.site-github {
  display: none;
  gap: var(--klc-space-8);
  padding-right: var(--klc-space-4);
}
/* The count pill follows the button: it lifts to the hover fill and the full ink on hover. */
.site-stars {
  transition-property: background-color, color;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-4);
  min-height: var(--klc-space-24);
  padding-inline: var(--klc-space-8);
  border-radius: var(--klc-radius-full);
  background: var(--kcq-control);
  color: var(--kcq-ink-2);
  font-size: var(--klc-text-12-font-size);
  line-height: 1;
}
@media (hover: hover) and (pointer: fine) {
  .site-github:hover .site-stars {
    background: var(--kcq-raised);
    color: var(--kcq-ink);
  }
}
.site-cta {
  margin-left: var(--klc-space-4);
}
/* Touch: the header's two buttons keep a 40px target (the bar is 64px tall). */
@media (pointer: coarse) {
  .site-github,
  .site-cta,
  .site-home {
    min-height: var(--klc-density-comfortable);
  }
}
@media (min-width: 768px) {
  .site-github {
    display: inline-flex;
  }
}
@media (min-width: 1280px) {
  .site-header-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-rows: var(--kcq-header-height);
    column-gap: var(--klc-space-24);
  }
  .site-nav {
    grid-column: 2;
    grid-row: 1;
  }
  .site-tools {
    grid-column: 3;
  }
}
@media (max-width: 479px) {
  .site-cta .button-arrow {
    display: none;
  }
}
</style>
