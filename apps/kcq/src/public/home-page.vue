<!--
  /home: seven blocks on one surface (restraint benchmark §4, founder decisions 2026-10-10), each in
  one grammar (heading, sub, one artifact) and one rhythm: hero · agent (the pinned story) · chart
  quality · markets and data (the real workstation) · developers · open source and trust (merged,
  text only) · final CTA (the one dark block, where the light returns) · footer.
-->
<script setup lang="ts">
import HomeAgent from "./home/home-agent.vue";
import HomeCta from "./home/home-cta.vue";
import HomeDevelopers from "./home/home-developers.vue";
import HomeHero from "./home/home-hero.vue";
import HomeOpenSource from "./home/home-open-source.vue";
import HomeRendering from "./home/home-rendering.vue";
import HomeWorkstation from "./home/home-workstation.vue";
</script>
<template>
  <main id="main">
    <HomeHero />
    <HomeAgent />
    <HomeRendering />
    <HomeWorkstation />
    <HomeDevelopers />
    <HomeOpenSource />
    <HomeCta />
  </main>
</template>
