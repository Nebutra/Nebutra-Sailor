"use client";

/**
 * Loan amortization schedule — configure-then-generate (brief §8).
 *
 * The loan terms *are* the product: there is nothing to paste, so the shell
 * regenerates the whole schedule as the terms change and the page shows a real
 * schedule on arrival instead of an empty form behind a Calculate button —
 * the one place the brief (§9.1, §9.5) deliberately improves on every
 * competitor, all of which are submit-gated.
 *
 * Three things this file owns that the shell cannot:
 *  - term is one period count (know-how #8): a value plus a unit, summed into
 *    `termMonths` before the input is built, never two fields the engine has
 *    to reconcile.
 *  - an invalid field keeps the last valid schedule on screen (§9.1 error
 *    state) rather than blanking the page mid-keystroke.
 *  - a long schedule renders a bounded window (§9.1 large-input path); the
 *    CSV/JSON exit and the API always carry every period.
 */
import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import {
  ConfigureGenerateShell,
  ShellBadge,
  ShellDrill,
  ShellNote,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-ui";

interface Row {
  period: number;
  date?: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

interface Output {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  totalExtra: number;
  payoffPeriod: number;
  termMonths: number;
  monthsSaved: number;
  crossoverPeriod: number | null;
  periodicRate: number;
  startYearMonth: string | null;
  schedule: Row[];
}

type TermUnit = "years" | "months";

/** Rows rendered before the table asks to be expanded — a 600-period schedule must not cost a scroll-jank frame. */
const WINDOW_ROWS = 60;

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

/** Grouped to 2 decimals, currency-agnostic: the engine is unit-free. */
function money(value: number): string {
  const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value < 0 ? "-" : ""}${grouped}.${fraction}`;
}

function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function toCsv(output: Output): string {
  const dated = output.startYearMonth !== null;
  const head = dated
    ? ["period", "date", "payment", "interest", "principal", "balance"]
    : ["period", "payment", "interest", "principal", "balance"];
  const lines = [head.join(",")];
  for (const row of output.schedule) {
    const cells = dated
      ? [row.period, row.date ?? "", row.payment, row.interest, row.principal, row.balance]
      : [row.period, row.payment, row.interest, row.principal, row.balance];
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
}

interface YearRow {
  key: string;
  label: string;
  interest: number;
  principal: number;
  balance: number;
}

/** Annual roll-up: calendar years when the schedule is dated, 12-period blocks otherwise. */
function rollUp(output: Output): YearRow[] {
  const out: YearRow[] = [];
  for (const row of output.schedule) {
    const key = row.date ? row.date.slice(0, 4) : String(Math.ceil(row.period / 12));
    const last = out.at(-1);
    if (last && last.key === key) {
      last.interest = Math.round((last.interest + row.interest) * 100) / 100;
      last.principal = Math.round((last.principal + row.principal) * 100) / 100;
      last.balance = row.balance;
    } else {
      out.push({
        key,
        label: row.date ? key : `${key}`,
        interest: row.interest,
        principal: row.principal,
        balance: row.balance,
      });
    }
  }
  return out;
}

const CELL = "px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap";
const HEAD = "px-3 py-2 text-right text-xs font-medium text-[var(--neutral-11)]";

export function W3LoanAmortizationRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();

  const [principal, setPrincipal] = useState("250000");
  const [rate, setRate] = useState("6.5");
  const [termValue, setTermValue] = useState("30");
  const [termUnit, setTermUnit] = useState<TermUnit>("years");
  const [startMonth, setStartMonth] = useState("");
  const [monthlyExtra, setMonthlyExtra] = useState("");
  const [yearlyExtra, setYearlyExtra] = useState("");
  const [yearlyMonth, setYearlyMonth] = useState("1");
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [oneTimePeriod, setOneTimePeriod] = useState("");
  const [view, setView] = useState<"monthly" | "annual">("monthly");
  const [expanded, setExpanded] = useState(false);

  const { input, errors } = useMemo(() => {
    const problems: Record<string, string> = {};
    const p = parseNumber(principal);
    const r = parseNumber(rate);
    const term = parseNumber(termValue);
    if (p === null || p <= 0) problems.principal = t("loanAmortization.errPrincipal");
    if (r === null || r < 0 || r > 100) problems.rate = t("loanAmortization.errRate");
    const months = term === null ? null : Math.round(termUnit === "years" ? term * 12 : term);
    if (months === null || months < 1 || months > 1200 || (term ?? 0) <= 0) {
      problems.term = t("loanAmortization.errTerm");
    }
    if (startMonth !== "" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) {
      problems.startMonth = t("loanAmortization.errStartMonth");
    }

    const monthly = parseNumber(monthlyExtra);
    const yearly = parseNumber(yearlyExtra);
    const oneAmount = parseNumber(oneTimeAmount);
    const onePeriod = parseNumber(oneTimePeriod);
    if (monthlyExtra !== "" && (monthly === null || monthly < 0)) {
      problems.monthlyExtra = t("loanAmortization.errExtra");
    }
    if (yearlyExtra !== "" && (yearly === null || yearly < 0)) {
      problems.yearlyExtra = t("loanAmortization.errExtra");
    }
    if (oneTimeAmount !== "" && (oneAmount === null || oneAmount < 0)) {
      problems.oneTimeAmount = t("loanAmortization.errExtra");
    }
    if (
      oneTimeAmount !== "" &&
      (onePeriod === null || !Number.isInteger(onePeriod) || onePeriod < 1)
    ) {
      problems.oneTimePeriod = t("loanAmortization.errOneTimePeriod");
    }

    if (Object.keys(problems).length > 0 || p === null || r === null || months === null) {
      return { input: null, errors: problems };
    }

    const extra: Record<string, unknown> = {};
    if (monthly !== null && monthly > 0) extra.monthly = monthly;
    if (yearly !== null && yearly > 0) {
      extra.yearly = { amount: yearly, month: Number(yearlyMonth) };
    }
    if (oneAmount !== null && oneAmount > 0 && onePeriod !== null) {
      extra.oneTime = [{ amount: oneAmount, period: onePeriod }];
    }

    return {
      input: {
        principal: p,
        annualRatePercent: r,
        termMonths: months,
        ...(startMonth === "" ? {} : { startYearMonth: startMonth }),
        ...(Object.keys(extra).length > 0 ? { extraPayments: extra } : {}),
      } as Record<string, unknown>,
      errors: problems,
    };
  }, [
    principal,
    rate,
    termValue,
    termUnit,
    startMonth,
    monthlyExtra,
    yearlyExtra,
    yearlyMonth,
    oneTimeAmount,
    oneTimePeriod,
    t,
  ]);

  // A half-typed field must not blank a schedule the user is reading (§9.1
  // error state): the last valid terms stay on screen, flagged inline above.
  const lastValid = useRef<Record<string, unknown> | null>(null);
  if (input !== null) lastValid.current = input;
  const effective = input ?? lastValid.current;

  return (
    <ConfigureGenerateShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      input={effective}
      emptyHint={t("loanAmortization.emptyHint")}
      note={t("loanAmortization.note")}
      layout="stack"
      exit={(o) => ({
        text: toCsv(o),
        json: o,
        filename: "amortization-schedule.csv",
        mimeType: "text/csv;charset=utf-8",
      })}
      renderResult={(o) => {
        const rows = o.schedule;
        const shown = expanded ? rows : rows.slice(0, WINDOW_ROWS);
        const dated = o.startYearMonth !== null;
        const years = view === "annual" ? rollUp(o) : [];
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "payment",
                  label: t("loanAmortization.monthlyPayment"),
                  value: money(o.monthlyPayment),
                },
                {
                  key: "interest",
                  label: t("loanAmortization.totalInterest"),
                  value: money(o.totalInterest),
                },
                { key: "paid", label: t("loanAmortization.totalPaid"), value: money(o.totalPaid) },
                {
                  key: "crossover",
                  label: t("loanAmortization.crossover"),
                  value:
                    o.crossoverPeriod === null
                      ? t("loanAmortization.crossoverNone")
                      : t("loanAmortization.crossoverValue", { n: o.crossoverPeriod }),
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="min-w-0 rounded-[var(--radius-lg)] bg-[var(--neutral-3)] px-4 py-3"
                >
                  <p className="text-xs text-[var(--neutral-11)]">{item.label}</p>
                  <p className="mt-1.5 truncate font-mono text-lg font-semibold tracking-tight text-[var(--neutral-12)] tabular-nums whitespace-nowrap sm:text-xl">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ShellBadge tone="info">
                {t("loanAmortization.payoff", { n: o.payoffPeriod })}
              </ShellBadge>
              {o.monthsSaved > 0 ? (
                <ShellBadge tone="success">
                  {t("loanAmortization.monthsSaved", { n: o.monthsSaved })}
                </ShellBadge>
              ) : null}
              {o.totalExtra > 0 ? (
                <ShellBadge tone="neutral">
                  {t("loanAmortization.totalExtra", { amount: money(o.totalExtra) })}
                </ShellBadge>
              ) : null}
              <div className="flex gap-1.5">
                {(["monthly", "annual"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={view === mode ? "ink" : "ghost"}
                    size="sm"
                    onClick={() => setView(mode)}
                  >
                    {mode === "monthly"
                      ? t("loanAmortization.viewMonthly")
                      : t("loanAmortization.viewAnnual")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
              {view === "monthly" ? (
                <table className="w-full min-w-[34rem] text-sm">
                  <caption className="sr-only">{t("loanAmortization.tableCaption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={`${HEAD} text-left`}>
                        {t("loanAmortization.colPeriod")}
                      </th>
                      {dated ? (
                        <th scope="col" className={`${HEAD} hidden text-left sm:table-cell`}>
                          {t("loanAmortization.colDate")}
                        </th>
                      ) : null}
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colPayment")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colInterest")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colPrincipal")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colBalance")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row) => (
                      <tr
                        key={row.period}
                        className={
                          row.period === o.crossoverPeriod
                            ? "bg-[color-mix(in_srgb,var(--status-info)_12%,transparent)]"
                            : undefined
                        }
                      >
                        <th
                          scope="row"
                          className="px-3 py-1.5 text-left font-normal tabular-nums text-[var(--neutral-11)]"
                        >
                          {row.period}
                        </th>
                        {dated ? (
                          <td className="hidden px-3 py-1.5 text-left text-[var(--neutral-11)] sm:table-cell">
                            {row.date}
                          </td>
                        ) : null}
                        <td className={CELL}>{money(row.payment)}</td>
                        <td className={CELL}>{money(row.interest)}</td>
                        <td className={CELL}>{money(row.principal)}</td>
                        <td className={CELL}>{money(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[28rem] text-sm">
                  <caption className="sr-only">{t("loanAmortization.tableCaption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={`${HEAD} text-left`}>
                        {t("loanAmortization.colYear")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colInterest")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colPrincipal")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("loanAmortization.colBalance")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((year) => (
                      <tr key={year.key}>
                        <th
                          scope="row"
                          className="px-3 py-1.5 text-left font-normal tabular-nums text-[var(--neutral-11)]"
                        >
                          {year.label}
                        </th>
                        <td className={CELL}>{money(year.interest)}</td>
                        <td className={CELL}>{money(year.principal)}</td>
                        <td className={CELL}>{money(year.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {view === "monthly" && rows.length > WINDOW_ROWS ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded
                    ? t("loanAmortization.collapseRows")
                    : t("loanAmortization.expandRows", { total: rows.length })}
                </Button>
                <ShellNote>
                  {t("loanAmortization.windowNote", {
                    shown: shown.length,
                    total: rows.length,
                  })}
                </ShellNote>
              </div>
            ) : null}
          </div>
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          id={`${uid}-principal`}
          label={t("loanAmortization.principal")}
          value={principal}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setPrincipal(e.target.value)}
          {...(errors.principal ? { error: errors.principal } : {})}
        />
        <Input
          id={`${uid}-rate`}
          label={t("loanAmortization.rate")}
          value={rate}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setRate(e.target.value)}
          {...(errors.rate ? { error: errors.rate } : {})}
        />
        <Input
          id={`${uid}-term`}
          label={t("loanAmortization.term")}
          value={termValue}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setTermValue(e.target.value)}
          {...(errors.term ? { error: errors.term } : {})}
        />
        <RunnerSelect
          id={`${uid}-term-unit`}
          label={t("loanAmortization.termUnit")}
          value={termUnit}
          onChange={(value) => setTermUnit(value as TermUnit)}
          options={[
            { value: "years", label: t("loanAmortization.unitYears") },
            { value: "months", label: t("loanAmortization.unitMonths") },
          ]}
        />
        <Input
          id={`${uid}-start`}
          label={t("loanAmortization.startMonth")}
          value={startMonth}
          placeholder="2026-01"
          autoComplete="off"
          spellCheck={false}
          className="font-mono sm:col-span-2 lg:col-span-1"
          onChange={(e) => setStartMonth(e.target.value)}
          description={t("loanAmortization.startMonthHint")}
          {...(errors.startMonth ? { error: errors.startMonth } : {})}
        />
      </div>

      {/* One disclosure, not a checkbox that reveals a disclosure: extra
          payments are secondary until the user asks for them (§9.2). */}
      <ShellDrill summary={t("loanAmortization.extraHeading")}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              id={`${uid}-extra-monthly`}
              label={t("loanAmortization.extraMonthly")}
              value={monthlyExtra}
              inputMode="decimal"
              autoComplete="off"
              onChange={(e) => setMonthlyExtra(e.target.value)}
              {...(errors.monthlyExtra ? { error: errors.monthlyExtra } : {})}
            />
            <Input
              id={`${uid}-extra-yearly`}
              label={t("loanAmortization.extraYearly")}
              value={yearlyExtra}
              inputMode="decimal"
              autoComplete="off"
              onChange={(e) => setYearlyExtra(e.target.value)}
              {...(errors.yearlyExtra ? { error: errors.yearlyExtra } : {})}
            />
            <RunnerSelect
              id={`${uid}-extra-yearly-month`}
              label={t("loanAmortization.extraYearlyMonth")}
              value={yearlyMonth}
              onChange={setYearlyMonth}
              options={MONTHS.map((m) => ({ value: m, label: m }))}
            />
            <Input
              id={`${uid}-extra-onetime`}
              label={t("loanAmortization.extraOneTime")}
              value={oneTimeAmount}
              inputMode="decimal"
              autoComplete="off"
              onChange={(e) => setOneTimeAmount(e.target.value)}
              {...(errors.oneTimeAmount ? { error: errors.oneTimeAmount } : {})}
            />
            <Input
              id={`${uid}-extra-onetime-period`}
              label={t("loanAmortization.extraOneTimePeriod")}
              value={oneTimePeriod}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => setOneTimePeriod(e.target.value)}
              {...(errors.oneTimePeriod ? { error: errors.oneTimePeriod } : {})}
            />
          </div>
          <ShellNote>{t("loanAmortization.extraNote")}</ShellNote>
        </div>
      </ShellDrill>
    </ConfigureGenerateShell>
  );
}
