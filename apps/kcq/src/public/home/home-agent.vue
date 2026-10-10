<!--
  Agent (deck 5.2; restraint benchmark §4 row 2). The section grammar: heading, sub, then one framed
  artifact, the agent's window, kept on the fixed dark chart surface in both page themes. Beside it
  the deck's three details as a plain numbered list. At rest (no script, reduced motion, touch,
  phones) the whole story is shown finished and stacked; on desktop the scroll types the prompt
  and lands each call as the window rises, then holds it under the header for a short runway
  (motion/agent-story.ts).
  It is a scripted replay and says so: the tool names and inputs are real registry entries at the
  pinned commit (virtual:kcq-facts), the drawing colour is the brand token, and the chart draws real
  closes. The deck's example prompts are the window's own input: press one to copy it. Nothing plays
  on its own; a Bar-Replay-style scrubber plays, pauses, steps and seeks (K3).
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
const track = ref<HTMLElement>();
/** How much of the prompt is typed: the first slice of the story's scroll types it. */
const typed = ref(1);
let story: AgentStory | undefined;
onMounted(() => {
  story = createAgentStory(pinned.value!, {
    track: () => track.value,
    onEnable: (active) => {
      storyActive.value = active;
      typed.value = 1;
      if (!active) replay.seek(calls.length);
    },
    onProgress: (progress) => {
      typed.value = Math.min(1, progress * (calls.length + 1));
      replay.scrub(progress);
    },
  });
});
const promptText = computed(() => t("home.agent.prompt"));
const shownPrompt = computed(() =>
  storyActive.value && step.value === 0 && !playing.value
    ? promptText.value.slice(0, Math.round(promptText.value.length * typed.value))
    : promptText.value,
);
onBeforeUnmount(() => {
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
/** Example prompts copy on press: paste them into the workstation's agent (deck 5.2). */
const { copy, copied, text: copiedText } = useClipboard({ copiedDuring: 1600, legacy: true });
</script>
<template>
  <section id="agent" class="band agent" aria-labelledby="agent-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="agent-heading" class="t-heading">{{ t("home.agent.heading") }}</h2>
        <p class="t-lede">{{ t("home.agent.body") }}</p>
      </div>

      <div ref="track" class="agent-story section-artifact" :data-story="storyActive || undefined">
        <div ref="pinned" class="agent-stage">
          <ol class="chapters">
            <li v-for="(detail, index) in (tm('home.agent.details') as unknown as string[])" :key="index">
              <button
                type="button"
                class="chapter"
                :aria-current="chapter === index ? 'step' : undefined"
                @click="replay.seek(CHAPTER_STEPS[index]!)"
              >
                <span class="chapter-index t-num">{{ index + 1 }}</span>
                <span>{{ rt(detail) }}</span>
              </button>
            </li>
          </ol>

          <div class="agent-console product-frame" data-theme="dark" :data-playing="playing || undefined">
            <div class="console-bar">
              <span class="t-ui">{{ t("home.agent.console") }}</span>
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
                  <span class="t-ui transcript-who">{{ t("home.agent.you") }}</span>
                  <span>
                    <span class="visually-hidden">{{ promptText }}</span>
                    <span aria-hidden="true">{{ shownPrompt }}</span><span
                      v-if="shownPrompt.length < promptText.length"
                      class="caret"
                      aria-hidden="true"
                    /><span class="ghost" aria-hidden="true">{{ promptText.slice(shownPrompt.length) }}</span>
                  </span>
                </p>
                <ol class="transcript-calls" aria-live="polite">
                  <li v-for="(call, index) in calls" :key="call.tool" class="call" :data-state="state(index)">
                    <span class="call-mark" aria-hidden="true">
                      <KcqIcon v-if="state(index) === 'done'" name="check" :size="12" />
                    </span>
                    <span class="call-head">
                      <span class="call-name" translate="no" :title="format(call.input)">{{ call.tool }}</span>
                      <span class="call-safety" :data-safety="call.safety">{{ t(`home.agent.safety.${call.safety}`) }}</span>
                    </span>
                    <span class="call-result">
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
              <button type="button" class="scrub-button scrub-speed t-num" :aria-label="`${t('home.agent.speed')} ${speed}×`" @click="replay.cycleSpeed()">
                {{ speed }}×
              </button>
            </div>
            <!-- The input: the deck's example prompts, ready to paste into the workstation's agent. -->
            <ul class="composer" :aria-label="t('home.agent.chipsLabel')">
              <li v-for="(chip, index) in (tm('home.agent.chips') as unknown as string[])" :key="index">
                <button
                  type="button"
                  class="suggestion"
                  :data-copied="(copied && copiedText === rt(chip)) || undefined"
                  @click="copy(rt(chip))"
                >
                  <KcqIcon name="prompt" :size="12" />
                  <span>{{ rt(chip) }}</span>
                </button>
              </li>
            </ul>
            <p class="visually-hidden" aria-live="polite">{{ copied ? t("home.agent.chipCopied") : "" }}</p>
            <p class="console-note t-ui">{{ t("home.agent.note", { commit: facts.commit.slice(0, 8) }) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
/* Complete at rest: with no script, reduced motion, touch or a short screen, the three details
   and the finished transcript read as one stacked block. The scroll choreography below only
   enhances it (motion/agent-story.ts). */
/* A new formatting context, so the stage's runway margin stays inside the track (the scroll
   distance) instead of collapsing through it. */
.agent-story {
  display: flow-root;
}
.agent-stage {
  display: grid;
  gap: var(--klc-space-32) var(--kcq-column-gap);
}
/* The deck's details: a plain numbered list. The current chapter's number turns Cobalt. */
.chapters {
  display: grid;
  align-content: start;
  gap: var(--klc-space-4);
}
.chapter {
  position: relative;
  display: grid;
  grid-template-columns: var(--klc-space-24) minmax(0, 1fr);
  gap: var(--klc-space-8);
  width: 100%;
  min-height: var(--klc-density-comfortable);
  padding: var(--klc-space-8) 0;
  border: 0;
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink);
  font-size: var(--klc-text-copy-16-font-size);
  line-height: var(--klc-text-copy-16-line-height);
  text-align: left;
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.chapter:active {
  transform: scale(var(--kcq-press));
}
.chapter-index {
  color: var(--kcq-ink-2);
  transition: color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
.chapter[aria-current="step"] .chapter-index {
  color: var(--kcq-accent-text);
}
/* While the scroll drives the story, the other chapters step back to the secondary ink (still
   AA) and a 2px Cobalt rule in the gutter marks the current one. */
.agent-story[data-story] .chapter:not([aria-current="step"]) {
  color: var(--kcq-ink-2);
}
.chapter::before {
  content: "";
  position: absolute;
  top: var(--klc-space-8);
  bottom: var(--klc-space-8);
  left: calc(-1 * var(--klc-space-16));
  width: 2px;
  border-radius: var(--klc-radius-full);
  background: var(--kcq-accent);
  opacity: 0;
  transition: opacity var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
.agent-story[data-story] .chapter[aria-current="step"]::before {
  opacity: 1;
}
@media (hover: hover) and (pointer: fine) {
  .chapter:hover,
  .agent-story[data-story] .chapter:not([aria-current="step"]):hover {
    color: var(--kcq-ink);
  }
}
/* The agent's window: the one framed artifact in this section. */
.agent-console {
  display: grid;
  align-self: start;
}
.console-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--klc-space-8) var(--klc-space-12) var(--klc-space-8) var(--klc-space-16);
  border-bottom: 1px solid var(--kcq-rule);
  color: var(--kcq-ink-2);
}
.console-glyph {
  width: var(--klc-space-24);
  height: var(--klc-space-24);
}
.glyph-dot {
  fill: var(--kcq-rule);
  transition: fill var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
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
  gap: var(--klc-space-12);
  padding: var(--klc-space-16);
}
.transcript-prompt {
  display: grid;
  gap: var(--klc-space-4);
  min-height: calc(var(--klc-text-copy-14-line-height) * 2 + var(--klc-space-24));
  font-size: var(--klc-text-copy-14-font-size);
  line-height: var(--klc-text-copy-14-line-height);
}
.transcript-who {
  color: var(--kcq-ink-2);
}
/* The rest of the prompt waits as ghost text, so the window never reads empty before it is typed. */
.ghost {
  color: var(--kcq-ink-2);
}
.caret {
  display: inline-block;
  width: 1px;
  height: 1.1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--kcq-accent);
}
/* Tool calls: quiet log lines, no inner cards; each call's real input is its name's tooltip. */
.transcript-calls {
  display: grid;
  gap: var(--klc-space-8);
}
.call {
  display: grid;
  grid-template-columns: var(--klc-space-16) minmax(0, 1fr);
  gap: 0 var(--klc-space-8);
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
}
.call > :not(.call-mark) {
  grid-column: 2;
}
/* Queued calls wait in the secondary ink (AA on the frame), never faded out: the window reads in
   full at every step, the check marks and the primary ink say what has run. */
.call[data-state="queued"] .call-name {
  color: var(--kcq-ink-2);
}
.call-mark {
  grid-row: 1;
  display: grid;
  place-items: center;
  width: var(--klc-space-12);
  height: var(--klc-space-12);
  margin-top: 2px;
  border: 1px solid var(--kcq-rule-strong);
  border-radius: var(--klc-radius-full);
  color: var(--kcq-ink);
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
  color: var(--kcq-ink);
  font-weight: 500;
  transition: color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
.call-safety,
.call-result {
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
  border-top: 1px solid var(--kcq-rule);
}
.scrubber {
  display: flex;
  align-items: center;
  gap: var(--klc-space-4);
  padding: var(--klc-space-8) var(--klc-space-12);
  border-top: 1px solid var(--kcq-rule);
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
  font-size: var(--klc-text-12-font-size);
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.scrub-button:not(:disabled):active {
  transform: scale(var(--kcq-press-icon));
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
  background: linear-gradient(var(--kcq-rule-strong), var(--kcq-rule-strong)) center / 100% 2px no-repeat;
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
/* The window's input: the example prompts as suggestions, press to copy. */
.composer {
  display: grid;
  gap: 0 var(--klc-space-16);
  padding: var(--klc-space-8) var(--klc-space-16);
  border-top: 1px solid var(--kcq-rule);
}
.suggestion {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  min-height: var(--klc-density-default);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--kcq-ink-2);
  font-size: var(--klc-text-12-font-size);
  line-height: var(--klc-text-12-line-height);
  text-align: left;
  cursor: copy;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.suggestion:active {
  transform: scale(var(--kcq-press));
}
@media (pointer: coarse) {
  .suggestion {
    min-height: var(--klc-density-comfortable);
  }
}
.suggestion[data-copied] {
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  .suggestion:hover {
    color: var(--kcq-ink);
  }
}
.console-note {
  padding: 0 var(--klc-space-16) var(--klc-space-12);
  color: var(--kcq-ink-2);
}
@media (min-width: 768px) {
  .console-body {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  }
  .composer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .console-chart {
    align-self: center;
    border-top: 0;
    border-left: 1px solid var(--kcq-rule);
  }
}
@media (min-width: 1024px) {
  .agent-stage {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .chapters {
    grid-column: 1 / span 3;
  }
  .agent-console {
    grid-column: 4 / span 9;
  }
  /* The pinned story: the stage (details and window together) sticks under the header for a short
     runway, its bottom margin; the choreography starts as the window rises into view, so most of
     it plays on the way in and the page grows by a fifth of a screen, not a full one. Sticky keeps
     the stage inside the track: it never overlaps the next section. */
  .agent-story[data-story] .agent-stage {
    position: sticky;
    top: calc(var(--kcq-header-height) + var(--klc-space-24));
    margin-bottom: 20vh;
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
