<!--
  09 Final CTA (research H1, §3 Final CTA): the bookend. An inverted band where the light returns:
  the field's own opening frame (the KCQ candle glyph as the only light, the prerendered poster)
  sits behind one line and two ways to start (deck 5.8). Static: the one signature motion stays in
  the hero.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { LINKS } from "../links";
import { APP_PATH } from "../routes";
import posterDark800 from "./hero/poster/poster-dark-800.webp";
import posterDark1600 from "./hero/poster/poster-dark-1600.webp";

const { t } = useI18n();
</script>
<template>
  <section id="start" class="band band-inverted cta" data-theme="dark" aria-labelledby="cta-heading">
    <img
      class="cta-light"
      :srcset="`${posterDark800} 800w, ${posterDark1600} 1600w`"
      sizes="(min-width: 1024px) 60vw, 100vw"
      :src="posterDark1600"
      alt=""
      width="1600"
      height="700"
      loading="lazy"
      decoding="async"
    />
    <div class="container cta-body">
      <h2 id="cta-heading" class="t-statement cta-heading">{{ t("home.cta.heading") }}</h2>
      <p class="t-lede">{{ t("home.cta.body") }}</p>
      <div class="cta-actions">
        <a class="button button-primary" :href="APP_PATH">
          {{ t("home.cta.primary") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
        <a class="button button-quiet" :href="LINKS.github" rel="noopener">
          {{ t("home.cta.github") }}
          <KcqIcon name="external" :size="14" />
        </a>
      </div>
    </div>
  </section>
</template>
<style scoped>
.cta {
  overflow: hidden;
  isolation: isolate;
}
/* The light returns: the field's opening frame, fading into the band from the right. */
.cta-light {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: -1;
  width: min(100%, 64rem);
  height: 100%;
  object-fit: cover;
  object-position: right center;
  mask-image: radial-gradient(ellipse 60% 70% at 70% 50%, #000 35%, transparent 80%);
  opacity: 0.9;
}
.cta-body {
  display: grid;
  justify-items: start;
  gap: var(--klc-space-24);
}
.cta-heading {
  max-width: 14ch;
}
.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-8);
}
@media (max-width: 767px) {
  .cta-light {
    opacity: 0.45;
  }
}
</style>
