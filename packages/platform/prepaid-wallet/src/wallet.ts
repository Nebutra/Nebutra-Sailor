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
  /**
   * Display read. May be served from a cache — fine for a dashboard, never for
   * a spend decision.
   */
  getBalance(tenantId: string): Promise<WalletBalance>;
  /**
   * Guard read. Bypasses every cache and hits the ledger.
   *
   * The billing credits service keeps `balanceCache`, a module-level Map with a
   * 60s TTL. On a second instance that cache can report a positive balance the
   * first instance has already spent — an overdraw. Admit/guard paths must call
   * this, and `debit()` must invalidate the cache. The two methods exist
   * separately so the guard cannot silently pick the cached one.
   */
  getBalanceFresh(tenantId: string): Promise<WalletBalance>;
  topUp(input: TopUpInput): Promise<WalletMutationResult>;
  debit(input: DebitInput): Promise<WalletMutationResult>;
  /** Display check. See {@link PrepaidWallet.getBalance}. */
  hasBalance(tenantId: string, amount: number): Promise<boolean>;
  /** Guard check. See {@link PrepaidWallet.getBalanceFresh}. */
  hasBalanceFresh(tenantId: string, amount: number): Promise<boolean>;
}

interface MemoryAccount {
  balance: number;
  currency: string;
}

/**
 * Deterministic in-memory wallet. **Test double only** — it is process-local,
 * so two instances disagree about the balance and a restart loses it. No
 * product surface may construct it; production wires
 * {@link createCreditLedgerWallet} over `CreditBalance` / `CreditTransaction`.
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

  /** No cache to bypass in memory; identical to {@link MemoryPrepaidWallet.getBalance}. */
  async getBalanceFresh(tenantId: string): Promise<WalletBalance> {
    return this.getBalance(tenantId);
  }

  async hasBalanceFresh(tenantId: string, amount: number): Promise<boolean> {
    return this.hasBalance(tenantId, amount);
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
