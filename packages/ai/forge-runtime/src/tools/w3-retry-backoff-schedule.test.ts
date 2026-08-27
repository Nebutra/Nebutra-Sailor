import { describe, expect, it } from "vitest";
import {
  applyJitter,
  baseDelayForRetry,
  type JitterMode,
  MAX_ATTEMPTS,
  type RetryBackoffScheduleResult,
  retryBackoffScheduleTool,
  w3RetryBackoffScheduleTools,
} from "./w3-retry-backoff-schedule";

function run(input: unknown): RetryBackoffScheduleResult {
  const parsed = retryBackoffScheduleTool.inputSchema.parse(input);
  return retryBackoffScheduleTool.execute(parsed) as RetryBackoffScheduleResult;
}

function rejects(input: unknown): boolean {
  return retryBackoffScheduleTool.inputSchema.safeParse(input).success === false;
}

function delays(result: RetryBackoffScheduleResult): number[] {
  return result.schedule.map((row) => row.delayMs.expected);
}

describe("retry-backoff-schedule · declaration", () => {
  it("declares the Simulator-root contract the brief fixes", () => {
    expect(retryBackoffScheduleTool.id).toBe("dev/retry-backoff-schedule");
    expect(retryBackoffScheduleTool.slug).toBe("retry-backoff-schedule");
    expect(retryBackoffScheduleTool.category).toBe("dev");
    expect(retryBackoffScheduleTool.id).toBe(
      `${retryBackoffScheduleTool.category}/${retryBackoffScheduleTool.slug}`,
    );
    expect(retryBackoffScheduleTool.meterId).toBe(
      `forge.${retryBackoffScheduleTool.category}.${retryBackoffScheduleTool.slug.replace(/-/g, "_")}`,
    );
    expect(retryBackoffScheduleTool.sideEffect).toBe("pure");
    expect(retryBackoffScheduleTool.roots).toContain("simulator");
    expect(retryBackoffScheduleTool.title.zh).not.toBe(retryBackoffScheduleTool.title.en);
    expect(retryBackoffScheduleTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(retryBackoffScheduleTool.seoKeywords.en.length).toBeGreaterThan(0);
    // Engine metadata names the formulas' source, not an invented library.
    expect(retryBackoffScheduleTool.engine.upstream).toContain("Exponential Backoff And Jitter");
    expect(retryBackoffScheduleTool.engine.upstream).toContain("excludes initial request");
    expect(w3RetryBackoffScheduleTools).toEqual([retryBackoffScheduleTool]);
  });

  it("is deterministic: identical input yields a byte-identical result", () => {
    // A pure tool cannot sample jitter — same policy in, same schedule out.
    const input = { strategy: "exponential", initialDelayMs: 500, jitter: "full", maxAttempts: 7 };
    expect(JSON.stringify(run(input))).toBe(JSON.stringify(run(input)));
  });
});

describe("retry-backoff-schedule · schema", () => {
  it("applies the brief's default policy when given an empty object", () => {
    const parsed = retryBackoffScheduleTool.inputSchema.parse({});
    expect(parsed).toMatchObject({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxAttempts: 5,
      attemptsExcludeInitialRequest: true,
      jitter: "none",
    });
    expect(parsed.maxDelayMs).toBeUndefined();
    expect(parsed.callerTimeoutMs).toBeUndefined();
  });

  it("rejects an unknown strategy and an unknown jitter mode", () => {
    expect(rejects({ strategy: "fibonacci" })).toBe(true);
    expect(rejects({ jitter: "decorrelated" })).toBe(true);
  });

  it("rejects a non-positive or non-integer initial delay", () => {
    expect(rejects({ initialDelayMs: 0 })).toBe(true);
    expect(rejects({ initialDelayMs: -100 })).toBe(true);
    expect(rejects({ initialDelayMs: 12.5 })).toBe(true);
  });

  it("rejects factor <= 1 — a multiplier of 1 is the `fixed` strategy, not exponential", () => {
    expect(rejects({ factor: 1 })).toBe(true);
    expect(rejects({ factor: 0.5 })).toBe(true);
    expect(rejects({ factor: 1.0001 })).toBe(false);
  });

  it("rejects a negative linear increment but accepts 0", () => {
    expect(rejects({ strategy: "linear", incrementMs: -1 })).toBe(true);
    expect(rejects({ strategy: "linear", incrementMs: 0 })).toBe(false);
  });

  it("rejects a cap below the initial delay (brief §9.1 error state)", () => {
    const bad = retryBackoffScheduleTool.inputSchema.safeParse({
      initialDelayMs: 1000,
      maxDelayMs: 500,
    });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues[0]?.path).toEqual(["maxDelayMs"]);
    }
    expect(rejects({ initialDelayMs: 1000, maxDelayMs: 1000 })).toBe(false);
  });

  it(`clamps the attempt budget to 1..${MAX_ATTEMPTS} (brief §9.1 step 7 hard bound)`, () => {
    expect(rejects({ maxAttempts: 0 })).toBe(true);
    expect(rejects({ maxAttempts: -3 })).toBe(true);
    expect(rejects({ maxAttempts: MAX_ATTEMPTS + 1 })).toBe(true);
    expect(rejects({ maxAttempts: MAX_ATTEMPTS })).toBe(false);
  });

  it("rejects a non-boolean attempt convention and a zero caller timeout", () => {
    expect(rejects({ attemptsExcludeInitialRequest: "yes" })).toBe(true);
    expect(rejects({ callerTimeoutMs: 0 })).toBe(true);
  });
});

describe("retry-backoff-schedule · strategies", () => {
  it("exponential grows by the factor from the initial delay", () => {
    // 500 · 2^0..2^4 — the textbook doubling policy.
    const result = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxAttempts: 5,
    });
    expect(delays(result)).toEqual([500, 1000, 2000, 4000, 8000]);
    expect(result.totalCumulativeWaitMs.expected).toBe(15_500);
    expect(result.finalDelayMs.expected).toBe(8000);
  });

  it("exponential accepts a fractional factor without float noise", () => {
    const result = run({
      strategy: "exponential",
      initialDelayMs: 100,
      factor: 1.5,
      maxAttempts: 4,
    });
    expect(delays(result)).toEqual([100, 150, 225, 337.5]);
  });

  it("linear adds the increment per retry", () => {
    const result = run({
      strategy: "linear",
      initialDelayMs: 200,
      incrementMs: 300,
      maxAttempts: 4,
    });
    expect(delays(result)).toEqual([200, 500, 800, 1100]);
    expect(result.totalCumulativeWaitMs.expected).toBe(2600);
  });

  it("fixed repeats the initial delay and ignores factor/increment", () => {
    const result = run({
      strategy: "fixed",
      initialDelayMs: 750,
      factor: 9,
      incrementMs: 9999,
      maxAttempts: 3,
    });
    expect(delays(result)).toEqual([750, 750, 750]);
  });

  it("cumulative is the running sum, row by row", () => {
    const result = run({ strategy: "fixed", initialDelayMs: 100, maxAttempts: 4 });
    expect(result.schedule.map((r) => r.cumulativeMs.expected)).toEqual([100, 200, 300, 400]);
  });
});

/* ── one case per know-how rule the brief names (§7) ────────────────────── */

describe("retry-backoff-schedule · know-how #1 — maxAttempts excludes the initial request", () => {
  it("default convention treats maxAttempts as retries, so total attempts is one more", () => {
    const result = run({ maxAttempts: 5, attemptsExcludeInitialRequest: true });
    expect(result.schedule).toHaveLength(5);
    expect(result.totalAttempts).toBe(6);
  });

  it("the other convention treats maxAttempts as the whole budget", () => {
    const result = run({ maxAttempts: 5, attemptsExcludeInitialRequest: false });
    expect(result.schedule).toHaveLength(4);
    expect(result.totalAttempts).toBe(5);
  });

  it("a total budget of exactly one attempt schedules no wait at all", () => {
    const result = run({ maxAttempts: 1, attemptsExcludeInitialRequest: false });
    expect(result.schedule).toEqual([]);
    expect(result.totalAttempts).toBe(1);
    expect(result.finalDelayMs).toEqual({ min: 0, expected: 0, max: 0 });
    expect(result.totalCumulativeWaitMs).toEqual({ min: 0, expected: 0, max: 0 });
  });

  it("one retry under the default convention still means two attempts", () => {
    const result = run({ maxAttempts: 1, attemptsExcludeInitialRequest: true });
    expect(result.totalAttempts).toBe(2);
    expect(result.schedule).toHaveLength(1);
  });
});

describe("retry-backoff-schedule · know-how #2 — jitter is a range, not a sampled point", () => {
  it("no jitter collapses the range to a point", () => {
    const [row] = run({ strategy: "fixed", initialDelayMs: 400, maxAttempts: 1 }).schedule;
    expect(row?.delayMs).toEqual({ min: 400, expected: 400, max: 400 });
  });

  it("jittered delays widen into min < expected < max", () => {
    for (const jitter of ["equal", "full"] as const) {
      const [row] = run({
        strategy: "fixed",
        initialDelayMs: 400,
        maxAttempts: 1,
        jitter,
      }).schedule;
      expect(row).toBeDefined();
      const range = row?.delayMs as { min: number; expected: number; max: number };
      expect(range.min).toBeLessThan(range.expected);
      expect(range.expected).toBeLessThan(range.max);
    }
  });

  it("cumulative carries the bound too — min and max sums, not one draw", () => {
    const result = run({ strategy: "fixed", initialDelayMs: 1000, maxAttempts: 3, jitter: "full" });
    expect(result.totalCumulativeWaitMs).toEqual({ min: 0, expected: 1500, max: 3000 });
  });
});

describe("retry-backoff-schedule · know-how #3 — equal and full jitter are different formulas", () => {
  it("full jitter is random(0, d): [0, d] with mean d/2", () => {
    expect(applyJitter(1000, "full")).toEqual({ min: 0, expected: 500, max: 1000 });
  });

  it("equal jitter is d/2 + random(0, d/2): [d/2, d] with mean 3d/4", () => {
    expect(applyJitter(1000, "equal")).toEqual({ min: 500, expected: 750, max: 1000 });
  });

  it("the two modes are not two settings of one slider", () => {
    expect(applyJitter(1000, "equal")).not.toEqual(applyJitter(1000, "full"));
  });

  it("both share the same upper bound — jitter never lengthens a delay past the base", () => {
    expect(applyJitter(640, "full").max).toBe(640);
    expect(applyJitter(640, "equal").max).toBe(640);
    expect(applyJitter(640, "none").max).toBe(640);
  });
});

/**
 * The AWS Architecture Blog "Exponential Backoff And Jitter" pseudo-code,
 * transcribed here rather than imported from the engine, so a band that agrees
 * with the engine but disagrees with the source cannot pass:
 *
 *   temp  = min(cap, base * 2 ** attempt)     // attempt is 0-based
 *   none  = temp
 *   full  = random_between(0, temp)
 *   equal = temp / 2 + random_between(0, temp / 2)
 */
function awsSleep(
  kind: JitterMode,
  base: number,
  cap: number | undefined,
  attempt: number,
  draw: number,
): number {
  const uncapped = base * 2 ** attempt;
  const temp = cap === undefined ? uncapped : Math.min(cap, uncapped);
  if (kind === "full") return draw * temp;
  if (kind === "equal") return temp / 2 + draw * (temp / 2);
  return temp;
}

describe("retry-backoff-schedule · the reported band is the AWS formula's own range", () => {
  // The extremes plus the midpoint of the uniform draw. `expected` is checked
  // against the analytic mean of the draw, not against a sample.
  const DRAWS = [0, 0.25, 0.5, 0.75, 1] as const;

  it.each([
    "none",
    "equal",
    "full",
  ] as const)("%s jitter brackets every draw the AWS pseudo-code can produce", (jitter) => {
    for (const cap of [undefined, 4000]) {
      const result = run({
        strategy: "exponential",
        initialDelayMs: 500,
        factor: 2,
        maxAttempts: 8,
        jitter,
        ...(cap === undefined ? {} : { maxDelayMs: cap }),
      });
      result.schedule.forEach((row, attempt) => {
        const samples = DRAWS.map((d) => awsSleep(jitter, 500, cap, attempt, d));
        const label = `${jitter}/cap=${cap}/attempt=${attempt}`;
        expect(Math.min(...samples), `${label} low`).toBe(row.delayMs.min);
        expect(Math.max(...samples), `${label} high`).toBe(row.delayMs.max);
        // Mean of a uniform draw over [min, max] — the midpoint.
        expect(row.delayMs.expected, `${label} mean`).toBeCloseTo(
          (row.delayMs.min + row.delayMs.max) / 2,
          9,
        );
      });
    }
  });

  it("cumulative bounds are the sums of the per-attempt bounds, not a resampling", () => {
    const result = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxAttempts: 6,
      jitter: "equal",
    });
    let min = 0;
    let max = 0;
    for (const row of result.schedule) {
      min += row.delayMs.min;
      max += row.delayMs.max;
      expect(row.cumulativeMs.min).toBeCloseTo(min, 9);
      expect(row.cumulativeMs.max).toBeCloseTo(max, 9);
    }
    // 500·(1+2+4+8+16+32) = 31,500 uncapped worst case; equal jitter halves the floor.
    expect(result.totalCumulativeWaitMs.max).toBe(31_500);
    expect(result.totalCumulativeWaitMs.min).toBe(15_750);
  });
});

describe("retry-backoff-schedule · know-how #4 — a cap flattens the curve, not just its ceiling", () => {
  it("every attempt past the crossover sits exactly at the cap", () => {
    const result = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxDelayMs: 2000,
      maxAttempts: 6,
    });
    expect(delays(result)).toEqual([500, 1000, 2000, 2000, 2000, 2000]);
  });

  it("the cumulative total reflects the capped curve, not the uncapped one", () => {
    const capped = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxDelayMs: 2000,
      maxAttempts: 6,
    });
    const uncapped = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxAttempts: 6,
    });
    expect(capped.totalCumulativeWaitMs.expected).toBe(9500);
    expect(uncapped.totalCumulativeWaitMs.expected).toBe(31_500);
  });

  it("the cap applies before jitter, so the jitter band narrows with it", () => {
    const [, , third] = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxDelayMs: 1000,
      maxAttempts: 3,
      jitter: "equal",
    }).schedule;
    // Uncapped the third delay would be 2000 → band [1000, 2000]; capped it is
    // 1000 → band [500, 1000].
    expect(third?.delayMs).toEqual({ min: 500, expected: 750, max: 1000 });
  });

  it("a linear curve flattens at the cap the same way", () => {
    const result = run({
      strategy: "linear",
      initialDelayMs: 100,
      incrementMs: 100,
      maxDelayMs: 300,
      maxAttempts: 5,
    });
    expect(delays(result)).toEqual([100, 200, 300, 300, 300]);
    expect(
      baseDelayForRetry(9, {
        strategy: "linear",
        initialDelayMs: 100,
        incrementMs: 100,
        factor: 2,
        maxDelayMs: 300,
      }),
    ).toBe(300);
  });
});

describe("retry-backoff-schedule · know-how #5 — cumulative wait is what breaks the caller", () => {
  it("flags a policy whose every single delay fits but whose total does not", () => {
    // Each delay is at most 8s, comfortably inside a 10s budget; the sequence
    // still spends 15.5s. This is the exact failure the brief's §1 pain names.
    const result = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxAttempts: 5,
      callerTimeoutMs: 10_000,
    });
    expect(result.finalDelayMs.max).toBeLessThan(10_000);
    expect(result.totalCumulativeWaitMs.max).toBe(15_500);
    expect(result.exceedsCallerTimeout).toBe(true);
  });

  it("does not flag a policy that fits inside the budget", () => {
    const result = run({
      strategy: "exponential",
      initialDelayMs: 500,
      factor: 2,
      maxAttempts: 5,
      callerTimeoutMs: 20_000,
    });
    expect(result.exceedsCallerTimeout).toBe(false);
  });

  it("exactly equal to the budget does not overrun it", () => {
    const result = run({
      strategy: "fixed",
      initialDelayMs: 1000,
      maxAttempts: 3,
      callerTimeoutMs: 3000,
    });
    expect(result.exceedsCallerTimeout).toBe(false);
  });

  it("judges the worst case, so full jitter's own upper bound is what counts", () => {
    // Expected wait is 1500ms, worst case 3000ms — a 2s budget can still blow.
    const result = run({
      strategy: "fixed",
      initialDelayMs: 1000,
      maxAttempts: 3,
      jitter: "full",
      callerTimeoutMs: 2000,
    });
    expect(result.totalCumulativeWaitMs.expected).toBe(1500);
    expect(result.exceedsCallerTimeout).toBe(true);
  });

  it("is null — unknown, not fine — when no caller timeout is supplied", () => {
    expect(run({ maxAttempts: 20 }).exceedsCallerTimeout).toBeNull();
  });
});

describe("retry-backoff-schedule · know-how #6 — attempt numbering is stated, not guessed", () => {
  it("attempt 1 is the initial request, so the first delay row is attempt 2", () => {
    const result = run({ maxAttempts: 3, attemptsExcludeInitialRequest: true });
    expect(result.schedule.map((r) => r.attempt)).toEqual([2, 3, 4]);
  });

  it("both attempt conventions number the same rows the same way", () => {
    const excluding = run({ maxAttempts: 3, attemptsExcludeInitialRequest: true });
    const including = run({ maxAttempts: 4, attemptsExcludeInitialRequest: false });
    // Same policy, stated two ways: identical schedules, identical numbering.
    expect(including.schedule).toEqual(excluding.schedule);
    expect(including.totalAttempts).toBe(excluding.totalAttempts);
  });

  it("the last row's attempt number is always totalAttempts", () => {
    const result = run({ maxAttempts: 7 });
    expect(result.schedule.at(-1)?.attempt).toBe(result.totalAttempts);
  });
});

describe("retry-backoff-schedule · bounds", () => {
  it("serves the maximum attempt budget without overflowing to Infinity", () => {
    const result = run({
      strategy: "exponential",
      initialDelayMs: MAX_ATTEMPTS,
      factor: 100,
      maxAttempts: MAX_ATTEMPTS,
    });
    expect(result.schedule).toHaveLength(MAX_ATTEMPTS);
    for (const row of result.schedule) {
      expect(Number.isFinite(row.delayMs.max)).toBe(true);
      expect(Number.isFinite(row.cumulativeMs.max)).toBe(true);
    }
  });

  it("cumulative never decreases across the schedule", () => {
    const result = run({
      strategy: "exponential",
      initialDelayMs: 250,
      factor: 3,
      maxDelayMs: 30_000,
      maxAttempts: 12,
      jitter: "equal",
    });
    let previous = 0;
    for (const row of result.schedule) {
      expect(row.cumulativeMs.expected).toBeGreaterThanOrEqual(previous);
      previous = row.cumulativeMs.expected;
      expect(row.cumulativeMs.min).toBeLessThanOrEqual(row.cumulativeMs.expected);
      expect(row.cumulativeMs.expected).toBeLessThanOrEqual(row.cumulativeMs.max);
    }
  });
});
