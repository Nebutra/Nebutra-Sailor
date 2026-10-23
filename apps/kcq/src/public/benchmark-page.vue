<!--
  The public benchmark (research/benchmark-plan.md), written to sell before it reports: the claim and
  the ranked figure in the hero, three numbers that carry the claim, then the close. How it was
  measured stays one click away, folded under the numbers, never in the reading path. Every number
  on the page comes from benchmark/compare-run.json, which compare-run.test.ts ties to the published
  raw file.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import CompareFigure from "./benchmark/compare-figure.vue";
import { COMPARE_RUN, COMPARE_RUN_FILES, highlights } from "./benchmark/compare-run";
import CompareTable from "./benchmark/compare-table.vue";
import KcqIcon from "./components/kcq-icon.vue";
import PageHero from "./components/page-hero.vue";
import PageSection from "./components/page-section.vue";
import { benchHarnessAt, LINKS } from "./links";
import { APP_PATH, PUBLIC_LOCALES } from "./routes";
import { usePublicLocale } from "./state/use-public-locale";

const { t, tm, rt } = useI18n();
const { locale } = usePublicLocale();
const run = COMPARE_RUN;
const figures = highlights(run);
const lang = computed(() => PUBLIC_LOCALES[locale.value].htmlLang);
const count = (value: number) => value.toLocaleString(lang.value);
const ms = (value: number) => value.toFixed(2);
const budget = run.configuration.refreshIntervalMs.toFixed(1);

// UTC, so the prerendered date and the hydrated one never differ.
const date = computed(() =>
  new Intl.DateTimeFormat(lang.value, { dateStyle: "long", timeZone: "UTC" }).format(new Date(run.generatedAt)),
);
const ledeText = computed(() =>
  t("benchmark.lede", { bars: count(figures.bars), ms: ms(figures.best.scenario.mainThreadMsPerFrame) }),
);
/** The three numbers under the hero, each a big value and the one line that makes it a claim. */
const proofs = computed(() => [
  {
    key: "growth",
    value: t("benchmark.proof.growth.value", { times: (figures.growth.to / figures.growth.from).toFixed(1) }),
    label: t("benchmark.proof.growth.label", {
      from: count(figures.growth.from),
      to: count(figures.growth.to),
      rate: Math.round(figures.growth.rate * 100),
    }),
  },
  {
    key: "ratio",
    value: t("benchmark.proof.ratio.value", { ratio: figures.ratio.toFixed(1) }),
    label: t("benchmark.proof.ratio.label", { library: figures.heaviest.subject.library }),
  },
  {
    key: "share",
    value: t("benchmark.proof.share.value", { share: figures.share }),
    label: t("benchmark.proof.share.label", { budget }),
  },
]);
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
  <main id="main">
    <PageHero :heading="t('benchmark.heading')" :lede="ledeText">
      <template #note>
        {{ t("benchmark.run", { date, cpu: run.environment.cpu, browser: run.environment.browser }) }}
        <a class="benchmark-jump" href="#fineprint">{{ t("benchmark.fineprintLink") }}</a>
      </template>
      <template #artifact>
        <CompareFigure />
      </template>
    </PageHero>

    <PageSection id="proof" :heading="t('benchmark.proof.heading')">
      <ul class="proofs">
        <li v-for="proof in proofs" :key="proof.key" class="proof">
          <span class="t-display t-num proof-value">{{ proof.value }}</span>
          <span class="t-copy">{{ proof.label }}</span>
        </li>
      </ul>

      <details id="fineprint" class="fineprint">
        <summary class="t-label">{{ t("benchmark.fineprint.summary") }}</summary>
        <div class="fineprint-body">
          <p class="t-copy">{{ t("benchmark.fineprint.run") }}</p>
          <div class="fineprint-columns">
            <section aria-labelledby="fineprint-method">
              <h3 id="fineprint-method" class="t-title">{{ t("benchmark.fineprint.method") }}</h3>
              <ol class="fineprint-method">
                <li v-for="(item, index) in tm('benchmark.method')" :key="index" class="t-copy">
                  <span class="t-num">{{ index + 1 }}</span><span>{{ rt(item) }}</span>
                </li>
              </ol>
            </section>
            <section aria-labelledby="fineprint-environment">
              <h3 id="fineprint-environment" class="t-title">{{ t("benchmark.fineprint.environment") }}</h3>
              <dl class="fineprint-environment">
                <div v-for="entry in environment" :key="entry.label">
                  <dt class="t-meta">{{ entry.label }}</dt>
                  <dd class="t-copy t-num">{{ entry.value }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <section aria-labelledby="fineprint-table">
            <h3 id="fineprint-table" class="t-title">{{ t("benchmark.fineprint.table") }}</h3>
            <CompareTable />
          </section>
          <ul class="fineprint-downloads">
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
          <p class="t-meta">{{ t("benchmark.caveat") }}</p>
        </div>
      </details>
    </PageSection>

    <PageSection id="start" :heading="t('benchmark.cta.heading')" :lede="t('benchmark.cta.body')" layout="center" closing>
      <template #head>
        <div class="benchmark-actions">
          <a class="button button-primary" :href="APP_PATH">
            {{ t("home.cta.primary") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
          <a class="button button-quiet" :href="LINKS.github" rel="noopener">
            {{ t("home.cta.github") }}
            <KcqIcon name="external" :size="14" />
          </a>
        </div>
      </template>
    </PageSection>
  </main>
</template>
<style scoped>
.benchmark-jump {
  margin-inline-start: var(--klc-space-8);
  color: var(--kcq-accent-text);
}
/* The three numbers: one row from tablet up, each value over its line, a hairline above each. */
.proofs {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-32) var(--kcq-column-gap);
}
.proof {
  display: grid;
  align-content: start;
  gap: var(--klc-space-12);
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
.proof-value {
  color: var(--kcq-ink);
}
.proof:first-child .proof-value {
  color: var(--kcq-accent-text);
}
@media (min-width: 768px) {
  .proofs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* The fine print: one quiet line until opened, then everything a sceptic needs. */
.fineprint {
  margin-top: var(--klc-space-64);
}
.fineprint summary {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
  min-height: var(--klc-density-comfortable);
  color: var(--kcq-ink-2);
  cursor: pointer;
  list-style: none;
}
.fineprint summary:hover {
  color: var(--kcq-ink);
}
.fineprint summary::-webkit-details-marker {
  display: none;
}
/* A plus that turns into a minus: two hairlines, the vertical one folds away when open. */
.fineprint summary::before {
  content: "";
  width: var(--klc-space-12);
  height: var(--klc-space-12);
  background:
    linear-gradient(currentColor, currentColor) center / 100% 1.5px no-repeat,
    linear-gradient(currentColor, currentColor) center / 1.5px 100% no-repeat;
  transition: background-size var(--klc-motion-dur-base) var(--klc-motion-ease-out);
}
.fineprint[open] summary::before {
  background-size:
    100% 1.5px,
    1.5px 0;
}
.fineprint-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-48);
  margin-top: var(--klc-space-24);
}
.fineprint-body section {
  display: grid;
  align-content: start;
  gap: var(--klc-space-16);
}
.fineprint-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--klc-space-48) var(--kcq-column-gap);
}
.fineprint-method {
  display: grid;
  gap: var(--klc-space-16);
}
.fineprint-method li {
  display: grid;
  grid-template-columns: var(--klc-space-32) minmax(0, 1fr);
}
.fineprint-method .t-num {
  color: var(--kcq-accent-text);
}
.fineprint-environment > div {
  display: grid;
  gap: var(--klc-space-4);
  padding-block: var(--klc-space-12);
  border-bottom: 1px solid var(--kcq-rule);
}
.fineprint-environment dd {
  color: var(--kcq-ink);
  overflow-wrap: anywhere;
}
.fineprint-downloads {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-8) var(--klc-space-16);
}
@media (min-width: 1024px) {
  .fineprint-columns {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .fineprint-columns > :first-child {
    grid-column: 1 / span 6;
  }
  .fineprint-columns > :last-child {
    grid-column: 8 / span 5;
  }
  .fineprint-environment > div {
    grid-template-columns: 8rem minmax(0, 1fr);
    gap: var(--klc-space-16);
  }
}
.benchmark-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-16);
}
</style>
