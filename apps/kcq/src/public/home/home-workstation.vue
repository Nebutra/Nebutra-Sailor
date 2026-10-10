<!--
  Markets and data (deck 5.4; restraint benchmark §4 row 4), the page's second grand moment. The
  section grammar: heading, sub and the named sources as one quiet line, then the real product at
  full container width: a capture of the workstation at the pinned build
  (scripts/capture-workstation.mjs), not a mock-up. It is the dark capture in both page themes, the
  same fixed chart surface as the hero and the agent window.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import shotDark1200 from "./workstation/workstation-dark-1200.webp";
import shotDark2400 from "./workstation/workstation-dark-2400.webp";

const { t, tm, rt } = useI18n();
const srcset = `${shotDark1200} 1200w, ${shotDark2400} 2400w`;
const sizes = "(min-width: 1344px) 1280px, calc(100vw - 64px)";
const sources = computed(() => (tm("home.workstation.sources") as unknown as string[]).map((source) => rt(source)));
</script>
<template>
  <section id="markets" class="band workstation" aria-labelledby="workstation-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="workstation-heading" class="t-heading">{{ t("home.workstation.heading") }}</h2>
        <p class="t-lede">{{ t("home.workstation.body") }}</p>
        <p class="t-meta">
          <span class="visually-hidden">{{ t("home.workstation.sourcesLabel") }}: </span>
          <span translate="no">{{ sources.join(" · ") }}</span>
        </p>
      </div>
      <figure class="shot product-frame section-artifact" data-theme="dark">
        <img
          :srcset="srcset"
          :sizes="sizes"
          :src="shotDark1200"
          :alt="t('home.workstation.alt')"
          width="1440"
          height="852"
          loading="lazy"
          decoding="async"
        />
        <figcaption class="visually-hidden">{{ t("home.workstation.alt") }} {{ facts.version }}</figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.shot img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
/* Phones: the full window is too small to read, so show the chart and its toolbar at legible size. */
@media (max-width: 767px) {
  .shot img {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    object-position: left top;
  }
}
</style>
