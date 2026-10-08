<!-- Mount the shared connection form inside the canonical source-management slot. -->
<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { SourceConnections, type SourceConnectionsProps } from "./source-connections";

const props = defineProps<SourceConnectionsProps>();
const host = shallowRef<HTMLDivElement | null>(null);
let root: Root | undefined;
function render() {
  root?.render(createElement(SourceConnections, { ...props }));
}
onMounted(() => {
  if (host.value) {
    root = createRoot(host.value);
    render();
  }
});
watch(() => [props.connections, props.canManage, props.busy, props.error], render);
onBeforeUnmount(() => root?.unmount());
</script>
<template><div ref="host" /></template>
