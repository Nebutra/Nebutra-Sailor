<!-- Reuse canonical React controls with the same lifecycle as the header island. -->
<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, shallowRef } from "vue";
import { ProfilePage, type ProfilePageProps } from "./profile-page";

const props = defineProps<ProfilePageProps>();
const host = shallowRef<HTMLDivElement | null>(null);
let root: Root | undefined;
onMounted(() => {
  if (host.value) {
    root = createRoot(host.value);
    root.render(createElement(ProfilePage, { ...props }));
  }
});
onBeforeUnmount(() => root?.unmount());
</script>
<template><div ref="host" /></template>
