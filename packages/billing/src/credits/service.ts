import { getTenantDb } from "@nebutra/db";
import type { CreditTransactionType } from "../types";
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

// ============================================
// Database & Cache Layer
// ============================================

const CACHE_TTL_MS = 60 * 1000;
interface CacheEntry {
  data: CreditBalance;
  expiresAt: number;
}
const balanceCache = new Map<string, CacheEntry>();

export function invalidateCreditCache(organizationId: string) {
  balanceCache.delete(organizationId);
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

  const db = getTenantDb(organizationId);
  let dbBalance = await db.creditBalance.findUnique({
    where: { organizationId },
  });

  if (!dbBalance) {
    dbBalance = await db.creditBalance.create({
      data: {
        organizationId,
        balance: 0,
        currency: "USD",
      },
    });
  }

  const mapped: CreditBalance = {
    organizationId: dbBalance.organizationId,
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
  const db = getTenantDb(input.organizationId);
  const transactionData = await db.$transaction(async (tx: any) => {
    const balance = await tx.creditBalance.upsert({
      where: { organizationId: input.organizationId },
      create: {
        organizationId: input.organizationId,
        balance: input.amount,
        currency: "USD",
      },
      update: {
        balance: { increment: input.amount },
      },
    });

    return await tx.creditTransaction.create({
      data: {
        creditBalanceId: balance.id,
        type: input.type,
        amount: input.amount,
        balanceAfter: balance.balance,
        description: input.description,
        expiresAt: input.expiresAt,
        relatedId: input.relatedId,
        metadata: input.metadata || {},
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
  const balance = await getCreditBalance(input.organizationId);

  if (balance.balance < input.amount) {
    throw new BillingError(
      `Insufficient credits. Available: ${balance.balance}, Required: ${input.amount}`,
      "INSUFFICIENT_CREDITS",
      402,
    );
  }

  const db = getTenantDb(input.organizationId);
  const transactionData = await db.$transaction(async (tx: any) => {
    const freshBalance = await tx.creditBalance.update({
      where: { organizationId: input.organizationId },
      data: { balance: { decrement: input.amount } },
    });

    if (Number(freshBalance.balance) < 0) {
      throw new BillingError("Insufficient credits", "INSUFFICIENT_CREDITS", 402);
    }

    return await tx.creditTransaction.create({
      data: {
        creditBalanceId: freshBalance.id,
        type: "USAGE",
        amount: -input.amount,
        balanceAfter: freshBalance.balance,
        description: input.description,
        relatedId: input.relatedId,
        metadata: input.metadata || {},
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
  const db = getTenantDb(organizationId);
  const balance = await db.creditBalance.findUnique({
    where: { organizationId },
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

  return raw.map((tx) => ({
    id: tx.id,
    organizationId,
    type: tx.type as CreditTransactionType,
    amount: Number(tx.amount),
    balanceAfter: Number(tx.balanceAfter),
    description: tx.description || undefined,
    expiresAt: tx.expiresAt || undefined,
    relatedId: tx.relatedId || undefined,
    metadata: (tx.metadata as Record<string, unknown>) || undefined,
    createdAt: tx.createdAt,
  }));
}

/**
 * Convert dollar amount to credits
 * 1 credit = $0.01 (100 credits = $1)
 */
export function dollarsToCredits(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert credits to dollars
 */
export function creditsToDollars(credits: number): number {
  return credits / 100;
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number): string {
  const dollars = creditsToDollars(credits);
  return `$${dollars.toFixed(2)}`;
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
