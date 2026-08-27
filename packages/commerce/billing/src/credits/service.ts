import { type BillingTenantDb, type InputJsonValue, requireTenantDb } from "../db";
import { dollarsToCents } from "../money";
import type { CreditTransactionType, Plan } from "../types";
import { BillingError } from "../types";

// ============================================
// Types
// ============================================

export interface CreditBalance {
  organizationId: string;
  balance: number;
  currency: string;
}

export interface CreditTransaction {
  id: string;
  organizationId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  expiresAt?: Date;
  relatedId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreditAllowance {
  plan: Plan;
  includedMonthly: number;
  dailyRefresh: number;
  refreshTime: string;
}

export interface AddCreditsInput {
  organizationId: string;
  amount: number;
  type: CreditTransactionType;
  description?: string;
  expiresAt?: Date;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

export interface DeductCreditsInput {
  organizationId: string;
  amount: number;
  description?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

// Host-injected transaction client (same structural surface as BillingTenantDb).
type CreditLedgerClient = BillingTenantDb;

// ============================================
// Database & Cache Layer
// ============================================

const CACHE_TTL_MS = 60 * 1000;
interface CacheEntry {
  data: CreditBalance;
  expiresAt: number;
}
const balanceCache = new Map<string, CacheEntry>();

const DEFAULT_CREDIT_ALLOWANCES: Record<Plan, Omit<CreditAllowance, "plan">> = {
  FREE: {
    includedMonthly: 1500,
    dailyRefresh: 300,
    refreshTime: "08:00 UTC",
  },
  PRO: {
    includedMonthly: 10_000,
    dailyRefresh: 1000,
    refreshTime: "08:00 UTC",
  },
  ENTERPRISE: {
    includedMonthly: -1,
    dailyRefresh: -1,
    refreshTime: "08:00 UTC",
  },
};

export function invalidateCreditCache(organizationId: string) {
  balanceCache.delete(organizationId);
}

function toJsonInput(metadata: Record<string, unknown> | undefined): InputJsonValue {
  return (metadata ?? {}) as InputJsonValue;
}

/**
 * Get credit balance for an organization
 */
export async function getCreditBalance(organizationId: string): Promise<CreditBalance> {
  const now = Date.now();
  const cached = balanceCache.get(organizationId);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const db = requireTenantDb(organizationId);
  let dbBalance = await db.creditBalance.findUnique({
    where: { tenantId: organizationId },
  });

  if (!dbBalance) {
    dbBalance = await db.creditBalance.create({
      data: {
        tenantId: organizationId,
        balance: 0,
        currency: "USD",
      },
    });
  }

  const mapped: CreditBalance = {
    organizationId: dbBalance.tenantId,
    balance: Number(dbBalance.balance),
    currency: dbBalance.currency,
  };

  balanceCache.set(organizationId, {
    data: mapped,
    expiresAt: now + CACHE_TTL_MS,
  });

  return mapped;
}

/**
 * Add credits to an organization's balance
 */
export async function addCredits(input: AddCreditsInput): Promise<CreditTransaction> {
  if (input.amount <= 0) {
    throw new BillingError("Credit amount must be positive", "INVALID_CREDIT_AMOUNT", 400);
  }

  const db = requireTenantDb(input.organizationId);
  const transactionData = await db.$transaction(async (tx: CreditLedgerClient) => {
    const balance = await tx.creditBalance.upsert({
      where: { tenantId: input.organizationId },
      create: {
        tenantId: input.organizationId,
        balance: 0,
        currency: "USD",
      },
      update: {},
    });

    if (input.relatedId) {
      const existing = await tx.creditTransaction.findFirst({
        where: {
          creditBalanceId: balance.id,
          relatedId: input.relatedId,
          type: input.type,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const updatedBalance = await tx.creditBalance.update({
      where: { tenantId: input.organizationId },
      data: { balance: { increment: input.amount } },
    });

    return tx.creditTransaction.create({
      data: {
        creditBalanceId: updatedBalance.id,
        type: input.type,
        amount: input.amount,
        balanceAfter: updatedBalance.balance,
        description: input.description,
        expiresAt: input.expiresAt,
        relatedId: input.relatedId,
        metadata: toJsonInput(input.metadata),
      },
    });
  });

  invalidateCreditCache(input.organizationId);

  return {
    id: transactionData.id,
    organizationId: input.organizationId,
    type: transactionData.type as CreditTransactionType,
    amount: Number(transactionData.amount),
    balanceAfter: Number(transactionData.balanceAfter),
    description: transactionData.description || undefined,
    expiresAt: transactionData.expiresAt || undefined,
    relatedId: transactionData.relatedId || undefined,
    metadata: (transactionData.metadata as Record<string, unknown>) || undefined,
    createdAt: transactionData.createdAt,
  };
}

/**
 * Deduct credits from an organization's balance
 */
export async function deductCredits(input: DeductCreditsInput): Promise<CreditTransaction> {
  if (input.amount <= 0) {
    throw new BillingError("Credit amount must be positive", "INVALID_CREDIT_AMOUNT", 400);
  }

  const db = requireTenantDb(input.organizationId);
  const transactionData = await db.$transaction(async (tx: CreditLedgerClient) => {
    const balance = await tx.creditBalance.findUnique({
      where: { tenantId: input.organizationId },
    });

    if (!balance) {
      throw new BillingError("Insufficient credits", "INSUFFICIENT_CREDITS", 402);
    }

    if (input.relatedId) {
      const existing = await tx.creditTransaction.findFirst({
        where: {
          creditBalanceId: balance.id,
          relatedId: input.relatedId,
          type: "USAGE",
        },
      });

      if (existing) {
        return existing;
      }
    }

    const updateResult = await tx.creditBalance.updateMany({
      where: {
        tenantId: input.organizationId,
        balance: { gte: input.amount },
      },
      data: { balance: { decrement: input.amount } },
    });

    if (updateResult.count === 0) {
      throw new BillingError("Insufficient credits", "INSUFFICIENT_CREDITS", 402);
    }

    const freshBalance = await tx.creditBalance.findUnique({
      where: { tenantId: input.organizationId },
    });

    if (!freshBalance) {
      throw new BillingError("Credit balance not found", "CREDIT_BALANCE_NOT_FOUND", 404);
    }

    return tx.creditTransaction.create({
      data: {
        creditBalanceId: freshBalance.id,
        type: "USAGE",
        amount: -input.amount,
        balanceAfter: freshBalance.balance,
        description: input.description,
        relatedId: input.relatedId,
        metadata: toJsonInput(input.metadata),
      },
    });
  });

  invalidateCreditCache(input.organizationId);

  return {
    id: transactionData.id,
    organizationId: input.organizationId,
    type: transactionData.type as CreditTransactionType,
    amount: Number(transactionData.amount),
    balanceAfter: Number(transactionData.balanceAfter),
    description: transactionData.description || undefined,
    relatedId: transactionData.relatedId || undefined,
    metadata: (transactionData.metadata as Record<string, unknown>) || undefined,
    createdAt: transactionData.createdAt,
  };
}

/**
 * Check if organization has enough credits
 */
export async function hasEnoughCredits(organizationId: string, amount: number): Promise<boolean> {
  const balance = await getCreditBalance(organizationId);
  return balance.balance >= amount;
}

/**
 * Get credit transaction history
 */
export async function getCreditTransactions(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: CreditTransactionType;
  },
): Promise<CreditTransaction[]> {
  const db = requireTenantDb(organizationId);
  const balance = await db.creditBalance.findUnique({
    where: { tenantId: organizationId },
    select: { id: true },
  });

  if (!balance) return [];

  const raw = await db.creditTransaction.findMany({
    where: {
      creditBalanceId: balance.id,
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });

  return (raw as Array<Record<string, unknown>>).map((tx) => ({
    id: String(tx.id),
    organizationId,
    type: tx.type as CreditTransactionType,
    amount: Number(tx.amount),
    balanceAfter: Number(tx.balanceAfter),
    description: (tx.description as string | null | undefined) || undefined,
    expiresAt: (tx.expiresAt as Date | null | undefined) || undefined,
    relatedId: (tx.relatedId as string | null | undefined) || undefined,
    metadata: (tx.metadata as Record<string, unknown>) || undefined,
    createdAt: tx.createdAt as Date,
  }));
}

/**
 * Convert dollar amount to credits
 * 1 credit = $0.01 (100 credits = $1)
 */
export function dollarsToCredits(dollars: number): number {
  return dollarsToCents(dollars);
}

/**
 * Convert credits to dollars
 */
export function creditsToDollars(credits: number): number {
  return credits / 100;
}

/**
 * Return plan-scoped included credits for app display and allowance policies.
 *
 * `-1` means unlimited. These defaults are deliberately centralized in the
 * billing package so dashboard UI, API routes, and future scheduled refresh
 * jobs do not drift.
 */
export function getCreditAllowanceForPlan(plan: Plan | string | null | undefined): CreditAllowance {
  const normalized = plan === "PRO" || plan === "ENTERPRISE" ? plan : "FREE";
  return {
    plan: normalized,
    ...DEFAULT_CREDIT_ALLOWANCES[normalized],
  };
}

/**
 * Format credits for display as a localized currency string.
 *
 * Credits are converted to major units (1 credit = $0.01), then formatted via
 * Intl.NumberFormat. For USD amounts under 1000 the output matches the previous
 * `$X.XX` form exactly; amounts >= 1000 gain a locale thousands separator
 * (e.g. "$1,000.00"). Non-USD currencies render with the correct symbol/format.
 *
 * @param credits Integer credit balance (1 credit = $0.01)
 * @param currency ISO 4217 currency code (default "USD")
 * @param locale BCP 47 locale tag (default "en-US")
 */
export function formatCredits(credits: number, currency = "USD", locale = "en-US"): string {
  const amount = creditsToDollars(credits);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/**
 * Refund credits to an organization
 */
export async function refundCredits(input: {
  organizationId: string;
  amount: number;
  reason?: string;
  relatedId?: string;
}): Promise<CreditTransaction> {
  return await addCredits({
    organizationId: input.organizationId,
    amount: input.amount,
    type: "REFUND",
    description: input.reason || "Refund",
    relatedId: input.relatedId,
  });
}

/**
 * Add bonus credits
 */
export async function addBonusCredits(input: {
  organizationId: string;
  amount: number;
  reason?: string;
  expiresAt?: Date;
}): Promise<CreditTransaction> {
  return await addCredits({
    organizationId: input.organizationId,
    amount: input.amount,
    type: "BONUS",
    description: input.reason || "Bonus credits",
    expiresAt: input.expiresAt,
  });
}
