/**
 * Tests for the step-level idempotency helper in @nebutra/saga.
 *
 * Contract (see docs/architecture/2026-04-18-event-flow.md):
 *   - `idempotent(key, fn, store)` wraps `fn` such that the inner side-effectful
 *     function runs at most once per `key`.
 *   - The first call's resolved value is cached in the store.
 *   - Subsequent calls with the same key return the cached value and do NOT
 *     invoke `fn` again.
 *   - Distinct keys are independent — wrapping two keys with the same `fn`
 *     produces two independent invocations.
 *   - `InMemoryIdempotencyStore` implements the `IdempotencyStore` interface
 *     and is acceptable only for in-process / test usage.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { idempotent, InMemoryIdempotencyStore } from "../idempotency.js";

describe("InMemoryIdempotencyStore", () => {
  it("round-trips set → has → get for the same key", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.set("k1", { hello: "world" });

    expect(await store.has("k1")).toBe(true);
    expect(await store.get("k1")).toEqual({ hello: "world" });
  });

  it("has() returns false for unknown keys", async () => {
    const store = new InMemoryIdempotencyStore();
    expect(await store.has("never-set")).toBe(false);
    expect(await store.get("never-set")).toBeNull();
  });

  it("isolates different keys", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.set("a", 1);
    await store.set("b", 2);

    expect(await store.get("a")).toBe(1);
    expect(await store.get("b")).toBe(2);
  });
});

describe("idempotent()", () => {
  let store: InMemoryIdempotencyStore;

  beforeEach(() => {
    store = new InMemoryIdempotencyStore();
  });

  it("invokes the underlying fn exactly once for the same key", async () => {
    const fn = vi.fn(async () => ({ charged: true, amount: 100 }));
    const wrapped = idempotent("order:123:charge", fn, store);

    const a = await wrapped();
    const b = await wrapped();
    const c = await wrapped();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ charged: true, amount: 100 });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it("returns the stored result on second call — never re-executes the side effect", async () => {
    let sideEffectCount = 0;
    const fn = async () => {
      sideEffectCount += 1;
      return sideEffectCount;
    };
    const wrapped = idempotent("step-1", fn, store);

    const first = await wrapped();
    const second = await wrapped();

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(sideEffectCount).toBe(1);
  });

  it("different keys allow independent execution of the same fn", async () => {
    const fn = vi.fn(async (...args: unknown[]) => args);

    const wrappedA = idempotent("k-a", () => fn("a"), store);
    const wrappedB = idempotent("k-b", () => fn("b"), store);

    await wrappedA();
    await wrappedA();
    await wrappedB();

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, "a");
    expect(fn).toHaveBeenNthCalledWith(2, "b");
  });

  it("does NOT cache a failed invocation — retry runs the fn again", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("transient");
      }
      return "ok";
    };

    const wrapped = idempotent("flaky", fn, store);

    await expect(wrapped()).rejects.toThrow("transient");
    expect(await wrapped()).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("is safe under concurrent calls with the same key (single winner)", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      // Simulate async work
      await new Promise((r) => setTimeout(r, 5));
      return callCount;
    };

    const wrapped = idempotent("concurrent-key", fn, store);

    const [a, b, c] = await Promise.all([wrapped(), wrapped(), wrapped()]);

    expect(callCount).toBe(1);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(c).toBe(1);
  });
});
