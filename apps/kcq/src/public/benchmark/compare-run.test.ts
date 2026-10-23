import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  axisTicks,
  COMPARE_RUN,
  COMPARE_RUN_FILES,
  roundRange,
  summarizeCompareRun,
  tierRows,
  verdict,
} from "./compare-run";
import summary from "./compare-run.json";

/** A file under apps/kcq/public by its served path. */
const published = (path: string) => readFileSync(new URL(`../../../public${path}`, import.meta.url), "utf8");
const tiers = COMPARE_RUN.configuration.visibleBars;

describe("chart-library comparison run", () => {
  it("is exactly the summary of the published raw report", () => {
    expect(summarizeCompareRun(JSON.parse(published(COMPARE_RUN_FILES.json)))).toEqual(summary);
  });

  it("publishes the CSV beside it, one row per scenario", () => {
    const lines = published(COMPARE_RUN_FILES.csv).trim().split("\n");
    expect(lines).toHaveLength(COMPARE_RUN.scenarios.length + 1);
  });

  it("measures every subject at every tier, least main-thread time first", () => {
    for (const bars of tiers) {
      const values = tierRows(COMPARE_RUN, bars).map((row) => row.scenario.mainThreadMsPerFrame);
      expect(values).toHaveLength(COMPARE_RUN.subjects.length);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    }
  });

  it("keeps every mean inside its round range, and every round on the shared axis", () => {
    const ticks = axisTicks(COMPARE_RUN);
    expect(ticks[0]).toBe(0);
    for (const scenario of COMPARE_RUN.scenarios) {
      const { low, high } = roundRange(scenario);
      expect(scenario.mainThreadMsPerFrameRounds).toHaveLength(COMPARE_RUN.configuration.rounds);
      expect(scenario.mainThreadMsPerFrame).toBeGreaterThanOrEqual(low);
      expect(scenario.mainThreadMsPerFrame).toBeLessThanOrEqual(high);
      expect(high).toBeLessThanOrEqual(ticks[ticks.length - 1]);
    }
  });

  it("quotes the verdict from KCQ's best backend at the largest tier", () => {
    const { bars, best, heaviest, ratio, lighter } = verdict(COMPARE_RUN);
    expect(bars).toBe(Math.max(...tiers));
    expect(best.kcq).toBe(true);
    expect(best).toEqual(tierRows(COMPARE_RUN, bars).find((row) => row.kcq));
    if (heaviest && ratio) expect(ratio).toBeCloseTo(heaviest.scenario.mainThreadMsPerFrame / best.scenario.mainThreadMsPerFrame);
    for (const row of lighter) {
      expect(row.kcq).toBe(false);
      expect(row.scenario.mainThreadMsPerFrame).toBeLessThanOrEqual(best.scenario.mainThreadMsPerFrame);
    }
  });
});
