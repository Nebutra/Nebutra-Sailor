<!--
  The page opening, shared by /home, /investors, /benchmark and 404 (restraint benchmark §4 row 1):
  one H1 at the display size, the lede, then in order the optional details, actions and note, and
  below them one artifact across the container. Nothing above the headline except a 404's kicker.

  The entrance is CSS only (public.css `.enter-*`) and needs no script: the headline through a mask,
  then each copy line 70ms (--kcq-stagger) after the one before, from 120ms, and the artifact at
  300ms; about a second in all. Reduced motion shows everything at once.
-->
<script setup lang="ts">
import { ref } from "vue";

defineProps<{ heading: string; lede: string }>();
defineSlots<{
  kicker?(): unknown;
  details?(): unknown;
  actions?(): unknown;
  note?(): unknown;
  artifact?(): unknown;
}>();

/** The section element, for a page whose artifact runs its own motion (home-hero.vue). */
const root = ref<HTMLElement | null>(null);
defineExpose({ root });
</script>
<template>
  <section id="hero" ref="root" class="band page-hero" aria-labelledby="hero-heading">
    <div class="container">
      <div class="page-hero-copy">
        <slot name="kicker" />
        <h1 id="hero-heading" class="t-display page-hero-heading enter-mask">{{ heading }}</h1>
        <p class="t-lede page-hero-lede enter-rise">{{ lede }}</p>
        <div v-if="$slots.details" class="page-hero-details enter-rise"><slot name="details" /></div>
        <div v-if="$slots.actions" class="page-hero-actions enter-rise"><slot name="actions" /></div>
        <div v-if="$slots.note" class="page-hero-note t-meta enter-rise"><slot name="note" /></div>
      </div>
      <div v-if="$slots.artifact" class="page-hero-artifact enter-settle"><slot name="artifact" /></div>
    </div>
  </section>
</template>
<style scoped>
.page-hero {
  padding-block: var(--klc-space-48) var(--kcq-band-space);
}
@media (min-width: 1024px) {
  .page-hero {
    padding-top: var(--klc-space-96);
  }
}
.page-hero-copy {
  display: grid;
  justify-items: start;
  gap: var(--klc-space-24);
}
/* About 760px: a deck sentence in three lines at 56px (two lines of Han at 48px). */
.page-hero-heading {
  max-width: 47.5rem;
}
.page-hero-lede,
.page-hero-details {
  max-width: 40rem;
}
.page-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-8);
}
/* The note qualifies the actions, so it sits closer to them than the copy rhythm. */
.page-hero-note {
  margin-top: calc(-1 * var(--klc-space-12));
}
.page-hero-artifact {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-top: var(--klc-space-48);
  --enter-delay: 300ms;
}
@media (min-width: 1024px) {
  .page-hero-artifact {
    margin-top: var(--klc-space-64);
  }
}
/* The entrance stagger: whichever copy lines a page has, each starts one step after the last. */
.page-hero-lede {
  --enter-delay: 120ms;
}
.page-hero-lede + .enter-rise {
  --enter-delay: calc(120ms + var(--kcq-stagger));
}
.page-hero-lede + .enter-rise + .enter-rise {
  --enter-delay: calc(120ms + 2 * var(--kcq-stagger));
}
.page-hero-lede + .enter-rise + .enter-rise + .enter-rise {
  --enter-delay: calc(120ms + 3 * var(--kcq-stagger));
}
</style>
