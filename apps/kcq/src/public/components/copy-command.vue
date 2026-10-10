<!--
  Copy, two shapes (landing-benchmark §6.1 secondary CTA; research G2/G3):
  - `command`: the install line you can read, select and copy in one press;
  - `prompt`: a labelled button that copies a prompt for your coding agent (KCQ's own CTA form).
  Confirmation morphs in place (copy → check, 2px blur bridge, 130ms) instead of a toast, and is
  announced politely. Reduced motion keeps the swap and drops the blur and scale.
-->
<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import KcqIcon from "./kcq-icon.vue";

const props = defineProps<{
  text: string;
  label: string;
  done: string;
  variant?: "command" | "prompt";
}>();
const { copy, copied, isSupported } = useClipboard({ copiedDuring: 1500, legacy: true });
</script>
<template>
  <span class="copy" :class="`copy-${props.variant ?? 'command'}`" :data-copied="copied || undefined">
    <code v-if="(props.variant ?? 'command') === 'command'" translate="no">{{ props.text }}</code>
    <button
      type="button"
      class="copy-button"
      :aria-label="props.variant === 'prompt' ? undefined : copied ? props.done : props.label"
      :disabled="!isSupported"
      @click="copy(props.text)"
    >
      <span class="copy-icons" aria-hidden="true">
        <KcqIcon name="copy" class="copy-icon-idle" />
        <KcqIcon name="check" class="copy-icon-done" />
      </span>
      <span v-if="props.variant === 'prompt'" class="copy-labels">
        <span class="copy-label-idle">{{ props.label }}</span>
        <span class="copy-label-done" aria-hidden="true">{{ props.done }}</span>
      </span>
    </button>
    <span class="visually-hidden" aria-live="polite">{{ copied ? props.done : "" }}</span>
  </span>
</template>
<style scoped>
.copy {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}
.copy-command {
  gap: var(--klc-space-4);
  min-height: var(--klc-density-comfortable);
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
.copy-command code::before {
  content: "$ ";
  color: var(--kcq-ink-2);
}
.copy-button {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.copy-button:active {
  transform: scale(var(--kcq-press));
}
.copy-command .copy-button {
  justify-content: center;
  width: var(--klc-density-default);
  height: var(--klc-density-default);
  border-radius: var(--klc-radius-xs);
}
.copy-prompt .copy-button {
  min-height: var(--klc-density-comfortable);
  padding-inline: var(--klc-space-16);
  border: 1px solid var(--kcq-rule-strong);
  border-radius: var(--klc-radius-sm);
  color: var(--kcq-ink);
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  font-weight: var(--klc-text-label-14-font-weight);
  white-space: nowrap;
}
@media (hover: hover) and (pointer: fine) {
  .copy-button:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
@media (pointer: coarse) {
  .copy-command {
    min-height: var(--klc-density-hit-target-touch);
  }
  .copy-command .copy-button {
    width: var(--klc-density-touch);
    height: var(--klc-density-touch);
  }
  .copy-prompt .copy-button {
    min-height: var(--klc-density-hit-target-touch);
  }
}
/* The morph: both states share one cell; the leaving one blurs out as the other sharpens in. */
.copy-icons,
.copy-labels {
  display: inline-grid;
}
.copy-icons > *,
.copy-labels > * {
  grid-area: 1 / 1;
  transition-property: opacity, filter, transform;
  transition-duration: 130ms;
  transition-timing-function: var(--klc-motion-ease-out);
}
.copy-icon-done,
.copy-label-done {
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.98);
}
.copy-icon-done {
  transform: scale(0.6);
}
.copy-icon-done {
  color: var(--kcq-up);
}
[data-copied] .copy-icon-idle,
[data-copied] .copy-label-idle {
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.98);
}
[data-copied] .copy-icon-done,
[data-copied] .copy-label-done {
  opacity: 1;
  filter: none;
  transform: none;
}
/* The check lands on the spring (300 / 30): the one tactile beat of a successful copy. */
[data-copied] .copy-icon-done {
  transition-duration: 130ms, 130ms, var(--kcq-spring-duration);
  transition-timing-function: var(--klc-motion-ease-out), var(--klc-motion-ease-out), var(--kcq-ease-spring);
}
@media (prefers-reduced-motion: reduce) {
  .copy-icons > *,
  .copy-labels > * {
    filter: none !important;
    transform: none !important;
  }
}
</style>
