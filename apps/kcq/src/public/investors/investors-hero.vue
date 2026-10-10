<!--
  Purpose (research investors-page.md §4.1): one sentence with the product as subject, a literal
  lede, the stage stated as intent, one primary action. The visual is the thesis already working:
  the team's own screenshot of the 601360 session (BP asset agent-box-range-601360, 2026-09-04),
  where an agent boxed a year of consolidation ranges on the chart. Static: the page's one motion
  is the tool-call log further down. On phones the shot crops to the chart, the part that reads.
  Restraint (benchmark rules 1, 8, 9): nothing above the headline, one stacked column, then one
  product frame on the fixed dark chart surface; no shadow.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { APP_PATH } from "../routes";
import { mailtoHref } from "./contact";
import session960 from "./shots/agent-601360-960.webp";
import session1920 from "./shots/agent-601360-1920.webp";
import square480 from "./shots/agent-601360-square-480.webp";
import square720 from "./shots/agent-601360-square-720.webp";

const { t } = useI18n();
</script>
<template>
  <section id="hero" class="band hero" aria-labelledby="hero-heading">
    <div class="container">
      <div class="hero-copy">
        <h1 id="hero-heading" class="t-display hero-heading enter-mask">{{ t("investors.heading") }}</h1>
        <p class="t-lede hero-lede enter-rise">{{ t("investors.hero.lede") }}</p>
        <p class="hero-stage enter-rise">{{ t("investors.hero.stage") }}</p>
        <div class="hero-actions enter-rise">
          <a
            class="button button-primary"
            :href="mailtoHref(t('investors.ask.investors.subject'), t('investors.ask.mailBody'))"
          >
            {{ t("investors.hero.primary") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
          <a class="button button-quiet" :href="APP_PATH">{{ t("investors.hero.secondary") }}</a>
        </div>
      </div>
      <figure class="session enter-settle">
        <div class="session-frame product-frame" data-theme="dark">
          <picture>
            <source
              media="(max-width: 767px)"
              :srcset="`${square480} 480w, ${square720} 720w`"
              sizes="calc(100vw - 32px)"
            />
            <img
              :srcset="`${session960} 960w, ${session1920} 1920w`"
              sizes="(min-width: 1344px) 1280px, calc(100vw - 64px)"
              :src="session1920"
              :alt="t('investors.session.alt')"
              width="1920"
              height="930"
              fetchpriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <figcaption class="session-caption">
          <span class="t-label session-label" translate="no">{{ t("investors.session.label") }}</span>
          <span class="t-copy">{{ t("investors.session.caption") }}</span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.hero {
  padding-block: var(--klc-space-48) var(--kcq-band-space);
}
@media (min-width: 1024px) {
  .hero {
    padding-top: var(--klc-space-96);
  }
}
.hero-copy {
  display: grid;
  justify-items: start;
  gap: var(--klc-space-24);
}
.hero-heading {
  max-width: 47.5rem;
}
.hero-lede {
  max-width: 40rem;
}
.hero-stage {
  max-width: 40rem;
  color: var(--kcq-ink);
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-12);
}
.session {
  margin: var(--klc-space-48) 0 0;
}
@media (min-width: 1024px) {
  .session {
    margin-top: var(--klc-space-64);
  }
}
.session-frame img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
.session-caption {
  display: grid;
  gap: var(--klc-space-4);
  max-width: 40rem;
  margin-top: var(--klc-space-16);
}
.session-caption .t-copy {
  color: var(--kcq-ink-2);
}
/* Phones get a square crop of the chart with its boxes (the <source> above): the whole window is
   too small to read there. The box is square before the image arrives, so nothing shifts. */
@media (max-width: 767px) {
  .session-frame img {
    aspect-ratio: 1 / 1;
  }
}
/* The shared entrance (public.css `.enter-*`), the same sequence as /home: about a second. */
.hero-lede {
  --enter-delay: 120ms;
}
.hero-stage {
  --enter-delay: 190ms;
}
.hero-actions {
  --enter-delay: 260ms;
}
.session {
  --enter-delay: 300ms;
}
</style>
