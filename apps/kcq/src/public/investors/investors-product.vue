<!--
  Proof by showing (research §4.3): the workstation as it ships today, the same capture /home uses
  (scripts/capture-workstation.mjs), the dark capture in both page themes as on /home, and three
  plain facts read from the pinned chart source rather than typed here: how it ships, what it draws
  with, its licence.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { useIntersectionObserver } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import shotDark1200 from "../home/workstation/workstation-dark-1200.webp";
import shotDark2400 from "../home/workstation/workstation-dark-2400.webp";
import { LINKS } from "../links";
import { APP_PATH } from "../routes";

const { t } = useI18n();
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
const BACKEND_NAMES: Record<string, string> = { webgpu: "WebGPU", webgl: "WebGL", canvas: "Canvas 2D" };
/** The bindings /home names (home.developers.body); the Angular adapter is not published yet. */
const SHIPPED_BINDINGS = new Set(["Vue", "React", "Web Component"]);
const rows = computed(() => [
  { label: t("investors.product.facts.bindings"), value: facts.bindings.names.filter((name) => SHIPPED_BINDINGS.has(name)).join(" · "), href: facts.bindings.href },
  {
    label: t("investors.product.facts.backends"),
    value: facts.backends.names.map((name) => BACKEND_NAMES[name] ?? name).join(" · "),
    href: facts.backends.href,
  },
  { label: t("investors.product.facts.license"), value: facts.license, href: LINKS.license },
]);
</script>
<template>
  <section id="product" class="band product" aria-labelledby="product-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="product-heading" class="t-heading">{{ t("investors.product.heading") }}</h2>
        <p class="t-lede">{{ t("investors.product.body") }}</p>
        <a class="section-link" :href="APP_PATH">
          {{ t("investors.product.open") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
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
        <figcaption class="visually-hidden">{{ t("home.workstation.alt") }}</figcaption>
      </figure>
      <dl class="facts">
        <div v-for="row in rows" :key="row.label" class="fact">
          <dt class="t-meta">{{ row.label }}</dt>
          <dd>
            <a class="fact-value" :href="row.href" rel="noopener" translate="no">{{ row.value }}</a>
          </dd>
        </div>
      </dl>
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
.facts {
  display: grid;
  gap: 0 var(--kcq-column-gap);
  margin-top: var(--klc-space-32);
}
.fact {
  display: grid;
  gap: var(--klc-space-4);
  padding-block: var(--klc-space-16);
  border-top: 1px solid var(--kcq-rule);
}
.fact-value {
  display: inline-flex;
  min-height: var(--klc-density-default);
  align-items: center;
  color: var(--kcq-ink);
  text-decoration-color: transparent;
  font-size: var(--klc-text-copy-16-font-size);
  line-height: var(--klc-text-copy-16-line-height);
}
@media (pointer: coarse) {
  .fact-value {
    min-height: var(--klc-density-comfortable);
  }
}
@media (hover: hover) and (pointer: fine) {
  .fact-value:hover {
    text-decoration-color: color-mix(in oklab, currentColor 50%, transparent);
  }
}
@media (min-width: 768px) {
  .facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
