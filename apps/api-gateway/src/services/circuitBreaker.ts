/**
 * Distributed circuit breaker for outbound service calls.
 *
 * State is stored in Redis so all pods in a multi-instance deploy share the
 * same breaker state per upstream. Atomic Lua scripts guarantee consistent
 * transitions across concurrent failures.
 *
 * States: CLOSED (normal) → OPEN (failing, reject fast) → HALF_OPEN (probe)
 *
 * Fallback: if Redis is unreachable, each pod degrades to local in-memory
 * state and logs a warning — requests must never fail because of breaker
 * infrastructure.
 *
 * Configuration per breaker:
 *   failureThreshold  – consecutive failures before tripping OPEN (default 5)
 *   successThreshold  – consecutive successes in HALF_OPEN to close (default 2)
 *   timeout           – ms to stay OPEN before probing HALF_OPEN (default 30 s)
 *   ttlSeconds        – TTL for Redis keys (default 3600; refreshed on writes)
 */

import { getRedis } from "@nebutra/cache";
import { logger } from "@nebutra/logger";

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

interface BreakerOptions {
  /** Consecutive failures before opening the breaker. Default: 5 */
  failureThreshold?: number;
  /** Consecutive successes in HALF_OPEN to close. Default: 2 */
  successThreshold?: number;
  /** Milliseconds to stay OPEN before attempting HALF_OPEN probe. Default: 30 000 */
  timeout?: number;
  /** TTL for Redis state keys in seconds. Default: 3600 */
  ttlSeconds?: number;
  /** Human-readable name for this breaker (used in log lines and Redis keys). */
  name?: string;
}

interface BreakerStatus {
  state: State;
  failures: number;
  successes: number;
  openedAt: number | null;
}

interface LocalState {
  state: State;
  failures: number;
  successes: number;
  openedAt: number | null;
}

// ── Lua scripts ──────────────────────────────────────────────────────────────
// All scripts are atomic server-side so concurrent pods observe consistent state.

/**
 * Read current state, applying OPEN → HALF_OPEN transition if the timeout has
 * elapsed. Returns [state, failures, successes, openedAt].
 *
 * KEYS[1] = state, KEYS[2] = failures, KEYS[3] = successes, KEYS[4] = opened_at
 * ARGV[1] = now (ms), ARGV[2] = timeout (ms), ARGV[3] = ttl (s)
 */
const GET_STATE_SCRIPT = `
local state = redis.call("GET", KEYS[1]) or "CLOSED"
local failures = tonumber(redis.call("GET", KEYS[2])) or 0
local successes = tonumber(redis.call("GET", KEYS[3])) or 0
local openedAt = tonumber(redis.call("GET", KEYS[4]))
local now = tonumber(ARGV[1])
local timeout = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

if state == "OPEN" and openedAt ~= nil and (now - openedAt) >= timeout then
  state = "HALF_OPEN"
  redis.call("SET", KEYS[1], "HALF_OPEN", "EX", ttl)
  redis.call("SET", KEYS[3], "0", "EX", ttl)
  successes = 0
end

return {state, tostring(failures), tostring(successes), openedAt and tostring(openedAt) or ""}
`;

/**
 * Record a failure. Atomically increments failures, and if the threshold is
 * reached (or state is HALF_OPEN) transitions to OPEN. Returns new state.
 *
 * KEYS[1] = state, KEYS[2] = failures, KEYS[3] = successes, KEYS[4] = opened_at
 * ARGV[1] = threshold, ARGV[2] = now (ms), ARGV[3] = ttl (s)
 */
const RECORD_FAILURE_SCRIPT = `
local state = redis.call("GET", KEYS[1]) or "CLOSED"
local failures = redis.call("INCR", KEYS[2])
redis.call("EXPIRE", KEYS[2], ARGV[3])
local threshold = tonumber(ARGV[1])

if state == "HALF_OPEN" or failures >= threshold then
  redis.call("SET", KEYS[1], "OPEN", "EX", ARGV[3])
  redis.call("SET", KEYS[4], ARGV[2], "EX", ARGV[3])
  redis.call("SET", KEYS[3], "0", "EX", ARGV[3])
  return {"OPEN", tostring(failures)}
end

return {state, tostring(failures)}
`;

/**
 * Record a success. In HALF_OPEN, increments successes and closes when the
 * threshold is met. In CLOSED, resets the failure counter. Returns new state.
 *
 * KEYS[1] = state, KEYS[2] = failures, KEYS[3] = successes, KEYS[4] = opened_at
 * ARGV[1] = successThreshold, ARGV[2] = ttl (s)
 */
const RECORD_SUCCESS_SCRIPT = `
local state = redis.call("GET", KEYS[1]) or "CLOSED"
local successThreshold = tonumber(ARGV[1])

if state == "HALF_OPEN" then
  local successes = redis.call("INCR", KEYS[3])
  redis.call("EXPIRE", KEYS[3], ARGV[2])
  if successes >= successThreshold then
    redis.call("SET", KEYS[1], "CLOSED", "EX", ARGV[2])
    redis.call("SET", KEYS[2], "0", "EX", ARGV[2])
    redis.call("SET", KEYS[3], "0", "EX", ARGV[2])
    redis.call("DEL", KEYS[4])
    return {"CLOSED", tostring(successes)}
  end
  return {"HALF_OPEN", tostring(successes)}
end

-- CLOSED path: reset failures counter
redis.call("SET", KEYS[2], "0", "EX", ARGV[2])
return {state, "0"}
`;

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly ttlSeconds: number;
  private readonly name: string;

  // Per-pod fallback state, used when Redis is unreachable.
  private readonly localState: LocalState = {
    state: "CLOSED",
    failures: 0,
    successes: 0,
    openedAt: null,
  };

  // Suppress duplicate "Redis unavailable" warnings within a short window.
  private lastRedisWarnAt = 0;
  private static readonly REDIS_WARN_INTERVAL_MS = 30_000;

  constructor(opts: BreakerOptions = {}) {
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.successThreshold = opts.successThreshold ?? 2;
    this.timeout = opts.timeout ?? 30_000;
    this.ttlSeconds = opts.ttlSeconds ?? 3600;
    this.name = opts.name ?? "unnamed";
  }

  /** Execute `fn`. Throws if the breaker is OPEN or if `fn` raises. */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    const state = await this.resolveState();

    if (state === "OPEN") {
      throw new CircuitOpenError(
        `Circuit breaker '${this.name}' is OPEN — upstream service unavailable`,
      );
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (err) {
      await this.onFailure(err);
      throw err;
    }
  }

  /** Alias kept for API parity with the design doc. */
  execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.call(fn);
  }

  /** Current state + counters. Prefers Redis; falls back to local state. */
  async getStatus(): Promise<BreakerStatus> {
    const keys = this.keys();
    try {
      const redis = getRedis();
      const result = (await redis.eval(
        GET_STATE_SCRIPT,
        [keys.state, keys.failures, keys.successes, keys.openedAt],
        [String(Date.now()), String(this.timeout), String(this.ttlSeconds)],
      )) as [string, string, string, string];

      const [stateStr, failuresStr, successesStr, openedAtStr] = result;
      const state = normalizeState(stateStr);
      if (state === "HALF_OPEN" && this.localState.state === "OPEN") {
        // Surface the transition locally so log lines stay informative.
        logger.info(`Circuit breaker '${this.name}' → HALF_OPEN (probing)`);
      }
      this.localState.state = state;
      this.localState.failures = Number(failuresStr) || 0;
      this.localState.successes = Number(successesStr) || 0;
      this.localState.openedAt = openedAtStr === "" ? null : Number(openedAtStr);

      return {
        state: this.localState.state,
        failures: this.localState.failures,
        successes: this.localState.successes,
        openedAt: this.localState.openedAt,
      };
    } catch (err) {
      this.warnRedisUnavailable(err);
      this.maybeTransitionHalfOpenLocal();
      return {
        state: this.localState.state,
        failures: this.localState.failures,
        successes: this.localState.successes,
        openedAt: this.localState.openedAt,
      };
    }
  }

  /** Force-reset the breaker to CLOSED and clear counters. */
  async reset(): Promise<void> {
    this.localState.state = "CLOSED";
    this.localState.failures = 0;
    this.localState.successes = 0;
    this.localState.openedAt = null;

    try {
      const redis = getRedis();
      const keys = this.keys();
      await redis.del(keys.state, keys.failures, keys.successes, keys.openedAt);
    } catch (err) {
      this.warnRedisUnavailable(err);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private keys(): {
    state: string;
    failures: string;
    successes: string;
    openedAt: string;
  } {
    const prefix = `breaker:${this.name}`;
    return {
      state: `${prefix}:state`,
      failures: `${prefix}:failures`,
      successes: `${prefix}:successes`,
      openedAt: `${prefix}:opened_at`,
    };
  }

  private async resolveState(): Promise<State> {
    const status = await this.getStatus();
    return status.state;
  }

  private async onSuccess(): Promise<void> {
    const keys = this.keys();
    try {
      const redis = getRedis();
      const result = (await redis.eval(
        RECORD_SUCCESS_SCRIPT,
        [keys.state, keys.failures, keys.successes, keys.openedAt],
        [String(this.successThreshold), String(this.ttlSeconds)],
      )) as [string, string];

      const newState = normalizeState(result[0]);
      const previousState = this.localState.state;
      this.localState.state = newState;
      this.localState.successes = Number(result[1]) || 0;
      if (newState === "CLOSED") {
        this.localState.failures = 0;
        this.localState.openedAt = null;
        if (previousState !== "CLOSED") {
          logger.info(`Circuit breaker '${this.name}' → CLOSED`);
        }
      }
      return;
    } catch (err) {
      this.warnRedisUnavailable(err);
    }

    // Redis fallback — per-pod state.
    if (this.localState.state === "HALF_OPEN") {
      this.localState.successes += 1;
      if (this.localState.successes >= this.successThreshold) {
        this.localState.state = "CLOSED";
        this.localState.failures = 0;
        this.localState.openedAt = null;
        logger.info(`Circuit breaker '${this.name}' → CLOSED (local)`);
      }
    } else {
      this.localState.failures = 0;
    }
  }

  private async onFailure(err: unknown): Promise<void> {
    const errMsg = err instanceof Error ? err.message : String(err);
    const keys = this.keys();
    const now = Date.now();

    try {
      const redis = getRedis();
      const result = (await redis.eval(
        RECORD_FAILURE_SCRIPT,
        [keys.state, keys.failures, keys.successes, keys.openedAt],
        [String(this.failureThreshold), String(now), String(this.ttlSeconds)],
      )) as [string, string];

      const newState = normalizeState(result[0]);
      const failures = Number(result[1]) || 0;
      const previousState = this.localState.state;
      this.localState.state = newState;
      this.localState.failures = failures;
      if (newState === "OPEN") {
        this.localState.openedAt = now;
        if (previousState !== "OPEN") {
          logger.warn(
            `Circuit breaker '${this.name}' → OPEN after ${failures} failure(s): ${errMsg}`,
          );
        }
      } else {
        logger.warn(
          `Circuit breaker '${this.name}' failure ${failures}/${this.failureThreshold}: ${errMsg}`,
        );
      }
      return;
    } catch (redisErr) {
      this.warnRedisUnavailable(redisErr);
    }

    // Redis fallback — per-pod state.
    this.localState.failures += 1;
    if (
      this.localState.state === "HALF_OPEN" ||
      this.localState.failures >= this.failureThreshold
    ) {
      this.localState.state = "OPEN";
      this.localState.openedAt = now;
      logger.warn(
        `Circuit breaker '${this.name}' → OPEN (local) after ${this.localState.failures} failure(s): ${errMsg}`,
      );
    } else {
      logger.warn(
        `Circuit breaker '${this.name}' failure ${this.localState.failures}/${this.failureThreshold} (local): ${errMsg}`,
      );
    }
  }

  private maybeTransitionHalfOpenLocal(): void {
    if (
      this.localState.state === "OPEN" &&
      this.localState.openedAt !== null &&
      Date.now() - this.localState.openedAt >= this.timeout
    ) {
      this.localState.state = "HALF_OPEN";
      this.localState.successes = 0;
      logger.info(`Circuit breaker '${this.name}' → HALF_OPEN (probing, local)`);
    }
  }

  private warnRedisUnavailable(err: unknown): void {
    const now = Date.now();
    if (now - this.lastRedisWarnAt < CircuitBreaker.REDIS_WARN_INTERVAL_MS) return;
    this.lastRedisWarnAt = now;
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `Redis circuit breaker unavailable for '${this.name}', using local state: ${msg}`,
    );
  }
}

function normalizeState(value: string): State {
  if (value === "OPEN" || value === "HALF_OPEN" || value === "CLOSED") {
    return value;
  }
  return "CLOSED";
}

export class CircuitOpenError extends Error {
  readonly code = "CIRCUIT_OPEN";
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

// ── Singleton breakers (one per upstream service) ────────────────────────────

export const aiServiceBreaker = new CircuitBreaker({
  name: "ai-service",
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30_000,
});

export const billingServiceBreaker = new CircuitBreaker({
  name: "billing-service",
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60_000,
});
