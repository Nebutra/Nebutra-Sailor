<!--
  Developers (deck 5.5; restraint benchmark §4 row 5; research G1, G2, G4). The section grammar:
  heading, sub, the docs link, then one artifact, the code window (a hairline, no shadow, cobalt and
  greys only). The snippets are highlighted by
  Shiki at build time (virtual:kcq-code, scripts/landing-plugin.mjs): spans carry
  `var(--shiki-token-*)`, mapped below onto KCQ tokens, so code follows the colour mode and the page
  ships no highlighter. Tabs follow the WAI-ARIA tabs pattern; keyboard switching is instant
  (CP 31). Copy confirms in place (VueUse useClipboard; icon morphs, label announced).
-->
<script setup lang="ts">
import { useClipboard, useResizeObserver } from "@vueuse/core";
import code from "virtual:kcq-code";
import { nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { LINKS } from "../links";
import { SNIPPETS as ALL_SNIPPETS } from "./developer-snippets";

/** The deck's three tabs (5.5); the agent-tools snippet is published in /llms.txt instead. */
const SNIPPETS = ALL_SNIPPETS.filter((snippet) => snippet.id !== "agent");

const { t } = useI18n();
const active = ref(0);
const tabs = ref<HTMLButtonElement[]>([]);
const highlighted = new Map(code.map((entry) => [entry.id, entry.html]));
const { copy, copied } = useClipboard({ copiedDuring: 1500, legacy: true });

/**
 * One indicator for the selected tab (ADR §1 P1 "layout"): it slides and stretches from the old
 * tab to the new one with transform only (position and width are translate and scale), so the
 * switch reads as one object moving and never triggers layout. Without script, the selected tab's
 * own underline stands in (CSS, `.code-tabs:not([data-indicator])`).
 */
const tablist = ref<HTMLElement>();
const indicator = ref<{ x: number; width: number } | null>(null);
function place() {
  const tab = tabs.value[active.value];
  if (tab) indicator.value = { x: tab.offsetLeft, width: tab.offsetWidth };
}
onMounted(place);
watch(active, () => nextTick(place));
useResizeObserver(tablist, place);

function onKey(event: KeyboardEvent) {
  const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  const target =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? SNIPPETS.length - 1
        : delta
          ? (active.value + delta + SNIPPETS.length) % SNIPPETS.length
          : -1;
  if (target < 0) return;
  event.preventDefault();
  active.value = target;
  tabs.value[target]?.focus();
}
</script>
<template>
  <section id="developers" class="band developers" aria-labelledby="developers-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="developers-heading" class="t-heading">{{ t("home.developers.heading") }}</h2>
        <p class="t-lede">{{ t("home.developers.body") }}</p>
        <a class="section-link" :href="LINKS.readme" rel="noopener">
          {{ t("home.developers.readme") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
      </div>
      <div class="code-window section-artifact">
        <div
          ref="tablist"
          class="code-tabs"
          role="tablist"
          :aria-label="t('home.developers.tabs')"
          :data-indicator="indicator ? '' : undefined"
          @keydown="onKey"
        >
          <button
            v-for="(snippet, index) in SNIPPETS"
            :id="`tab-${snippet.id}`"
            :key="snippet.id"
            ref="tabs"
            type="button"
            role="tab"
            class="code-tab t-label"
            :aria-selected="active === index"
            :aria-controls="`panel-${snippet.id}`"
            :tabindex="active === index ? 0 : -1"
            @click="active = index"
          >
            {{ snippet.label }}
          </button>
          <span
            v-if="indicator"
            class="code-tab-indicator"
            aria-hidden="true"
            :style="{ '--x': `${indicator.x}px`, '--w': indicator.width }"
          />
        </div>
        <!-- Every panel sits in one grid cell, so the window is as tall as the longest snippet and a
             tab switch never moves the page (the hidden ones keep their box, out of the a11y tree). -->
        <div class="code-panels">
          <div
            v-for="(snippet, index) in SNIPPETS"
            :id="`panel-${snippet.id}`"
            :key="snippet.id"
            role="tabpanel"
            :aria-labelledby="`tab-${snippet.id}`"
            class="code-panel"
            :data-active="active === index || undefined"
            :inert="active !== index || undefined"
          >
            <div class="code-bar">
              <span class="code-file" translate="no">{{ snippet.file }}</span>
              <button
                type="button"
                class="code-copy t-label"
                :data-copied="copied || undefined"
                :aria-label="t('home.developers.copy')"
                @click="copy(snippet.code)"
              >
                <span class="code-copy-icons" aria-hidden="true">
                  <KcqIcon name="copy" class="code-copy-idle" />
                  <KcqIcon name="check" class="code-copy-done" />
                </span>
              </button>
              <span class="visually-hidden" aria-live="polite">{{ copied && active === index ? t("home.developers.copied") : "" }}</span>
            </div>
            <!-- Build-time Shiki output of our own snippet source (no user input). -->
            <pre class="code" tabindex="0" translate="no"><code v-html="highlighted.get(snippet.id)" /></pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
/* Token colours: only pairs that hold AA on the window ground (ink, ink-2, accent text). */
.code-window {
  --shiki-foreground: var(--kcq-ink);
  --shiki-background: transparent;
  --shiki-token-keyword: var(--kcq-accent-ink);
  --shiki-token-constant: var(--kcq-accent-ink);
  --shiki-token-string: var(--kcq-ink-soft);
  --shiki-token-string-expression: var(--kcq-ink-soft);
  --shiki-token-comment: var(--kcq-ink-2);
  --shiki-token-function: var(--kcq-ink);
  --shiki-token-parameter: var(--kcq-ink);
  --shiki-token-punctuation: var(--kcq-ink-2);
  --shiki-token-link: var(--kcq-accent-ink);
  min-width: 0;
  max-width: 56rem;
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-lg);
  overflow: hidden;
}
.code-tabs {
  position: relative;
  display: flex;
  overflow-x: auto;
  padding-inline: var(--klc-space-8);
  border-bottom: 1px solid var(--kcq-rule);
  scrollbar-width: none;
}
.code-tab {
  flex: none;
  /* Flush against the tab strip's scroll edge: the ring draws inside. */
  outline-offset: -2px;
  border-radius: var(--klc-radius-sm) var(--klc-radius-sm) 0 0;
  min-height: var(--klc-density-touch);
  padding-inline: var(--klc-space-12);
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition-property: color, border-color;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .code-tab:hover {
    color: var(--kcq-ink);
  }
}
.code-tab[aria-selected="true"] {
  color: var(--kcq-ink);
}
.code-tabs:not([data-indicator]) .code-tab[aria-selected="true"] {
  border-bottom-color: var(--kcq-accent);
}
.code-tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 1px;
  height: 2px;
  background: var(--kcq-accent);
  transform: translateX(var(--x)) scaleX(var(--w));
  transform-origin: left center;
  transition: transform var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
  pointer-events: none;
}
.code-panels {
  display: grid;
}
.code-panel {
  grid-area: 1 / 1;
  min-width: 0;
}
.code-panel:not([data-active]) {
  visibility: hidden;
}
.code-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--klc-space-4) var(--klc-space-4) var(--klc-space-4) var(--klc-space-16);
}
.code-file {
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  color: var(--kcq-ink-2);
}
.code-copy {
  display: inline-grid;
  place-items: center;
  width: var(--klc-density-comfortable);
  height: var(--klc-density-comfortable);
  padding: 0;
  border: 0;
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition-property: transform, color, background-color;
  transition-duration: var(--klc-motion-dur-press);
  transition-timing-function: var(--klc-motion-ease-out);
}
.code-copy[data-copied] {
  color: var(--kcq-ink);
}
.code-copy:active {
  transform: scale(var(--kcq-press-icon));
}
@media (hover: hover) and (pointer: fine) {
  .code-copy:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
.code-copy-icons {
  display: inline-grid;
}
.code-copy-icons > * {
  grid-area: 1 / 1;
  transition-property: opacity, filter, transform;
  transition-duration: 130ms;
  transition-timing-function: var(--klc-motion-ease-out);
}
.code-copy-done {
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.6);
  color: var(--kcq-ink);
}
[data-copied] .code-copy-idle {
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.98);
}
/* The check lands on the spring (300 / 30): the one tactile beat of a successful copy. */
[data-copied] .code-copy-done {
  opacity: 1;
  filter: none;
  transform: none;
  transition-duration: 130ms, 130ms, var(--kcq-spring-duration);
  transition-timing-function: var(--klc-motion-ease-out), var(--klc-motion-ease-out), var(--kcq-ease-spring);
}
/* Long lines scroll inside the pane only; the page never scrolls sideways. */
.code {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--kcq-rule-strong) transparent;
  outline-offset: -2px;
  border-radius: 0 0 var(--klc-radius-lg) var(--klc-radius-lg);
  padding: var(--klc-space-4) var(--klc-space-16) var(--klc-space-24) 0;
  font-size: var(--klc-text-copy-14-font-size);
  line-height: 22px;
  color: var(--kcq-ink);
  tab-size: 2;
  counter-reset: line;
}
/* Line numbers in the gutter, not in the copied text (research G1). */
.code :deep(.line) {
  counter-increment: line;
}
.code :deep(.line)::before {
  content: counter(line);
  display: inline-block;
  width: var(--klc-space-48);
  padding-right: var(--klc-space-16);
  text-align: right;
  color: var(--kcq-ink-2);
  opacity: 0.6;
  user-select: none;
}
@media (prefers-reduced-motion: reduce) {
  .code-copy-icons > * {
    filter: none !important;
    transform: none !important;
  }
}
</style>
