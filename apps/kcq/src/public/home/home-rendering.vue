<!--
  Charts (deck 5.3; restraint benchmark §4 row 3). The section grammar: heading, sub, the benchmark
  link, then one artifact: a loupe over real candles drawn on this screen (rendering/pixel-loupe.vue),
  static until the visitor drags it. The claim is something you can check; speed numbers live on
  /benchmark.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import KcqIcon from "../components/kcq-icon.vue";
import { publicPath } from "../routes";
import { usePublicLocale } from "../state/use-public-locale";
import PixelLoupe from "./rendering/pixel-loupe.vue";

const { t } = useI18n();
const { locale } = usePublicLocale();
</script>
<template>
  <section id="rendering" class="band rendering" aria-labelledby="rendering-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="rendering-heading" class="t-heading">{{ t("home.rendering.heading") }}</h2>
        <p class="t-lede">{{ t("home.rendering.body") }}</p>
        <RouterLink class="section-link" :to="publicPath('benchmark', locale)">
          {{ t("home.rendering.benchmark") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </RouterLink>
      </div>
      <PixelLoupe class="section-artifact" />
    </div>
  </section>
</template>
