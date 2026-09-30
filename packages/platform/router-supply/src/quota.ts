/**
 * Quota window state machine (ADR 2026-09-30 addendum — quota layer).
 *
 * Pure and DB-free, mirroring `state.ts`'s role for capability: the repository
 * seam (`RouterSupplyRepository`) is the only thing that reads or writes a
 * `SupplyQuotaWindow` row, and it delegates every transition decision here.
 *
 * This is a *headroom* signal, not a capability verdict — `THROTTLED` and
 * `EXHAUSTED` here never suspend `SupplySourceModel.state`; they only bias
 * routing preference and drive an alert. A source with an exhausted quota
 * window still answers real calls the moment the window resets.
 */

export type QuotaUnit = "USD" | "TOKENS" | "REQUESTS";
export type QuotaSourceOfTruth = "HEADER" | "ENDPOINT" | "SELF_METERED";
export type QuotaState = "NOMINAL" | "THROTTLED" | "EXHAUSTED";
export type QuotaAlertLevel = "NONE" | "WARN_80" | "WARN_95" | "EXHAUSTED";

/** 80% throttles routing preference; 100% is exhausted. Matches the owner's own example ratios. */
export const THROTTLE_THRESHOLD = 0.8;
/** The second alert rung, before exhaustion. */
export const ALERT_THRESHOLD_95 = 0.95;

const ALERT_RANK: Record<QuotaAlertLevel, number> = {
  NONE: 0,
  WARN_80: 1,
  WARN_95: 2,
  EXHAUSTED: 3,
};

/** Headroom state from a used/limit pair. No limit (null or non-positive) is always NOMINAL. */
export function stateFor(used: number, limit: number | null): QuotaState {
  if (limit === null || limit <= 0) return "NOMINAL";
  const ratio = used / limit;
  if (ratio >= 1) return "EXHAUSTED";
  if (ratio >= THROTTLE_THRESHOLD) return "THROTTLED";
  return "NOMINAL";
}

/** Same ratio, at alerting granularity (splits THROTTLED into WARN_80 / WARN_95). */
export function ratioAlertLevel(used: number, limit: number | null): QuotaAlertLevel {
  if (limit === null || limit <= 0) return "NONE";
  const ratio = used / limit;
  if (ratio >= 1) return "EXHAUSTED";
  if (ratio >= ALERT_THRESHOLD_95) return "WARN_95";
  if (ratio >= THROTTLE_THRESHOLD) return "WARN_80";
  return "NONE";
}

/** Only an escalation is worth a new alert — flat or improving never re-fires. */
export function shouldAlertRatio(prior: QuotaAlertLevel, next: QuotaAlertLevel): boolean {
  return ALERT_RANK[next] > ALERT_RANK[prior];
}

/** The independent forecast axis: its own cooldown, not the ratio ladder. */
export function shouldAlertForecast(
  forecastSoon: boolean,
  lastForecastAlertAt: Date | null,
  now: Date,
  cooldownMs: number,
): boolean {
  if (!forecastSoon) return false;
  if (!lastForecastAlertAt) return true;
  return now.getTime() - lastForecastAlertAt.getTime() >= cooldownMs;
}

/**
 * Adaptive active-pull scheduling (§6): how long until this window is worth
 * checking again. Close to its limit (or forecasting soon) pulls again as
 * soon as the cron's own floor allows; comfortably idle is pushed well out —
 * most cron ticks should find nothing due, the row-level schedule is the real
 * rate limiter, the same posture `listSuspendedDueForRetry` established for
 * capability.
 */
export function nextPullDelaySeconds(state: QuotaState, forecastSoon: boolean): number {
  if (state === "EXHAUSTED" || state === "THROTTLED") return 900; // 15 min
  if (forecastSoon) return 1800; // 30 min
  return 3600; // 60 min
}

export function forecastWithinHours(
  forecastExhaustAt: Date | null,
  now: Date,
  hours: number,
): boolean {
  if (!forecastExhaustAt) return false;
  return forecastExhaustAt.getTime() - now.getTime() <= hours * 3_600_000;
}

export interface QuotaWindowSnapshot {
  readonly unit: QuotaUnit;
  readonly limit: number | null;
  readonly used: number;
  readonly resetsAt: Date | null;
  readonly windowSeconds: number | null;
  readonly sourceOfTruth: QuotaSourceOfTruth;
  readonly state: QuotaState;
  readonly burnRatePerHour: number | null;
  readonly forecastExhaustAt: Date | null;
  readonly lastAlertLevel: QuotaAlertLevel;
  readonly lastForecastAlertAt: Date | null;
  readonly lastSampleAt: Date | null;
}

export interface QuotaObservation {
  /** Absolute reading (header/endpoint) — replaces `used`. */
  readonly used?: number | null;
  /** Absolute remaining (header) — `used = limit - remaining` when `used` is absent. */
  readonly remaining?: number | null;
  /** Increment (self-metered) — added to `used`. */
  readonly deltaUsed?: number | null;
  /** Adopted when given; otherwise the window keeps its own (declared or previously observed). */
  readonly limit?: number | null;
  /** Adopted when the provider names one (header/endpoint own the clock in that case). */
  readonly resetsAt?: Date | null;
  readonly sourceOfTruth: QuotaSourceOfTruth;
  /**
   * The header-less-429 case (`quota-headers.ts` `parseForceExhaustedUntil`):
   * no ratio data at all, just "blocked until this instant." Short-circuits
   * straight to EXHAUSTED until then; recovery falls out of the normal ratio
   * recompute on the next observation once `now` passes it.
   */
  readonly forceExhaustedUntil?: Date | null;
}

export interface QuotaTransition {
  readonly snapshot: QuotaWindowSnapshot;
  readonly sample: { readonly usedAmount: number; readonly deltaAmount: number | null };
}

const BURN_SMOOTHING = 0.3;

/**
 * One pure transition: fold one observation into a window's snapshot.
 *
 * `self_metered` accumulates (we own the clock, so it also rolls the window
 * over itself once `now >= resetsAt`, fast-forwarding through any number of
 * missed cycles). `header`/`endpoint` replace `used` with the provider's own
 * absolute reading — never accumulated on top of a number the provider
 * already gave in full — and adopt the provider's own `resetsAt` when named.
 *
 * Recovery needs no special case: whenever the computed `used` is lower than
 * the window's previous `used`, that is a rollover by definition, and this
 * clears `lastAlertLevel` back to NONE and the burn-rate baseline right there.
 */
export function applyQuotaObservation(
  window: QuotaWindowSnapshot,
  observation: QuotaObservation,
  now: Date,
): QuotaTransition {
  if (
    observation.forceExhaustedUntil &&
    observation.forceExhaustedUntil.getTime() > now.getTime()
  ) {
    return {
      snapshot: {
        ...window,
        state: "EXHAUSTED",
        resetsAt: observation.forceExhaustedUntil,
        lastSampleAt: now,
      },
      sample: { usedAmount: window.used, deltaAmount: 0 },
    };
  }

  let used = window.used;
  let resetsAt = window.resetsAt;
  const limit = observation.limit ?? window.limit;

  if (observation.sourceOfTruth === "SELF_METERED") {
    if (resetsAt && window.windowSeconds && now.getTime() >= resetsAt.getTime()) {
      used = 0;
      do {
        resetsAt = new Date((resetsAt as Date).getTime() + window.windowSeconds * 1000);
      } while (resetsAt.getTime() <= now.getTime());
    }
    used += observation.deltaUsed ?? 0;
  } else {
    if (observation.used != null) {
      used = observation.used;
    } else if (observation.remaining != null && limit != null) {
      used = Math.max(0, limit - observation.remaining);
    }
    if (observation.resetsAt !== undefined && observation.resetsAt !== null) {
      resetsAt = observation.resetsAt;
    }
  }

  const rolledOver = used < window.used;
  const deltaAmount = used - window.used;

  let burnRatePerHour = rolledOver ? null : window.burnRatePerHour;
  if (!rolledOver && window.lastSampleAt) {
    const elapsedHours = (now.getTime() - window.lastSampleAt.getTime()) / 3_600_000;
    if (elapsedHours > 0 && deltaAmount >= 0) {
      const instantRate = deltaAmount / elapsedHours;
      burnRatePerHour =
        burnRatePerHour == null
          ? instantRate
          : burnRatePerHour * (1 - BURN_SMOOTHING) + instantRate * BURN_SMOOTHING;
    }
  }

  const forecastExhaustAt =
    limit != null && burnRatePerHour != null && burnRatePerHour > 0 && used < limit
      ? new Date(now.getTime() + ((limit - used) / burnRatePerHour) * 3_600_000)
      : null;

  const state = stateFor(used, limit);
  const lastAlertLevel = rolledOver ? "NONE" : window.lastAlertLevel;
  const lastForecastAlertAt = rolledOver ? null : window.lastForecastAlertAt;

  return {
    snapshot: {
      ...window,
      limit,
      used,
      resetsAt,
      state,
      burnRatePerHour,
      forecastExhaustAt,
      lastAlertLevel,
      lastForecastAlertAt,
      lastSampleAt: now,
    },
    sample: { usedAmount: used, deltaAmount: rolledOver ? null : deltaAmount },
  };
}
