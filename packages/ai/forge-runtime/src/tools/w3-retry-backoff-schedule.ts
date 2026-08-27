/**
 * retry-backoff-schedule — project a retry policy onto a wall-clock schedule
 * (Simulator root, docs/plans/tools/retry-backoff-schedule.md).
 *
 * The Simulator root is thin (§6.7.9): this tool completes it rather than pads
 * it — it answers the one question the three reached competitors all answer
 * (when does each attempt land, how long is the whole thing) plus the one
 * none of them answers (does that total blow the caller's own timeout).
 *
 * What the brief demands beyond a naive backoff loop (§7 know-how):
 *  1. "Max attempts" is ambiguous across retry libraries, so the convention is
 *     an explicit input (`attemptsExcludeInitialRequest`, default true, the
 *     retries.dev convention) rather than a silent choice. Both conventions
 *     produce the *same* attempt numbers here; only the row count differs.
 *  2. Jitter is a range, not a sampled point. A planning tool that returns one
 *     random draw is lying about precision, so every delay is emitted as
 *     {min, expected, max} and the engine stays pure — no Math.random, no
 *     Date.now, deterministic for identical input.
 *  3. Equal and full jitter are different formulas, not two settings of one
 *     slider: full = random(0, d) → [0, d], expected d/2; equal =
 *     d/2 + random(0, d/2) → [d/2, d], expected 3d/4.
 *  4. A delay cap changes the shape of the curve, not just its ceiling: the
 *     cap is applied to the computed base delay *before* jitter, so every
 *     attempt past the crossover is flat at the cap instead of still climbing.
 *  5. Cumulative wait, not any single delay, is what breaks a caller's budget,
 *     so cumulative min/expected/max is carried per row and `callerTimeoutMs`
 *     is judged against the cumulative worst case, not against the last delay.
 *  6. Attempt numbering is a real hazard (competitors number 0-based and
 *     1-based for the same policy). Here `attempt` is always the 1-based index
 *     of the attempt the delay precedes, in the full sequence including the
 *     initial request — so the initial request is attempt 1 and never has a
 *     delay row.
 *
 * Formulas implemented: full/equal jitter per the AWS Architecture Blog
 * "Exponential Backoff And Jitter" pair, as cited by k-lab.dev/retry's own FAQ
 * copy (brief §7 know-how #3 — sourced from that competitor's copy, not read
 * from the article in this pass); the "excludes initial request" attempt
 * convention per retries.dev's own field label (brief §7 know-how #1).
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── bounds ────────────────────────────────────────────────────────────── */

/**
 * Hard upper bound on attempts (brief §9.1 step 7). An unbounded table is both
 * a bad page and a way to make the agent-facing endpoint do unbounded work.
 */
export const MAX_ATTEMPTS = 100;
/** 24h in ms — no sane retry policy input exceeds a day. */
export const MAX_DURATION_MS = 86_400_000;
/** A factor above this is a typo, not a policy. */
export const MAX_FACTOR = 100;

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type RetryStrategy = "exponential" | "linear" | "fixed";
export type JitterMode = "none" | "equal" | "full";

/** One delay expressed as the bound the real client will fall inside. */
export interface DelayRange {
  min: number;
  expected: number;
  max: number;
}

export interface RetryScheduleRow {
  /**
   * 1-based index of the attempt this delay precedes, counting the initial
   * request as attempt 1. The first row is therefore always attempt 2.
   */
  attempt: number;
  delayMs: DelayRange;
  cumulativeMs: DelayRange;
}

export interface RetryBackoffScheduleResult {
  schedule: RetryScheduleRow[];
  /** Attempts including the initial request. */
  totalAttempts: number;
  /** Delay before the last attempt; all zeros when there is no retry at all. */
  finalDelayMs: DelayRange;
  totalCumulativeWaitMs: DelayRange;
  /** null when `callerTimeoutMs` was not supplied — "unknown", not "fine". */
  exceedsCallerTimeout: boolean | null;
}

/* ── schema ────────────────────────────────────────────────────────────── */

const inputSchema = z
  .object({
    strategy: z
      .enum(["exponential", "linear", "fixed"])
      .default("exponential")
      .describe("Delay curve: exponential (factor), linear (increment) or fixed."),
    initialDelayMs: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_DURATION_MS)
      .default(500)
      .describe("Delay before the first retry, in milliseconds. Must be > 0."),
    factor: z.coerce
      .number()
      .gt(1)
      .max(MAX_FACTOR)
      .default(2)
      .describe("Exponential only: multiplier per retry. Must be > 1 (1 would be `fixed`)."),
    incrementMs: z.coerce
      .number()
      .int()
      .min(0)
      .max(MAX_DURATION_MS)
      .default(0)
      .describe("Linear only: milliseconds added per retry. 0 degenerates to `fixed`."),
    maxDelayMs: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_DURATION_MS)
      .optional()
      .describe("Optional cap applied to each computed delay before jitter. Must be >= initial."),
    maxAttempts: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_ATTEMPTS)
      .default(5)
      .describe(
        `Attempt budget, 1..${MAX_ATTEMPTS}. Read with attemptsExcludeInitialRequest to know whether it counts retries or total attempts.`,
      ),
    attemptsExcludeInitialRequest: z
      .boolean()
      .default(true)
      .describe(
        "true (default): maxAttempts counts retries only, the initial request is extra. false: maxAttempts is the total attempt count including the initial request.",
      ),
    jitter: z
      .enum(["none", "equal", "full"])
      .default("none")
      .describe(
        "none: delay is exact. full: random(0, d). equal: d/2 + random(0, d/2). Reported as a range, never as one sampled draw.",
      ),
    callerTimeoutMs: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_DURATION_MS)
      .optional()
      .describe("Your own request/deadline budget. Judged against the cumulative worst case."),
  })
  .superRefine((value, ctx) => {
    if (value.maxDelayMs !== undefined && value.maxDelayMs < value.initialDelayMs) {
      ctx.addIssue({
        code: "custom",
        path: ["maxDelayMs"],
        message: "maxDelayMs must be >= initialDelayMs — a cap below the first delay is a typo.",
      });
    }
  });

export type RetryBackoffScheduleInput = z.infer<typeof inputSchema>;

/* ── engine ────────────────────────────────────────────────────────────── */

/** Kill float artifacts (500 * 1.1 ** 3) without pretending to sub-µs accuracy. */
function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Base delay before retry `retryIndex` (1-based), cap applied.
 *
 * Know-how #4: the cap is applied here, before jitter, so the curve flattens
 * at the cap instead of continuing to climb underneath a clipped display.
 */
export function baseDelayForRetry(
  retryIndex: number,
  opts: {
    strategy: RetryStrategy;
    initialDelayMs: number;
    factor: number;
    incrementMs: number;
    maxDelayMs?: number | undefined;
  },
): number {
  const step = retryIndex - 1;
  let delay: number;
  switch (opts.strategy) {
    case "exponential":
      delay = opts.initialDelayMs * opts.factor ** step;
      break;
    case "linear":
      delay = opts.initialDelayMs + opts.incrementMs * step;
      break;
    default:
      delay = opts.initialDelayMs;
  }
  if (!Number.isFinite(delay)) delay = Number.MAX_SAFE_INTEGER;
  if (opts.maxDelayMs !== undefined) delay = Math.min(delay, opts.maxDelayMs);
  return roundMs(delay);
}

/**
 * Turn one deterministic delay into the bound a jittered client falls inside.
 *
 * Know-how #2 and #3: `expected` is the mean of the uniform draw, not a sample,
 * so the engine stays pure and two callers with the same policy agree.
 */
export function applyJitter(delay: number, jitter: JitterMode): DelayRange {
  switch (jitter) {
    case "full":
      // random(0, d)
      return { min: 0, expected: roundMs(delay / 2), max: roundMs(delay) };
    case "equal":
      // d/2 + random(0, d/2)
      return { min: roundMs(delay / 2), expected: roundMs(delay * 0.75), max: roundMs(delay) };
    default:
      return { min: roundMs(delay), expected: roundMs(delay), max: roundMs(delay) };
  }
}

const ZERO_RANGE: DelayRange = { min: 0, expected: 0, max: 0 };

function addRange(a: DelayRange, b: DelayRange): DelayRange {
  return {
    min: roundMs(a.min + b.min),
    expected: roundMs(a.expected + b.expected),
    max: roundMs(a.max + b.max),
  };
}

export function buildRetrySchedule(input: RetryBackoffScheduleInput): RetryBackoffScheduleResult {
  // Know-how #1: the convention is an input, so the count is never a guess.
  const totalAttempts = input.attemptsExcludeInitialRequest
    ? input.maxAttempts + 1
    : input.maxAttempts;
  const retryCount = totalAttempts - 1;

  const schedule: RetryScheduleRow[] = [];
  let cumulative = ZERO_RANGE;
  for (let retryIndex = 1; retryIndex <= retryCount; retryIndex += 1) {
    const base = baseDelayForRetry(retryIndex, {
      strategy: input.strategy,
      initialDelayMs: input.initialDelayMs,
      factor: input.factor,
      incrementMs: input.incrementMs,
      maxDelayMs: input.maxDelayMs,
    });
    const delayMs = applyJitter(base, input.jitter);
    cumulative = addRange(cumulative, delayMs);
    // Know-how #6: attempt 1 is the initial request and has no delay row, so
    // the first delay precedes attempt 2 under either attempt convention.
    schedule.push({ attempt: retryIndex + 1, delayMs, cumulativeMs: cumulative });
  }

  const last = schedule.at(-1);
  const totalCumulativeWaitMs = last ? last.cumulativeMs : ZERO_RANGE;

  // Know-how #5: judged on the cumulative worst case. Any single delay can sit
  // comfortably inside the budget while the sequence still overruns it.
  const exceedsCallerTimeout =
    input.callerTimeoutMs === undefined ? null : totalCumulativeWaitMs.max > input.callerTimeoutMs;

  return {
    schedule,
    totalAttempts,
    finalDelayMs: last ? last.delayMs : ZERO_RANGE,
    totalCumulativeWaitMs,
    exceedsCallerTimeout,
  };
}

/* ── tool ──────────────────────────────────────────────────────────────── */

export const retryBackoffScheduleTool = tool({
  id: "dev/retry-backoff-schedule",
  slug: "retry-backoff-schedule",
  category: "dev",
  title: { zh: "重试退避计划模拟", en: "Retry Backoff Schedule Simulator" },
  description: {
    zh: "把重试策略（指数/线性/固定、倍数、上限、抖动、次数）展开成每次重试的延迟与累计等待；抖动给出最小/期望/最大区间而非单次采样，并判断累计等待是否超出调用方超时",
    en: "Expand a retry policy (exponential / linear / fixed, factor, cap, jitter, attempt budget) into a per-attempt delay and cumulative wait schedule — jitter as a min/expected/max range instead of one sampled draw, plus a verdict on whether the cumulative wait overruns your own timeout",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server", "client"],
  meterId: "forge.dev.retry_backoff_schedule",
  roots: ["simulator"],
  engine: {
    name: "forge-retry-backoff-schedule",
    upstream:
      'AWS Architecture Blog "Exponential Backoff And Jitter" full/equal jitter pair (full = random(0,d); equal = d/2 + random(0,d/2)), as cited by k-lab.dev/retry\'s FAQ per brief §7 know-how #3 · retries.dev "Max Retries (excludes initial request)" attempt convention per know-how #1',
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "重试退避计算器,指数退避计算,重试延迟计算,退避抖动计算,重试计划模拟器",
    en: "retry backoff calculator, exponential backoff calculator, retry delay calculator, backoff jitter calculator, retry schedule simulator",
  },
  inputSchema,
  execute: (input: RetryBackoffScheduleInput): RetryBackoffScheduleResult =>
    buildRetrySchedule(input),
});

export const w3RetryBackoffScheduleTools: readonly AnyForgeToolDefinition[] = [
  retryBackoffScheduleTool,
];
