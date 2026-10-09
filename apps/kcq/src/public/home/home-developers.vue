<!--
  06 Developers (landing-benchmark §6.7; research G1, G2, G4). The snippets are highlighted by
  Shiki at build time (virtual:kcq-code, scripts/landing-plugin.mjs): spans carry
  `var(--shiki-token-*)`, mapped below onto KCQ tokens, so code follows the colour mode and the page
  ships no highlighter. Tabs follow the WAI-ARIA tabs pattern; keyboard switching is instant
  (CP 31). Copy confirms in place (VueUse useClipboard; icon morphs, label announced).
-->
<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import code from "virtual:kcq-code";
import { ref } from "vue";
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
    <div class="container developers-grid">
      <div class="section-head developers-head">
        <h2 id="developers-heading" class="t-heading">{{ t("home.developers.heading") }}</h2>
        <p class="t-lede">{{ t("home.developers.body") }}</p>
        <a class="developer-link" :href="LINKS.readme" rel="noopener">
          {{ t("home.developers.readme") }}
          <KcqIcon class="button-arrow" name="arrow" />
        </a>
      </div>
      <div class="code-window">
        <div class="code-tabs" role="tablist" :aria-label="t('home.developers.tabs')" @keydown="onKey">
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
        </div>
        <div
          v-for="(snippet, index) in SNIPPETS"
          v-show="active === index"
          :id="`panel-${snippet.id}`"
          :key="snippet.id"
          role="tabpanel"
          :aria-labelledby="`tab-${snippet.id}`"
          class="code-panel"
        >
          <div class="code-bar">
            <span class="t-meta code-file" translate="no">{{ snippet.file }}</span>
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
  </section>
</template>
<style scoped>
.developers-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
}
.developer-link {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: var(--klc-space-8);
  min-height: var(--klc-density-comfortable);
  font-size: var(--klc-text-label-14-font-size);
  font-weight: var(--klc-text-label-14-font-weight);
  text-decoration: none;
}
/* Token colours: only pairs that hold AA on the window ground (ink, ink-2, accent text). */
.code-window {
  --shiki-foreground: var(--kcq-ink);
  --shiki-background: transparent;
  --shiki-token-keyword: var(--kcq-accent-text);
  --shiki-token-constant: var(--kcq-accent-text);
  --shiki-token-string: color-mix(in oklab, var(--kcq-up) 45%, var(--kcq-ink));
  --shiki-token-string-expression: color-mix(in oklab, var(--kcq-up) 45%, var(--kcq-ink));
  --shiki-token-comment: var(--kcq-ink-2);
  --shiki-token-function: var(--kcq-ink);
  --shiki-token-parameter: var(--kcq-ink);
  --shiki-token-punctuation: var(--kcq-ink-2);
  --shiki-token-link: var(--kcq-accent-text);
  min-width: 0;
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-lg);
  background: var(--kcq-raised);
  overflow: hidden;
  box-shadow: var(--klc-elevation-2);
}
.code-tabs {
  display: flex;
  overflow-x: auto;
  padding-inline: var(--klc-space-8);
  border-bottom: 1px solid var(--kcq-rule);
  scrollbar-width: none;
}
.code-tab {
  flex: none;
  min-height: var(--klc-density-touch);
  padding-inline: var(--klc-space-12);
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition: color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .code-tab:hover {
    color: var(--kcq-ink);
  }
}
.code-tab[aria-selected="true"] {
  color: var(--kcq-ink);
  border-bottom-color: var(--kcq-accent);
}
.code-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--klc-space-4) var(--klc-space-4) var(--klc-space-4) var(--klc-space-16);
}
.code-file {
  text-transform: none;
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
  transition: transform var(--klc-motion-dur-press) var(--klc-motion-ease-out);
}
.code-copy:active {
  transform: scale(0.97);
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
  transform: scale(0.98);
  color: var(--kcq-up);
}
[data-copied] .code-copy-idle {
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.98);
}
[data-copied] .code-copy-done {
  opacity: 1;
  filter: none;
  transform: none;
}
.code {
  overflow-x: auto;
  padding: var(--klc-space-4) var(--klc-space-16) var(--klc-space-24) 0;
  font-size: var(--klc-text-13-font-size);
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
@media (min-width: 1024px) {
  .developers-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: center;
  }
  .developers-head {
    grid-column: 1 / span 5;
  }
  .code-window {
    grid-column: 6 / span 7;
  }
}
@media (prefers-reduced-motion: reduce) {
  .code-copy-icons > * {
    filter: none !important;
    transform: none !important;
  }
}
</style>
