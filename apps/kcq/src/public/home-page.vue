<!--
  /home: the approved deck's eight sections (research-a16z-copy.md §5), as bands with their own
  ground and density (research §3 rhythm map): hero · agent (inverted, the pinned story) · chart
  quality (chart-grid ground) · markets and data (the real workstation) · developers · open source
  · trust (quiet) · final CTA (inverted, the light returns) · footer.
-->
<script setup lang="ts">
import HomeAgent from "./home/home-agent.vue";
import HomeCommunity from "./home/home-community.vue";
import HomeCta from "./home/home-cta.vue";
import HomeDevelopers from "./home/home-developers.vue";
import HomeHero from "./home/home-hero.vue";
import HomeRendering from "./home/home-rendering.vue";
import HomeTrust from "./home/home-trust.vue";
import HomeWorkstation from "./home/home-workstation.vue";
</script>
<template>
  <main id="main">
    <HomeHero />
    <HomeAgent />
    <HomeRendering />
    <HomeWorkstation />
    <HomeDevelopers />
    <HomeCommunity />
    <HomeTrust />
    <HomeCta />
  </main>
</template>
