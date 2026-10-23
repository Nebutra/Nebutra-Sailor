<!--
  The workstation capture at the pinned build (scripts/capture-workstation.mjs), shared by /home and
  /investors. Both captures exist, one per colour mode; each <img> carries its mode and the page
  theme hides the other (public.css "Theme variants"), so the product shows in the visitor's mode
  and the hidden capture is never fetched (lazy images that do not render do not load).
-->
<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";
import { reactive, ref } from "vue";
import shotDark1200 from "../home/workstation/workstation-dark-1200.webp";
import shotDark2400 from "../home/workstation/workstation-dark-2400.webp";
import shotLight1200 from "../home/workstation/workstation-light-1200.webp";
import shotLight2400 from "../home/workstation/workstation-light-2400.webp";
import type { ThemeMode } from "../theme";

defineProps<{ alt: string }>();

const CAPTURES: readonly { mode: ThemeMode; src: string; srcset: string }[] = [
  { mode: "light", src: shotLight1200, srcset: `${shotLight1200} 1200w, ${shotLight2400} 2400w` },
  { mode: "dark", src: shotDark1200, srcset: `${shotDark1200} 1200w, ${shotDark2400} 2400w` },
];
const sizes = "(min-width: 1344px) 1280px, calc(100vw - 64px)";

/**
 * The capture loads when its frame is within a screen of the viewport, not at page load: the
 * browser's own lazy loading starts 1250–2500px early, which on phones is the first view's network.
 * The frame holds the capture's ratio, so nothing shifts; the caption carries the alt text.
 */
const frame = ref<HTMLElement>();
const near = ref(false);
/** Each capture fades in once decoded (a loading state, ADR §1 P1), over the frame's own ground. */
const loaded = reactive<Record<ThemeMode, boolean>>({ light: false, dark: false });
const { stop } = useIntersectionObserver(
  frame,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    near.value = true;
    stop();
  },
  { rootMargin: "100% 0px" },
);
</script>
<template>
  <figure ref="frame" class="shot product-frame section-artifact">
    <template v-if="near">
      <img
        v-for="capture in CAPTURES"
        :key="capture.mode"
        :data-theme-variant="capture.mode"
        :srcset="capture.srcset"
        :sizes="sizes"
        :src="capture.src"
        :alt="alt"
        width="1440"
        height="852"
        loading="lazy"
        decoding="async"
        :data-loaded="loaded[capture.mode] || undefined"
        @load="loaded[capture.mode] = true"
      />
    </template>
    <figcaption class="visually-hidden"><slot>{{ alt }}</slot></figcaption>
  </figure>
</template>
<style scoped>
/* The frame keeps the capture's ratio before the image exists. */
.shot {
  aspect-ratio: 1440 / 852;
}
.shot img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  opacity: 0;
  transition: opacity var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.shot img[data-loaded] {
  opacity: 1;
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
