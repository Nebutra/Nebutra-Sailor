<!--
  Proof strip (landing-benchmark §3.3: for open source, reproducible facts are the honest proof).
  Every figure is counted at build time from the pinned chart commit and links to the file it was
  counted from. No performance figure until /benchmark publishes a measured run (design §6).
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { DEFAULT_PUBLIC_LOCALE, publicPath, type PublicLocale } from "../routes";

const { t, locale } = useI18n();
const items = computed(() => [
  { key: "tools", value: String(facts.tools.count), href: facts.tools.href },
  { key: "backends", value: String(facts.backends.names.length), href: facts.backends.href },
  { key: "bindings", value: String(facts.bindings.names.length), href: facts.bindings.href },
  { key: "presets", value: `${facts.presets.count} × 2`, href: facts.presets.href },
  { key: "license", value: facts.license, href: facts.license_href },
]);
const benchmark = computed(() => publicPath("benchmark", (locale.value as PublicLocale) ?? DEFAULT_PUBLIC_LOCALE));
</script>
<template>
  <section class="proof" aria-labelledby="proof-heading">
    <div class="container">
      <h2 id="proof-heading" class="visually-hidden">{{ t("home.proof.heading") }}</h2>
      <dl class="proof-grid">
        <div v-for="item in items" :key="item.key" class="proof-item">
          <dt class="t-meta">{{ t(`home.proof.${item.key}.label`) }}</dt>
          <dd class="proof-value t-num">
            <a :href="item.href" rel="noopener">{{ item.value }}</a>
          </dd>
          <dd class="t-copy">{{ t(`home.proof.${item.key}.detail`) }}</dd>
        </div>
      </dl>
      <p class="proof-note t-copy">
        <span>{{ t("home.proof.source", { commit: facts.commit.slice(0, 8) }) }}</span>
        <span>
          {{ t("home.proof.benchmark") }}
          <RouterLink :to="benchmark">{{ t("home.proof.benchmarkLink") }}</RouterLink>
        </span>
      </p>
    </div>
  </section>
</template>
<style scoped>
.proof {
  padding-block: var(--klc-space-32) 0;
}
.proof-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--kcq-rule);
  border-left: 1px solid var(--kcq-rule);
}
.proof-item {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding: var(--klc-space-16);
  border-right: 1px solid var(--kcq-rule);
  border-bottom: 1px solid var(--kcq-rule);
}
.proof-item:last-child {
  grid-column: 1 / -1;
}
.proof-value {
  font-size: var(--klc-text-32-font-size);
  line-height: var(--klc-text-32-line-height);
  letter-spacing: -0.02em;
}
.proof-value a {
  color: var(--kcq-ink);
  text-decoration-color: var(--kcq-rule-strong);
}
@media (hover: hover) and (pointer: fine) {
  .proof-value a:hover {
    color: var(--kcq-accent-text);
    text-decoration-color: currentColor;
  }
}
.proof-note {
  display: grid;
  gap: var(--klc-space-4);
  margin-top: var(--klc-space-16);
}
@media (min-width: 1024px) {
  .proof-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .proof-item:last-child {
    grid-column: auto;
  }
  .proof-note {
    display: flex;
    justify-content: space-between;
    gap: var(--klc-space-24);
  }
}
</style>
