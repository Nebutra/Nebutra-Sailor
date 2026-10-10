<!--
  Why now (research §4.2, Sequoia's "why now"): three shifts, one line of claim and one sentence
  each, read left to right like three bars on an axis. Plain numbered text on a hairline: no chips,
  no cards (restraint benchmark rules 8, 9).
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReveal } from "../home/motion/use-reveal";

const { t, tm } = useI18n();
const items = computed(() =>
  (tm("investors.shifts.items") as unknown[]).map((_, index) => ({
    title: t(`investors.shifts.items.${index}.title`),
    body: t(`investors.shifts.items.${index}.body`),
  })),
);
/** Reveal: the three shifts land in reading order, the way the argument builds. */
const list = ref<HTMLElement>();
const { state } = useReveal(list);
</script>
<template>
  <section id="why-now" class="band shifts" aria-labelledby="shifts-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="shifts-heading" class="t-heading">{{ t("investors.shifts.heading") }}</h2>
      </div>
      <ol ref="list" class="shift-list" :data-reveal="state">
        <li v-for="(item, index) in items" :key="index" class="shift reveal-item" :style="{ '--i': index }">
          <span class="shift-index t-num" aria-hidden="true">{{ index + 1 }}</span>
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
  gap: var(--klc-space-8);
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
.shift-index {
  color: var(--kcq-ink-2);
}
.shift .t-copy {
  max-width: 24rem;
}
@media (min-width: 768px) {
  .shift-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .shift-list {
    margin-top: var(--klc-space-64);
  }
}
</style>
