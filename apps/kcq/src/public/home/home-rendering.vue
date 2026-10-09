<!--
  Rendering you can see (landing-benchmark §6.4). A diagram, labelled as one: what physical-pixel
  alignment does to a one-pixel wick on a 2× screen. No frame-time claims until /benchmark has
  measured data (design §6, §11).
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, tm, rt } = useI18n();
const CELLS = 8;
/** Coverage per column for a 1-device-pixel wick at x = 3 (snapped) and x = 3.5 (unsnapped). */
const columns = {
  aligned: Array.from({ length: CELLS }, (_, x) => (x === 3 ? 1 : 0)),
  blurred: Array.from({ length: CELLS }, (_, x) => (x === 3 || x === 4 ? 0.5 : 0)),
};
</script>
<template>
  <section id="rendering" class="section" aria-labelledby="rendering-heading">
    <div class="container rendering-grid">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">03</span>{{ t("home.rendering.eyebrow") }}</p>
      <div class="section-head rendering-head">
        <h2 id="rendering-heading" class="t-heading">{{ t("home.rendering.heading") }}</h2>
        <p class="t-lede">{{ t("home.rendering.body") }}</p>
      </div>

      <figure class="loupe">
        <div class="loupe-pair">
          <div v-for="variant in (['aligned', 'blurred'] as const)" :key="variant" class="loupe-cell">
            <svg :viewBox="`0 0 ${CELLS} ${CELLS}`" class="loupe-grid" aria-hidden="true">
              <defs>
                <pattern :id="`loupe-${variant}`" width="1" height="1" patternUnits="userSpaceOnUse">
                  <rect x="0.04" y="0.04" width="0.92" height="0.92" class="loupe-pixel" style="--coverage: 0" />
                </pattern>
              </defs>
              <rect :width="CELLS" :height="CELLS" :fill="`url(#loupe-${variant})`" />
              <template v-for="(coverage, x) in columns[variant]" :key="x">
                <template v-if="coverage">
                  <rect
                    v-for="y in CELLS"
                    :key="y"
                    :x="x + 0.04"
                    :y="y - 1 + 0.04"
                    width="0.92"
                    height="0.92"
                    class="loupe-pixel"
                    :style="{ '--coverage': coverage }"
                  />
                </template>
              </template>
            </svg>
            <p class="t-label">{{ t(`home.rendering.${variant}`) }}</p>
            <p class="t-copy">{{ t(`home.rendering.${variant}Note`) }}</p>
          </div>
        </div>
        <figcaption class="t-meta">{{ t("home.rendering.diagram") }}</figcaption>
      </figure>

      <div class="backends">
        <h3 class="t-title">{{ t("home.rendering.backendsHeading") }}</h3>
        <p class="t-copy">{{ t("home.rendering.backendsBody") }}</p>
        <ol class="backend-chain">
          <li v-for="(backend, index) in tm('home.rendering.backends')" :key="index" class="backend">
            <span class="t-meta t-num">0{{ index + 1 }}</span>
            <span class="t-label" translate="no">{{ rt(backend.name) }}</span>
            <span class="t-copy">{{ rt(backend.note) }}</span>
          </li>
        </ol>
        <p class="t-copy backends-note">{{ t("home.rendering.numbers") }}</p>
      </div>
    </div>
  </section>
</template>
<style scoped>
.rendering-grid {
  display: grid;
  --row-gap: var(--klc-space-48);
  gap: var(--row-gap) var(--kcq-column-gap);
}
.loupe {
  margin: 0;
  display: grid;
  gap: var(--klc-space-16);
}
.loupe-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kcq-column-gap);
}
.loupe-cell {
  display: grid;
  gap: var(--klc-space-8);
  align-content: start;
}
.loupe-grid {
  width: 100%;
  height: auto;
  margin-bottom: var(--klc-space-8);
  background: var(--kcq-rule);
  border: 1px solid var(--kcq-rule);
}
/* One device pixel per cell: page colour mixed with ink by the wick's coverage of that pixel. */
.loupe-pixel {
  fill: color-mix(in oklab, var(--kcq-ink) calc(var(--coverage) * 100%), var(--kcq-page));
}
.backends {
  display: grid;
  gap: var(--klc-space-12);
  align-content: start;
}
.backend-chain {
  display: grid;
  margin-top: var(--klc-space-8);
  border-top: 1px solid var(--kcq-rule);
}
.backend {
  display: grid;
  grid-template-columns: var(--klc-space-32) minmax(0, 1fr);
  gap: var(--klc-space-4) var(--klc-space-12);
  padding-block: var(--klc-space-12);
  border-bottom: 1px solid var(--kcq-rule);
}
.backend .t-copy {
  grid-column: 2;
}
.backends-note {
  padding-top: var(--klc-space-8);
}
@media (min-width: 1024px) {
  .rendering-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .rendering-head {
    grid-column: 1 / span 6;
    grid-row: 2;
  }
  .loupe {
    grid-column: 1 / span 6;
    grid-row: 3;
  }
  .backends {
    grid-column: 8 / span 5;
    grid-row: 2 / span 2;
    align-self: end;
  }
}
</style>
