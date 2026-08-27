import { PrepaidWalletError } from "./errors";

export interface WalletBalance {
  readonly tenantId: string;
  readonly balance: number;
  readonly currency: string;
}

export interface WalletMutationResult extends WalletBalance {
  readonly transactionId: string;
  readonly balanceAfter: number;
}

export interface TopUpInput {
  readonly tenantId: string;
  readonly amount: number;
  readonly currency?: string;
  readonly description?: string;
  readonly relatedId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DebitInput {
  readonly tenantId: string;
  readonly amount: number;
  readonly description?: string;
  readonly relatedId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Product prepaid wallet port. Implementations may wrap CreditBalance DB
 * or in-memory stores for tests.
 */
export interface PrepaidWallet {
  getBalance(tenantId: string): Promise<WalletBalance>;
  topUp(input: TopUpInput): Promise<WalletMutationResult>;
  debit(input: DebitInput): Promise<WalletMutationResult>;
  hasBalance(tenantId: string, amount: number): Promise<boolean>;
}

interface MemoryAccount {
  balance: number;
  currency: string;
}

/**
 * Deterministic in-memory wallet for unit tests and local demos.
 * Not for production multi-instance use.
 */
export class MemoryPrepaidWallet implements PrepaidWallet {
  private readonly accounts = new Map<string, MemoryAccount>();
  private seq = 0;

  constructor(private readonly defaultCurrency = "USD") {}

  async getBalance(tenantId: string): Promise<WalletBalance> {
    const account = this.ensure(tenantId);
    return {
      tenantId,
      balance: account.balance,
      currency: account.currency,
    };
  }

  async topUp(input: TopUpInput): Promise<WalletMutationResult> {
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
      throw new PrepaidWalletError(
        "invalid_amount",
        "Top-up amount must be a positive finite number",
      );
    }
    const account = this.ensure(input.tenantId);
    if (input.currency && input.currency !== account.currency) {
      account.currency = input.currency;
    }
    account.balance = roundMoney(account.balance + input.amount);
    return this.mutation(input.tenantId, account);
  }

  async debit(input: DebitInput): Promise<WalletMutationResult> {
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
      throw new PrepaidWalletError(
        "invalid_amount",
        "Debit amount must be a positive finite number",
      );
    }
    const account = this.ensure(input.tenantId);
    if (account.balance < input.amount) {
      throw new PrepaidWalletError(
        "insufficient_credits",
        `Insufficient balance: need ${input.amount}, have ${account.balance}`,
      );
    }
    account.balance = roundMoney(account.balance - input.amount);
    return this.mutation(input.tenantId, account);
  }

  async hasBalance(tenantId: string, amount: number): Promise<boolean> {
    const account = this.ensure(tenantId);
    return account.balance >= amount;
  }

  /** Test helper: set absolute balance. */
  seed(tenantId: string, balance: number, currency = this.defaultCurrency): void {
    this.accounts.set(tenantId, { balance: roundMoney(balance), currency });
  }

  private ensure(tenantId: string): MemoryAccount {
    let account = this.accounts.get(tenantId);
    if (!account) {
      account = { balance: 0, currency: this.defaultCurrency };
      this.accounts.set(tenantId, account);
    }
    return account;
  }

  private mutation(tenantId: string, account: MemoryAccount): WalletMutationResult {
    this.seq += 1;
    return {
      tenantId,
      balance: account.balance,
      currency: account.currency,
      transactionId: `mem_txn_${this.seq}`,
      balanceAfter: account.balance,
    };
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
