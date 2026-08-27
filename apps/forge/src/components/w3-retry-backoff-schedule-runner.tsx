"use client";

/**
 * retry-backoff-schedule — configure-then-generate (brief §8).
 *
 * The policy *is* the product: there is nothing to paste, so the shell
 * recomputes on every keystroke and the page answers before the first click.
 * All three reached competitors converged on exactly this shape, so a run
 * button here would be a pure step tax.
 *
 * House rules the brief pins to this page:
 *  - only the fields the active strategy uses are rendered (factor for
 *    exponential, increment for linear, neither for fixed) — competitors gray
 *    out or simply show fields the current strategy ignores;
 *  - the attempt-convention checkbox says out loud whether the number counts
 *    retries or attempts (know-how #1) instead of leaving it to be guessed;
 *  - jitter reads as a min–max band with an average, never a single sampled
 *    draw (know-how #2);
 *  - invalid input is reported inline on the offending field, so the rest of
 *    the configuration survives a typo (§9.1 step 6).
 */
import { Stopwatch, Warning } from "@nebutra/icons";
import { Button, Checkbox, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import {
  ConfigureGenerateShell,
  ShellBadge,
  ShellNote,
  ShellVerdict,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-ui";

/* ── contract mirrors packages/ai/forge-runtime/src/tools/w3-retry-backoff-schedule.ts ── */

type Strategy = "exponential" | "linear" | "fixed";
type Jitter = "none" | "equal" | "full";

interface Range {
  min: number;
  expected: number;
  max: number;
}

interface Row {
  attempt: number;
  delayMs: Range;
  cumulativeMs: Range;
}

interface Output {
  schedule: Row[];
  totalAttempts: number;
  finalDelayMs: Range;
  totalCumulativeWaitMs: Range;
  exceedsCallerTimeout: boolean | null;
}

const STRATEGIES: readonly Strategy[] = ["exponential", "linear", "fixed"];
const JITTERS: readonly Jitter[] = ["none", "equal", "full"];
const MAX_ATTEMPTS = 100;
const MAX_DURATION_MS = 86_400_000;

/* ── numeric field parsing ─────────────────────────────────────────────── */

/** null = blank (a legitimate "unset" for the optional fields), NaN = garbage. */
function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

function isWholeInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/** Omit `error` entirely when the field is clean — the prop is exact-optional. */
function errorProp(message: string | undefined): { error?: string } {
  return message === undefined ? {} : { error: message };
}

/**
 * Milliseconds a human can judge at a glance. Unit symbols only — "1.5 s"
 * needs no translation, and a table of raw milliseconds hides the scale that
 * makes a policy obviously wrong.
 */
function formatMs(ms: number): string {
  if (ms === 0) return "0 ms";
  if (ms < 1000) return `${Number(ms.toFixed(3))} ms`;
  if (ms < 60_000) return `${Number((ms / 1000).toFixed(2))} s`;
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Number(((ms % 60_000) / 1000).toFixed(1));
    return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function formatRange(range: Range, jittered: boolean): string {
  return jittered ? `${formatMs(range.min)} – ${formatMs(range.max)}` : formatMs(range.expected);
}

/** The plain-text payload someone pastes into a ticket. */
function scheduleText(output: Output, jittered: boolean): string {
  const header = jittered
    ? "attempt\tdelay_min_ms\tdelay_expected_ms\tdelay_max_ms\tcumulative_max_ms"
    : "attempt\tdelay_ms\tcumulative_ms";
  const rows = output.schedule.map((row) =>
    jittered
      ? [
          row.attempt,
          row.delayMs.min,
          row.delayMs.expected,
          row.delayMs.max,
          row.cumulativeMs.max,
        ].join("\t")
      : [row.attempt, row.delayMs.expected, row.cumulativeMs.expected].join("\t"),
  );
  return [header, ...rows].join("\n");
}

/**
 * The row where a climbing curve first hits the cap and goes flat (know-how
 * #4), or null. A cap that is already binding on the very first delay is not a
 * flattening — the curve never climbed — and neither is a naturally flat
 * strategy, so both answer null rather than a misleading badge.
 */
function capReachedAt(schedule: readonly Row[], capMs: number | null): Row | null {
  if (capMs === null || schedule.length < 2) return null;
  const index = schedule.findIndex((row) => row.delayMs.max === capMs);
  if (index < 1) return null;
  return schedule[index] ?? null;
}

/* ── runner ────────────────────────────────────────────────────────────── */

export function W3RetryBackoffScheduleRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();

  // Arrival is never blank: the default policy is the empty state (§9.1).
  const [strategy, setStrategy] = useState<Strategy>("exponential");
  const [initialDelay, setInitialDelay] = useState("500");
  const [factor, setFactor] = useState("2");
  const [increment, setIncrement] = useState("500");
  const [maxDelay, setMaxDelay] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("5");
  const [excludeInitial, setExcludeInitial] = useState(true);
  const [jitter, setJitter] = useState<Jitter>("none");
  const [callerTimeout, setCallerTimeout] = useState("");

  const parsed = useMemo(() => {
    const errors: Record<string, string> = {};

    const initial = parseNumber(initialDelay);
    if (initial === null || Number.isNaN(initial) || !isWholeInRange(initial, 1, MAX_DURATION_MS)) {
      errors.initialDelay = t("retryBackoff.errInitialDelay");
    }

    const factorValue = parseNumber(factor);
    if (
      strategy === "exponential" &&
      (factorValue === null || Number.isNaN(factorValue) || factorValue <= 1 || factorValue > 100)
    ) {
      errors.factor = t("retryBackoff.errFactor");
    }

    const incrementValue = parseNumber(increment);
    if (
      strategy === "linear" &&
      (incrementValue === null ||
        Number.isNaN(incrementValue) ||
        !isWholeInRange(incrementValue, 0, MAX_DURATION_MS))
    ) {
      errors.increment = t("retryBackoff.errIncrement");
    }

    const capValue = parseNumber(maxDelay);
    if (capValue !== null) {
      if (Number.isNaN(capValue) || !isWholeInRange(capValue, 1, MAX_DURATION_MS)) {
        errors.maxDelay = t("retryBackoff.errMaxDelay");
      } else if (typeof initial === "number" && !Number.isNaN(initial) && capValue < initial) {
        errors.maxDelay = t("retryBackoff.errCapBelowInitial");
      }
    }

    const attemptsValue = parseNumber(maxAttempts);
    if (
      attemptsValue === null ||
      Number.isNaN(attemptsValue) ||
      !isWholeInRange(attemptsValue, 1, MAX_ATTEMPTS)
    ) {
      errors.maxAttempts = t("retryBackoff.errMaxAttempts");
    }

    const timeoutValue = parseNumber(callerTimeout);
    if (
      timeoutValue !== null &&
      (Number.isNaN(timeoutValue) || !isWholeInRange(timeoutValue, 1, MAX_DURATION_MS))
    ) {
      errors.callerTimeout = t("retryBackoff.errCallerTimeout");
    }

    if (Object.keys(errors).length > 0) {
      return { errors, input: null, capMs: null, timeoutMs: null };
    }

    return {
      errors,
      capMs: capValue,
      timeoutMs: timeoutValue,
      input: {
        strategy,
        initialDelayMs: initial as number,
        ...(strategy === "exponential" ? { factor: factorValue as number } : {}),
        ...(strategy === "linear" ? { incrementMs: incrementValue as number } : {}),
        ...(capValue === null ? {} : { maxDelayMs: capValue }),
        maxAttempts: attemptsValue as number,
        attemptsExcludeInitialRequest: excludeInitial,
        jitter,
        ...(timeoutValue === null ? {} : { callerTimeoutMs: timeoutValue }),
      } as Record<string, unknown>,
    };
  }, [
    strategy,
    initialDelay,
    factor,
    increment,
    maxDelay,
    maxAttempts,
    excludeInitial,
    jitter,
    callerTimeout,
    t,
  ]);

  const jittered = jitter !== "none";
  const { capMs, timeoutMs } = parsed;

  return (
    <ConfigureGenerateShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      input={parsed.input}
      emptyHint={t("retryBackoff.emptyHint")}
      note={t("retryBackoff.note")}
      exit={(o) => ({
        text: scheduleText(o, jittered),
        json: o,
        filename: "retry-schedule.tsv",
        mimeType: "text/tab-separated-values;charset=utf-8",
      })}
      renderResult={(o) => {
        const flatFrom = capReachedAt(o.schedule, capMs);
        return (
          <div className="space-y-3">
            <ShellVerdict
              tone={o.exceedsCallerTimeout ? "warning" : "info"}
              headline={
                <span className="inline-flex items-center gap-2">
                  <Stopwatch className="h-5 w-5" aria-hidden="true" />
                  {jittered
                    ? t("retryBackoff.headlineRange", {
                        attempts: o.totalAttempts,
                        expected: formatMs(o.totalCumulativeWaitMs.expected),
                        max: formatMs(o.totalCumulativeWaitMs.max),
                      })
                    : t("retryBackoff.headlineExact", {
                        attempts: o.totalAttempts,
                        wait: formatMs(o.totalCumulativeWaitMs.expected),
                      })}
                </span>
              }
              caveat={
                o.schedule.length === 0
                  ? t("retryBackoff.noRetries")
                  : t("retryBackoff.finalDelay", {
                      attempt: o.totalAttempts,
                      delay: formatRange(o.finalDelayMs, jittered),
                    })
              }
              badges={
                <>
                  <ShellBadge tone="neutral">
                    {t("retryBackoff.retryCount", { count: o.schedule.length })}
                  </ShellBadge>
                  {flatFrom ? (
                    <ShellBadge tone="info">
                      {t("retryBackoff.capFlattened", {
                        attempt: flatFrom.attempt,
                        delay: formatMs(flatFrom.delayMs.max),
                      })}
                    </ShellBadge>
                  ) : null}
                </>
              }
            />

            {o.exceedsCallerTimeout === null ? null : (
              <p
                className={
                  o.exceedsCallerTimeout
                    ? "flex items-start gap-2 rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--status-warning)_14%,transparent)] p-3 text-sm text-[var(--status-warning)]"
                    : "flex items-start gap-2 rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] p-3 text-sm text-[var(--status-success)]"
                }
              >
                {o.exceedsCallerTimeout ? (
                  <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : null}
                <span>
                  {o.exceedsCallerTimeout
                    ? t("retryBackoff.timeoutExceeded", {
                        wait: formatMs(o.totalCumulativeWaitMs.max),
                        timeout: formatMs(timeoutMs ?? 0),
                      })
                    : t("retryBackoff.timeoutOk", {
                        wait: formatMs(o.totalCumulativeWaitMs.max),
                        timeout: formatMs(timeoutMs ?? 0),
                      })}
                </span>
              </p>
            )}

            {o.schedule.length > 0 ? (
              <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
                <table className="w-full text-sm" aria-label={t("retryBackoff.tableLabel")}>
                  <thead>
                    <tr className="text-left text-xs text-[var(--neutral-10)]">
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t("retryBackoff.colAttempt")}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t("retryBackoff.colDelay")}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t("retryBackoff.colCumulative")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.schedule.map((row) => (
                      <tr key={row.attempt} className="align-top">
                        <th
                          scope="row"
                          className="whitespace-nowrap px-3 py-2 text-left font-mono text-xs font-normal text-[var(--neutral-11)]"
                        >
                          #{row.attempt}
                        </th>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          <span className="text-[var(--neutral-12)]">
                            {formatRange(row.delayMs, jittered)}
                          </span>
                          {jittered ? (
                            <span className="ml-2 text-[var(--neutral-10)]">
                              {t("retryBackoff.average", {
                                value: formatMs(row.delayMs.expected),
                              })}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          <span className="text-[var(--neutral-12)]">
                            {formatRange(row.cumulativeMs, jittered)}
                          </span>
                          {jittered ? (
                            <span className="ml-2 text-[var(--neutral-10)]">
                              {t("retryBackoff.average", {
                                value: formatMs(row.cumulativeMs.expected),
                              })}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {jittered ? <ShellNote>{t(`retryBackoff.formula.${jitter}`)}</ShellNote> : null}
          </div>
        );
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-[var(--neutral-11)]">
          {t("retryBackoff.strategy")}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {STRATEGIES.map((id) => (
            <Button
              key={id}
              type="button"
              variant={strategy === id ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={strategy === id}
              onClick={() => setStrategy(id)}
            >
              {t(`retryBackoff.strategy.${id}`)}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Input
          id={`${uid}-initial`}
          label={t("retryBackoff.initialDelay")}
          type="number"
          inputMode="numeric"
          min={1}
          value={initialDelay}
          onChange={(e) => setInitialDelay(e.target.value)}
          {...errorProp(parsed.errors.initialDelay)}
          className="font-mono"
          autoComplete="off"
        />
        {strategy === "exponential" ? (
          <Input
            id={`${uid}-factor`}
            label={t("retryBackoff.factor")}
            description={t("retryBackoff.factorHint")}
            type="number"
            inputMode="decimal"
            step="0.1"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            {...errorProp(parsed.errors.factor)}
            className="font-mono"
            autoComplete="off"
          />
        ) : null}
        {strategy === "linear" ? (
          <Input
            id={`${uid}-increment`}
            label={t("retryBackoff.increment")}
            description={t("retryBackoff.incrementHint")}
            type="number"
            inputMode="numeric"
            min={0}
            value={increment}
            onChange={(e) => setIncrement(e.target.value)}
            {...errorProp(parsed.errors.increment)}
            className="font-mono"
            autoComplete="off"
          />
        ) : null}
        <Input
          id={`${uid}-cap`}
          label={t("retryBackoff.maxDelay")}
          description={t("retryBackoff.maxDelayHint")}
          type="number"
          inputMode="numeric"
          min={1}
          value={maxDelay}
          onChange={(e) => setMaxDelay(e.target.value)}
          {...errorProp(parsed.errors.maxDelay)}
          className="font-mono"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id={`${uid}-attempts`}
          label={t("retryBackoff.maxAttempts")}
          description={t("retryBackoff.maxAttemptsHint")}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_ATTEMPTS}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(e.target.value)}
          {...errorProp(parsed.errors.maxAttempts)}
          className="font-mono"
          autoComplete="off"
        />
        <RunnerSelect
          id={`${uid}-jitter`}
          label={t("retryBackoff.jitter")}
          value={jitter}
          onChange={(value) => setJitter(value as Jitter)}
          options={JITTERS.map((id) => ({ value: id, label: t(`retryBackoff.jitter.${id}`) }))}
        />
        <Input
          id={`${uid}-timeout`}
          label={t("retryBackoff.callerTimeout")}
          description={t("retryBackoff.callerTimeoutHint")}
          type="number"
          inputMode="numeric"
          min={1}
          value={callerTimeout}
          onChange={(e) => setCallerTimeout(e.target.value)}
          {...errorProp(parsed.errors.callerTimeout)}
          className="font-mono"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1">
        <Checkbox id={`${uid}-convention`} checked={excludeInitial} onChange={setExcludeInitial}>
          <span className="text-sm">{t("retryBackoff.excludeInitial")}</span>
        </Checkbox>
        <ShellNote>{t("retryBackoff.excludeInitialNote")}</ShellNote>
      </div>
    </ConfigureGenerateShell>
  );
}
