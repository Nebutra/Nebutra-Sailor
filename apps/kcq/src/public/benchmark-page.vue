<!--
  The public benchmark (research/benchmark-plan.md): one measured comparison of four chart libraries,
  then how it was measured and on what, with the raw run downloadable beside it. Every number on the
  page comes from benchmark/compare-run.json, which compare-run.test.ts ties to the published raw file.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import CompareFigure from "./benchmark/compare-figure.vue";
import { COMPARE_RUN, COMPARE_RUN_FILES, verdict } from "./benchmark/compare-run";
import CompareTable from "./benchmark/compare-table.vue";
import KcqIcon from "./components/kcq-icon.vue";
import { benchHarnessAt } from "./links";
import { PUBLIC_LOCALES } from "./routes";
import { usePublicLocale } from "./state/use-public-locale";

const { t, tm, rt } = useI18n();
const { locale } = usePublicLocale();
const run = COMPARE_RUN;
const figures = verdict(run);
const lang = computed(() => PUBLIC_LOCALES[locale.value].htmlLang);
const ms = (value: number) => value.toFixed(2);

// UTC, so the prerendered date and the hydrated one never differ.
const date = computed(() =>
  new Intl.DateTimeFormat(lang.value, { dateStyle: "long", timeZone: "UTC" }).format(new Date(run.generatedAt)),
);
const lead = computed(() =>
  figures.heaviest && figures.ratio
    ? t("benchmark.verdict.lead", {
        bars: figures.bars.toLocaleString(lang.value),
        renderer: figures.best.subject.renderer,
        ms: ms(figures.best.scenario.mainThreadMsPerFrame),
        library: figures.heaviest.subject.library,
        ratio: figures.ratio.toFixed(1),
      })
    : undefined,
);
const trail = computed(() =>
  figures.lighter.length
    ? t(
        "benchmark.verdict.trail",
        {
          libraries: new Intl.ListFormat(lang.value, { type: "conjunction" }).format(
            figures.lighter.map((row) => `${row.subject.library} (${ms(row.scenario.mainThreadMsPerFrame)} ms)`),
          ),
        },
        figures.lighter.length,
      )
    : undefined,
);
/** Both sentences as one string, joined the locale's way (a space in English, none in Chinese). */
const verdictText = computed(() =>
  lead.value && trail.value ? t("benchmark.verdict.both", { lead: lead.value, trail: trail.value }) : lead.value,
);
const environment = computed(() => [
  {
    label: t("benchmark.environment.machine"),
    value: `${run.environment.cpu} · ${run.environment.memoryGiB} GB · ${run.environment.os}`,
  },
  { label: t("benchmark.environment.graphics"), value: run.environment.gpu },
  { label: t("benchmark.environment.browser"), value: t("benchmark.environment.browserValue", { browser: run.environment.browser }) },
  {
    label: t("benchmark.environment.viewport"),
    value: t("benchmark.environment.viewportValue", {
      width: run.configuration.width,
      height: run.configuration.height,
      dpr: run.configuration.dpr,
    }),
  },
  {
    label: t("benchmark.environment.versions"),
    value: Object.entries(run.libraries)
      .map(([name, version]) => `${name} ${version}`)
      .join(" · "),
  },
  {
    label: t("benchmark.environment.commit"),
    value: run.dirty ? t("benchmark.environment.dirty", { commit: run.commit.slice(0, 8) }) : run.commit.slice(0, 8),
  },
]);
</script>
<template>
  <main id="main" class="band benchmark">
    <div class="container">
      <header class="section-head">
        <h1 class="t-heading enter-mask">{{ t("benchmark.heading") }}</h1>
        <p class="t-lede enter-rise" style="--enter-delay: 80ms">{{ t("benchmark.lede") }}</p>
        <p class="t-meta enter-rise" style="--enter-delay: 140ms">
          {{ t("benchmark.run", { date, cpu: run.environment.cpu, browser: run.environment.browser }) }}
        </p>
      </header>

      <CompareFigure class="section-artifact enter-settle" style="--enter-delay: 200ms" />

      <div class="benchmark-after">
        <p v-if="lead" class="t-lede benchmark-verdict">{{ verdictText }}</p>
        <ul class="benchmark-downloads">
          <li>
            <a class="button button-quiet" :href="COMPARE_RUN_FILES.json" download>{{ t("benchmark.downloads.json") }}</a>
          </li>
          <li>
            <a class="button button-quiet" :href="COMPARE_RUN_FILES.csv" download>{{ t("benchmark.downloads.csv") }}</a>
          </li>
          <li>
            <a class="section-link" :href="benchHarnessAt(run.commit)" rel="noopener" target="_blank">
              {{ t("benchmark.downloads.harness") }}
              <KcqIcon class="button-arrow" name="arrow" />
            </a>
          </li>
        </ul>
        <CompareTable />
      </div>

      <div class="benchmark-notes">
        <section aria-labelledby="method-heading">
          <h2 id="method-heading" class="t-title">{{ t("benchmark.method.heading") }}</h2>
          <ol class="benchmark-method">
            <li v-for="(item, index) in tm('benchmark.method.items')" :key="index" class="t-copy">
              <span class="t-num">{{ index + 1 }}</span><span>{{ rt(item) }}</span>
            </li>
          </ol>
        </section>
        <section aria-labelledby="environment-heading">
          <h2 id="environment-heading" class="t-title">{{ t("benchmark.environment.heading") }}</h2>
          <dl class="benchmark-environment">
            <div v-for="entry in environment" :key="entry.label">
              <dt class="t-meta">{{ entry.label }}</dt>
              <dd class="t-copy t-num">{{ entry.value }}</dd>
            </div>
          </dl>
          <p class="t-meta benchmark-caveat">{{ t("benchmark.caveat") }}</p>
        </section>
      </div>
    </div>
  </main>
</template>
<style scoped>
.benchmark-after {
  display: grid;
  /* minmax(0, …): the table's own min-width scrolls inside .table-scroll instead of widening the page. */
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-24);
  margin-top: var(--klc-space-32);
}
.benchmark-verdict {
  max-width: 48rem;
  color: var(--kcq-ink);
}
.benchmark-downloads {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-8) var(--klc-space-16);
}
.benchmark-notes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-48) var(--kcq-column-gap);
  margin-top: var(--klc-space-80);
  padding-top: var(--klc-space-48);
  border-top: 1px solid var(--kcq-rule);
}
.benchmark-notes section {
  display: grid;
  align-content: start;
  gap: var(--klc-space-24);
}
.benchmark-method {
  display: grid;
  gap: var(--klc-space-16);
}
.benchmark-method li {
  display: grid;
  grid-template-columns: var(--klc-space-32) minmax(0, 1fr);
}
.benchmark-method .t-num {
  color: var(--kcq-accent-text);
}
.benchmark-environment {
  display: grid;
}
.benchmark-environment > div {
  display: grid;
  gap: var(--klc-space-4);
  padding-block: var(--klc-space-12);
  border-bottom: 1px solid var(--kcq-rule);
}
.benchmark-environment dd {
  color: var(--kcq-ink);
  overflow-wrap: anywhere;
}
@media (min-width: 1024px) {
  .benchmark-notes {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .benchmark-notes > :first-child {
    grid-column: 1 / span 6;
  }
  .benchmark-notes > :last-child {
    grid-column: 8 / span 5;
  }
  .benchmark-environment > div {
    grid-template-columns: 8rem minmax(0, 1fr);
    gap: var(--klc-space-16);
  }
}
</style>
