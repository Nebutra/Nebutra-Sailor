<!--
  The public pages' icon set: one 16px grid, 1.5px strokes, round joins (CP 25: one stroke width,
  one corner language). Decorative by default; the control that holds it carries the label.
-->
<script setup lang="ts">
const PATHS = {
  arrow: "M3 8h9.5M9 4.5 12.5 8 9 11.5",
  external: "M6 3.5H3.5v9h9V10M9 3h4v4M13 3 7.5 8.5",
  copy: "M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z",
  check: "M3 8.5 6.5 12 13 4.5",
  pause: "M5.5 3.5v9M10.5 3.5v9",
  play: "M5 3.2v9.6L12.5 8 5 3.2Z",
  replay: "M3 8a5 5 0 1 0 1.5-3.6M3 2.5v3h3",
  system: "M2.5 3.5h11v7h-11zM6 13.5h4M8 10.5v3",
  light: "M8 5.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5ZM8 1.5v1.25M8 13.25v1.25M14.5 8h-1.25M2.75 8H1.5M12.6 3.4l-.9.9M4.3 11.7l-.9.9M12.6 12.6l-.9-.9M4.3 4.3l-.9-.9",
  dark: "M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z",
} as const;

defineProps<{ name: keyof typeof PATHS; size?: number }>();
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
    <path :d="PATHS[name]" />
  </svg>
</template>
<style scoped>
.kcq-icon {
  flex: none;
}
</style>
