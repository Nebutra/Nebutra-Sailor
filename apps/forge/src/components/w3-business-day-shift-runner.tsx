"use client";

/**
 * Business day calculator — configure-then-generate (brief §8).
 *
 * The rule set *is* the product: weekend definition, holiday list, makeup
 * workdays and the inclusive/exclusive switch decide the answer, and changing
 * any one of them changes every subsequent result. So the shell recomputes
 * live and there is deliberately no Calculate button — the incumbent gates even
 * this trivial arithmetic behind one (§9.3 must-have #6).
 *
 * The rule-set line travels with the result rather than hiding behind a
 * details toggle (§9.3 must-have #5): a business-day count separated from the
 * calendar that produced it is a number nobody can reconcile.
 */
import { ArrowRight, Calendar } from "@nebutra/icons";
import { Button, Checkbox, DatePicker, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ConfigureGenerateShell,
  ShellBadge,
  ShellNote,
  ShellVerdict,
} from "@/components/journey-shells";

type Mode = "shift" | "countBetween";
type Classification = "workday" | "weekend" | "holiday" | "makeupWorkday";

interface Output {
  mode: Mode;
  result: { date?: string; count?: number; dateClassification?: Classification };
  ruleSetUsed: {
    weekendDays: number[];
    holidayCount: number;
    makeupWorkdayCount: number;
    includeEndDate?: boolean;
  };
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day, not UTC — "today" for a person is their own Thursday. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface DateList {
  dates: string[];
  ignored: number;
}

/** One date per line or comma-separated; anything unparseable is counted, not silently dropped. */
function parseDateList(raw: string): DateList {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const dates: string[] = [];
  let ignored = 0;
  for (const token of tokens) {
    if (ISO_DATE.test(token)) dates.push(token);
    else ignored += 1;
  }
  return { dates, ignored };
}

function parseSignedInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

export function W3BusinessDayShiftRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();

  const [mode, setMode] = useState<Mode>("shift");
  // Empty on the server, today after mount — a date computed during render
  // would disagree between the two passes and break hydration.
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("10");
  const [endDate, setEndDate] = useState("");
  const [includeEndDate, setIncludeEndDate] = useState(false);
  const [weekendDays, setWeekendDays] = useState<number[]>([0, 6]);
  const [holidayText, setHolidayText] = useState("");
  const [makeupText, setMakeupText] = useState("");

  useEffect(() => {
    setStartDate((current) => current || todayIso());
  }, []);

  const holidays = useMemo(() => parseDateList(holidayText), [holidayText]);
  const makeups = useMemo(() => parseDateList(makeupText), [makeupText]);

  const toggleWeekend = useCallback((day: number) => {
    setWeekendDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  const parsedDays = parseSignedInt(days);

  const input = useMemo(() => {
    if (!ISO_DATE.test(startDate)) return null;
    const base = {
      startDate,
      weekendDays,
      holidays: holidays.dates,
      makeupWorkdays: makeups.dates,
    };
    if (mode === "shift") {
      if (parsedDays === null) return null;
      return { ...base, mode, days: parsedDays };
    }
    if (!ISO_DATE.test(endDate)) return null;
    return { ...base, mode, endDate, includeEndDate };
  }, [
    endDate,
    holidays.dates,
    includeEndDate,
    makeups.dates,
    mode,
    parsedDays,
    startDate,
    weekendDays,
  ]);

  const ruleLine = useCallback(
    (rules: Output["ruleSetUsed"]) => {
      const parts: string[] = [];
      parts.push(
        rules.weekendDays.length === 0
          ? t("businessDayShift.ruleNoWeekend")
          : t("businessDayShift.ruleWeekend", {
              days: rules.weekendDays
                .map((d) => t(`businessDayShift.weekday.${WEEKDAY_KEYS[d]}`))
                .join(", "),
            }),
      );
      parts.push(t("businessDayShift.ruleHolidays", { n: rules.holidayCount }));
      parts.push(t("businessDayShift.ruleMakeups", { n: rules.makeupWorkdayCount }));
      if (rules.includeEndDate !== undefined) {
        parts.push(
          rules.includeEndDate
            ? t("businessDayShift.ruleEndIncluded")
            : t("businessDayShift.ruleEndExcluded"),
        );
      }
      return parts.join(" · ");
    },
    [t],
  );

  const chainFrom = useCallback((date: string) => {
    setMode("shift");
    setStartDate(date);
  }, []);

  return (
    <ConfigureGenerateShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      input={input}
      emptyHint={
        mode === "shift"
          ? t("businessDayShift.emptyHintShift")
          : t("businessDayShift.emptyHintCount")
      }
      note={t("businessDayShift.note")}
      exit={(o) => ({
        text: o.mode === "shift" ? (o.result.date ?? "") : String(o.result.count ?? ""),
        json: o,
      })}
      renderResult={(o) => {
        const negative = (o.result.count ?? 0) < 0;
        return (
          <div className="space-y-3">
            <ShellVerdict
              tone={negative ? "warning" : "info"}
              headline={
                o.mode === "shift"
                  ? (o.result.date ?? "")
                  : t("businessDayShift.countHeadline", { n: o.result.count ?? 0 })
              }
              caveat={
                o.mode === "countBetween" && negative
                  ? t("businessDayShift.reversedRange")
                  : undefined
              }
              badges={
                o.result.dateClassification ? (
                  <ShellBadge
                    tone={
                      o.result.dateClassification === "makeupWorkday"
                        ? "warning"
                        : o.result.dateClassification === "workday"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {t(`businessDayShift.classification.${o.result.dateClassification}`)}
                  </ShellBadge>
                ) : null
              }
            />
            <p className="text-sm text-[var(--neutral-11)]">{ruleLine(o.ruleSetUsed)}</p>
            {o.mode === "shift" && o.result.date ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => chainFrom(o.result.date as string)}
              >
                <ArrowRight className="h-4 w-4" />
                {t("businessDayShift.chain")}
              </Button>
            ) : null}
          </div>
        );
      }}
    >
      <div
        className="flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label={t("businessDayShift.modeLabel")}
      >
        {(["shift", "countBetween"] as const).map((id) => (
          // biome-ignore lint/a11y/useSemanticElements: raw <input type="radio"> is banned in apps/** — button + radio role is the DS-compliant path
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() => setMode(id)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              mode === id
                ? "bg-[var(--blue-3)] text-[var(--neutral-12)]"
                : "bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]"
            }`}
          >
            {t(`businessDayShift.mode.${id}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DatePicker
          id={`${uid}-start`}
          label={t("businessDayShift.startDate")}
          value={startDate}
          onValueChange={setStartDate}
        />
        {mode === "shift" ? (
          <Input
            id={`${uid}-days`}
            type="number"
            step={1}
            label={t("businessDayShift.days")}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-40"
          />
        ) : (
          <DatePicker
            id={`${uid}-end`}
            label={t("businessDayShift.endDate")}
            value={endDate}
            onValueChange={setEndDate}
          />
        )}
      </div>
      {mode === "shift" && days.trim() !== "" && parsedDays === null ? (
        <ShellNote>{t("businessDayShift.daysInvalid")}</ShellNote>
      ) : null}
      {mode === "shift" ? <ShellNote>{t("businessDayShift.daysHint")}</ShellNote> : null}

      {mode === "countBetween" ? (
        <Checkbox id={`${uid}-include`} checked={includeEndDate} onChange={setIncludeEndDate}>
          <span className="text-sm">{t("businessDayShift.includeEndDate")}</span>
        </Checkbox>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--neutral-11)]">
          {t("businessDayShift.weekendLabel")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_KEYS.map((key, index) => {
            const on = weekendDays.includes(index);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleWeekend(index)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  on
                    ? "bg-[var(--blue-3)] text-[var(--neutral-12)]"
                    : "bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]"
                }`}
              >
                {t(`businessDayShift.weekday.${key}`)}
              </button>
            );
          })}
        </div>
        <ShellNote>{t("businessDayShift.weekendHint")}</ShellNote>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Textarea
            id={`${uid}-holidays`}
            label={t("businessDayShift.holidays")}
            value={holidayText}
            placeholder={t("businessDayShift.datesPlaceholder")}
            rows={4}
            onChange={(e) => setHolidayText(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
          />
          <ShellNote>
            {holidays.ignored > 0
              ? t("businessDayShift.datesIgnored", { n: holidays.ignored })
              : t("businessDayShift.holidaysHint")}
          </ShellNote>
        </div>
        <div className="space-y-1.5">
          <Textarea
            id={`${uid}-makeups`}
            label={t("businessDayShift.makeupWorkdays")}
            value={makeupText}
            placeholder={t("businessDayShift.datesPlaceholder")}
            rows={4}
            onChange={(e) => setMakeupText(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
          />
          <ShellNote>
            {makeups.ignored > 0
              ? t("businessDayShift.datesIgnored", { n: makeups.ignored })
              : t("businessDayShift.makeupHint")}
          </ShellNote>
        </div>
      </div>

      {!startDate ? (
        <p className="flex items-center gap-2 text-sm text-[var(--neutral-11)]">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          {t("businessDayShift.pickStart")}
        </p>
      ) : null}
    </ConfigureGenerateShell>
  );
}
