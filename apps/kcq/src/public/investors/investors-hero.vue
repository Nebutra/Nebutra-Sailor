<!--
  Purpose (research investors-page.md §4.1): one sentence with the product as subject, a literal
  lede, the stage stated as intent, one primary action. The visual is the thesis already working:
  the team's own screenshot of the 601360 session (BP asset agent-box-range-601360, 2026-09-04),
  where an agent boxed a year of consolidation ranges on the chart. Static: the page's one motion
  is the tool-call log further down. On phones the shot crops to the chart, the part that reads.
  The shared page opening (components/page-hero.vue; restraint benchmark rules 1, 8, 9), then one
  product frame in the page's colour mode; no shadow. The screenshot itself is the team's dark-mode
  capture (there is no light one): content inside the frame, not the frame's surface.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import PageHero from "../components/page-hero.vue";
import { APP_PATH } from "../routes";
import { mailtoHref } from "./contact";
import session960 from "./shots/agent-601360-960.webp";
import session1920 from "./shots/agent-601360-1920.webp";
import square480 from "./shots/agent-601360-square-480.webp";
import square720 from "./shots/agent-601360-square-720.webp";

const { t } = useI18n();
</script>
<template>
  <PageHero :heading="t('investors.heading')" :lede="t('investors.hero.lede')">
    <template #details>
      <p class="hero-stage">{{ t("investors.hero.stage") }}</p>
    </template>
    <template #actions>
      <a class="button button-primary" :href="mailtoHref(t('investors.ask.investors.subject'), t('investors.ask.mailBody'))">
        {{ t("investors.hero.primary") }}
        <KcqIcon class="button-arrow" name="arrow" />
      </a>
      <a class="button button-quiet" :href="APP_PATH">{{ t("investors.hero.secondary") }}</a>
    </template>
    <template #artifact>
      <figure class="session">
        <div class="session-frame product-frame">
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
    </template>
  </PageHero>
</template>
<style scoped>
.hero-stage {
  color: var(--kcq-ink);
}
.session {
  margin: 0;
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
</style>
