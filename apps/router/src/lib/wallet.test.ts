import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `@nebutra/billing` throws "requires a host tenant DB" until it is configured.
 * `instrumentation.ts` does that at boot — but boot and a request handler do not
 * always share a module instance in a bundled build, and `/v1/limits` reached an
 * unconfigured copy and returned 500 on our own published endpoint.
 *
 * So the wallet configures it on the way to first use. This pins the ordering:
 * configuration happens before the wallet is built, not after and not never.
 */
const order: string[] = [];
const configureBillingTenantDb = vi.fn(() => void order.push("configure"));

vi.mock("server-only", () => ({}));
vi.mock("@nebutra/billing", () => ({ configureBillingTenantDb }));
vi.mock("@nebutra/billing/credits", () => ({
  getCreditBalance: vi.fn(),
  getCreditBalanceFresh: vi.fn(),
  invalidateCreditCache: vi.fn(),
  addCredits: vi.fn(),
  deductCredits: vi.fn(),
}));
vi.mock("@nebutra/db", () => ({ getTenantDb: vi.fn() }));
vi.mock("@nebutra/prepaid-wallet", () => ({
  createCreditLedgerWallet: vi.fn(() => {
    order.push("create");
    return { getBalance: vi.fn(), getBalanceFresh: vi.fn(), hasBalanceFresh: vi.fn() };
  }),
}));

describe("the wallet configures billing storage before it is used", () => {
  beforeEach(() => {
    order.length = 0;
    configureBillingTenantDb.mockClear();
    vi.resetModules();
  });

  it("configures the tenant db before building the wallet", async () => {
    const { getWallet } = await import("./wallet");
    getWallet();
    expect(order).toEqual(["configure", "create"]);
  });

  it("does it once, however many times the wallet is asked for", async () => {
    const { getBalanceFresh, getBalanceForDisplay } = await import("./wallet");
    getBalanceFresh("t1");
    getBalanceForDisplay("t1");
    expect(configureBillingTenantDb).toHaveBeenCalledTimes(1);
  });
});
