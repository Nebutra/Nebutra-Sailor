<!-- Mount the shared React notice; the Vue shell only decides when it shows. -->
<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, shallowRef } from "vue";
import { InsufficientBalanceNotice } from "./wallet-chip";

const props = defineProps<{ origin: string; onDismiss: () => void }>();
const host = shallowRef<HTMLDivElement | null>(null);
let root: Root | undefined;
onMounted(() => {
  if (host.value) {
    root = createRoot(host.value);
    root.render(createElement(InsufficientBalanceNotice, { ...props }));
  }
});
onBeforeUnmount(() => root?.unmount());
</script>
<template><div ref="host" /></template>
