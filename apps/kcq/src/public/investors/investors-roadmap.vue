<!--
  Roadmap, phase names only (research §4.9): budgets and dated KPIs are in the deck. Four nodes on
  one line, the current one filled in Cobalt and marked in words; static.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t, tm } = useI18n();
const items = computed(() =>
  (tm("investors.roadmap.items") as unknown[]).map((_, index) => ({
    when: t(`investors.roadmap.items.${index}.when`),
    body: t(`investors.roadmap.items.${index}.body`),
  })),
);
</script>
<template>
  <section id="roadmap" class="band roadmap" aria-labelledby="roadmap-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="roadmap-heading" class="t-heading">{{ t("investors.roadmap.heading") }}</h2>
      </div>
      <ol class="road">
        <li
          v-for="(item, index) in items"
          :key="item.when"
          class="stop"
          :aria-current="index === 0 ? 'step' : undefined"
        >
          <span class="stop-node" aria-hidden="true" />
          <p class="stop-when">
            <span class="t-title">{{ item.when }}</span>
            <span v-if="index === 0" class="stop-here t-meta">{{ t("investors.roadmap.here") }}</span>
          </p>
          <p class="t-copy">{{ item.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
<style scoped>
.road {
  position: relative;
  display: grid;
  gap: var(--klc-space-32);
  margin-top: var(--klc-space-48);
}
@media (min-width: 1024px) {
  .road {
    margin-top: var(--klc-space-64);
  }
}
.stop {
  position: relative;
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding-left: var(--klc-space-32);
}
/* The line: vertical on phones (node to node), horizontal from md. */
.stop:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 18px;
  bottom: calc(-1 * var(--klc-space-32) - 6px);
  width: 1px;
  background: var(--kcq-rule-strong);
}
.stop-node {
  position: absolute;
  left: 0;
  top: 6px;
  width: 11px;
  height: 11px;
  border-radius: var(--klc-radius-full);
  background: var(--kcq-page);
  box-shadow: inset 0 0 0 2px var(--kcq-rule-strong);
}
.stop[aria-current] .stop-node {
  background: var(--kcq-accent);
  box-shadow: none;
}
.stop-when {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-8);
}
.stop-here {
  color: var(--kcq-accent-text);
}
.stop .t-copy {
  max-width: 22rem;
}
@media (min-width: 768px) {
  .road {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--kcq-column-gap);
  }
  .stop {
    padding-left: 0;
    padding-top: var(--klc-space-32);
  }
  .stop-node {
    top: 0;
  }
  .stop:not(:last-child)::after {
    left: 18px;
    right: calc(-1 * var(--kcq-column-gap) + 6px);
    top: 5px;
    bottom: auto;
    width: auto;
    height: 1px;
  }
}
</style>
