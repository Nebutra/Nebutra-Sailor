<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { WorkbenchHelp, type WorkbenchHelpProps } from "./workbench-help";

const props = defineProps<WorkbenchHelpProps>();
const host = shallowRef<HTMLDivElement | null>(null);
let root: Root | undefined;
function render() {
  root?.render(createElement(WorkbenchHelp, { ...props }));
}
onMounted(() => {
  if (host.value) {
    root = createRoot(host.value);
    render();
  }
});
watch(() => [props.section, props.analyticsConsent, props.diagnostics], render);
onBeforeUnmount(() => root?.unmount());
</script>
<template><div ref="host" /></template>
