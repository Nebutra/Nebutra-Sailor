<!-- React owns the controls; the workbench composable owns loading and selection. -->
<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { WorkbenchEmpty, type WorkbenchEmptyProps } from "./workbench-empty";

const props = defineProps<WorkbenchEmptyProps>();
const host = shallowRef<HTMLDivElement | null>(null);
let root: Root | undefined;
function render() {
  root?.render(createElement(WorkbenchEmpty, { ...props }));
}
onMounted(() => {
  if (host.value) {
    root = createRoot(host.value);
    render();
  }
});
watch(
  () => [
    props.dataLoading,
    props.shortcutLoading,
    props.dataError,
    props.shortcutError,
    props.chartReady,
    props.hasSelection,
  ],
  render,
);
onBeforeUnmount(() => root?.unmount());
</script>
<template><div ref="host" /></template>
