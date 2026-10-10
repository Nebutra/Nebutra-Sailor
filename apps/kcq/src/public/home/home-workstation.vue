<!--
  Markets and data (deck 5.4; restraint benchmark §4 row 4), the page's second grand moment. The
  section grammar: heading, sub and the named sources as one quiet line, then the real product at
  full container width: a capture of the workstation at the pinned build
  (scripts/capture-workstation.mjs), not a mock-up. It is the dark capture in both page themes, the
  same fixed chart surface as the hero and the agent window.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { useIntersectionObserver } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import shotDark1200 from "./workstation/workstation-dark-1200.webp";
import shotDark2400 from "./workstation/workstation-dark-2400.webp";

const { t, tm, rt } = useI18n();
const srcset = `${shotDark1200} 1200w, ${shotDark2400} 2400w`;
const sizes = "(min-width: 1344px) 1280px, calc(100vw - 64px)";
/**
 * The capture loads when its frame is within a screen of the viewport, not at page load: the
 * browser's own lazy loading starts 1250–2500px early, which on phones is the first view's network.
 * The frame holds the capture's ratio, so nothing shifts; the caption carries the alt text.
 */
const frame = ref<HTMLElement>();
const near = ref(false);
/** The capture fades in once decoded (a loading state, ADR §1 P1), over the frame's own ground. */
const loaded = ref(false);
const { stop } = useIntersectionObserver(
  frame,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    near.value = true;
    stop();
  },
  { rootMargin: "100% 0px" },
);
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
      <figure ref="frame" class="shot product-frame section-artifact" data-theme="dark">
        <img
          v-if="near"
          :srcset="srcset"
          :sizes="sizes"
          :src="shotDark1200"
          :alt="t('home.workstation.alt')"
          width="1440"
          height="852"
          decoding="async"
          :data-loaded="loaded || undefined"
          @load="loaded = true"
        />
        <figcaption class="visually-hidden">{{ t("home.workstation.alt") }} {{ facts.version }}</figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
/* The frame keeps the capture's ratio before the image exists. */
.shot {
  aspect-ratio: 1440 / 852;
}
.shot img {
  opacity: 0;
  transition: opacity var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.shot img[data-loaded] {
  opacity: 1;
}
.shot img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
/* Phones: the full window is too small to read, so show the chart and its toolbar at legible size. */
@media (max-width: 767px) {
  .shot {
    aspect-ratio: 1 / 1;
  }
  .shot img {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    object-position: left top;
  }
}
</style>
