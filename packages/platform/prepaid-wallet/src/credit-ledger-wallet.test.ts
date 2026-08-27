import { describe, expect, it, vi } from "vitest";
import { createCreditLedgerWallet } from "./credit-ledger-wallet";
import { PrepaidWalletError } from "./errors";

describe("createCreditLedgerWallet", () => {
  it("maps get/topUp/debit onto credit ledger port", async () => {
    const port = {
      getCreditBalance: vi
        .fn()
        .mockResolvedValueOnce({
          organizationId: "org_1",
          balance: 5,
          currency: "USD",
        })
        .mockResolvedValue({
          organizationId: "org_1",
          balance: 12,
          currency: "USD",
        }),
      addCredits: vi.fn().mockResolvedValue({ id: "tx_up", balanceAfter: 12 }),
      deductCredits: vi.fn().mockResolvedValue({ id: "tx_down", balanceAfter: 10 }),
    };

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

    port.getCreditBalance.mockResolvedValue({
      organizationId: "org_1",
      balance: 10,
      currency: "USD",
    });
    const debit = await wallet.debit({ tenantId: "org_1", amount: 2 });
    expect(debit.transactionId).toBe("tx_down");
    expect(debit.balance).toBe(10);
  });

  it("maps insufficient credits errors", async () => {
    const port = {
      getCreditBalance: vi.fn(),
      addCredits: vi.fn(),
      deductCredits: vi.fn().mockRejectedValue(
        Object.assign(new Error("Insufficient credits"), {
          code: "INSUFFICIENT_CREDITS",
        }),
      ),
    };
    const wallet = createCreditLedgerWallet(port);
    await expect(wallet.debit({ tenantId: "org_1", amount: 1 })).rejects.toBeInstanceOf(
      PrepaidWalletError,
    );
    await expect(wallet.debit({ tenantId: "org_1", amount: 1 })).rejects.toMatchObject({
      code: "insufficient_credits",
    });
  });
});
