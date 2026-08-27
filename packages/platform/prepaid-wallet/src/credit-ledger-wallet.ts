import { PrepaidWalletError } from "./errors";
import type {
  DebitInput,
  PrepaidWallet,
  TopUpInput,
  WalletBalance,
  WalletMutationResult,
} from "./wallet";

/**
 * Minimal port matching @nebutra/billing credits service shape.
 * Injected so this package stays free of Prisma / billing deps.
 */
export interface CreditLedgerPort {
  getCreditBalance(tenantId: string): Promise<{
    organizationId: string;
    balance: number;
    currency: string;
  }>;
  addCredits(input: {
    organizationId: string;
    amount: number;
    type: "PURCHASE" | "BONUS" | "ADJUSTMENT" | "REFUND";
    description?: string;
    relatedId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string; balanceAfter: number }>;
  deductCredits(input: {
    organizationId: string;
    amount: number;
    description?: string;
    relatedId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string; balanceAfter: number }>;
}

/**
 * PrepaidWallet backed by the existing CreditBalance ledger (via billing service).
 *
 * @example
 * ```ts
 * import * as credits from "@nebutra/billing/credits";
 * import { createCreditLedgerWallet } from "@nebutra/prepaid-wallet";
 * const wallet = createCreditLedgerWallet(credits);
 * ```
 */
export function createCreditLedgerWallet(port: CreditLedgerPort): PrepaidWallet {
  return {
    async getBalance(tenantId: string): Promise<WalletBalance> {
      const row = await port.getCreditBalance(tenantId);
      return {
        tenantId: row.organizationId,
        balance: row.balance,
        currency: row.currency,
      };
    },

    async topUp(input: TopUpInput): Promise<WalletMutationResult> {
      if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
        throw new PrepaidWalletError(
          "invalid_amount",
          "Top-up amount must be a positive finite number",
        );
      }
      try {
        const tx = await port.addCredits({
          organizationId: input.tenantId,
          amount: input.amount,
          type: "PURCHASE",
          description: input.description ?? "prepaid top-up",
          ...(input.relatedId !== undefined ? { relatedId: input.relatedId } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        });
        const bal = await port.getCreditBalance(input.tenantId);
        return {
          tenantId: input.tenantId,
          balance: bal.balance,
          currency: bal.currency,
          transactionId: tx.id,
          balanceAfter: Number(tx.balanceAfter),
        };
      } catch (err) {
        rethrowAsWalletError(err);
      }
    },

    async debit(input: DebitInput): Promise<WalletMutationResult> {
      if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
        throw new PrepaidWalletError(
          "invalid_amount",
          "Debit amount must be a positive finite number",
        );
      }
      try {
        const tx = await port.deductCredits({
          organizationId: input.tenantId,
          amount: input.amount,
          description: input.description ?? "usage debit",
          ...(input.relatedId !== undefined ? { relatedId: input.relatedId } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        });
        const bal = await port.getCreditBalance(input.tenantId);
        return {
          tenantId: input.tenantId,
          balance: bal.balance,
          currency: bal.currency,
          transactionId: tx.id,
          balanceAfter: Number(tx.balanceAfter),
        };
      } catch (err) {
        rethrowAsWalletError(err);
      }
    },

    async hasBalance(tenantId: string, amount: number): Promise<boolean> {
      const bal = await port.getCreditBalance(tenantId);
      return bal.balance >= amount;
    },
  };
}

function rethrowAsWalletError(err: unknown): never {
  if (err instanceof PrepaidWalletError) throw err;
  const message = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";

  if (code === "INSUFFICIENT_CREDITS" || /insufficient credits/i.test(message)) {
    throw new PrepaidWalletError("insufficient_credits", message);
  }
  throw new PrepaidWalletError("invalid_amount", message);
}
