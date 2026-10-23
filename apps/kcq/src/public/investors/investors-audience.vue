<!--
  Who we build for (research §4.6): the shape of the market without a TAM slide. Four kinds of
  team, each with one concrete thing they would build; archetypes, not customers, so no logos.
  The section grammar (components/page-section.vue): heading, then the list on a hairline.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PageSection from "../components/page-section.vue";

const { t, tm } = useI18n();
const items = computed(() =>
  (tm("investors.audience.items") as unknown[]).map((_, index) => ({
    title: t(`investors.audience.items.${index}.title`),
    body: t(`investors.audience.items.${index}.body`),
  })),
);
</script>
<template>
  <PageSection id="audience" :heading="t('investors.audience.heading')">
    <ul class="audience-list">
      <li v-for="item in items" :key="item.title" class="audience-item">
        <h3 class="t-title">{{ item.title }}</h3>
        <p class="t-copy">{{ item.body }}</p>
      </li>
    </ul>
  </PageSection>
</template>
<style scoped>
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
