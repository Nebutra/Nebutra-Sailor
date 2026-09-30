/**
 * The per (source, model) capability state machine (ADR 2026-09-30 supply
 * capability probing).
 *
 * Pure and DB-free on purpose: the repository seam (`@nebutra/repositories`
 * `RouterSupplyRepository`) is the only thing that reads or writes a row, and
 * it delegates every transition decision here so the rule — what turns a
 * model on or off the shelf — has exactly one implementation, unit-testable
 * without Postgres.
 *
 * `pending → available → degraded → suspended(temporary) → available`, with
 * hysteresis (repeat failures before suspending, so one flaky call cannot
 * delist a model) and exponential backoff while suspended (so a broken source
 * is retried less and less often, never abandoned). A model is never deleted
 * by this machine — `SUSPENDED` is a hold, not a verdict.
 */

export type SupplyModelState = "PENDING" | "AVAILABLE" | "DEGRADED" | "SUSPENDED";

/** One outcome a probe (active or passive) can report. */
export type ProbeOutcome = "success" | "failure";

/**
 * Consecutive failures before a healthy model is marked merely degraded (still
 * sellable, but flagged) — one bad call is noise, not a verdict.
 */
export const DEGRADE_AFTER_FAILURES = 1;

/**
 * Consecutive failures before a model is suspended (delisted). Three, not one:
 * a suspend is a shelf-visible decision, and hysteresis is what keeps a single
 * upstream hiccup from flapping the public catalogue.
 */
export const SUSPEND_AFTER_FAILURES = 3;

/**
 * Consecutive successes before a degraded or suspended model is restored.
 * Deliberately one: the owner wants "comes back by itself" to mean
 * immediately, not after a multi-probe quorum — the cost of a false recovery
 * is one more probe cycle, not a customer-visible failure (the shelf gate is
 * additive on top of the published-price gate either way).
 */
export const RESTORE_AFTER_SUCCESSES = 1;

/**
 * Backoff ladder for a suspended model's next active probe: 1h → 6h → 24h,
 * capped. Retried forever, never abandoned — the ladder only ever grows to
 * its ceiling, it does not stop.
 */
export const BACKOFF_LADDER_SECONDS: readonly number[] = [3_600, 21_600, 86_400];

export interface CapabilityCounters {
  readonly state: SupplyModelState;
  readonly consecutiveFailures: number;
  readonly consecutiveSuccesses: number;
  readonly backoffSeconds: number;
}

export interface StateTransition {
  readonly state: SupplyModelState;
  readonly stateReason: string | null;
  readonly consecutiveFailures: number;
  readonly consecutiveSuccesses: number;
  readonly backoffSeconds: number;
  /** `null` when the model is not (or no longer) suspended. */
  readonly nextProbeAt: Date | null;
  readonly transitioned: boolean;
}

/** The next backoff step, one rung up the ladder from the current one. */
export function nextBackoffSeconds(currentBackoffSeconds: number): number {
  for (const rung of BACKOFF_LADDER_SECONDS) {
    if (rung > currentBackoffSeconds) return rung;
  }
  return BACKOFF_LADDER_SECONDS[BACKOFF_LADDER_SECONDS.length - 1] ?? currentBackoffSeconds;
}

/**
 * Apply one probe outcome to a capability row's counters and return the next
 * state. `reason` is the classified failure reason (`auth_not_found`, `401`,
 * `model_not_found`, …); ignored on success.
 */
export function applyOutcome(
  counters: CapabilityCounters,
  outcome: ProbeOutcome,
  reason: string | null,
  now: Date = new Date(),
): StateTransition {
  if (outcome === "success") {
    const consecutiveSuccesses = counters.consecutiveSuccesses + 1;
    const wasDown = counters.state === "DEGRADED" || counters.state === "SUSPENDED";
    const restored = wasDown && consecutiveSuccesses >= RESTORE_AFTER_SUCCESSES;
    const state: SupplyModelState =
      restored || counters.state === "PENDING" ? "AVAILABLE" : counters.state;
    return {
      state,
      // A success always clears the reason a failure would have set, even
      // while still building toward restoration — there is nothing wrong to
      // report right now.
      stateReason: null,
      consecutiveFailures: 0,
      consecutiveSuccesses,
      backoffSeconds: 0,
      nextProbeAt: null,
      transitioned: state !== counters.state,
    };
  }

  const consecutiveFailures = counters.consecutiveFailures + 1;
  let state: SupplyModelState = counters.state;
  if (consecutiveFailures >= SUSPEND_AFTER_FAILURES) {
    state = "SUSPENDED";
  } else if (consecutiveFailures >= DEGRADE_AFTER_FAILURES) {
    state = state === "SUSPENDED" ? state : "DEGRADED";
  }

  const suspended = state === "SUSPENDED";
  const backoffSeconds = suspended ? nextBackoffSeconds(counters.backoffSeconds) : 0;
  const nextProbeAt = suspended ? new Date(now.getTime() + backoffSeconds * 1000) : null;

  return {
    state,
    stateReason: reason,
    consecutiveFailures,
    consecutiveSuccesses: 0,
    backoffSeconds,
    nextProbeAt,
    transitioned: state !== counters.state,
  };
}

/** A manual pin/ban, applied on top of the automatic machine — the escape hatch, not the mechanism. */
export function effectiveState(input: {
  readonly state: SupplyModelState;
  readonly pinned: boolean;
  readonly banned: boolean;
}): SupplyModelState {
  if (input.banned) return "SUSPENDED";
  if (input.pinned) return "AVAILABLE";
  return input.state;
}

/** Whether a model in this state should be sold on the public shelf / routed to. */
export function isSellableState(state: SupplyModelState): boolean {
  return state === "AVAILABLE" || state === "DEGRADED";
}
