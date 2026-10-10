<!--
  Final CTA (deck 5.8; restraint benchmark §4 row 7): the bookend and the page's one dark block.
  The light returns as the same system: the light field's own opening frame (the KCQ candle glyph
  as the only light, the prerendered poster), small and centred above one line and two ways to
  start, "Open the workstation" and "View on GitHub". Static: the one signature motion stays in the
  hero. The heading keeps the page's one H2 size, so the close never outshouts the hero.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { LINKS } from "../links";
import { APP_PATH } from "../routes";
import posterDark800 from "./hero/poster/poster-dark-800.webp";

const { t } = useI18n();
</script>
<template>
  <section id="start" class="band band-deferred cta" data-theme="dark" aria-labelledby="cta-heading">
    <div class="container cta-body">
      <img
        class="cta-light"
        :src="posterDark800"
        alt=""
        width="800"
        height="350"
        loading="lazy"
        decoding="async"
      />
      <h2 id="cta-heading" class="t-heading">{{ t("home.cta.heading") }}</h2>
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
  padding-bottom: var(--klc-space-96);
}
.cta-body {
  display: grid;
  justify-items: center;
  gap: var(--klc-space-16);
  text-align: center;
}
/* The light returns: the field's opening frame, cropped to the glyph (at 590 × 175 of the 800px
   frame) and fading out at the edges, so only the candle and its glow show. */
.cta-light {
  width: 100%;
  max-width: 40rem;
  height: 15rem;
  margin-bottom: var(--klc-space-8);
  object-fit: none;
  object-position: calc(50% - 190px) 50%;
  mask-image: radial-gradient(closest-side, #000 40%, transparent);
}
.cta-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-16);
}
</style>
