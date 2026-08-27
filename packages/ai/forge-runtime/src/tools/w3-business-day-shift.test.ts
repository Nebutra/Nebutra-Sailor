import { describe, expect, it } from "vitest";
import {
  type BusinessDayShiftOutput,
  buildRuleSet,
  businessDayShiftTool,
  classifyDay,
  countBusinessDays,
  dayOfWeek,
  epochDayToIso,
  parseIsoDate,
  w3BusinessDayShiftTools,
} from "./w3-business-day-shift";

function run(input: unknown): BusinessDayShiftOutput {
  const parsed = businessDayShiftTool.inputSchema.parse(input);
  return businessDayShiftTool.execute(parsed) as BusinessDayShiftOutput;
}

function rejects(input: unknown): boolean {
  return !businessDayShiftTool.inputSchema.safeParse(input).success;
}

/**
 * Anchors used throughout, verified against the proleptic Gregorian calendar:
 * 2026-07-27 Mon · 07-30 Thu · 07-31 Fri · 08-01 Sat · 08-02 Sun · 08-03 Mon.
 */
const MON = "2026-07-27";
const THU = "2026-07-30";
const FRI = "2026-07-31";
const SAT = "2026-08-01";
const NEXT_MON = "2026-08-03";

describe("definition", () => {
  it("declares a pure, deterministic contract", () => {
    expect(businessDayShiftTool.id).toBe("time/business-day-shift");
    expect(businessDayShiftTool.category).toBe("time");
    expect(businessDayShiftTool.slug).toBe("business-day-shift");
    expect(businessDayShiftTool.id).toBe(
      `${businessDayShiftTool.category}/${businessDayShiftTool.slug}`,
    );
    expect(businessDayShiftTool.sideEffect).toBe("pure");
    expect(businessDayShiftTool.meterId).toBe("forge.time.business_day_shift");
    expect(businessDayShiftTool.roots).toContain("simulator");
    expect(businessDayShiftTool.engine.upstream).toContain("ISO 8601");
    expect(w3BusinessDayShiftTools).toContain(businessDayShiftTool);
  });

  it("is deterministic — same input, identical output", () => {
    const input = { mode: "shift", startDate: THU, days: 10 };
    expect(run(input)).toEqual(run(input));
  });
});

describe("date primitives", () => {
  it("keeps single-digit years out of the 1900s (Date.UTC trap)", () => {
    expect(epochDayToIso(parseIsoDate("0001-01-01"))).toBe("0001-01-01");
    expect(epochDayToIso(parseIsoDate("0042-06-15"))).toBe("0042-06-15");
  });

  it("numbers weekdays 0=Sunday..6=Saturday, before and after the epoch", () => {
    expect(dayOfWeek(parseIsoDate("1970-01-01"))).toBe(4); // Thursday
    expect(dayOfWeek(parseIsoDate("1969-12-31"))).toBe(3); // Wednesday
    expect(dayOfWeek(parseIsoDate(SAT))).toBe(6);
  });

  it("rejects a date that is not on the calendar", () => {
    expect(() => parseIsoDate("2026-02-30")).toThrow(/invalid_date/);
    expect(() => parseIsoDate("2026-13-01")).toThrow(/invalid_date/);
    expect(() => parseIsoDate("2026-7-30")).toThrow(/invalid_date/);
    // 2026 is not a leap year; 2024 is.
    expect(() => parseIsoDate("2026-02-29")).toThrow(/invalid_date/);
    expect(epochDayToIso(parseIsoDate("2024-02-29"))).toBe("2024-02-29");
  });
});

describe("mode=shift", () => {
  it("does not count the start date and lands on the next working day", () => {
    // WORKDAY convention: Thursday + 1 business day is Friday, not Thursday.
    expect(run({ mode: "shift", startDate: THU, days: 1 }).result.date).toBe(FRI);
  });

  it("steps over the weekend", () => {
    expect(run({ mode: "shift", startDate: FRI, days: 1 }).result.date).toBe(NEXT_MON);
  });

  it("projects ten business days out", () => {
    // 07-31, 08-03..08-07, 08-10..08-13 — ten working days, landing Thursday.
    expect(run({ mode: "shift", startDate: THU, days: 10 }).result.date).toBe("2026-08-13");
  });

  it("returns the start date untouched for days=0, classified (§9.4 single-date check)", () => {
    const out = run({ mode: "shift", startDate: SAT, days: 0 });
    expect(out.result.date).toBe(SAT);
    expect(out.result.dateClassification).toBe("weekend");
    const workday = run({ mode: "shift", startDate: THU, days: 0 });
    expect(workday.result.dateClassification).toBe("workday");
  });

  it("crosses a leap day and a year boundary the way WORKDAY does", () => {
    // 2024-02-28 is a Wednesday; +2 business days is Thu 29 Feb then Fri 1 Mar.
    expect(run({ mode: "shift", startDate: "2024-02-28", days: 2 }).result.date).toBe("2024-03-01");
    // 2023-12-29 is a Friday; +1 lands on Mon 2024-01-01, not 2023-12-30.
    expect(run({ mode: "shift", startDate: "2023-12-29", days: 1 }).result.date).toBe("2024-01-01");
    // 2026 is not a leap year, so +1 from 28 Feb is 2 Mar (1 Mar is a Sunday).
    expect(run({ mode: "shift", startDate: "2026-02-27", days: 1 }).result.date).toBe("2026-03-02");
  });

  it("subtracts on a negative count instead of erroring (know-how #6)", () => {
    expect(run({ mode: "shift", startDate: NEXT_MON, days: -1 }).result.date).toBe(FRI);
    expect(run({ mode: "shift", startDate: NEXT_MON, days: -10 }).result.date).toBe("2026-07-20");
  });

  it("skips a user-supplied holiday (know-how #3 — opt-in, applied when given)", () => {
    expect(run({ mode: "shift", startDate: THU, days: 1, holidays: [FRI] }).result.date).toBe(
      NEXT_MON,
    );
    // Same call without the list is the pure weekend-rule answer.
    expect(run({ mode: "shift", startDate: THU, days: 1 }).result.date).toBe(FRI);
  });

  it("lands on a makeup workday and says so (know-how #1)", () => {
    const out = run({ mode: "shift", startDate: FRI, days: 1, makeupWorkdays: [SAT] });
    expect(out.result.date).toBe(SAT);
    expect(out.result.dateClassification).toBe("makeupWorkday");
  });

  it("honours a Friday–Saturday weekend (know-how #5)", () => {
    // Thu + 1 with Fri/Sat off is Sunday, which is a working day in that locale.
    const out = run({ mode: "shift", startDate: THU, days: 1, weekendDays: [5, 6] });
    expect(out.result.date).toBe("2026-08-02");
    expect(out.result.dateClassification).toBe("workday");
    expect(out.ruleSetUsed.weekendDays).toEqual([5, 6]);
  });

  it("classifies a holiday landing only when days=0 asks about it", () => {
    const out = run({ mode: "shift", startDate: THU, days: 0, holidays: [THU] });
    expect(out.result.dateClassification).toBe("holiday");
  });

  it("omits includeEndDate from ruleSetUsed — it has no meaning for a shift", () => {
    const out = run({ mode: "shift", startDate: THU, days: 1, includeEndDate: true });
    expect(out.ruleSetUsed.includeEndDate).toBeUndefined();
    expect(out.result.count).toBeUndefined();
  });

  it("reports the range limit rather than silently wrapping the year", () => {
    expect(() => run({ mode: "shift", startDate: "9999-12-30", days: 100 })).toThrow(
      /date_out_of_range/,
    );
  });

  it("names the failure when the rule set leaves no working day", () => {
    expect(() =>
      run({ mode: "shift", startDate: THU, days: 1, weekendDays: [0, 1, 2, 3, 4, 5, 6] }),
    ).toThrow(/no_working_day/);
  });
});

describe("mode=countBetween", () => {
  it("excludes the end date by default and includes it on request (know-how #2)", () => {
    const exclusive = run({ mode: "countBetween", startDate: MON, endDate: FRI });
    expect(exclusive.result.count).toBe(4);
    // NETWORKDAYS counts both ends — that is includeEndDate: true.
    const inclusive = run({
      mode: "countBetween",
      startDate: MON,
      endDate: FRI,
      includeEndDate: true,
    });
    expect(inclusive.result.count).toBe(5);
  });

  it("echoes includeEndDate back so a number can be reconciled (know-how #4)", () => {
    expect(run({ mode: "countBetween", startDate: MON, endDate: FRI }).ruleSetUsed).toEqual({
      weekendDays: [0, 6],
      holidayCount: 0,
      makeupWorkdayCount: 0,
      includeEndDate: false,
    });
  });

  it("skips the weekend inside the range", () => {
    expect(
      run({ mode: "countBetween", startDate: MON, endDate: NEXT_MON, includeEndDate: true }).result
        .count,
    ).toBe(6);
    expect(run({ mode: "countBetween", startDate: MON, endDate: NEXT_MON }).result.count).toBe(5);
  });

  it("answers a reversed range with a signed negative count, not an error (§9.1 step 7)", () => {
    expect(run({ mode: "countBetween", startDate: FRI, endDate: MON }).result.count).toBe(-4);
    expect(
      run({ mode: "countBetween", startDate: FRI, endDate: MON, includeEndDate: true }).result
        .count,
    ).toBe(-5);
  });

  it("treats start=end as an empty range, or as a one-day check when inclusive", () => {
    expect(run({ mode: "countBetween", startDate: THU, endDate: THU }).result.count).toBe(0);
    expect(
      run({ mode: "countBetween", startDate: THU, endDate: THU, includeEndDate: true }).result
        .count,
    ).toBe(1);
    expect(
      run({ mode: "countBetween", startDate: SAT, endDate: SAT, includeEndDate: true }).result
        .count,
    ).toBe(0);
  });

  it("subtracts a holiday once, and never subtracts one that falls on a weekend", () => {
    const withHoliday = run({
      mode: "countBetween",
      startDate: MON,
      endDate: FRI,
      includeEndDate: true,
      holidays: ["2026-07-29"],
    });
    expect(withHoliday.result.count).toBe(4);

    const weekendHoliday = run({
      mode: "countBetween",
      startDate: MON,
      endDate: NEXT_MON,
      includeEndDate: true,
      holidays: [SAT],
    });
    expect(weekendHoliday.result.count).toBe(6);
  });

  it("adds a makeup workday that falls on a weekend (know-how #1)", () => {
    const out = run({
      mode: "countBetween",
      startDate: MON,
      endDate: NEXT_MON,
      includeEndDate: true,
      makeupWorkdays: [SAT],
    });
    expect(out.result.count).toBe(7);
    expect(out.ruleSetUsed.makeupWorkdayCount).toBe(1);
  });

  it("counts the whole of 2026 as 261 weekdays", () => {
    expect(
      run({ mode: "countBetween", startDate: "2026-01-01", endDate: "2027-01-01" }).result.count,
    ).toBe(261);
  });

  it("agrees with NETWORKDAYS on a leap year, derived from the calendar not the code", () => {
    // 2024-01-01 is a Monday (Zeller) and 2024 has 366 days = 52 weeks + Mon +
    // Tue, so 52×5 + 2 = 262 weekdays. 2026-01-01 is a Thursday and 2026 has
    // 365 = 52 weeks + Thu, so 52×5 + 1 = 261. Both are what a spreadsheet
    // NETWORKDAYS over the inclusive year returns.
    expect(
      run({
        mode: "countBetween",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        includeEndDate: true,
      }).result.count,
    ).toBe(262);
    expect(
      run({
        mode: "countBetween",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        includeEndDate: true,
      }).result.count,
    ).toBe(261);
  });

  it("agrees with a day-by-day walk across ranges, weekends, holidays and makeups", () => {
    const cases = [
      { startDate: MON, endDate: "2026-12-31", weekendDays: [0, 6], includeEndDate: false },
      { startDate: MON, endDate: "2026-12-31", weekendDays: [0, 6], includeEndDate: true },
      { startDate: "2026-12-31", endDate: MON, weekendDays: [5, 6], includeEndDate: true },
      { startDate: "2025-02-01", endDate: "2027-03-15", weekendDays: [0], includeEndDate: true },
      { startDate: THU, endDate: THU, weekendDays: [0, 6], includeEndDate: true },
    ] as const;
    const holidays = ["2026-10-01", "2026-10-02", SAT, "2026-05-01", "2025-12-25"];
    const makeupWorkdays = ["2026-09-26", "2026-10-10", THU];

    for (const c of cases) {
      const rules = buildRuleSet({ weekendDays: c.weekendDays, holidays, makeupWorkdays });
      const start = parseIsoDate(c.startDate);
      const end = parseIsoDate(c.endDate);
      const step = end < start ? -1 : 1;
      let walked = 0;
      for (let day = start; day !== end; day += step) {
        const kind = classifyDay(day, rules);
        if (kind === "workday" || kind === "makeupWorkday") walked += 1;
      }
      if (c.includeEndDate) {
        const kind = classifyDay(end, rules);
        if (kind === "workday" || kind === "makeupWorkday") walked += 1;
      }
      const expected = step === -1 ? -walked : walked;
      expect(countBusinessDays(start, end, rules, c.includeEndDate)).toBe(expected);
    }
  });
});

describe("rule precedence and reporting", () => {
  it("lets a makeup workday win over a holiday on the same date", () => {
    const rules = buildRuleSet({ holidays: [SAT], makeupWorkdays: [SAT] });
    expect(classifyDay(parseIsoDate(SAT), rules)).toBe("makeupWorkday");
    expect(
      run({ mode: "shift", startDate: FRI, days: 1, holidays: [SAT], makeupWorkdays: [SAT] }).result
        .date,
    ).toBe(SAT);
  });

  it("calls a makeup entry on an ordinary weekday what it is — a workday", () => {
    const rules = buildRuleSet({ makeupWorkdays: [THU] });
    expect(classifyDay(parseIsoDate(THU), rules)).toBe("workday");
  });

  it("reports the rule set on every answer, de-duplicated (know-how #4)", () => {
    const out = run({
      mode: "shift",
      startDate: THU,
      days: 1,
      weekendDays: [6, 0, 6],
      holidays: [FRI, FRI, SAT],
      makeupWorkdays: [SAT],
    });
    expect(out.ruleSetUsed).toEqual({
      weekendDays: [0, 6],
      holidayCount: 2,
      makeupWorkdayCount: 1,
    });
  });
});

describe("schema rejects bad input", () => {
  it("rejects malformed or impossible dates", () => {
    expect(rejects({ mode: "shift", startDate: "2026-7-30", days: 1 })).toBe(true);
    expect(rejects({ mode: "shift", startDate: "30/07/2026", days: 1 })).toBe(true);
    expect(rejects({ mode: "shift", startDate: "", days: 1 })).toBe(true);
    expect(rejects({ mode: "shift", startDate: THU, days: 1, holidays: ["2026/07/31"] })).toBe(
      true,
    );
    // Well-formed but not on the calendar: caught by the engine, with a code.
    expect(() => run({ mode: "shift", startDate: "2026-02-30", days: 1 })).toThrow(/invalid_date/);
  });

  it("rejects a day count that is not a bounded integer", () => {
    expect(rejects({ mode: "shift", startDate: THU, days: 1.5 })).toBe(true);
    expect(rejects({ mode: "shift", startDate: THU, days: 1_000_000 })).toBe(true);
    expect(rejects({ mode: "shift", startDate: THU, days: "3" })).toBe(true);
  });

  it("rejects weekend days outside 0..6", () => {
    expect(rejects({ mode: "shift", startDate: THU, days: 1, weekendDays: [7] })).toBe(true);
    expect(rejects({ mode: "shift", startDate: THU, days: 1, weekendDays: [-1] })).toBe(true);
    expect(rejects({ mode: "shift", startDate: THU, days: 1, weekendDays: ["sat"] })).toBe(true);
  });

  it("requires the field the chosen mode depends on", () => {
    expect(rejects({ mode: "shift", startDate: THU })).toBe(true);
    expect(rejects({ mode: "countBetween", startDate: THU })).toBe(true);
    expect(rejects({ mode: "sideways", startDate: THU, days: 1 })).toBe(true);
    expect(rejects({ days: 1 })).toBe(true);
  });

  it("defaults mode to shift and includeEndDate to false", () => {
    const parsed = businessDayShiftTool.inputSchema.parse({ startDate: THU, days: 1 });
    expect(parsed).toMatchObject({ mode: "shift", includeEndDate: false });
  });

  it("caps hand-maintained date lists", () => {
    const many = Array.from({ length: 1_001 }, () => THU);
    expect(rejects({ mode: "shift", startDate: THU, days: 1, holidays: many })).toBe(true);
  });
});
