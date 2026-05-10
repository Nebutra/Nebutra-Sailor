/**
 * Step-level idempotency for saga orchestrators.
 *
 * A saga step wrapped with `idempotent(key, fn, store)` is guaranteed to run
 * its underlying `fn` at most once per `key`. On the first successful
 * invocation the resolved value is recorded in the store; subsequent calls
 * return that cached value without invoking `fn` again.
 *
 * Failures are NOT cached — a rejected promise leaves the store untouched so
 * that the caller can retry safely.
 *
 * See docs/architecture/2026-04-18-event-flow.md for how this fits into the
 * canonical event flow (saga steps are one of two subscriber shapes on the
 * event bus).
 *
 * ───────────────────────────────────────────────────────────────────────
 *
 * The default {@link InMemoryIdempotencyStore} is process-local and loses
 * state on restart. It is suitable for:
 *   - unit tests
 *   - short-lived sagas executed within a single process
 * It is NOT suitable for:
 *   - multi-instance deployments (idempotency is not shared across replicas)
 *   - production billing / charge / email-send workflows — use a Redis or
 *     database-backed IdempotencyStore there.
 */

/**
 * Pluggable storage for cached step results. Implementations MUST be safe
 * under concurrent reads and writes from multiple in-process callers.
 */
export interface IdempotencyStore {
  has(key: string): Promise<boolean>;
  set(key: string, result: unknown, ttl?: number): Promise<void>;
  get(key: string): Promise<unknown | null>;
}

/**
 * In-memory store. NOT durable. Do not use in production.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly data = new Map<string, unknown>();

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async set(key: string, result: unknown, _ttl?: number): Promise<void> {
    // TTL intentionally ignored for in-memory store — callers expecting
    // expiration should wire a Redis-backed implementation.
    this.data.set(key, result);
  }

  async get(key: string): Promise<unknown | null> {
    return this.data.has(key) ? (this.data.get(key) ?? null) : null;
  }
}

/**
 * Wrap an async fn with idempotency semantics scoped to `key`.
 *
 * Concurrency behaviour: if two callers invoke the returned wrapper at the
 * same time with the same `key`, only one underlying `fn` runs — the other
 * awaits the same in-flight promise and gets the same result.
 */
export function idempotent<T>(
  key: string,
  fn: () => Promise<T>,
  store: IdempotencyStore,
): () => Promise<T> {
  const inflight = new Map<string, Promise<T>>();

  return async () => {
    const cached = await store.get(key);
    if (cached !== null && cached !== undefined) {
      return cached as T;
    }

    const existing = inflight.get(key);
    if (existing) {
      return existing;
    }

    const run = (async () => {
      try {
        const result = await fn();
        await store.set(key, result);
        return result;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, run);
    return run;
  };
}
