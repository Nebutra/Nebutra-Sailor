import { describe, expect, it } from "vitest";
import {
  fromWeeklyCommitActivity,
  getContributionLevel,
  type WeeklyCommitActivity,
} from "../github-calendar-data";

describe("fromWeeklyCommitActivity", () => {
  it("maps each week's 7 daily counts to dated ContributionDay entries", () => {
    // 2024-01-07 is a Sunday (UTC midnight), matching GitHub's `week` field.
    const sundayUtc = Date.UTC(2024, 0, 7, 0, 0, 0) / 1000;
    const weeks: WeeklyCommitActivity[] = [
      { week: sundayUtc, days: [0, 1, 2, 3, 0, 5, 0], total: 11 },
    ];

    const result = fromWeeklyCommitActivity(weeks);

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ date: "2024-01-07", count: 0 });
    expect(result[1]).toEqual({ date: "2024-01-08", count: 1 });
    expect(result[3]).toEqual({ date: "2024-01-10", count: 3 });
    expect(result[6]).toEqual({ date: "2024-01-13", count: 0 });
  });

  it("rolls over month and year boundaries correctly", () => {
    // Sunday 2023-12-31 UTC — the week straddles the year boundary.
    const sundayUtc = Date.UTC(2023, 11, 31, 0, 0, 0) / 1000;
    const weeks: WeeklyCommitActivity[] = [{ week: sundayUtc, days: [1, 1, 1, 1, 1, 1, 1] }];

    const result = fromWeeklyCommitActivity(weeks);

    expect(result.map((d) => d.date)).toEqual([
      "2023-12-31",
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
      "2024-01-04",
      "2024-01-05",
      "2024-01-06",
    ]);
  });

  it("flattens multiple weeks in order", () => {
    const week1 = Date.UTC(2024, 0, 7) / 1000;
    const week2 = Date.UTC(2024, 0, 14) / 1000;
    const weeks: WeeklyCommitActivity[] = [
      { week: week1, days: [0, 0, 0, 0, 0, 0, 0] },
      { week: week2, days: [1, 2, 3, 4, 5, 6, 7] },
    ];

    const result = fromWeeklyCommitActivity(weeks);

    expect(result).toHaveLength(14);
    expect(result[7]).toEqual({ date: "2024-01-14", count: 1 });
    expect(result[13]).toEqual({ date: "2024-01-20", count: 7 });
  });

  it("defaults a missing day count to 0", () => {
    const week = Date.UTC(2024, 0, 7) / 1000;
    // Malformed input: only 3 days instead of 7.
    const weeks: WeeklyCommitActivity[] = [{ week, days: [2, 0, 4] }];

    const result = fromWeeklyCommitActivity(weeks);

    expect(result).toHaveLength(3);
    expect(result.every((d) => typeof d.count === "number")).toBe(true);
  });

  it("returns an empty array for empty input", () => {
    expect(fromWeeklyCommitActivity([])).toEqual([]);
  });
});

describe("getContributionLevel", () => {
  it("maps 0 contributions to level 0 (empty)", () => {
    expect(getContributionLevel(0)).toBe(0);
  });

  it("maps 1-3 contributions to their matching mid levels", () => {
    expect(getContributionLevel(1)).toBe(1);
    expect(getContributionLevel(2)).toBe(2);
    expect(getContributionLevel(3)).toBe(3);
  });

  it("caps counts of 4+ at the top level", () => {
    expect(getContributionLevel(4)).toBe(4);
    expect(getContributionLevel(100)).toBe(4);
  });

  it("uses custom thresholds when provided and matching the level count", () => {
    // Levels: 0 (<10), 1 (>=10), 2 (>=25), 3 (>=50), 4 (>=100)
    const thresholds = [0, 10, 25, 50, 100];

    expect(getContributionLevel(5, thresholds)).toBe(0);
    expect(getContributionLevel(10, thresholds)).toBe(1);
    expect(getContributionLevel(24, thresholds)).toBe(1);
    expect(getContributionLevel(25, thresholds)).toBe(2);
    expect(getContributionLevel(100, thresholds)).toBe(4);
  });

  it("ignores thresholds that don't match the level count and falls back to defaults", () => {
    const mismatchedThresholds = [0, 5, 10];

    expect(getContributionLevel(2, mismatchedThresholds)).toBe(2);
  });
});
