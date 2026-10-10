<!--
  Business model, shape only (research §4.7; a16z open-source stages): one plain fact as the
  heading, then the four tiers as a plain four-column list on hairline dividers, equal heights and
  one top edge (restraint benchmark rule 9). No prices: those are in the deck, and the note says so.
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
      </div>
      <ol class="stairs">
        <li v-for="tier in tiers" :key="tier.name" class="step">
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
  margin-top: var(--klc-space-48);
  border-top: 1px solid var(--kcq-rule);
}
.step {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding-block: var(--klc-space-24);
  border-bottom: 1px solid var(--kcq-rule);
}
.step-term {
  color: var(--kcq-ink-2);
}
.model-note {
  margin-top: var(--klc-space-24);
}
@media (min-width: 768px) {
  .stairs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--kcq-column-gap);
  }
}
/* Four columns from lg, divided by hairlines; every column starts on the same top edge. */
@media (min-width: 1024px) {
  .stairs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: 0;
    margin-top: var(--klc-space-64);
    border-bottom: 1px solid var(--kcq-rule);
  }
  .step {
    padding-inline: var(--klc-space-24);
    border-bottom: 0;
  }
  .step:first-child {
    padding-left: 0;
  }
  .step + .step {
    border-left: 1px solid var(--kcq-rule);
  }
}
</style>
