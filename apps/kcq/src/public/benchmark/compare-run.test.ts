import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  axisTicks,
  COMPARE_RUN,
  COMPARE_RUN_FILES,
  roundRange,
  summarizeCompareRun,
  highlights,
  tierRows,
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

  it("sells only figures the run contains", () => {
    const { bars, best, heaviest, ratio, share, growth } = highlights(COMPARE_RUN);
    const rows = tierRows(COMPARE_RUN, bars);
    expect(bars).toBe(Math.max(...tiers));
    expect(best).toEqual(rows.find((row) => row.kcq));
    expect(heaviest).toEqual(rows.at(-1));
    expect(heaviest.kcq).toBe(false);
    expect(ratio).toBeCloseTo(heaviest.scenario.mainThreadMsPerFrame / best.scenario.mainThreadMsPerFrame);
    expect(best.scenario.mainThreadMsPerFrame / COMPARE_RUN.configuration.refreshIntervalMs).toBeLessThan(share / 100);
    const smallest = tierRows(COMPARE_RUN, Math.min(...tiers)).find((row) => row.kcq);
    if (!smallest) throw new Error("The run has no KCQ scenario at its smallest tier");
    expect(growth.from).toBe(smallest.scenario.actualVisibleBars);
    expect(growth.to).toBe(best.scenario.actualVisibleBars);
    expect(1 + growth.rate).toBeCloseTo(best.scenario.mainThreadMsPerFrame / smallest.scenario.mainThreadMsPerFrame);
  });
});
