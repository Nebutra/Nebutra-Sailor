<!--
  The lockup: candle glyph in Cobalt + the `KLineChartQuant` wordmark in Outfit 600 (ADR 0001,
  design §2.1–2.2). The name is never translated. `endorsed` adds "by Nebutra", which appears only
  outside workspace chrome (Sailor ADR kcq-brand-architecture).
-->
<script setup lang="ts">
import { glyphPath } from "../brand/glyph";

defineProps<{ endorsed?: string }>();
const path = glyphPath();
</script>
<template>
  <span class="brand-mark">
    <svg class="brand-glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path :d="path" />
    </svg>
    <span class="brand-word" translate="no">KLineChartQuant</span>
    <span v-if="endorsed" class="brand-endorse">{{ endorsed }}</span>
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
  font-size: var(--klc-text-label-13-font-size);
  line-height: var(--klc-text-label-13-line-height);
  color: var(--kcq-ink-2);
}
</style>
