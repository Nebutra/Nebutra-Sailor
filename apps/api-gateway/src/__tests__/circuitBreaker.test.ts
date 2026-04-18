/**
 * Distributed CircuitBreaker tests.
 *
 * Uses an in-memory mock of the Upstash Redis client (supporting GET/SET/INCR/
 * DEL/EXPIRE and a tiny Lua interpreter) to simulate two pods sharing state.
 * This is the same atomic contract the real Redis eval provides.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ──────────────────────────────────────────────────────────
// A single in-memory Redis store shared by all "pods" constructed in a test.

interface Store {
  data: Map<string, string>;
}

function createStore(): Store {
  return { data: new Map() };
}

// Shared store is swapped per-test via `currentStore`.
let currentStore: Store = createStore();

/** Mini Lua runner that understands the exact commands used by our scripts. */
function evalScript(
  store: Store,
  script: string,
  keys: string[],
  args: string[],
): unknown {
  // Rather than re-implementing Lua, we detect which script is being evaluated
  // by a marker phrase and run a TS equivalent that mutates `store`.
  const now = () => Date.now();

  const get = (k: string) => store.data.get(k) ?? null;
  const set = (k: string, v: string) => store.data.set(k, v);
  const del = (k: string) => store.data.delete(k);
  const incr = (k: string): number => {
    const next = (Number(store.data.get(k)) || 0) + 1;
    store.data.set(k, String(next));
    return next;
  };

  if (script.includes("redis.call(\"INCR\", KEYS[2])") && script.includes("OPEN")) {
    // RECORD_FAILURE_SCRIPT
    const [stateKey, failuresKey, successesKey, openedAtKey] = keys as [
      string,
      string,
      string,
      string,
    ];
    const [thresholdStr, nowMs, ttl] = args;
    void ttl;
    const state = get(stateKey) ?? "CLOSED";
    const failures = incr(failuresKey);
    const threshold = Number(thresholdStr);

    if (state === "HALF_OPEN" || failures >= threshold) {
      set(stateKey, "OPEN");
      set(openedAtKey, nowMs ?? String(now()));
      set(successesKey, "0");
      return ["OPEN", String(failures)];
    }
    return [state, String(failures)];
  }

  if (script.includes("successThreshold") && script.includes("HALF_OPEN")) {
    // RECORD_SUCCESS_SCRIPT
    const [stateKey, failuresKey, successesKey, openedAtKey] = keys as [
      string,
      string,
      string,
      string,
    ];
    const successThreshold = Number(args[0]);
    const state = get(stateKey) ?? "CLOSED";

    if (state === "HALF_OPEN") {
      const successes = incr(successesKey);
      if (successes >= successThreshold) {
        set(stateKey, "CLOSED");
        set(failuresKey, "0");
        set(successesKey, "0");
        del(openedAtKey);
        return ["CLOSED", String(successes)];
      }
      return ["HALF_OPEN", String(successes)];
    }

    set(failuresKey, "0");
    return [state, "0"];
  }

  // GET_STATE_SCRIPT
  const [stateKey, failuresKey, successesKey, openedAtKey] = keys as [
    string,
    string,
    string,
    string,
  ];
  const [nowStr, timeoutStr] = args;
  let state = get(stateKey) ?? "CLOSED";
  let successes = Number(get(successesKey)) || 0;
  const failures = Number(get(failuresKey)) || 0;
  const openedAtRaw = get(openedAtKey);
  const openedAt = openedAtRaw === null ? null : Number(openedAtRaw);
  const nowMs = Number(nowStr);
  const timeoutMs = Number(timeoutStr);

  if (state === "OPEN" && openedAt !== null && nowMs - openedAt >= timeoutMs) {
    state = "HALF_OPEN";
    set(stateKey, "HALF_OPEN");
    set(successesKey, "0");
    successes = 0;
  }

  return [
    state,
    String(failures),
    String(successes),
    openedAt === null ? "" : String(openedAt),
  ];
}

function createMockRedis(store: Store) {
  return {
    eval: async (script: string, keys: string[], args: string[]) =>
      evalScript(store, script, keys, args),
    del: async (...ks: string[]) => {
      for (const k of ks) store.data.delete(k);
      return ks.length;
    },
  };
}

let mockGetRedisImpl: () => unknown = () => createMockRedis(currentStore);

vi.mock("@nebutra/cache", () => ({
  getRedis: () => mockGetRedisImpl(),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────

const { CircuitBreaker, CircuitOpenError } = await import("../services/circuitBreaker.js");

// ─── Helpers ───────────────────────────────────────────────────────────────

const failingFn = async () => {
  throw new Error("upstream error");
};
const succeedingFn = async () => "ok";

// ─── Tests ────────────────────────────────────────────────────────────────

describe("CircuitBreaker (distributed)", () => {
  beforeEach(() => {
    currentStore = createStore();
    mockGetRedisImpl = () => createMockRedis(currentStore);
  });

  it("opens after reaching the failure threshold", async () => {
    const cb = new CircuitBreaker({
      name: "test-open",
      failureThreshold: 3,
      timeout: 10_000,
    });

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow("upstream error");
    }

    await expect(cb.call(succeedingFn)).rejects.toBeInstanceOf(CircuitOpenError);
    const status = await cb.getStatus();
    expect(status.state).toBe("OPEN");
    expect(status.failures).toBe(3);
  });

  it("shares state across pods via Redis (multi-instance safety)", async () => {
    // Two CircuitBreaker instances with the same name — this simulates two
    // pods behind a load balancer, each with its own in-process object but
    // pointing at the same Redis key space.
    const podA = new CircuitBreaker({
      name: "shared-upstream",
      failureThreshold: 5,
      timeout: 10_000,
    });
    const podB = new CircuitBreaker({
      name: "shared-upstream",
      failureThreshold: 5,
      timeout: 10_000,
    });

    // Pod A records 5 failures → breaker trips OPEN globally.
    for (let i = 0; i < 5; i++) {
      await expect(podA.call(failingFn)).rejects.toThrow("upstream error");
    }

    // Pod B's next call must see OPEN (not CLOSED) and fail fast without
    // invoking the upstream function.
    const upstream = vi.fn(async () => "should-never-run");
    await expect(podB.call(upstream)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(upstream).not.toHaveBeenCalled();

    const statusB = await podB.getStatus();
    expect(statusB.state).toBe("OPEN");
  });

  it("transitions OPEN → HALF_OPEN after timeout elapses", async () => {
    const cb = new CircuitBreaker({
      name: "test-halfopen",
      failureThreshold: 2,
      timeout: 50,
    });

    await expect(cb.call(failingFn)).rejects.toThrow();
    await expect(cb.call(failingFn)).rejects.toThrow();
    expect((await cb.getStatus()).state).toBe("OPEN");

    await new Promise((r) => setTimeout(r, 60));

    const status = await cb.getStatus();
    expect(status.state).toBe("HALF_OPEN");
  });

  it("closes after successThreshold probes succeed in HALF_OPEN", async () => {
    const cb = new CircuitBreaker({
      name: "test-close",
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 20,
    });

    await expect(cb.call(failingFn)).rejects.toThrow();
    await expect(cb.call(failingFn)).rejects.toThrow();
    expect((await cb.getStatus()).state).toBe("OPEN");

    await new Promise((r) => setTimeout(r, 30));
    expect((await cb.getStatus()).state).toBe("HALF_OPEN");

    await cb.call(succeedingFn);
    await cb.call(succeedingFn);

    const status = await cb.getStatus();
    expect(status.state).toBe("CLOSED");
    expect(status.failures).toBe(0);
  });

  it("re-opens immediately if HALF_OPEN probe fails", async () => {
    const cb = new CircuitBreaker({
      name: "test-reopen",
      failureThreshold: 2,
      timeout: 20,
    });

    await expect(cb.call(failingFn)).rejects.toThrow();
    await expect(cb.call(failingFn)).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 30));

    expect((await cb.getStatus()).state).toBe("HALF_OPEN");
    await expect(cb.call(failingFn)).rejects.toThrow("upstream error");
    expect((await cb.getStatus()).state).toBe("OPEN");
  });

  it("falls back to per-pod local state when Redis is unreachable", async () => {
    mockGetRedisImpl = () => {
      throw new Error("Redis credentials not configured");
    };

    const cb = new CircuitBreaker({
      name: "test-fallback",
      failureThreshold: 3,
      timeout: 10_000,
    });

    // The breaker must not propagate the Redis error — requests still run.
    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow("upstream error");
    }

    // Local state should now reflect OPEN.
    const status = await cb.getStatus();
    expect(status.state).toBe("OPEN");
    await expect(cb.call(succeedingFn)).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("reset() clears state back to CLOSED", async () => {
    const cb = new CircuitBreaker({
      name: "test-reset",
      failureThreshold: 2,
      timeout: 10_000,
    });

    await expect(cb.call(failingFn)).rejects.toThrow();
    await expect(cb.call(failingFn)).rejects.toThrow();
    expect((await cb.getStatus()).state).toBe("OPEN");

    await cb.reset();

    const status = await cb.getStatus();
    expect(status.state).toBe("CLOSED");
    expect(status.failures).toBe(0);
  });
});
