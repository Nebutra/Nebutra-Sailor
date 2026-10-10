<!--
  The earned secret (research §4.4): the agent acts through typed tools with a declared safety
  level, shown as the call log of the same 601360 session the hero pictures. Tool names and safety
  come from the pinned chart source (virtual:kcq-facts), so they cannot drift from the library.

  The page's one signature motion: when the log first scrolls into view, the rail fills and the
  three calls land in order, the way the agent panel showed them. CSS transitions only, armed
  after hydration, so the prerendered page (and no-JS, and reduced motion) shows the finished log.
-->
<script setup lang="ts">
import { useIntersectionObserver, usePreferredReducedMotion } from "@vueuse/core";
import facts from "virtual:kcq-facts";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

/** The session's calls, in order (the agent panel in the hero screenshot). */
const CALLS = ["instruments_query_name", "market_bars_query", "drawing_create"] as const;

const { t } = useI18n();
const steps = computed(() =>
  CALLS.map((tool, index) => {
    const safety = facts.tools.safety[tool] ?? "read-only";
    return { tool, safety, label: t(`investors.tools.safety.${safety}`), what: t(`investors.tools.steps.${index}`) };
  }),
);

const log = ref<HTMLElement>();
const armed = ref(false);
const seen = ref(false);
const motion = usePreferredReducedMotion();
onMounted(() => {
  if (motion.value === "reduce") return;
  // Only arm what is still below the fold: something already on screen never hides.
  const rect = log.value?.getBoundingClientRect();
  if (rect && rect.top > window.innerHeight) armed.value = true;
});
const { stop } = useIntersectionObserver(
  log,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    seen.value = true;
    stop();
  },
  { threshold: 0.35 },
);
</script>
<template>
  <section id="tools" class="band band-inverted tools" data-theme="dark" aria-labelledby="tools-heading">
    <div class="container tools-grid">
      <div class="section-head">
        <h2 id="tools-heading" class="t-heading">{{ t("investors.tools.heading") }}</h2>
        <p class="t-lede">{{ t("investors.tools.body") }}</p>
        <p class="t-meta tools-note">{{ t("investors.tools.note") }}</p>
      </div>
      <figure
        ref="log"
        class="log"
        :data-armed="armed || undefined"
        :data-seen="seen || undefined"
      >
        <figcaption class="t-meta log-head">
          <span class="status-dot" aria-hidden="true" />{{ t("investors.tools.log") }}
        </figcaption>
        <ol class="log-list">
          <li v-for="(step, index) in steps" :key="step.tool" class="call" :style="{ '--i': index }">
            <span class="call-node" aria-hidden="true" />
            <div class="call-line">
              <code class="call-tool" translate="no">{{ step.tool }}</code>
              <span class="call-safety t-meta" :data-safety="step.safety">{{ step.label }}</span>
            </div>
            <p class="t-copy call-what">{{ step.what }}</p>
          </li>
        </ol>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.tools-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
  align-items: center;
}
.tools-note {
  text-transform: none;
  letter-spacing: 0;
}
@media (min-width: 1024px) {
  .tools-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .tools-grid > .section-head {
    grid-column: 1 / span 5;
  }
  .log {
    grid-column: 7 / span 6;
  }
}
/* The log, drawn like the agent panel: a quiet card, a rail of nodes, one row per call. */
.log {
  position: relative;
  margin: 0;
  padding: var(--klc-space-24);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-lg);
  background: var(--kcq-surface);
}
.log-head {
  display: flex;
  align-items: center;
  gap: var(--klc-space-8);
  padding-bottom: var(--klc-space-16);
  margin-bottom: var(--klc-space-8);
  border-bottom: 1px solid var(--kcq-rule);
  text-transform: none;
  letter-spacing: 0;
}
.log-head .status-dot {
  background: var(--kcq-up);
}
.log-list {
  position: relative;
  display: grid;
}
.call {
  position: relative;
  display: grid;
  grid-template-columns: var(--klc-space-24) minmax(0, 1fr);
  column-gap: var(--klc-space-12);
  row-gap: var(--klc-space-4);
  padding-block: var(--klc-space-16);
}
.call + .call {
  border-top: 1px dashed var(--kcq-rule);
}
.call-node {
  grid-row: 1 / span 2;
  width: 11px;
  height: 11px;
  margin-top: 5px;
  border-radius: var(--klc-radius-full);
  background: var(--kcq-surface);
  box-shadow: inset 0 0 0 2px var(--kcq-accent);
  position: relative;
  z-index: 1;
}
.call-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-8);
}
.call-tool {
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
  color: var(--kcq-ink);
  overflow-wrap: anywhere;
}
.call-safety {
  padding: 0 var(--klc-space-8);
  border: 1px solid var(--kcq-rule-strong);
  border-radius: var(--klc-radius-full);
  text-transform: none;
  letter-spacing: 0;
}
.call-safety[data-safety="destructive"] {
  border-color: transparent;
  background: var(--kcq-accent-strong);
  color: #fff;
}
.call-what {
  grid-column: 2;
  color: var(--kcq-ink-soft);
}
/* The rail: a segment from each node to the next, behind the nodes (node centre: 16 + 5 + 5.5). */
.call:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 26px;
  bottom: -26px;
  width: 1px;
  background: var(--kcq-accent);
  transform-origin: top;
}
/* The motion: armed after hydration only when the log is below the fold, played once on sight. */
.log[data-armed] .call::after {
  transform: scaleY(0);
}
.log[data-armed] .call {
  opacity: 0;
  transform: translateY(var(--klc-space-8));
}
.log[data-armed][data-seen] .call::after {
  transform: none;
  transition: transform 380ms var(--klc-motion-ease-in-out);
  transition-delay: calc(var(--i) * 380ms + 320ms);
}
.log[data-armed][data-seen] .call {
  opacity: 1;
  transform: none;
  transition:
    opacity var(--klc-motion-dur-slow) var(--klc-motion-ease-out),
    transform var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
  transition-delay: calc(var(--i) * 380ms + 120ms);
}
@media (prefers-reduced-motion: reduce) {
  .log[data-armed] .call,
  .log[data-armed] .call::after {
    opacity: 1;
    transform: none;
  }
}
</style>
