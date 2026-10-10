<!--
  The lockup: candle glyph in Cobalt + the `KLineChartQuant` wordmark in Outfit 600 (ADR 0001,
  design §2.1–2.2). The name is never translated. `endorsed` adds "by" + the Nebutra wordmark (the
  official mark, never typed text), which appears only outside workspace chrome (Sailor ADR
  kcq-brand-architecture).
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import { glyphPath } from "../brand/glyph";
import NebutraWordmark from "./nebutra-wordmark.vue";

/** `endorsed` is the localized lead-in ("by"); the endorser is always the Nebutra wordmark. */
defineProps<{ endorsed?: string }>();
const path = glyphPath();
</script>
<template>
  <span class="brand-mark">
    <svg class="brand-glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path :d="path" />
    </svg>
    <span class="brand-word" translate="no">KLineChartQuant</span>
    <a
      v-if="endorsed"
      class="brand-endorse"
      :href="`https://${brand.domains.landing}`"
      rel="noopener"
      translate="no"
    >
      <span>{{ endorsed }}</span>
      <NebutraWordmark :label="brand.name" />
    </a>
  </span>
</template>
<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  color: var(--kcq-ink);
}
.brand-glyph {
  fill: var(--kcq-accent);
}
.brand-word {
  font-family: var(--kcq-font-display);
  font-weight: 600;
  font-size: var(--klc-text-label-16-font-size);
  line-height: var(--klc-text-label-16-line-height);
  letter-spacing: -0.02em;
}
.brand-endorse {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  font-size: var(--klc-text-label-13-font-size);
  line-height: var(--klc-text-label-13-line-height);
  color: var(--kcq-ink-2);
  text-decoration: none;
  transition: color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
.brand-endorse:focus-visible {
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  .brand-endorse:hover {
    color: var(--kcq-ink);
  }
}
@media (pointer: coarse) {
  .brand-endorse {
    min-height: var(--klc-density-comfortable);
  }
}
.brand-endorse :deep(.nebutra-wordmark) {
  /* Optical match to the 13px label: the wordmark's cap height sits on the text's x-height band. */
  height: 0.8em;
  transform: translateY(0.04em);
}
</style>
