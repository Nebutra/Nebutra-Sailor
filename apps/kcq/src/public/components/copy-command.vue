<!-- An install command you can read and copy in one press (landing-benchmark §6.1 secondary CTA). -->
<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import KcqIcon from "./kcq-icon.vue";

const props = defineProps<{ command: string; label: string; done: string }>();
const copied = ref(false);
let timer = 0;

async function copy() {
  try {
    await navigator.clipboard.writeText(props.command);
    copied.value = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (copied.value = false), 1600);
  } catch {
    // Clipboard denied: the command stays visible and selectable.
  }
}
onBeforeUnmount(() => window.clearTimeout(timer));
</script>
<template>
  <span class="copy-command">
    <code translate="no">{{ props.command }}</code>
    <button type="button" class="copy-command-button" :aria-label="copied ? props.done : props.label" @click="copy">
      <KcqIcon :name="copied ? 'check' : 'copy'" />
    </button>
    <span class="visually-hidden" aria-live="polite">{{ copied ? props.done : "" }}</span>
  </span>
</template>
<style scoped>
.copy-command {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-4);
  min-height: var(--klc-density-comfortable);
  max-width: 100%;
  padding-left: var(--klc-space-12);
  padding-right: var(--klc-space-2);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-sm);
  background: var(--kcq-surface);
}
.copy-command code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--klc-text-13-font-size);
  line-height: var(--klc-text-13-line-height);
  color: var(--kcq-ink);
}
.copy-command-button {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--klc-density-default);
  height: var(--klc-density-default);
  padding: 0;
  border: 0;
  border-radius: var(--klc-radius-xs);
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .copy-command-button:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
@media (pointer: coarse) {
  .copy-command {
    min-height: var(--klc-density-hit-target-touch);
  }
  .copy-command-button {
    width: var(--klc-density-touch);
    height: var(--klc-density-touch);
  }
}
</style>
