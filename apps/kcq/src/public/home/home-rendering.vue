<!--
  03 Charts (messaging pillar "crisp and smooth"; research F5, I2). The band's ground is the
  chart's own grid. The claim is something you can check: a loupe over real candles drawn on this
  screen (rendering/pixel-loupe.vue). The screen's pixel ratio and refresh rate appear only as a
  quiet caption, measured here, never claimed; speed numbers live on /benchmark.
-->
<script setup lang="ts">
import { useElementVisibility } from "@vueuse/core";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import KcqIcon from "../components/kcq-icon.vue";
import { publicPath } from "../routes";
import { usePublicLocale } from "../state/use-public-locale";
import { useVisitorDisplay } from "../state/use-visitor-display";
import PixelLoupe from "./rendering/pixel-loupe.vue";

const { t } = useI18n();
const { locale } = usePublicLocale();
const visitor = useVisitorDisplay();
const section = ref<HTMLElement>();
const visible = useElementVisibility(section);
watch(visible, (now) => now && void visitor.measure(), { once: true });
</script>
<template>
  <section id="rendering" ref="section" class="band rendering" aria-labelledby="rendering-heading">
    <div class="container rendering-grid">
      <div class="section-head">
        <h2 id="rendering-heading" class="t-heading">{{ t("home.rendering.heading") }}</h2>
        <p class="t-lede">{{ t("home.rendering.body") }}</p>
        <RouterLink class="rendering-link" :to="publicPath('benchmark', locale)">
          {{ t("home.rendering.benchmark") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </RouterLink>
      </div>
      <div class="rendering-proof">
        <PixelLoupe />
        <p class="t-meta t-num rendering-screen" :data-measured="visitor.hz.value !== null || undefined">
          {{
            t("home.rendering.loupe.screen", {
              ratio: visitor.hz.value === null ? "—" : Math.round(visitor.pixelRatio.value * 100) / 100,
              hz: visitor.hz.value ?? "—",
            })
          }}
        </p>
      </div>
    </div>
  </section>
</template>
<style scoped>
/* The chart's grid as the band's ground (research I2), fading out toward the edges. */
.rendering::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--kcq-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--kcq-grid) 1px, transparent 1px);
  background-size: var(--klc-space-96) var(--klc-space-48);
  background-position: center top;
  mask-image: radial-gradient(ellipse 70% 60% at 60% 50%, #000 30%, transparent 85%);
  opacity: 0.7;
}
.rendering-grid {
  position: relative;
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
  align-items: center;
}
.rendering-link {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  justify-self: start;
  min-height: var(--klc-density-comfortable);
  font-size: var(--klc-text-label-14-font-size);
  font-weight: var(--klc-text-label-14-font-weight);
  text-decoration: none;
}
.rendering-proof {
  display: grid;
  gap: var(--klc-space-12);
  padding: var(--klc-space-16);
  border-radius: var(--klc-radius-lg);
  background: color-mix(in oklab, var(--kcq-page) 86%, transparent);
}
.rendering-screen {
  text-transform: none;
}
@media (min-width: 1024px) {
  .rendering-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .rendering-grid > .section-head {
    grid-column: 1 / span 5;
  }
  .rendering-proof {
    grid-column: 6 / span 7;
  }
}
</style>
