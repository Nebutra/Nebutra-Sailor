<!--
  For developers (landing-benchmark §6.7, Resend/Vercel code-first): Vue · React · Web Component ·
  Agent tools, then the architecture in one line. Tabs follow the WAI-ARIA tabs pattern; keyboard
  switching is instant (CP 31: keyboard actions are not animated).
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { SNIPPETS } from "./developer-snippets";

const { t } = useI18n();
const active = ref(0);
const copied = ref(false);
const tabs = ref<HTMLButtonElement[]>([]);
let timer = 0;

function onKey(event: KeyboardEvent) {
  const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  const target =
    event.key === "Home" ? 0 : event.key === "End" ? SNIPPETS.length - 1 : delta ? (active.value + delta + SNIPPETS.length) % SNIPPETS.length : -1;
  if (target < 0) return;
  event.preventDefault();
  active.value = target;
  tabs.value[target]?.focus();
}
async function copy() {
  try {
    await navigator.clipboard.writeText(SNIPPETS[active.value]!.code);
    copied.value = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (copied.value = false), 1600);
  } catch {
    // Clipboard denied: the code stays selectable.
  }
}
onBeforeUnmount(() => window.clearTimeout(timer));
</script>
<template>
  <section id="developers" class="section" aria-labelledby="developers-heading">
    <div class="container developers-grid">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">06</span>{{ t("home.developers.eyebrow") }}</p>
      <div class="section-head developers-head">
        <h2 id="developers-heading" class="t-heading">{{ t("home.developers.heading") }}</h2>
        <p class="t-lede">{{ t("home.developers.body") }}</p>
        <p class="architecture t-meta" translate="no">
          <span>ChartController</span><span aria-hidden="true">→</span><span>readonly signals</span><span aria-hidden="true">→</span><span>StateKernel</span>
        </p>
        <ul class="developer-links">
          <li><a :href="`${facts.upstream}#readme`" rel="noopener">{{ t("home.developers.readme") }}</a></li>
          <li>
            <a :href="`${facts.upstream}/blob/main/docs/architecture/architecture.md`" rel="noopener">{{ t("home.developers.architecture") }}</a>
          </li>
          <li>
            <a href="https://www.npmjs.com/package/@363045841yyt/klinechart" rel="noopener">{{ t("home.developers.npm") }}</a>
          </li>
        </ul>
      </div>
      <div class="code-card">
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
            <span class="t-meta" translate="no">{{ snippet.file }}</span>
            <button type="button" class="code-copy" :aria-label="copied ? t('home.developers.copied') : t('home.developers.copy')" @click="copy">
              <KcqIcon :name="copied && active === index ? 'check' : 'copy'" />
            </button>
          </div>
          <pre tabindex="0" translate="no"><code>{{ snippet.code }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.developers-grid {
  display: grid;
  --row-gap: var(--klc-space-48);
  gap: var(--row-gap) var(--kcq-column-gap);
}
.architecture {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8);
  text-transform: none;
  color: var(--kcq-ink);
}
.architecture span[aria-hidden] {
  color: var(--kcq-ink-2);
}
.developer-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8) var(--klc-space-24);
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
}
.code-card {
  min-width: 0;
  border: 1px solid var(--kcq-rule);
  background: var(--kcq-surface);
}
.code-tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--kcq-rule);
}
.code-tab {
  flex: none;
  min-height: var(--klc-density-touch);
  padding-inline: var(--klc-space-16);
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
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
  border-bottom: 1px solid var(--kcq-rule);
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
}
@media (hover: hover) and (pointer: fine) {
  .code-copy:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
pre {
  overflow-x: auto;
  padding: var(--klc-space-16);
  font-size: var(--klc-text-13-font-size);
  line-height: 20px;
  color: var(--kcq-ink);
  tab-size: 2;
}
@media (min-width: 1024px) {
  .developers-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .developers-head {
    grid-column: 1 / span 5;
  }
  .code-card {
    grid-column: 6 / span 7;
  }
}
</style>
