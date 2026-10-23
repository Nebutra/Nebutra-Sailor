<!--
  Charts (deck 5.3; restraint benchmark §4 row 3). The section grammar (components/page-section.vue): heading, sub, the benchmark
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
import PageSection from "../components/page-section.vue";

const { t } = useI18n();
const { locale } = usePublicLocale();
</script>
<template>
  <PageSection id="rendering" :heading="t('home.rendering.heading')" :lede="t('home.rendering.body')">
    <template #head>
      <RouterLink class="section-link" :to="publicPath('benchmark', locale)">
        {{ t("home.rendering.benchmark") }}
        <KcqIcon class="button-arrow" name="arrow" />
      </RouterLink>
    </template>
    <PixelLoupe />
  </PageSection>
</template>
