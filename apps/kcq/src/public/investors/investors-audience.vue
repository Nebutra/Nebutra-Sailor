<!--
  Who we build for (research §4.6): the shape of the market without a TAM slide. Four kinds of
  team, each with one concrete thing they would build; archetypes, not customers, so no logos.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t, tm } = useI18n();
const items = computed(() =>
  (tm("investors.audience.items") as unknown[]).map((_, index) => ({
    title: t(`investors.audience.items.${index}.title`),
    body: t(`investors.audience.items.${index}.body`),
  })),
);
</script>
<template>
  <section id="audience" class="band band-raised audience" aria-labelledby="audience-heading">
    <div class="container audience-grid">
      <h2 id="audience-heading" class="t-heading audience-heading">{{ t("investors.audience.heading") }}</h2>
      <ul class="audience-list">
        <li v-for="item in items" :key="item.title" class="audience-item">
          <h3 class="t-title">{{ item.title }}</h3>
          <p class="t-copy">{{ item.body }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
<style scoped>
.audience-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
}
.audience-heading {
  max-width: 16ch;
}
.audience-list {
  display: grid;
  gap: 0 var(--kcq-column-gap);
}
.audience-item {
  display: grid;
  gap: var(--klc-space-8);
  padding-block: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule-strong);
}
@media (min-width: 768px) {
  .audience-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .audience-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .audience-heading {
    grid-column: 1 / span 4;
  }
  .audience-list {
    grid-column: 6 / span 7;
  }
}
</style>
