<!--
  Trust and BYOK (deck 5.7; motion spec: trust areas stay still). Every line is what the code does:
  model API keys live in this browser's storage and go straight to the chosen provider
  (KCQ browser-provider-stores.ts); market-data keys need an account and are vault-encrypted per
  tenant on the gateway (backends/gateway/src/routes/kcq/store.ts); /app opens as a guest (main.ts). No diagram, no
  motion, no decoration of legal copy (research §3 Trust).
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import { useI18n } from "vue-i18n";

const { t, tm, rt } = useI18n();
</script>
<template>
  <section id="trust" class="band trust" aria-labelledby="trust-heading">
    <div class="container trust-grid">
      <div class="section-head">
        <h2 id="trust-heading" class="t-heading">{{ t("home.trust.heading") }}</h2>
        <p class="t-lede">{{ t("home.trust.body") }}</p>
      </div>
      <div class="trust-detail">
        <ul class="trust-facts t-meta">
          <li v-for="(fact, index) in tm('home.trust.facts')" :key="index">{{ rt(fact) }}</li>
        </ul>
        <p class="t-copy">{{ t("home.trust.detail", { brand: brand.name }) }}</p>
        <p class="t-copy trust-disclaimer">{{ t("home.trust.disclaimer") }}</p>
      </div>
    </div>
  </section>
</template>
<style scoped>
.trust-grid {
  display: grid;
  gap: var(--klc-space-32) var(--kcq-column-gap);
}
.trust-detail {
  display: grid;
  gap: var(--klc-space-16);
  align-content: end;
  max-width: 34rem;
}
.trust-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8) var(--klc-space-16);
  color: var(--kcq-ink);
}
.trust-facts li {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
}
.trust-facts li::before {
  content: "";
  width: var(--klc-space-4);
  height: var(--klc-space-4);
  background: var(--kcq-accent);
}
.trust-disclaimer {
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
}
@media (min-width: 1024px) {
  .trust-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: end;
  }
  .trust-grid > .section-head {
    grid-column: 1 / span 6;
  }
  .trust-detail {
    grid-column: 8 / span 5;
  }
}
</style>
