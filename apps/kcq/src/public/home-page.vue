<!-- 首页先展示工作台，再解释 AI 操作、图表质量与开发接入；沿用公共页面的章节组件。 -->
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
  <main id="main" class="home-page">
    <HomeHero />
    <HomeWorkstation />
    <HomeAgent />
    <HomeRendering />
    <HomeDevelopers />
    <HomeOpenSource />
    <HomeCta />
  </main>
</template>
<style scoped>
/* 首页的信息间距独立收紧，基准页与投资人页面继续使用原有节奏。 */
.home-page {
  --kcq-band-space: var(--klc-space-64);
}
@media (min-width: 1024px) {
  .home-page {
    --kcq-band-space: var(--klc-space-80);
  }
}
</style>
