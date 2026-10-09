<!--
  /home, ordered by argument (landing-benchmark §5 "demo → proof → depth", §6 outline):
  hero with the running product → checkable facts → agent = user → rendering → workstation bento
  → theme presets → developers → open source → trust → final CTA.
-->
<script setup lang="ts">
import { ref, watch } from "vue";
import HomeAgent from "./home/home-agent.vue";
import HomeBento from "./home/home-bento.vue";
import HomeCommunity from "./home/home-community.vue";
import HomeCta from "./home/home-cta.vue";
import HomeDevelopers from "./home/home-developers.vue";
import HomeHero from "./home/home-hero.vue";
import HomeProof from "./home/home-proof.vue";
import HomeRendering from "./home/home-rendering.vue";
import HomeThemes from "./home/home-themes.vue";
import HomeTrust from "./home/home-trust.vue";
import { useTheme } from "./use-theme";

const { mode } = useTheme();
const hero = ref<InstanceType<typeof HomeHero>>();
watch(mode, () => void hero.value?.applyMode());
</script>
<template>
  <main id="main">
    <HomeHero ref="hero" />
    <HomeProof />
    <HomeAgent />
    <HomeRendering />
    <HomeBento />
    <HomeThemes />
    <HomeDevelopers />
    <HomeCommunity />
    <HomeTrust />
    <HomeCta />
  </main>
</template>
