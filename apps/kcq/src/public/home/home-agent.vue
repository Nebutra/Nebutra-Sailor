<!--
  Agent = user, the signature section (landing-benchmark §6.3; design §6: the dot-matrix KCQ
  glyph is the agent's field, not Vercel's 10-dot mark). A scripted replay, labelled as one: the
  tool names and inputs are real registry entries at the pinned commit (virtual:kcq-facts), and
  the last close comes from the hero's bars. Each completed call lights one band of the glyph.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { glyphDots } from "../brand/glyph";
import KcqIcon from "../components/kcq-icon.vue";
import { CACHED_BARS } from "./hero/bars";

const { t, tm, rt } = useI18n();
const lastClose = CACHED_BARS.at(-1)?.close ?? 0;

/** Every name must exist in the registry; agent-replay.test.ts checks them against the source. */
const CALLS = [
  { tool: "panes_list", input: {} },
  { tool: "instruments_query_name", input: { symbol: "000300" } },
  { tool: "comparison_create", input: { symbol: "000300", source: "gotdx", assetClass: "index" } },
  {
    tool: "drawing_create",
    input: { kind: "horizontal-line", paneId: "main", anchors: [{ price: lastClose }], style: { stroke: "#4A90D9" } },
  },
] as const;
const registered = new Set(facts.tools.names);
const calls = CALLS.filter((call) => registered.has(call.tool));

const COLUMNS = 21;
const ROWS = 21;
const dots = glyphDots(COLUMNS, ROWS, 16, calls.length);
/** One path per group keeps the prerendered field small: a dot is a closed two-arc circle. */
const circles = (list: typeof dots, r: number) =>
  list
    .map((dot) => `M${(dot.column + 0.5 - r).toFixed(2)} ${dot.row + 0.5}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`)
    .join("");
const bands = calls.map((_, band) =>
  circles(
    dots.filter((dot) => dot.onGlyph && dot.band === band),
    0.34,
  ),
);
const done = ref(calls.length);
const section = ref<HTMLElement>();
let timer = 0;
let observer: IntersectionObserver | undefined;

const progress = computed(() => t("home.agent.progress", { done: done.value, total: calls.length }));

function play() {
  window.clearInterval(timer);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    done.value = calls.length;
    return;
  }
  done.value = 0;
  timer = window.setInterval(() => {
    done.value += 1;
    if (done.value >= calls.length) window.clearInterval(timer);
  }, 900);
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      play();
    },
    { threshold: 0.4 },
  );
  if (section.value) observer.observe(section.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.clearInterval(timer);
});

const format = (input: object) => JSON.stringify(input);
</script>
<template>
  <section id="agent" ref="section" class="section" aria-labelledby="agent-heading">
    <div class="container agent-grid">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">02</span>{{ t("home.agent.eyebrow") }}</p>
      <div class="section-head agent-head">
        <h2 id="agent-heading" class="t-heading">{{ t("home.agent.heading") }}</h2>
        <p class="t-lede">{{ t("home.agent.body") }}</p>
        <ul class="agent-points">
          <li v-for="(point, index) in tm('home.agent.points')" :key="index" class="t-copy">
            {{ rt(point, { tools: facts.tools.count, kinds: facts.drawingKinds.count }) }}
          </li>
        </ul>
      </div>

      <div class="agent-stage">
        <figure class="agent-transcript">
          <figcaption class="agent-transcript-head">
            <span class="t-meta">{{ t("home.agent.transcript") }}</span>
            <button type="button" class="button button-quiet agent-replay" @click="play">
              <KcqIcon name="replay" />
              {{ t("home.agent.replay") }}
            </button>
          </figcaption>
          <p class="agent-prompt">
            <span class="t-meta">{{ t("home.agent.you") }}</span>
            <span>{{ t("home.agent.prompt") }}</span>
          </p>
          <ol class="agent-calls">
            <li
              v-for="(call, index) in calls"
              :key="call.tool"
              class="agent-call"
              :data-state="index < done ? 'done' : index === done ? 'running' : 'queued'"
            >
              <code class="agent-call-name" translate="no">{{ call.tool }}</code>
              <code class="agent-call-input" translate="no">{{ format(call.input) }}</code>
              <span class="t-copy agent-call-result">
                {{ t("home.agent.returns", { result: rt(tm("home.agent.results")[index]!) }) }}
              </span>
            </li>
          </ol>
          <p class="t-copy agent-note">{{ t("home.agent.transcriptNote", { commit: facts.commit.slice(0, 8) }) }}</p>
        </figure>

        <figure class="agent-field">
          <svg
            :viewBox="`0 0 ${COLUMNS} ${ROWS}`"
            role="img"
            :aria-label="`${t('home.agent.fieldLabel')} ${progress}`"
          >
            <defs>
              <pattern id="agent-ground" width="1" height="1" patternUnits="userSpaceOnUse">
                <circle class="agent-dot" cx="0.5" cy="0.5" r="0.16" />
              </pattern>
            </defs>
            <rect :width="COLUMNS" :height="ROWS" fill="url(#agent-ground)" />
            <path
              v-for="(band, index) in bands"
              :key="index"
              :d="band"
              :class="['agent-dot', index < done ? 'is-lit' : 'is-mark']"
            />
          </svg>
          <figcaption class="t-meta t-num agent-progress" aria-live="polite">{{ progress }}</figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
<style scoped>
.agent-grid {
  display: grid;
  --row-gap: var(--klc-space-48);
  gap: var(--row-gap);
}
.agent-points {
  display: grid;
  gap: var(--klc-space-8);
  padding-top: var(--klc-space-8);
}
.agent-points li {
  padding-left: var(--klc-space-16);
  position: relative;
}
.agent-points li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.6em;
  width: var(--klc-space-8);
  height: 1px;
  background: var(--kcq-rule-strong);
}
.agent-stage {
  display: grid;
  gap: var(--kcq-column-gap);
}
.agent-transcript,
.agent-field {
  margin: 0;
  border: 1px solid var(--kcq-rule);
  background: var(--kcq-surface);
}
.agent-transcript {
  display: grid;
  align-content: start;
}
.agent-transcript-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--klc-space-12);
  padding: var(--klc-space-8) var(--klc-space-8) var(--klc-space-8) var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
}
.agent-replay {
  min-height: var(--klc-density-default);
  padding-inline: var(--klc-space-12);
}
.agent-prompt {
  display: grid;
  gap: var(--klc-space-4);
  padding: var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
}
.agent-calls {
  display: grid;
}
.agent-call {
  display: grid;
  gap: var(--klc-space-4);
  padding: var(--klc-space-12) var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
  transition: opacity var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.agent-call[data-state="queued"] {
  opacity: 0.4;
}
.agent-call-name {
  font-size: var(--klc-text-13-font-size);
  line-height: var(--klc-text-13-line-height);
  color: var(--kcq-ink);
}
.agent-call[data-state="done"] .agent-call-name::before {
  content: "✓ ";
  color: var(--kcq-accent-text);
}
.agent-call-input {
  overflow-wrap: anywhere;
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  color: var(--kcq-ink-2);
}
.agent-note {
  padding: var(--klc-space-12) var(--klc-space-16);
}
.agent-field {
  display: grid;
  place-items: center;
  gap: var(--klc-space-12);
  padding: var(--klc-space-24);
}
.agent-field svg {
  width: min(100%, 22rem);
  height: auto;
}
.agent-dot {
  fill: var(--kcq-rule);
  transition: fill var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
.agent-dot.is-mark {
  fill: var(--kcq-rule-strong);
}
.agent-dot.is-lit {
  fill: var(--kcq-accent);
}
@media (min-width: 1024px) {
  .agent-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    --row-gap: var(--kcq-column-gap);
    gap: var(--row-gap) var(--kcq-column-gap);
  }
  .agent-head {
    grid-column: 1 / span 5;
    align-self: start;
  }
  .agent-stage {
    grid-column: 6 / span 7;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }
}
</style>
