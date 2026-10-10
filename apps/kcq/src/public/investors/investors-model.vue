<!--
  Business model, shape only (research §4.7; a16z open-source stages): four tiers as a staircase
  that rises left to right, each step one bar higher, like an advancing trend. No prices: those
  are in the deck, and the note says so.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t, tm } = useI18n();
const tiers = computed(() =>
  (tm("investors.model.tiers") as unknown[]).map((_, index) => ({
    name: t(`investors.model.tiers.${index}.name`),
    term: t(`investors.model.tiers.${index}.term`),
    body: t(`investors.model.tiers.${index}.body`),
  })),
);
</script>
<template>
  <section id="model" class="band model" aria-labelledby="model-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="model-heading" class="t-heading">{{ t("investors.model.heading") }}</h2>
        <p class="t-lede">{{ t("investors.model.body") }}</p>
      </div>
      <ol class="stairs">
        <li v-for="(tier, index) in tiers" :key="tier.name" class="step" :style="{ '--step': index }">
          <span class="step-bar" aria-hidden="true" />
          <h3 class="t-title">{{ tier.name }}</h3>
          <p class="t-meta step-term">{{ tier.term }}</p>
          <p class="t-copy">{{ tier.body }}</p>
        </li>
      </ol>
      <p class="t-copy model-note">{{ t("investors.model.note") }}</p>
    </div>
  </section>
</template>
<style scoped>
.stairs {
  display: grid;
  gap: var(--klc-space-12) var(--kcq-column-gap);
  margin-top: var(--klc-space-48);
}
.step {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding: var(--klc-space-24);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-md);
  background: var(--kcq-raised);
}
/* Each tier's bar is one step taller: the price-label Cobalt at the top tier, ink-2 below it. */
.step-bar {
  width: var(--klc-space-4);
  height: calc(var(--klc-space-12) + var(--step) * var(--klc-space-8));
  margin-bottom: var(--klc-space-8);
  border-radius: 1px;
  background: color-mix(in oklab, var(--kcq-accent) calc(40% + var(--step) * 20%), var(--kcq-rule-strong));
}
.step-term {
  text-transform: none;
  letter-spacing: 0;
  color: var(--kcq-accent-ink);
}
.model-note {
  margin-top: var(--klc-space-24);
}
@media (min-width: 768px) {
  .stairs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* From lg the four tiers climb: each starts one step higher than the one before. */
@media (min-width: 1024px) {
  .stairs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: end;
  }
  .step {
    margin-top: calc((3 - var(--step)) * var(--klc-space-32));
    min-height: calc(var(--klc-space-160) + var(--klc-space-48) + var(--step) * var(--klc-space-32));
  }
}
</style>
