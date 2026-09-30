import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  BACKOFF_LADDER_SECONDS,
  type CapabilityCounters,
  effectiveState,
  isSellableState,
  nextBackoffSeconds,
} from "./state";

const zero: CapabilityCounters = {
  state: "PENDING",
  consecutiveFailures: 0,
  consecutiveSuccesses: 0,
  backoffSeconds: 0,
};

describe("applyOutcome", () => {
  it("moves PENDING to AVAILABLE on the first success", () => {
    const t = applyOutcome(zero, "success", null);
    expect(t.state).toBe("AVAILABLE");
    expect(t.transitioned).toBe(true);
    expect(t.nextProbeAt).toBeNull();
  });

  it("does not suspend on a single failure — one bad call is noise", () => {
    const t = applyOutcome({ ...zero, state: "AVAILABLE" }, "failure", "timeout");
    expect(t.state).toBe("DEGRADED");
    expect(t.consecutiveFailures).toBe(1);
    expect(t.nextProbeAt).toBeNull();
  });

  it("suspends after SUSPEND_AFTER_FAILURES consecutive failures", () => {
    let counters: CapabilityCounters = { ...zero, state: "AVAILABLE" };
    let t = applyOutcome(counters, "failure", "auth_not_found");
    expect(t.state).toBe("DEGRADED");
    counters = { ...counters, state: t.state, consecutiveFailures: t.consecutiveFailures };
    t = applyOutcome(counters, "failure", "auth_not_found");
    expect(t.state).toBe("DEGRADED");
    counters = { ...counters, state: t.state, consecutiveFailures: t.consecutiveFailures };
    t = applyOutcome(counters, "failure", "auth_not_found");
    expect(t.state).toBe("SUSPENDED");
    expect(t.stateReason).toBe("auth_not_found");
    expect(t.nextProbeAt).not.toBeNull();
    expect(t.backoffSeconds).toBe(BACKOFF_LADDER_SECONDS[0]);
  });

  it("restores immediately on the next success once suspended", () => {
    const suspended: CapabilityCounters = {
      state: "SUSPENDED",
      consecutiveFailures: 5,
      consecutiveSuccesses: 0,
      backoffSeconds: BACKOFF_LADDER_SECONDS[0] ?? 0,
    };
    const t = applyOutcome(suspended, "success", null);
    expect(t.state).toBe("AVAILABLE");
    expect(t.transitioned).toBe(true);
    expect(t.consecutiveFailures).toBe(0);
    expect(t.backoffSeconds).toBe(0);
    expect(t.nextProbeAt).toBeNull();
  });

  it("walks the backoff ladder on repeated suspension without abandoning it", () => {
    const suspended: CapabilityCounters = {
      state: "SUSPENDED",
      consecutiveFailures: 3,
      consecutiveSuccesses: 0,
      backoffSeconds: BACKOFF_LADDER_SECONDS[0] ?? 0,
    };
    const t1 = applyOutcome(suspended, "failure", "auth_not_found");
    expect(t1.backoffSeconds).toBe(BACKOFF_LADDER_SECONDS[1]);
    const t2 = applyOutcome(
      { ...suspended, backoffSeconds: t1.backoffSeconds },
      "failure",
      "auth_not_found",
    );
    expect(t2.backoffSeconds).toBe(BACKOFF_LADDER_SECONDS[2]);
    // Capped, not abandoned — one more failure stays at the ceiling.
    const t3 = applyOutcome(
      { ...suspended, backoffSeconds: t2.backoffSeconds },
      "failure",
      "auth_not_found",
    );
    expect(t3.backoffSeconds).toBe(BACKOFF_LADDER_SECONDS[BACKOFF_LADDER_SECONDS.length - 1]);
    expect(t3.state).toBe("SUSPENDED");
  });
});

describe("nextBackoffSeconds", () => {
  it("steps through the ladder and caps at the ceiling", () => {
    expect(nextBackoffSeconds(0)).toBe(3_600);
    expect(nextBackoffSeconds(3_600)).toBe(21_600);
    expect(nextBackoffSeconds(21_600)).toBe(86_400);
    expect(nextBackoffSeconds(86_400)).toBe(86_400);
    expect(nextBackoffSeconds(999_999)).toBe(86_400);
  });
});

describe("effectiveState", () => {
  it("a ban always wins, even over a pin", () => {
    expect(effectiveState({ state: "AVAILABLE", pinned: true, banned: true })).toBe("SUSPENDED");
  });
  it("a pin forces AVAILABLE regardless of the probed state", () => {
    expect(effectiveState({ state: "SUSPENDED", pinned: true, banned: false })).toBe("AVAILABLE");
  });
  it("with neither override, the probed state stands", () => {
    expect(effectiveState({ state: "DEGRADED", pinned: false, banned: false })).toBe("DEGRADED");
  });
});

describe("isSellableState", () => {
  it("AVAILABLE and DEGRADED are sellable; PENDING and SUSPENDED are not", () => {
    expect(isSellableState("AVAILABLE")).toBe(true);
    expect(isSellableState("DEGRADED")).toBe(true);
    expect(isSellableState("PENDING")).toBe(false);
    expect(isSellableState("SUSPENDED")).toBe(false);
  });
});
