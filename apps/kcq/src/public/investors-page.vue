<!--
  /investors: the story told to a VC or a design partner so that they write for the deck
  (.trellis/tasks/10-09-frontend-design-system/research/investors-page.md §4, Sequoia's spine
  compressed). Marketing, not disclosure: the round size, valuation, use of funds and projections
  live in the deck only. On /home's restraint system (restraint benchmark §3): one page surface,
  one H2 size, one section rhythm, no eyebrows, product frames on the fixed dark chart surface.
  hero with the real 601360 session · why now · the tool calls (the page's one motion) · the live
  workstation · releases in public · business model · who it is for · roadmap · team · the ask
  (the one dark block, which the footer continues) · footer.
-->
<script setup lang="ts">
import { useHead } from "@unhead/vue";
// The same file public.css loads for Geist on the public pages: one hashed asset.
import geistFont from "./brand/kcq-geist-latin.woff2?url";
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
 * This page's largest paint is the headline, and the first frame waits on the copy face the
 * layout asks for; preloading it starts with the document instead of after style resolution.
 * (No mono in the first view any more, so only the copy face.)
 */
const preload = (href: string) => ({
  rel: "preload" as const,
  href,
  as: "font" as const,
  type: "font/woff2",
  crossorigin: "anonymous" as const,
});
useHead({ link: [preload(geistFont)] });
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
