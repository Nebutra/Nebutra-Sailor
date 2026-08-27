/**
 * business-day-shift — project a date N business days out, or count the
 * business days between two dates (Simulator root).
 *
 * Pure calendar-rule projection: the arithmetic is trivial once the *rule set*
 * is fixed, and the rule set is the whole problem. What the brief demands
 * beyond a naive "skip Sat/Sun" clone (docs/plans/tools/business-day-shift.md §7):
 *
 *  1. A business day is not "not Saturday/Sunday". China's 调休/补班 scheme moves
 *     work onto specific Saturdays around every multi-day holiday, so a working
 *     Saturday is a real state a generic weekend rule cannot express. Modelled
 *     generically as `makeupWorkdays` — an explicit list of dates that are
 *     worked despite the base rule saying otherwise — rather than a bundled
 *     country calendar this tool would then have to maintain (§9.4).
 *  2. Inclusive vs exclusive endpoint counting is a silently-different
 *     convention between tools. `includeEndDate` is explicit either way, and is
 *     echoed back in `ruleSetUsed` so a number can be reconciled against a
 *     spreadsheet (`NETWORKDAYS` counts both ends — that is `includeEndDate:
 *     true` here).
 *  3. Holiday-awareness is opt-in: with no `holidays` supplied the answer is
 *     the pure weekend-rule count, which is what a user matching a bare
 *     `WORKDAY` call expects.
 *  4. The rule set travels with the answer. `ruleSetUsed` is always populated,
 *     so a number is never separated from the weekend definition and the
 *     holiday/makeup list sizes that produced it.
 *  5. Weekends are configurable (`weekendDays`), because Friday–Saturday and
 *     Thursday–Friday weekends exist and a Sat/Sun hardcode is simply wrong in
 *     those locales.
 *  6. Negative day counts subtract rather than error — "10 business days before
 *     this date" is a named use case, not bad input. Likewise an `endDate`
 *     before `startDate` yields a signed negative count, not a rejection.
 *
 * Precedence, stated once and applied everywhere: makeupWorkday > holiday >
 * weekend > workday. The makeup list is the adjustment layer published on top
 * of the base calendar, so it wins; a date in both `holidays` and
 * `makeupWorkdays` is therefore worked.
 *
 * Determinism: no clock, no locale, no randomness. Dates are handled as UTC
 * epoch-day integers, so no host time zone can shift an answer, and "today" is
 * an input the caller supplies rather than something this tool reads.
 *
 * Specs implemented: ISO 8601-1:2019 calendar date representation
 * (`YYYY-MM-DD`, proleptic Gregorian) for every date in and out; the
 * spreadsheet WORKDAY / NETWORKDAYS counting convention for the two modes.
 * Weekday numbering here is 0=Sunday..6=Saturday (the spreadsheet/JS
 * convention), deliberately *not* ISO 8601's 1=Monday..7=Sunday — the field is
 * documented as such rather than silently reinterpreted.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── constants ─────────────────────────────────────────────────────────── */

const MS_PER_DAY = 86_400_000;
/** ISO 8601 calendar dates in this tool stay inside the four-digit year form. */
const MIN_EPOCH_DAY = isoToEpochDayUnchecked(1, 1, 1);
const MAX_EPOCH_DAY = isoToEpochDayUnchecked(9999, 12, 31);
/** A signed shift larger than this is a data-entry slip, not a deadline. */
const MAX_SHIFT_DAYS = 100_000;
/** Hand-maintained lists; past this a user needs a calendar feed, not a form. */
const MAX_DATE_LIST = 1_000;
/**
 * Walk bound for `shift`. Reached only when the rule set leaves (almost) no
 * working days at all — better a named error than a frozen page.
 */
const MAX_SHIFT_SCAN_DAYS = 1_000_000;

export const DEFAULT_WEEKEND_DAYS: readonly number[] = [0, 6];

/* ── date primitives (UTC epoch days — no host time zone can move these) ── */

/**
 * `Date.UTC` maps years 0–99 onto 1900–1999, which would quietly turn 0042-01-01
 * into 1942. Setting the fields on an epoch-anchored Date keeps year 1 as year 1.
 */
function isoToEpochDayUnchecked(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime() / MS_PER_DAY;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Strict ISO 8601 calendar date. Round-tripping through the constructed date
 * is what rejects 2026-02-30 — `Date.UTC` would happily roll it to March 2.
 */
export function parseIsoDate(value: string): number {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new Error(`invalid_date: ${JSON.stringify(value)} is not an ISO 8601 date (YYYY-MM-DD).`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`invalid_date: ${value} has an out-of-range month or day.`);
  }
  const epochDay = isoToEpochDayUnchecked(year, month, day);
  if (!Number.isFinite(epochDay)) throw new Error(`invalid_date: ${value} is not a real date.`);
  const back = new Date(epochDay * MS_PER_DAY);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() + 1 !== month ||
    back.getUTCDate() !== day
  ) {
    throw new Error(`invalid_date: ${value} is not a real calendar date.`);
  }
  return epochDay;
}

export function epochDayToIso(epochDay: number): string {
  if (epochDay < MIN_EPOCH_DAY || epochDay > MAX_EPOCH_DAY) {
    throw new Error(
      "date_out_of_range: the result falls outside the ISO 8601 four-digit year range (0001-01-01 … 9999-12-31).",
    );
  }
  const date = new Date(epochDay * MS_PER_DAY);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 0=Sunday … 6=Saturday, matching the `weekendDays` field. */
export function dayOfWeek(epochDay: number): number {
  return ((epochDay % 7) + 11) % 7;
}

/* ── rule set ──────────────────────────────────────────────────────────── */

export type DateClassification = "workday" | "weekend" | "holiday" | "makeupWorkday";

export interface RuleSet {
  weekendDays: readonly number[];
  weekend: ReadonlySet<number>;
  holidays: ReadonlySet<number>;
  makeupWorkdays: ReadonlySet<number>;
}

function toDaySet(dates: readonly string[] | undefined): Set<number> {
  const out = new Set<number>();
  for (const value of dates ?? []) out.add(parseIsoDate(value));
  return out;
}

export function buildRuleSet(input: {
  weekendDays?: readonly number[] | undefined;
  holidays?: readonly string[] | undefined;
  makeupWorkdays?: readonly string[] | undefined;
}): RuleSet {
  const weekendDays = [...new Set(input.weekendDays ?? DEFAULT_WEEKEND_DAYS)].sort((a, b) => a - b);
  return {
    weekendDays,
    weekend: new Set(weekendDays),
    holidays: toDaySet(input.holidays),
    makeupWorkdays: toDaySet(input.makeupWorkdays),
  };
}

/**
 * The four-state model (know-how #1). `makeupWorkday` is reported only when the
 * makeup list actually overrides a non-working base day — a makeup entry landing
 * on an ordinary Tuesday is just a workday, and saying otherwise would invent a
 * distinction the calendar does not make.
 */
export function classifyDay(epochDay: number, rules: RuleSet): DateClassification {
  const isWeekend = rules.weekend.has(dayOfWeek(epochDay));
  const isHoliday = rules.holidays.has(epochDay);
  if (rules.makeupWorkdays.has(epochDay)) {
    return isWeekend || isHoliday ? "makeupWorkday" : "workday";
  }
  if (isHoliday) return "holiday";
  if (isWeekend) return "weekend";
  return "workday";
}

export function isWorkingDay(epochDay: number, rules: RuleSet): boolean {
  const kind = classifyDay(epochDay, rules);
  return kind === "workday" || kind === "makeupWorkday";
}

/* ── mode: shift ───────────────────────────────────────────────────────── */

/**
 * WORKDAY semantics: the start date is never counted, and each working day
 * crossed consumes one unit. `days === 0` returns the start date untouched —
 * that is the single-date check (§9.4), not a snap to the nearest workday.
 */
export function shiftBusinessDays(startEpochDay: number, days: number, rules: RuleSet): number {
  if (days === 0) return startEpochDay;
  const step = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  let cursor = startEpochDay;
  let scanned = 0;
  while (remaining > 0) {
    cursor += step;
    scanned += 1;
    if (scanned > MAX_SHIFT_SCAN_DAYS) {
      throw new Error(
        "no_working_day: the rule set leaves too few working days to satisfy this shift — widen the weekend definition or shorten the holiday list.",
      );
    }
    if (cursor < MIN_EPOCH_DAY || cursor > MAX_EPOCH_DAY) {
      throw new Error(
        "date_out_of_range: the result falls outside the ISO 8601 four-digit year range (0001-01-01 … 9999-12-31).",
      );
    }
    if (isWorkingDay(cursor, rules)) remaining -= 1;
  }
  return cursor;
}

/* ── mode: countBetween ────────────────────────────────────────────────── */

/** Working days in the half-open interval [from, to) under the weekend rule alone. */
function weekendRuleCount(from: number, to: number, rules: RuleSet): number {
  const span = to - from;
  if (span <= 0) return 0;
  const workingPerWeek = 7 - rules.weekend.size;
  const fullWeeks = Math.floor(span / 7);
  let count = fullWeeks * workingPerWeek;
  for (let day = from + fullWeeks * 7; day < to; day += 1) {
    if (!rules.weekend.has(dayOfWeek(day))) count += 1;
  }
  return count;
}

/**
 * Signed business-day count between two dates.
 *
 * The interval is directional and half-open at the end date: forward it is
 * [start, end), backward it is (end, start] — the start date always counts, the
 * end date counts only when `includeEndDate` is set (know-how #2). With
 * `includeEndDate: true` and a forward range this is exactly `NETWORKDAYS`.
 * A backward range answers with a negative number rather than an error
 * (know-how #6 applied to the second mode).
 *
 * Closed-form over the weekend rule plus a bounded pass over the two date
 * lists, so a 9,000-year span costs the same as a one-week span.
 */
export function countBusinessDays(
  startEpochDay: number,
  endEpochDay: number,
  rules: RuleSet,
  includeEndDate: boolean,
): number {
  const backward = endEpochDay < startEpochDay;
  // Half-open core, oriented low→high; the end date is added separately so the
  // two directions share one code path.
  const low = backward ? endEpochDay + 1 : startEpochDay;
  const high = backward ? startEpochDay + 1 : endEpochDay;

  let count = weekendRuleCount(low, high, rules);
  for (const holiday of rules.holidays) {
    if (holiday < low || holiday >= high) continue;
    if (rules.makeupWorkdays.has(holiday)) continue;
    if (rules.weekend.has(dayOfWeek(holiday))) continue;
    count -= 1;
  }
  for (const makeup of rules.makeupWorkdays) {
    if (makeup < low || makeup >= high) continue;
    if (rules.weekend.has(dayOfWeek(makeup))) count += 1;
  }
  if (includeEndDate && isWorkingDay(endEpochDay, rules)) count += 1;
  return backward ? -count : count;
}

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type BusinessDayMode = "shift" | "countBetween";

export interface BusinessDayResult {
  /** mode=shift: the landing date, ISO 8601. */
  date?: string;
  /** mode=countBetween: signed count, negative when endDate precedes startDate. */
  count?: number;
  /** mode=shift: the four-state classification of the landing date. */
  dateClassification?: DateClassification;
}

export interface BusinessDayRuleSetUsed {
  weekendDays: number[];
  holidayCount: number;
  makeupWorkdayCount: number;
  /** Echoed for mode=countBetween only — it has no meaning for a shift. */
  includeEndDate?: boolean;
}

export interface BusinessDayShiftOutput {
  mode: BusinessDayMode;
  result: BusinessDayResult;
  ruleSetUsed: BusinessDayRuleSetUsed;
}

/* ── tool definition ───────────────────────────────────────────────────── */

const isoDateField = z
  .string()
  .regex(ISO_DATE, "Expected an ISO 8601 calendar date, e.g. 2026-07-30.");

const inputSchema = z
  .object({
    mode: z
      .enum(["shift", "countBetween"])
      .default("shift")
      .describe(
        "shift: project `days` business days from `startDate`. countBetween: count business days from `startDate` to `endDate`.",
      ),
    startDate: isoDateField.describe(
      "The date to start from, ISO 8601 (YYYY-MM-DD). Always counted in countBetween mode; never counted as a step in shift mode.",
    ),
    days: z
      .number()
      .int()
      .min(-MAX_SHIFT_DAYS)
      .max(MAX_SHIFT_DAYS)
      .optional()
      .describe(
        "mode=shift only, required there. Signed business-day count: negative shifts backward. 0 returns startDate unchanged (a single-date check).",
      ),
    endDate: isoDateField
      .optional()
      .describe(
        "mode=countBetween only, required there. May precede startDate — the count then comes back negative rather than erroring.",
      ),
    includeEndDate: z
      .boolean()
      .default(false)
      .describe(
        "mode=countBetween only. false (default) counts [startDate, endDate); true also counts endDate itself, which is what a spreadsheet NETWORKDAYS returns.",
      ),
    weekendDays: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .optional()
      .describe(
        "Non-working days of the week, 0=Sunday..6=Saturday (spreadsheet numbering, not ISO 8601's 1=Monday). Default [0,6]. Use [5,6] for a Friday–Saturday weekend.",
      ),
    holidays: z
      .array(isoDateField)
      .max(MAX_DATE_LIST)
      .optional()
      .describe(
        "Extra non-working dates (ISO 8601). Omit for a pure weekend-rule answer — no country calendar is applied implicitly.",
      ),
    makeupWorkdays: z
      .array(isoDateField)
      .max(MAX_DATE_LIST)
      .optional()
      .describe(
        "Dates worked despite the base rule (China's 调休/补班 mechanism, generically). Overrides both weekendDays and holidays for those dates.",
      ),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "shift" && value.days === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: "`days` is required when mode is `shift`.",
      });
    }
    if (value.mode === "countBetween" && value.endDate === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "`endDate` is required when mode is `countBetween`.",
      });
    }
  });

export type BusinessDayShiftInput = z.infer<typeof inputSchema>;

export function runBusinessDayShift(input: BusinessDayShiftInput): BusinessDayShiftOutput {
  const rules = buildRuleSet(input);
  const startEpochDay = parseIsoDate(input.startDate);
  const ruleSetUsed: BusinessDayRuleSetUsed = {
    weekendDays: [...rules.weekendDays],
    holidayCount: rules.holidays.size,
    makeupWorkdayCount: rules.makeupWorkdays.size,
  };

  if (input.mode === "countBetween") {
    if (input.endDate === undefined) {
      throw new Error("missing_end_date: `endDate` is required when mode is `countBetween`.");
    }
    const includeEndDate = input.includeEndDate ?? false;
    const endEpochDay = parseIsoDate(input.endDate);
    return {
      mode: "countBetween",
      result: { count: countBusinessDays(startEpochDay, endEpochDay, rules, includeEndDate) },
      ruleSetUsed: { ...ruleSetUsed, includeEndDate },
    };
  }

  if (input.days === undefined) {
    throw new Error("missing_days: `days` is required when mode is `shift`.");
  }
  const landing = shiftBusinessDays(startEpochDay, input.days, rules);
  return {
    mode: "shift",
    result: {
      date: epochDayToIso(landing),
      dateClassification: classifyDay(landing, rules),
    },
    ruleSetUsed,
  };
}

export const businessDayShiftTool = tool({
  id: "time/business-day-shift",
  slug: "business-day-shift",
  category: "time",
  title: { zh: "工作日计算器", en: "Business Day Calculator" },
  description: {
    zh: "按工作日推算日期或计算两日期间的工作日天数：支持负数回推、自定义周末（如周五–周六）、自定义节假日与调休补班日，并把所用规则随结果一起给出",
    en: "Shift a date by N business days or count the business days between two dates — signed backward shifts, custom weekend definitions, your own holiday list, makeup workdays, and the exact rule set reported with every answer",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server", "client"],
  meterId: "forge.time.business_day_shift",
  roots: ["simulator"],
  engine: {
    name: "forge-business-day-rules",
    upstream:
      "ISO 8601-1:2019 calendar date representation (YYYY-MM-DD, proleptic Gregorian) · spreadsheet WORKDAY / NETWORKDAYS counting convention · 调休/补班 makeup-workday mechanism modelled as an explicit date list rather than a bundled national calendar",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "工作日计算器,工作日天数计算,日期加工作日,两个日期之间的工作日,调休补班计算,节假日排除计算",
    en: "business days calculator, working days calculator, add business days to a date, workdays between two dates, networkdays online, custom weekend calculator",
  },
  inputSchema,
  execute: (input: BusinessDayShiftInput): BusinessDayShiftOutput => runBusinessDayShift(input),
});

export const w3BusinessDayShiftTools: readonly AnyForgeToolDefinition[] = [businessDayShiftTool];
