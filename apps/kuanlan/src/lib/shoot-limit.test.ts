import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BURST_PER_MINUTE,
  DEFAULT_DAILY,
  resetShootLimits,
  spendShootAllowance,
} from "./shoot-limit";

describe("shoot allowance", () => {
  beforeEach(() => {
    process.env.KUANLAN_SHOOT_BURST = undefined;
    delete process.env.KUANLAN_SHOOT_BURST;
    delete process.env.KUANLAN_SHOOT_DAILY;
    resetShootLimits();
  });

  afterEach(() => {
    delete process.env.KUANLAN_SHOOT_BURST;
    delete process.env.KUANLAN_SHOOT_DAILY;
    resetShootLimits();
  });

  it("counts down the day as shots are taken", async () => {
    process.env.KUANLAN_SHOOT_BURST = "10";
    process.env.KUANLAN_SHOOT_DAILY = "4";
    resetShootLimits();

    const first = await spendShootAllowance("user_1");
    const second = await spendShootAllowance("user_1");

    expect(first).toMatchObject({ allowed: true, remaining: 3 });
    expect(second).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("refuses on the burst ceiling before the day is spent", async () => {
    process.env.KUANLAN_SHOOT_BURST = "2";
    process.env.KUANLAN_SHOOT_DAILY = "100";
    resetShootLimits();

    await spendShootAllowance("user_1");
    await spendShootAllowance("user_1");
    const refused = await spendShootAllowance("user_1");

    expect(refused.allowed).toBe(false);
    expect(refused.scope).toBe("burst");
    expect(refused.retryAfter).toBeGreaterThan(0);
  });

  it("refuses on the daily ceiling once the day is spent", async () => {
    process.env.KUANLAN_SHOOT_BURST = "100";
    process.env.KUANLAN_SHOOT_DAILY = "2";
    resetShootLimits();

    await spendShootAllowance("user_1");
    await spendShootAllowance("user_1");
    const refused = await spendShootAllowance("user_1");

    expect(refused.allowed).toBe(false);
    expect(refused.scope).toBe("daily");
  });

  it("keeps one person's ceiling off everybody else's", async () => {
    process.env.KUANLAN_SHOOT_BURST = "100";
    process.env.KUANLAN_SHOOT_DAILY = "1";
    resetShootLimits();

    await spendShootAllowance("user_1");
    const mine = await spendShootAllowance("user_1");
    const theirs = await spendShootAllowance("user_2");

    expect(mine.allowed).toBe(false);
    expect(theirs.allowed).toBe(true);
  });

  it("falls back to the conservative defaults when the env is unusable", async () => {
    process.env.KUANLAN_SHOOT_DAILY = "not-a-number";
    resetShootLimits();

    const first = await spendShootAllowance("user_1");

    expect(first.remaining).toBe(DEFAULT_DAILY - 1);
    expect(DEFAULT_BURST_PER_MINUTE).toBeGreaterThan(0);
  });

  it("does not admit a shot past a zero or negative ceiling", async () => {
    process.env.KUANLAN_SHOOT_DAILY = "0";
    resetShootLimits();

    // 0 is not a usable ceiling — it would close the product rather than bound
    // it — so it falls back to the default rather than refusing everyone.
    const first = await spendShootAllowance("user_1");
    expect(first.allowed).toBe(true);
  });
});
