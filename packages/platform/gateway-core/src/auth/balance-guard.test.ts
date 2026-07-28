import { describe, expect, it, vi } from "vitest";
import { admitSpend, checkBalance } from "./balance-guard";

/**
 * A Redis stand-in that actually evaluates the admission script's arithmetic,
 * rather than asserting the script was called. The whole point of the change
 * is that concurrent callers share one counter, and a mock that returns a
 * fixed value cannot show that.
 */
function fakeRedis(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => {
      store.set(k, v);
      return "OK";
    },
    del: async (k: string) => (store.delete(k) ? 1 : 0),
    eval: async (_script: string, keys: string[], args: Array<string | number>) => {
      const key = keys[0] as string;
      const delta = Number(args[0]);
      const limit = Number(args[1]);
      const committed = Number(store.get(key) ?? "0") + delta;
      store.set(key, String(committed));
      if (committed > limit) {
        store.set(key, String(committed - delta));
        return 0;
      }
      return 1;
    },
  };
}

describe("admitSpend", () => {
  it("rejects when the balance is zero", async () => {
    const redis = fakeRedis();
    await expect(admitSpend("org_1", 1, redis, async () => 0)).rejects.toThrow(
      /Insufficient credit/,
    );
  });

  it("admits a request that fits", async () => {
    const redis = fakeRedis();
    await expect(admitSpend("org_1", 4, redis, async () => 10)).resolves.toBeUndefined();
    expect(redis.store.get("credit:window:org_1")).toBe("4");
  });

  it("bounds concurrent requests to the balance", async () => {
    // The behaviour the old guard could not provide: ten requests worth 3 each
    // against a balance of 10 must not all pass just because each of them read
    // the same positive cached balance.
    const redis = fakeRedis();
    const getBalance = vi.fn(async () => 10);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => admitSpend("org_1", 3, redis, getBalance)),
    );

    const admitted = results.filter((r) => r.status === "fulfilled").length;
    expect(admitted).toBe(3); // 3 + 3 + 3 = 9 fits; the fourth would be 12
    expect(Number(redis.store.get("credit:window:org_1"))).toBeLessThanOrEqual(10);
  });

  it("puts the amount back when it rejects, so one big request does not block small ones", async () => {
    const redis = fakeRedis();
    await expect(admitSpend("org_1", 50, redis, async () => 10)).rejects.toThrow();
    expect(Number(redis.store.get("credit:window:org_1") ?? "0")).toBe(0);
    await expect(admitSpend("org_1", 5, redis, async () => 10)).resolves.toBeUndefined();
  });

  it("falls back to the balance check when the adapter has no eval", async () => {
    const { eval: _omitted, ...noEval } = fakeRedis();
    await expect(admitSpend("org_1", 999, noEval, async () => 10)).resolves.toBeUndefined();
  });
});

describe("checkBalance", () => {
  it("caches the balance so a second call does not hit the billing service", async () => {
    const redis = fakeRedis();
    const getBalance = vi.fn(async () => 5);
    await checkBalance("org_1", redis, getBalance);
    await checkBalance("org_1", redis, getBalance);
    expect(getBalance).toHaveBeenCalledTimes(1);
  });
});
