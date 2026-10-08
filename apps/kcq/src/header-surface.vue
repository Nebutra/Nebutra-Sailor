<!-- Mount shared React UI without replacing the canonical Vue chart. -->
<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { WorkbenchHeader, type WorkbenchHeaderProps } from "./workbench-header";

const props = defineProps<WorkbenchHeaderProps>();
const host = shallowRef<HTMLDivElement | null>(null);
let root: Root | undefined;
function render() {
  root?.render(createElement(WorkbenchHeader, { ...props }));
}
onMounted(() => {
  if (host.value) {
    root = createRoot(host.value);
    render();
  }
});
watch(() => [props.context, props.busy, props.signInUrl], render);
onBeforeUnmount(() => root?.unmount());
</script>
<template><div ref="host" class="header-surface" /></template>
