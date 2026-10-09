<!--
  03 Agent = user, the signature section (landing-benchmark §6.3; research §3 Agent; design §6:
  the dot-matrix KCQ glyph is the agent's field, not Vercel's 10-dot mark). An inverted band that
  opens on one big line (research A3), then a console: the transcript streams call by call, the
  pending call shimmers (C3) until it resolves, each call carries its registry safety level (L4),
  and the chart beside it changes as each call lands. A Bar-Replay-style scrubber (TradingView's own
  metaphor) plays, pauses, steps and seeks; any manual move takes over from playback (K3).
  It is a scripted replay and says so: the tool names and inputs are real registry entries at the
  pinned commit (virtual:kcq-facts), the drawing colour is the brand token, and the chart draws
  real closes. The section CTA copies a prompt for your own agent (G3) and links the agent view.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import presets from "virtual:kcq-presets";
import { useClipboard } from "@vueuse/core";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { glyphDots } from "../brand/glyph";
import KcqIcon from "../components/kcq-icon.vue";
import AgentChart from "./agent/agent-chart.vue";
import { useProvideReplay } from "./agent/replay";
import { CACHED_BARS } from "./hero/bars";
import { type AgentStory, createAgentStory } from "./motion/agent-story";

const { t, tm, rt } = useI18n();

const lastClose = CACHED_BARS.at(-1)?.close ?? 0;

/** Every name must exist in the registry; developer-snippets.test.ts checks them against the source. */
const CALLS = [
  { tool: "panes_list", input: {} },
  {
    tool: "drawing_create",
    input: { kind: "horizontal-line", paneId: "main", anchors: [{ price: lastClose }], style: { stroke: presets.pro.light.accent } },
  },
  { tool: "instruments_query_name", input: { symbol: "000300" } },
  { tool: "comparison_create", input: { symbol: "000300", source: "gotdx", assetClass: "index" } },
] as const;
const registered = new Set(facts.tools.names);
const calls = CALLS.filter((call) => registered.has(call.tool)).map((call) => ({
  ...call,
  safety: facts.tools.safety[call.tool]!,
}));

const replay = useProvideReplay(calls.length);
const { step, playing, running, speed } = replay;

/**
 * Chapters of the story, one per detail line of the deck (panes → drawing → comparison), each the
 * replay step it ends on; the prompt above them is the problem. Desktop: the scroll position scrubs through them while the console is
 * pinned (motion/agent-story.ts). Elsewhere: they are tap-through steps. No autoplay anywhere.
 */
const CHAPTER_STEPS = [1, 2, 4].map((value) => Math.min(value, calls.length));
const chapter = computed(() => {
  let current = 0;
  CHAPTER_STEPS.forEach((value, index) => {
    if (step.value >= value) current = index;
  });
  return current;
});
const storyActive = ref(false);
const pinned = ref<HTMLElement>();
let story: AgentStory | undefined;
let disposed = false;
onMounted(async () => {
  const created = await createAgentStory(pinned.value!, {
    header: 64,
    onEnable: (active) => {
      storyActive.value = active;
      if (!active) replay.seek(calls.length);
    },
    onProgress: (progress) => replay.scrub(progress),
  }).catch(() => undefined);
  if (disposed) created?.revert();
  else story = created;
});
onBeforeUnmount(() => {
  disposed = true;
  story?.revert();
});

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

const progress = computed(() => t("home.agent.progress", { done: step.value, total: calls.length }));
const state = (index: number) => (index < step.value ? "done" : index === running.value ? "running" : "queued");
const format = (input: object) => JSON.stringify(input);
/** Example prompts copy on press: paste them into the workstation's agent (deck 5.2 chips). */
const { copy, copied, text: copiedText } = useClipboard({ copiedDuring: 1600, legacy: true });
</script>
<template>
  <section id="agent" class="band band-inverted agent" data-theme="dark" aria-labelledby="agent-heading">
    <div class="container">
      <h2 id="agent-heading" class="t-statement agent-statement">{{ t("home.agent.heading") }}</h2>
      <p class="t-lede agent-lede">{{ t("home.agent.body") }}</p>

      <ul class="chips" :aria-label="t('home.agent.chipsLabel')">
        <li v-for="(chip, index) in (tm('home.agent.chips') as unknown as string[])" :key="index">
          <button type="button" class="chip" :data-copied="(copied && copiedText === rt(chip)) || undefined" @click="copy(rt(chip))">
            <KcqIcon name="prompt" :size="14" />
            <span>{{ rt(chip) }}</span>
          </button>
        </li>
      </ul>
      <p class="visually-hidden" aria-live="polite">{{ copied ? t("home.agent.chipCopied") : "" }}</p>

      <div ref="pinned" class="agent-grid" :data-story="storyActive || undefined">
        <div class="agent-copy">
          <ol class="chapters">
            <li v-for="(detail, index) in (tm('home.agent.details') as unknown as string[])" :key="index">
              <button
                type="button"
                class="chapter"
                :aria-current="chapter === index ? 'step' : undefined"
                @click="replay.seek(CHAPTER_STEPS[index]!)"
              >
                <span class="chapter-index t-num">{{ index + 1 }}</span>
                <span class="chapter-title t-title">{{ rt(detail) }}</span>
              </button>
            </li>
          </ol>
        </div>

        <div class="agent-console" :data-playing="playing || undefined">
          <div class="console-bar">
            <span class="t-meta">{{ t("home.agent.console") }}</span>
            <svg class="console-glyph" :viewBox="`0 0 ${COLUMNS} ${ROWS}`" role="img" :aria-label="`${t('home.agent.fieldLabel')} ${progress}`">
              <defs>
                <pattern id="agent-ground" width="1" height="1" patternUnits="userSpaceOnUse">
                  <circle class="glyph-dot" cx="0.5" cy="0.5" r="0.16" />
                </pattern>
              </defs>
              <rect :width="COLUMNS" :height="ROWS" fill="url(#agent-ground)" />
              <path
                v-for="(band, index) in bands"
                :key="index"
                :d="band"
                :class="['glyph-dot', index < step ? 'is-lit' : 'is-mark']"
              />
            </svg>
          </div>
          <div class="console-body">
            <div class="transcript">
              <p class="transcript-prompt">
                <span class="t-meta">{{ t("home.agent.you") }}</span>
                <span>{{ t("home.agent.prompt") }}</span>
              </p>
              <ol class="transcript-calls" aria-live="polite">
                <li
                  v-for="(call, index) in calls"
                  :key="call.tool"
                  class="call"
                  :data-state="state(index)"
                >
                  <span class="call-mark" aria-hidden="true">
                    <KcqIcon v-if="state(index) === 'done'" name="check" :size="14" />
                  </span>
                  <span class="call-head">
                    <code class="call-name" translate="no">{{ call.tool }}</code>
                    <span class="call-safety t-meta" :data-safety="call.safety">{{ t(`home.agent.safety.${call.safety}`) }}</span>
                  </span>
                  <code class="call-input" translate="no">{{ format(call.input) }}</code>
                  <span class="call-result t-copy">
                    <span v-if="state(index) === 'running'" class="shimmer">{{ t("home.agent.running") }}</span>
                    <template v-else>{{ t("home.agent.returns", { result: rt(tm("home.agent.results")[index]!) }) }}</template>
                  </span>
                </li>
              </ol>
            </div>
            <AgentChart class="console-chart" />
          </div>
          <div class="scrubber" role="group" :aria-label="t('home.agent.scrub')">
            <button type="button" class="scrub-button" :aria-label="t('home.agent.back')" :disabled="step === 0" @click="replay.seek(step - 1)">
              <KcqIcon name="step-back" :size="14" />
            </button>
            <button
              type="button"
              class="scrub-button scrub-play"
              :aria-label="playing ? t('home.agent.pause') : step >= calls.length ? t('home.agent.replay') : t('home.agent.play')"
              @click="replay.toggle()"
            >
              <KcqIcon :name="playing ? 'pause' : step >= calls.length ? 'replay' : 'play'" :size="14" />
            </button>
            <button type="button" class="scrub-button" :aria-label="t('home.agent.forward')" :disabled="step >= calls.length" @click="replay.seek(step + 1)">
              <KcqIcon name="step-forward" :size="14" />
            </button>
            <ol class="scrub-track">
              <li v-for="index in calls.length" :key="index">
                <button
                  type="button"
                  class="scrub-tick"
                  :data-done="index <= step || undefined"
                  :aria-label="t('home.agent.step', { step: index, total: calls.length })"
                  :aria-current="index === step ? 'step' : undefined"
                  @click="replay.seek(index)"
                />
              </li>
            </ol>
            <button type="button" class="scrub-button scrub-speed t-num" :aria-label="t('home.agent.speed')" @click="replay.cycleSpeed()">
              {{ speed }}×
            </button>
          </div>
          <p class="console-note t-copy">{{ t("home.agent.note", { commit: facts.commit.slice(0, 8) }) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.agent-statement {
  max-width: 16ch;
  font-size: var(--klc-text-48-font-size);
  line-height: var(--klc-text-48-line-height);
  letter-spacing: -0.035em;
}
@media (min-width: 1024px) {
  .agent-statement {
    font-size: var(--klc-text-72-font-size);
    line-height: var(--klc-text-72-line-height);
  }
}
.agent-lede {
  max-width: 40rem;
  margin: var(--klc-space-24) 0 var(--klc-space-32);
}
.agent-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
}
.agent-copy {
  display: grid;
  align-content: start;
  gap: var(--klc-space-32);
}
/* Chapters: a progress rail on the left, like a time axis; the current one reads in full ink. */
.chapters {
  display: grid;
  border-left: 1px solid var(--kcq-rule);
}
.chapter {
  position: relative;
  display: grid;
  grid-template-columns: var(--klc-space-24) minmax(0, 1fr);
  gap: var(--klc-space-4) var(--klc-space-8);
  width: 100%;
  padding: var(--klc-space-12) 0 var(--klc-space-12) var(--klc-space-16);
  border: 0;
  background: transparent;
  color: var(--kcq-ink-2);
  text-align: left;
  cursor: pointer;
  transition: color var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.chapter::before {
  content: "";
  position: absolute;
  left: -1px;
  top: var(--klc-space-12);
  bottom: var(--klc-space-12);
  width: 2px;
  background: var(--kcq-accent);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
.chapter[aria-current="step"] {
  color: var(--kcq-ink);
}
.chapter[aria-current="step"]::before {
  transform: scaleY(1);
}
@media (hover: hover) and (pointer: fine) {
  .chapter:hover {
    color: var(--kcq-ink);
  }
}
.chapter-index {
  grid-row: 1 / span 2;
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-20-line-height);
}
.chapter-title {
  color: inherit;
}
/* Example prompts as chips (deck 5.2): press to copy, the chip confirms in place. */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-8);
  margin-bottom: var(--klc-space-48);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  min-height: var(--klc-density-comfortable);
  padding-inline: var(--klc-space-12) var(--klc-space-16);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
  background: var(--kcq-surface);
  color: var(--kcq-ink);
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  text-align: left;
  cursor: copy;
  transition:
    border-color var(--klc-motion-dur-fast) var(--klc-motion-ease-out),
    transform var(--klc-motion-dur-press) var(--klc-motion-ease-out);
}
.chip .kcq-icon {
  color: var(--kcq-accent-text);
}
.chip:active {
  transform: scale(0.97);
}
.chip[data-copied] {
  border-color: var(--kcq-up);
}
@media (hover: hover) and (pointer: fine) {
  .chip:hover {
    border-color: var(--kcq-accent);
  }
}
/* The console: the one framed surface in this band, because it is a product window. */
.agent-console {
  display: grid;
  min-width: 0;
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-md);
  background: var(--kcq-page);
  overflow: hidden;
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--kcq-accent) 10%, transparent), var(--klc-elevation-3);
}
.console-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--klc-space-8) var(--klc-space-12) var(--klc-space-8) var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
}
.console-glyph {
  width: var(--klc-space-32);
  height: var(--klc-space-32);
}
.glyph-dot {
  fill: var(--kcq-rule);
  transition: fill var(--klc-motion-dur-slow) var(--klc-motion-ease-out);
}
.glyph-dot.is-mark {
  fill: var(--kcq-rule-strong);
}
.glyph-dot.is-lit {
  fill: var(--kcq-accent);
}
.console-body {
  display: grid;
}
.transcript {
  display: grid;
  align-content: start;
  border-bottom: 1px solid var(--kcq-rule);
}
.transcript-prompt {
  display: grid;
  gap: var(--klc-space-4);
  padding: var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
}
.call {
  display: grid;
  grid-template-columns: var(--klc-space-16) minmax(0, 1fr);
  gap: var(--klc-space-4) var(--klc-space-8);
  padding: var(--klc-space-12) var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
  transition: opacity var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.call:last-child {
  border-bottom: 0;
}
.call > :not(.call-mark) {
  grid-column: 2;
}
.call[data-state="queued"] {
  opacity: 0.35;
}
.call-mark {
  grid-row: 1;
  display: grid;
  place-items: center;
  width: var(--klc-space-16);
  height: var(--klc-space-16);
  margin-top: 1px;
  border: 1.5px solid var(--kcq-rule-strong);
  border-radius: var(--klc-radius-full);
  color: var(--kcq-up);
}
.call[data-state="done"] .call-mark {
  border-color: transparent;
}
.call[data-state="running"] .call-mark {
  border-color: var(--kcq-accent);
  border-top-color: transparent;
  animation: spin 900ms linear infinite;
}
@keyframes spin {
  to {
    rotate: 1turn;
  }
}
.call-head {
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--klc-space-8);
}
.call-name {
  font-size: var(--klc-text-13-font-size);
  line-height: var(--klc-text-13-line-height);
  color: var(--kcq-ink);
}
.call-safety {
  padding: 0 var(--klc-space-4);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-xs);
  font-size: var(--klc-text-11-mono-font-size);
  text-transform: none;
}
.call-safety[data-safety="read-only"] {
  color: var(--kcq-accent-text);
  border-color: color-mix(in oklab, var(--kcq-accent) 40%, transparent);
}
.call-input {
  overflow-wrap: anywhere;
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  color: var(--kcq-ink-2);
}
/* "Working" without a spinner on the words: a gradient sweeps the label (research C3). */
.shimmer {
  color: transparent;
  background: linear-gradient(
      90deg,
      var(--kcq-ink-2) 0%,
      var(--kcq-ink-2) 40%,
      var(--kcq-ink) 50%,
      var(--kcq-ink-2) 60%,
      var(--kcq-ink-2) 100%
    )
    0 0 / 300% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  animation: shimmer 1.6s linear infinite;
}
@keyframes shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0 0;
  }
}
.console-chart {
  border-bottom: 1px solid var(--kcq-rule);
}
.scrubber {
  display: flex;
  align-items: center;
  gap: var(--klc-space-4);
  padding: var(--klc-space-8) var(--klc-space-12);
  border-bottom: 1px solid var(--kcq-rule);
}
.scrub-button {
  display: inline-grid;
  place-items: center;
  min-width: var(--klc-density-default);
  height: var(--klc-density-default);
  padding: 0 var(--klc-space-4);
  border: 0;
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink);
  cursor: pointer;
  transition: transform var(--klc-motion-dur-press) var(--klc-motion-ease-out);
}
.scrub-button:active {
  transform: scale(0.97);
}
.scrub-button:disabled {
  color: var(--kcq-ink-2);
  opacity: 0.5;
  cursor: default;
}
.scrub-play {
  background: var(--kcq-control);
}
@media (hover: hover) and (pointer: fine) {
  .scrub-button:not(:disabled):hover {
    background: var(--kcq-hover);
  }
}
.scrub-speed {
  font-size: var(--klc-text-12-font-size);
}
.scrub-track {
  display: flex;
  flex: 1;
  gap: var(--klc-space-4);
  margin-inline: var(--klc-space-8);
}
.scrub-track li {
  flex: 1;
}
.scrub-tick {
  display: block;
  width: 100%;
  height: var(--klc-density-default);
  padding: 0;
  border: 0;
  background: linear-gradient(var(--kcq-rule-strong), var(--kcq-rule-strong)) center / 100% 3px no-repeat;
  cursor: pointer;
}
.scrub-tick[data-done] {
  background-image: linear-gradient(var(--kcq-accent), var(--kcq-accent));
}
@media (pointer: coarse) {
  .scrub-button,
  .scrub-tick {
    height: var(--klc-density-hit-target-touch);
  }
}
.console-note {
  padding: var(--klc-space-12) var(--klc-space-16);
}
@media (min-width: 768px) {
  .console-body {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  }
  .transcript {
    border-bottom: 0;
    border-right: 1px solid var(--kcq-rule);
  }
  .console-body {
    background: var(--klc-color-chart-background);
  }
  .transcript {
    background: var(--kcq-page);
  }
  .console-chart {
    align-self: center;
    border-bottom: 0;
  }
}
@media (min-width: 1024px) {
  .agent-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .agent-copy {
    grid-column: 1 / span 4;
  }
  .agent-console {
    grid-column: 5 / span 8;
    align-self: start;
  }
}
@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
    color: var(--kcq-ink-2);
    background: none;
  }
  .call[data-state="running"] .call-mark {
    animation: none;
  }
}
</style>
