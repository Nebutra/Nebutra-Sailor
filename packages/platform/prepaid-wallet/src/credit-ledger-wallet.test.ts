import { describe, expect, it, vi } from "vitest";
import { type CreditLedgerPort, createCreditLedgerWallet } from "./credit-ledger-wallet";
import { PrepaidWalletError } from "./errors";

function makePort(over: Partial<CreditLedgerPort> = {}): CreditLedgerPort {
  return {
    getCreditBalance: vi.fn(),
    getCreditBalanceFresh: vi.fn(),
    invalidateCreditCache: vi.fn(),
    addCredits: vi.fn(),
    deductCredits: vi.fn(),
    ...over,
  } as CreditLedgerPort;
}

describe("createCreditLedgerWallet", () => {
  it("maps get/topUp/debit onto credit ledger port", async () => {
    const port = makePort({
      getCreditBalance: vi.fn().mockResolvedValue({
        organizationId: "org_1",
        balance: 5,
        currency: "USD",
      }),
      getCreditBalanceFresh: vi.fn().mockResolvedValue({
        organizationId: "org_1",
        balance: 12,
        currency: "USD",
      }),
      addCredits: vi.fn().mockResolvedValue({ id: "tx_up", balanceAfter: 12 }),
      deductCredits: vi.fn().mockResolvedValue({ id: "tx_down", balanceAfter: 10 }),
    });

    const wallet = createCreditLedgerWallet(port);

    await expect(wallet.getBalance("org_1")).resolves.toEqual({
      tenantId: "org_1",
      balance: 5,
      currency: "USD",
    });

    const top = await wallet.topUp({ tenantId: "org_1", amount: 7 });
    expect(port.addCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        amount: 7,
        type: "PURCHASE",
      }),
    );
    expect(top.transactionId).toBe("tx_up");
    expect(top.balanceAfter).toBe(12);

    (port.getCreditBalanceFresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      organizationId: "org_1",
      balance: 10,
      currency: "USD",
    });
    const debit = await wallet.debit({ tenantId: "org_1", amount: 2 });
    expect(debit.transactionId).toBe("tx_down");
    expect(debit.balance).toBe(10);
  });

  it("reads the guard balance uncached and never through the cached getter", async () => {
    const port = makePort({
      getCreditBalance: vi
        .fn()
        .mockResolvedValue({ organizationId: "org_1", balance: 99, currency: "USD" }),
      getCreditBalanceFresh: vi
        .fn()
        .mockResolvedValue({ organizationId: "org_1", balance: 0.5, currency: "USD" }),
    });
    const wallet = createCreditLedgerWallet(port);

    await expect(wallet.getBalanceFresh("org_1")).resolves.toMatchObject({ balance: 0.5 });
    await expect(wallet.hasBalanceFresh("org_1", 1)).resolves.toBe(false);
    // The stale positive balance is what an overdraw looks like; the guard never saw it.
    await expect(wallet.hasBalance("org_1", 1)).resolves.toBe(true);
    expect(port.getCreditBalanceFresh).toHaveBeenCalledTimes(2);
  });

  it("invalidates the cache on every mutation", async () => {
    const port = makePort({
      getCreditBalanceFresh: vi
        .fn()
        .mockResolvedValue({ organizationId: "org_1", balance: 3, currency: "USD" }),
      addCredits: vi.fn().mockResolvedValue({ id: "tx_up", balanceAfter: 3 }),
      deductCredits: vi.fn().mockResolvedValue({ id: "tx_down", balanceAfter: 3 }),
    });
    const wallet = createCreditLedgerWallet(port);

    await wallet.topUp({ tenantId: "org_1", amount: 1 });
    await wallet.debit({ tenantId: "org_1", amount: 1 });

    expect(port.invalidateCreditCache).toHaveBeenCalledTimes(2);
    expect(port.invalidateCreditCache).toHaveBeenCalledWith("org_1");
  });

  it("maps insufficient credits errors", async () => {
    const port = makePort({
      deductCredits: vi.fn().mockRejectedValue(
        Object.assign(new Error("Insufficient credits"), {
          code: "INSUFFICIENT_CREDITS",
        }),
      ),
    });
    const wallet = createCreditLedgerWallet(port);
    await expect(wallet.debit({ tenantId: "org_1", amount: 1 })).rejects.toBeInstanceOf(
      PrepaidWalletError,
    );
    await expect(wallet.debit({ tenantId: "org_1", amount: 1 })).rejects.toMatchObject({
      code: "insufficient_credits",
    });
  });
});
