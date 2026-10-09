<!--
  Why now (research §4.2, Sequoia's "why now"): three shifts, one line of claim and one sentence
  each, read left to right like three bars on an axis. The index is the chart's price-label chip.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t, tm } = useI18n();
const items = computed(() =>
  (tm("investors.shifts.items") as unknown[]).map((_, index) => ({
    title: t(`investors.shifts.items.${index}.title`),
    body: t(`investors.shifts.items.${index}.body`),
  })),
);
</script>
<template>
  <section id="why-now" class="band band-raised shifts" aria-labelledby="shifts-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="shifts-heading" class="t-heading">{{ t("investors.shifts.heading") }}</h2>
        <p class="t-lede">{{ t("investors.shifts.lede") }}</p>
      </div>
      <ol class="shift-list">
        <li v-for="(item, index) in items" :key="index" class="shift">
          <span class="shift-index t-num" aria-hidden="true">{{ String(index + 1).padStart(2, "0") }}</span>
          <h3 class="t-title">{{ item.title }}</h3>
          <p class="t-copy">{{ item.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
<style scoped>
.shift-list {
  display: grid;
  gap: var(--klc-space-32) var(--kcq-column-gap);
  margin-top: var(--klc-space-48);
}
.shift {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: var(--klc-space-12);
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule-strong);
}
/* The chart's price-label chip; Cobalt deep enough for white 11px text. */
.shift-index {
  display: inline-grid;
  place-items: center;
  min-width: var(--klc-space-24);
  height: var(--klc-space-16);
  padding-inline: var(--klc-space-4);
  border-radius: var(--klc-radius-xs);
  background: var(--kcq-accent-strong);
  color: #fff;
  font-size: var(--klc-text-11-mono-font-size);
  line-height: 1;
}
.shift .t-copy {
  max-width: 24rem;
}
@media (min-width: 768px) {
  .shift-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: var(--klc-space-64);
  }
}
</style>
