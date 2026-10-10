<!--
  Shipping cadence (research §4.8: "we ship in public", cadence over vanity counts). Every tagged
  release of the open-source engine on one date axis, from the same build-time GitHub snapshot the
  /home community band reads (home/community/activity.json). The first release of each minor
  version stands taller, like a session's opening bar; the latest is Cobalt. Labels are HTML over
  the SVG so they keep their size on phones. It is a chart of our own releases, not the product, so
  it stands on the page without a frame (restraint benchmark rule 9).
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import activity from "../home/community/activity.json";
import { LINKS } from "../links";
import { useReveal } from "../home/motion/use-reveal";
import { usePublicLocale } from "../state/use-public-locale";

const { t } = useI18n();
const { intl } = usePublicLocale();

const releases = [...(activity.releases as [string, number][])].sort((a, b) => a[1] - b[1]);
const fetchedAt = Date.parse(activity.fetchedAt);
const start = releases[0]?.[1] ?? fetchedAt;
const DAY = 86_400_000;
const from = start - 2 * DAY;
const to = fetchedAt + 2 * DAY;
const x = (at: number) => ((at - from) / (to - from)) * 100;

const minorOf = (tag: string) => /^v(\d+\.\d+)\./.exec(tag)?.[1] ?? tag;
const ticks = releases.map(([tag, at], index) => ({
  tag,
  at,
  x: x(at),
  opens: index === 0 || minorOf(releases[index - 1]![0]) !== minorOf(tag),
}));
const latest = ticks.at(-1);

/** UTC throughout: prerender and the browser must print the same dates. */
const dayFormat = computed(
  () => new Intl.DateTimeFormat(intl.value, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }),
);
const monthFormat = computed(() => new Intl.DateTimeFormat(intl.value, { month: "short", timeZone: "UTC" }));
const months = computed(() => {
  const out: { label: string; x: number }[] = [];
  const cursor = new Date(from);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  while (cursor.getTime() < to) {
    out.push({ label: monthFormat.value.format(cursor), x: x(cursor.getTime()) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
});
const summary = computed(() =>
  t("investors.cadence.count", {
    count: releases.length,
    from: dayFormat.value.format(start),
    to: latest ? dayFormat.value.format(latest.at) : "",
  }),
);
/**
 * Data motion on real data (ADR §1 P2 "SVG and data"): on first sight each release tick grows from
 * the axis in date order, so the cadence reads as time passing. The ticks are the real releases.
 */
const plot = ref<HTMLElement>();
const { state } = useReveal(plot, 0.5);
</script>
<template>
  <section id="releases" class="band cadence" aria-labelledby="cadence-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="cadence-heading" class="t-heading">{{ t("investors.cadence.heading") }}</h2>
        <p class="t-lede">{{ t("investors.cadence.body") }}</p>
        <a class="section-link" :href="LINKS.releases" rel="noopener">
          {{ t("investors.cadence.changelog") }}
          <KcqIcon name="external" :size="14" />
        </a>
      </div>
      <figure class="timeline section-artifact">
        <figcaption class="timeline-caption">
          <span class="t-label t-num">{{ summary }}</span>
          <span v-if="latest" class="t-meta timeline-latest" translate="no">
            <span class="timeline-latest-dot" aria-hidden="true" />{{ t("investors.cadence.latest") }} {{ latest.tag }}
          </span>
        </figcaption>
        <div
          ref="plot"
          class="timeline-plot"
          :data-reveal="state"
          role="img"
          :aria-label="t('investors.cadence.label', { date: activity.fetchedAt.slice(0, 10) })"
        >
          <svg class="timeline-ticks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line class="timeline-axis" x1="0" x2="100" y1="100" y2="100" vector-effect="non-scaling-stroke" />
            <line
              v-for="tick in ticks"
              :key="tick.tag"
              class="timeline-tick"
              :data-opens="tick.opens || undefined"
              :data-latest="tick === latest || undefined"
              :style="{ '--x': tick.x.toFixed(1) }"
              :x1="tick.x"
              :x2="tick.x"
              y1="100"
              :y2="tick === latest ? 8 : tick.opens ? 30 : 62"
              vector-effect="non-scaling-stroke"
            />
          </svg>
          <span
            v-for="tick in ticks.filter((item) => item.opens)"
            :key="`label-${tick.tag}`"
            class="timeline-version t-meta"
            :style="{ left: `${tick.x}%` }"
            aria-hidden="true"
            translate="no"
          >v{{ minorOf(tick.tag) }}</span>
        </div>
        <div class="timeline-months" aria-hidden="true">
          <span v-for="month in months" :key="month.label" class="t-meta" :style="{ left: `${month.x}%` }">
            {{ month.label }}
          </span>
        </div>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.timeline {
  margin-inline: 0;
  margin-bottom: 0;
}
.timeline-caption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--klc-space-8) var(--klc-space-24);
  margin-bottom: var(--klc-space-32);
}
.timeline-caption .t-label {
  word-break: keep-all;
}
.timeline-latest {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  color: var(--kcq-accent-text);
  text-transform: none;
}
.timeline-latest-dot {
  width: var(--klc-space-8);
  height: var(--klc-space-8);
  border-radius: var(--klc-radius-full);
  background: var(--kcq-accent);
}
.timeline-plot {
  position: relative;
  height: 9rem;
}
.timeline-ticks {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.timeline-axis {
  stroke: var(--kcq-rule-strong);
  stroke-width: 1;
}
.timeline-tick {
  stroke: var(--kcq-ink-2);
  stroke-width: 1.5;
}
.timeline-tick {
  transform-box: fill-box;
  transform-origin: bottom;
}
.timeline-plot[data-reveal="armed"] .timeline-tick {
  transform: scaleY(0);
}
/* Up to about 600ms across the year, each tick in the medium duration: time, left to right. */
.timeline-plot[data-reveal="shown"] .timeline-tick {
  transition: transform var(--kcq-motion-medium) var(--klc-motion-ease-out);
  transition-delay: calc(var(--x) * 6ms);
}
@media (prefers-reduced-motion: reduce) {
  .timeline-plot[data-reveal="armed"] .timeline-tick {
    transform: none;
  }
}
.timeline-tick[data-opens] {
  stroke: var(--kcq-ink);
  stroke-width: 2;
}
.timeline-tick[data-latest] {
  stroke: var(--kcq-accent);
  stroke-width: 3;
}
/* Minor-version labels sit at the top of their tall tick, left-aligned to it. */
.timeline-version {
  position: absolute;
  top: 30%;
  translate: 4px 0;
  color: var(--kcq-ink-2);
  text-transform: none;
  letter-spacing: 0;
  white-space: nowrap;
}
.timeline-months {
  position: relative;
  height: var(--klc-space-24);
  margin-top: var(--klc-space-8);
}
.timeline-months span {
  position: absolute;
  top: 0;
  translate: -50% 0;
  white-space: nowrap;
}
/* Phones: version labels would collide; the months and the latest tag carry the axis. */
@media (max-width: 767px) {
  .timeline-plot {
    height: 6rem;
  }
  .timeline-version {
    display: none;
  }
}
</style>
