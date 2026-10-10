<!--
  /investors: the story told to a VC or a design partner so that they write for the deck
  (.trellis/tasks/10-09-frontend-design-system/research/investors-page.md §4, Sequoia's spine
  compressed). Marketing, not disclosure: the round size, valuation, use of funds and projections
  live in the deck only. Bands on the /home system: hero with the real 601360 session · why now
  (raised) · the tool calls (inverted, the page's one motion) · the live workstation · releases
  in public (raised) · business model · who it is for (raised) · roadmap · team (raised) · the ask
  (inverted) · footer.
-->
<script setup lang="ts">
import { useHead } from "@unhead/vue";
// The same files public.css loads (vite.config.mjs `kcq-geist-*` aliases): one hashed asset each.
import geistMonoFont from "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.woff2?url";
import geistFont from "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2?url";
import InvestorsAsk from "./investors/investors-ask.vue";
import InvestorsAudience from "./investors/investors-audience.vue";
import InvestorsCadence from "./investors/investors-cadence.vue";
import InvestorsHero from "./investors/investors-hero.vue";
import InvestorsModel from "./investors/investors-model.vue";
import InvestorsProduct from "./investors/investors-product.vue";
import InvestorsRoadmap from "./investors/investors-roadmap.vue";
import InvestorsShifts from "./investors/investors-shifts.vue";
import InvestorsTeam from "./investors/investors-team.vue";
import InvestorsTools from "./investors/investors-tools.vue";

/**
 * This page's largest paint is the headline, and the first frame waits on the copy and mono faces
 * the layout asks for; preloading them starts both with the document instead of after style
 * resolution (Lighthouse mobile, simulated: FCP 2.0 s → 1.4 s, LCP 2.9 s → 2.7 s).
 */
const preload = (href: string) => ({
  rel: "preload" as const,
  href,
  as: "font" as const,
  type: "font/woff2",
  crossorigin: "anonymous" as const,
});
useHead({ link: [preload(geistFont), preload(geistMonoFont)] });
</script>
<template>
  <main id="main">
    <InvestorsHero />
    <InvestorsShifts />
    <InvestorsTools />
    <InvestorsProduct />
    <InvestorsCadence />
    <InvestorsModel />
    <InvestorsAudience />
    <InvestorsRoadmap />
    <InvestorsTeam />
    <InvestorsAsk />
  </main>
</template>
