<!--
  07 Open source (landing-benchmark §6.8: the OSS form of social proof is the work and the
  channels, not logos; research A2, A5). The past year of commits, drawn as a volume pane: one bar
  per week, coloured up or down against the week before, with the release dates as ticks on its
  time axis. Read from GitHub by scripts/refresh-community.mjs and dated on the page. The zh page
  lists the QQ group first, the en page Telegram first.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { LINKS } from "../links";
import { usePublicLocale } from "../state/use-public-locale";
import activity from "./community/activity.json";

const { t } = useI18n();
const { locale, intl } = usePublicLocale();
const channels = computed(() => {
  const github = { key: "github", href: LINKS.github };
  const telegram = { key: "telegram", href: LINKS.telegram };
  const qq = { key: "qq", href: LINKS.qq };
  return locale.value === "zh" ? [github, qq, telegram] : [github, telegram, qq];
});

const weeks = activity.weeks as [number, number][];
const W = 520;
const H = 120;
const AXIS = 18;
const max = Math.max(...weeks.map(([, commits]) => commits));
const slot = W / weeks.length;
const bars = weeks.map(([start, commits], index) => ({
  x: index * slot + slot * 0.18,
  width: slot * 0.64,
  height: Math.max(1, (commits / max) * (H - AXIS - 4)),
  up: index === 0 || commits >= weeks[index - 1]![1],
  start,
}));
const first = weeks[0]![0];
const last = weeks.at(-1)![0] + 7 * 86_400_000;
const releases = (activity.releases as [string, number][]).filter(([, at]) => at >= first);
const xAt = (time: number) => ((time - first) / (last - first)) * W;
const total = weeks.reduce((sum, [, commits]) => sum + commits, 0);
const months = computed(() => {
  const format = new Intl.DateTimeFormat(intl.value, { month: "short" });
  const ticks: { x: number; label: string }[] = [];
  const cursor = new Date(first);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  while (cursor.getTime() < last) {
    if (cursor.getUTCMonth() % 2 === 0) ticks.push({ x: xAt(cursor.getTime()), label: format.format(cursor) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
});
const count = computed(() => new Intl.NumberFormat(intl.value).format(total));
</script>
<template>
  <section id="community" class="band band-raised community" aria-labelledby="community-heading">
    <div class="container community-grid">
      <div class="section-head community-head">
        <h2 id="community-heading" class="t-heading">{{ t("home.community.heading") }}</h2>
        <p class="t-lede">{{ t("home.community.body") }}</p>
      </div>
      <figure class="activity">
        <figcaption class="activity-head">
          <span class="t-label t-num">{{ t("home.community.activity", { count }) }}</span>
          <a class="t-meta t-num activity-release" :href="LINKS.releases" rel="noopener" translate="no">
            {{ t("home.community.latest", { version: facts.version }) }}
          </a>
        </figcaption>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t('home.community.chart', { date: activity.fetchedAt.slice(0, 10) })">
          <line class="activity-axis" x1="0" :x2="W" :y1="H - AXIS" :y2="H - AXIS" />
          <rect
            v-for="bar in bars"
            :key="bar.start"
            :class="bar.up ? 'is-up' : 'is-down'"
            :x="bar.x"
            :y="H - AXIS - bar.height"
            :width="bar.width"
            :height="bar.height"
          />
          <line
            v-for="[tag, at] in releases"
            :key="tag"
            class="activity-release-tick"
            :x1="xAt(at)"
            :x2="xAt(at)"
            :y1="H - AXIS"
            :y2="H - AXIS + 5"
          />
          <text v-for="tick in months" :key="tick.x" class="activity-month" :x="tick.x" :y="H - 3">{{ tick.label }}</text>
        </svg>
        <p class="t-copy activity-note">{{ t("home.community.chart", { date: activity.fetchedAt.slice(0, 10) }) }}</p>
      </figure>
      <ul class="channels">
        <li v-for="channel in channels" :key="channel.key">
          <a class="channel" :href="channel.href" rel="noopener">
            <span class="t-title">{{ t(`home.community.${channel.key}`) }}</span>
            <KcqIcon class="channel-arrow" name="external" />
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
<style scoped>
.community-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
}
.activity {
  display: grid;
  gap: var(--klc-space-12);
  margin: 0;
}
.activity-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--klc-space-8);
}
.activity-release {
  text-transform: none;
}
.activity svg {
  width: 100%;
  height: auto;
}
.activity-axis {
  stroke: var(--kcq-rule-strong);
  stroke-width: 1;
}
.is-up {
  fill: var(--kcq-up);
}
.is-down {
  fill: var(--kcq-down);
}
.activity-release-tick {
  stroke: var(--kcq-accent);
  stroke-width: 1;
}
.activity-month {
  font-family: var(--kcq-font-mono);
  font-size: 10px;
  fill: var(--kcq-ink-2);
  text-anchor: middle;
}
.channels {
  display: grid;
  border-top: 1px solid var(--kcq-rule);
}
.channel {
  position: relative;
  display: grid;
  gap: var(--klc-space-4);
  padding: var(--klc-space-16) var(--klc-space-48) var(--klc-space-16) 0;
  border-bottom: 1px solid var(--kcq-rule);
  color: var(--kcq-ink);
  text-decoration: none;
}
.channel-detail {
  font-family: var(--kcq-font-mono);
}
.channel-arrow {
  position: absolute;
  right: var(--klc-space-8);
  top: 50%;
  translate: 0 -50%;
  color: var(--kcq-ink-2);
  transition:
    transform var(--klc-motion-dur-fast) var(--klc-motion-ease-out),
    color var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .channel:hover .t-title {
    color: var(--kcq-accent-text);
  }
  .channel:hover .channel-arrow {
    transform: translate(2px, -2px);
    color: var(--kcq-ink);
  }
}
@media (min-width: 1024px) {
  .community-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: start;
  }
  .community-head {
    grid-column: 1 / span 5;
    grid-row: 1;
  }
  .channels {
    grid-column: 1 / span 5;
    grid-row: 2;
  }
  .activity {
    grid-column: 7 / span 6;
    grid-row: 1 / span 2;
    align-self: center;
  }
}
</style>
