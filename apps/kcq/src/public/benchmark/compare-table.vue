<!--
  Every scenario of the run as a table, inside the page's fine print: the figure's main-thread time
  plus the in-page frame-work percentiles and dropped frames, tier by tier in the figure's order.
  The same numbers as the CSV download.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { PUBLIC_LOCALES } from "../routes";
import { usePublicLocale } from "../state/use-public-locale";
import { COMPARE_RUN, type CompareRow, roundRange, tierRows } from "./compare-run";

const { t } = useI18n();
const { locale } = usePublicLocale();
const tiers = COMPARE_RUN.configuration.visibleBars.map((bars) => ({ bars, rows: tierRows(COMPARE_RUN, bars) }));

const count = (value: number) => value.toLocaleString(PUBLIC_LOCALES[locale.value].htmlLang);
const ms = (value: number) => value.toFixed(2);
const range = (row: CompareRow) => {
  const { low, high } = roundRange(row.scenario);
  return `${ms(low)}–${ms(high)}`;
};
const percent = (value: number) =>
  value.toLocaleString(PUBLIC_LOCALES[locale.value].htmlLang, { style: "percent", maximumFractionDigits: 1 });
</script>
<template>
  <div class="table-scroll">
    <table class="t-copy t-num">
      <thead>
        <tr>
          <th scope="col">{{ t("benchmark.table.library") }}</th>
          <th scope="col">{{ t("benchmark.table.renderer") }}</th>
          <th scope="col" class="number">{{ t("benchmark.table.bars") }}</th>
          <th scope="col" class="number">{{ t("benchmark.table.main") }}</th>
          <th scope="col" class="number">{{ t("benchmark.table.range") }}</th>
          <th scope="col" class="number">{{ t("benchmark.table.p50") }}</th>
          <th scope="col" class="number">{{ t("benchmark.table.p99") }}</th>
          <th scope="col" class="number">{{ t("benchmark.table.dropped") }}</th>
        </tr>
      </thead>
      <tbody v-for="tier in tiers" :key="tier.bars">
        <tr v-for="row in tier.rows" :key="row.subject.id" :data-kcq="row.kcq || undefined">
          <th scope="row">{{ row.subject.library }}</th>
          <td>{{ row.subject.renderer }}</td>
          <td class="number">{{ count(row.scenario.actualVisibleBars) }}</td>
          <td class="number">{{ ms(row.scenario.mainThreadMsPerFrame) }}</td>
          <td class="number">{{ range(row) }}</td>
          <td class="number">{{ ms(row.scenario.frameWorkP50Ms) }}</td>
          <td class="number">{{ ms(row.scenario.frameWorkP99Ms) }}</td>
          <td class="number">{{ percent(row.scenario.droppedFrameRate) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 44rem;
  border-collapse: collapse;
}
th,
td {
  padding: var(--klc-space-8) var(--klc-space-12);
  text-align: start;
  font-weight: inherit;
  white-space: nowrap;
  border-bottom: 1px solid var(--kcq-rule);
}
thead th {
  color: var(--kcq-ink-2);
  border-bottom-color: var(--kcq-rule-strong);
}
tbody + tbody tr:first-child > * {
  border-top: 1px solid var(--kcq-rule-strong);
}
tbody th,
[data-kcq] td {
  color: var(--kcq-ink);
}
.number {
  text-align: end;
}
</style>
