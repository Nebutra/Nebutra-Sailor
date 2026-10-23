<!--
  Final CTA (deck 5.8; restraint benchmark §4 row 7): the bookend, a closing band the footer
  continues (public.css .band-closing), in the visitor's colour mode like the rest of the page.
  The light returns as the same system: the light field's own opening frame (the KCQ candle glyph
  as the only light, the prerendered poster), small and centred above one line and two ways to
  start, "Open the workstation" and "View on GitHub". Static: the one signature motion stays in the
  hero. The heading keeps the page's one H2 size, so the close never outshouts the hero.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import PageSection from "../components/page-section.vue";
import { LINKS } from "../links";
import { APP_PATH } from "../routes";
// Files, not data URIs: the close is far below the fold, so it stays out of the HTML. Lazy, so only
// the poster of the page's mode loads (public.css "Theme variants").
import posterDark800 from "./hero/poster/poster-dark-800.webp?no-inline";
import posterLight800 from "./hero/poster/poster-light-800.webp?no-inline";

const { t } = useI18n();
const POSTERS = [
  { mode: "light", src: posterLight800 },
  { mode: "dark", src: posterDark800 },
] as const;
</script>
<template>
  <PageSection id="start" :heading="t('home.cta.heading')" :lede="t('home.cta.body')" layout="center" closing>
    <template #kicker>
      <img
        v-for="poster in POSTERS"
        :key="poster.mode"
        class="cta-light"
        :data-theme-variant="poster.mode"
        :src="poster.src"
        alt=""
        width="800"
        height="350"
        loading="lazy"
        decoding="async"
      />
    </template>
    <template #head>
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
    </template>
  </PageSection>
</template>
<style scoped>
/* The light returns: the field's opening frame, cropped to the glyph (at 590 × 175 of the 800px
   frame) and fading out at the edges, so only the candle and its glow show. */
.cta-light {
  /* At most 420 × 240: inside the frame on every side of the glyph, so the frame's own ground
     never shows as an edge; the mask fades the glow out before the box does. */
  width: 100%;
  max-width: 26.25rem;
  height: 15rem;
  margin-bottom: var(--klc-space-8);
  object-fit: none;
  object-position: calc(50% - 190px) 50%;
  mask-image: radial-gradient(closest-side, #000 25%, transparent 92%);
}
.cta-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-16);
}
</style>
