<!--
  One section of a public page (restraint benchmark §3): the band, the container, a head (H2, an
  optional lede, then anything the head carries: a meta line, a link, channels) and the body one
  step below. Every section on every page is this grammar; a section never sets its own band padding,
  head width or head-to-body spacing.

  Layouts: `stack` puts the body under the head; `split` puts the head in the left five columns and
  the body from column seven on desktop; `center` centres both (the final CTA). `closing` makes it
  the page's last band, the surface the footer continues (public.css .band-closing).
-->
<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    id: string;
    heading: string;
    lede?: string;
    layout?: "stack" | "split" | "center";
    closing?: boolean;
  }>(),
  { lede: undefined, layout: "stack", closing: false },
);
defineSlots<{
  kicker?(): unknown;
  head?(): unknown;
  default?(): unknown;
}>();

const headingId = computed(() => `${props.id}-heading`);
</script>
<template>
  <section :id="id" class="band page-section" :class="{ 'band-closing': closing }" :aria-labelledby="headingId">
    <div class="container page-section-grid" :data-layout="layout">
      <header class="page-section-head">
        <slot name="kicker" />
        <h2 :id="headingId" class="t-heading">{{ heading }}</h2>
        <p v-if="lede" class="t-lede">{{ lede }}</p>
        <slot name="head" />
      </header>
      <div v-if="$slots.default" class="page-section-body"><slot /></div>
    </div>
  </section>
</template>
<style scoped>
.page-section-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.page-section-head {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: var(--klc-space-16);
  max-width: 40rem;
}
.page-section-body {
  min-width: 0;
  margin-top: var(--klc-space-48);
}
@media (min-width: 1024px) {
  .page-section-body {
    margin-top: var(--klc-space-64);
  }
  .page-section-grid[data-layout="split"] {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--kcq-column-gap);
  }
  [data-layout="split"] > .page-section-head {
    grid-column: 1 / span 5;
  }
  [data-layout="split"] > .page-section-body {
    grid-column: 7 / span 6;
    margin-top: 0;
  }
}
[data-layout="center"] {
  justify-items: center;
  text-align: center;
}
[data-layout="center"] > .page-section-head {
  justify-items: center;
}
</style>
