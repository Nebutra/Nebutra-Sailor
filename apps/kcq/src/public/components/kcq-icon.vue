<!--
  The public pages' icon set: one 16px grid, 1.5px strokes, round joins (CP 25: one stroke width,
  one corner language). Decorative by default; the control that holds it carries the label.
  `arrow` is two parts so `.button-arrow` can grow its shaft on hover (research F1).
-->
<script setup lang="ts">
type Part = { d: string; class?: string };
const PATHS: Record<IconName, readonly Part[]> = {
  arrow: [
    { d: "M3 8h9.5", class: "arrow-shaft" },
    { d: "M9 4.5 12.5 8 9 11.5", class: "arrow-head" },
  ],
  external: [{ d: "M6 3.5H3.5v9h9V10M9 3h4v4M13 3 7.5 8.5" }],
  copy: [
    {
      d: "M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z",
    },
  ],
  check: [{ d: "M3 8.5 6.5 12 13 4.5" }],
  pause: [{ d: "M5.5 3.5v9M10.5 3.5v9" }],
  play: [{ d: "M5 3.2v9.6L12.5 8 5 3.2Z" }],
  replay: [{ d: "M3 8a5 5 0 1 0 1.5-3.6M3 2.5v3h3" }],
  "step-back": [{ d: "M4 3.5v9M12 3.5 6.5 8l5.5 4.5Z" }],
  "step-forward": [{ d: "M12 3.5v9M4 3.5 9.5 8 4 12.5Z" }],
  prompt: [{ d: "M3 4.5 6.5 8 3 11.5M8 11.5h5" }],
  system: [{ d: "M2.5 3.5h11v7h-11zM6 13.5h4M8 10.5v3" }],
  light: [
    {
      d: "M8 5.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5ZM8 1.5v1.25M8 13.25v1.25M14.5 8h-1.25M2.75 8H1.5M12.6 3.4l-.9.9M4.3 11.7l-.9.9M12.6 12.6l-.9-.9M4.3 4.3l-.9-.9",
    },
  ],
  dark: [{ d: "M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z" }],
  star: [{ d: "M8 2.25l1.75 3.6 3.95.55-2.87 2.77.7 3.93L8 11.25 4.47 13.1l.7-3.93L2.3 6.4l3.95-.55Z" }],
};

defineProps<{ name: IconName; size?: number }>();
</script>
<script lang="ts">
export type IconName =
  | "arrow"
  | "external"
  | "copy"
  | "check"
  | "pause"
  | "play"
  | "replay"
  | "step-back"
  | "step-forward"
  | "prompt"
  | "system"
  | "light"
  | "dark"
  | "star";
</script>
<template>
  <svg
    class="kcq-icon"
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(part, index) in PATHS[name]" :key="index" :d="part.d" :class="part.class" />
  </svg>
</template>
<style scoped>
.kcq-icon {
  flex: none;
}
</style>
