<!--
  Who we build for (research §4.6): the shape of the market without a TAM slide. Four kinds of
  team, each with one concrete thing they would build; archetypes, not customers, so no logos.
  The section grammar: heading, then the list on a hairline.
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
  <section id="audience" class="band audience" aria-labelledby="audience-heading">
    <div class="container">
      <h2 id="audience-heading" class="t-heading audience-heading">{{ t("investors.audience.heading") }}</h2>
      <ul class="audience-list section-artifact">
        <li v-for="item in items" :key="item.title" class="audience-item">
          <h3 class="t-title">{{ item.title }}</h3>
          <p class="t-copy">{{ item.body }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
<style scoped>
.audience-heading {
  max-width: 40rem;
}
.audience-list {
  display: grid;
  gap: 0 var(--kcq-column-gap);
}
.audience-item {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding-block: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
@media (min-width: 768px) {
  .audience-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .audience-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
