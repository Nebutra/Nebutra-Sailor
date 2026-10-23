<!--
  Proof by showing (research §4.3): the workstation as it ships today, the same capture /home uses
  (workstation-shot.vue), in the visitor's colour mode as on /home, and three
  plain facts read from the pinned chart source rather than typed here: how it ships, what it draws
  with, its licence.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import WorkstationShot from "../components/workstation-shot.vue";
import { LINKS } from "../links";
import { APP_PATH } from "../routes";

const { t } = useI18n();
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
      <WorkstationShot :alt="t('home.workstation.alt')" />
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
