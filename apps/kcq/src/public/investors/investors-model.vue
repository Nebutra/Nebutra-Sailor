<!--
  Business model, shape only (research §4.7; a16z open-source stages): four tiers in a row, each
  marked by a bar one step taller than the last, like an advancing trend. Plain text on a
  hairline, no cards (restraint benchmark rule 9). No prices: those are in the deck, and the note
  says so.
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
  gap: var(--klc-space-32) var(--kcq-column-gap);
  margin-top: var(--klc-space-48);
}
.step {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
/* Each tier's bar is one step taller, ink-2 rising to Cobalt at the top tier. */
.step-bar {
  width: var(--klc-space-4);
  height: calc(var(--klc-space-12) + var(--step) * var(--klc-space-8));
  margin-bottom: var(--klc-space-8);
  align-self: end;
  border-radius: 1px;
  background: color-mix(in oklab, var(--kcq-accent) calc(var(--step) * 33%), var(--kcq-rule-strong));
}
.step-term {
  color: var(--kcq-ink-2);
}
.model-note {
  margin-top: var(--klc-space-32);
}
@media (min-width: 768px) {
  .stairs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .stairs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: var(--klc-space-64);
  }
  /* The bars share one baseline, so the rise reads across the row. */
  .step {
    grid-template-rows: calc(var(--klc-space-12) + 3 * var(--klc-space-8) + var(--klc-space-8));
  }
}
</style>
