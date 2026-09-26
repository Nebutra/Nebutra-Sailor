import type { PaymentOrder, Prisma, PrismaClient } from "@nebutra/db";

export interface CreatePaymentOrderData {
  tenantId: string;
  offerId: string;
  fulfillment: { type: string; params: Record<string, unknown> };
  amountMinor: number;
  currency: string;
  provider: string;
  method: string;
  expiresAt: Date;
  metadata?: Record<string, string>;
}

/**
 * Payment orders — the money side of every purchase.
 *
 * Every state change is a conditional update on the current status, so two
 * notifications racing (webhook and reconcile, or a provider retry) move an
 * order at most once; the caller learns from the boolean whether it won.
 */
export class PaymentOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreatePaymentOrderData): Promise<PaymentOrder> {
    return this.prisma.paymentOrder.create({
      data: {
        tenantId: data.tenantId,
        offerId: data.offerId,
        fulfillment: data.fulfillment as Prisma.InputJsonValue,
        amountMinor: data.amountMinor,
        currency: data.currency,
        provider: data.provider,
        method: data.method,
        expiresAt: data.expiresAt,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: string): Promise<PaymentOrder | null> {
    return this.prisma.paymentOrder.findUnique({ where: { id } });
  }

  async setProviderRef(id: string, providerRef: string): Promise<void> {
    await this.prisma.paymentOrder.update({ where: { id }, data: { providerRef } });
  }

  /** PENDING (or EXPIRED — a late payment is still money received) → PAID. */
  async markPaid(
    id: string,
    data: { paidMinor: number; providerRef?: string; paidAt?: Date },
  ): Promise<boolean> {
    const result = await this.prisma.paymentOrder.updateMany({
      where: { id, status: { in: ["PENDING", "EXPIRED"] } },
      data: {
        status: "PAID",
        paidMinor: data.paidMinor,
        paidAt: data.paidAt ?? new Date(),
        ...(data.providerRef ? { providerRef: data.providerRef } : {}),
      },
    });
    return result.count === 1;
  }

  async markFulfilled(id: string): Promise<boolean> {
    const result = await this.prisma.paymentOrder.updateMany({
      where: { id, fulfilledAt: null },
      data: { fulfilledAt: new Date() },
    });
    return result.count === 1;
  }

  async markExpired(id: string): Promise<boolean> {
    const result = await this.prisma.paymentOrder.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    return result.count === 1;
  }

  /**
   * Add a refund to the running total. Guarded on the total seen by the
   * caller, so two concurrent refunds cannot both pass the "not more than
   * was paid" check against the same stale number.
   */
  async recordRefund(
    id: string,
    data: { previousRefundedMinor: number; refundedMinor: number; fullyRefunded: boolean },
  ): Promise<boolean> {
    const result = await this.prisma.paymentOrder.updateMany({
      where: { id, refundedMinor: data.previousRefundedMinor },
      data: {
        refundedMinor: data.refundedMinor,
        status: data.fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });
    return result.count === 1;
  }

  /** Pending orders old enough that a notification should have arrived. */
  async listPendingCreatedBefore(before: Date, limit: number): Promise<PaymentOrder[]> {
    return this.prisma.paymentOrder.findMany({
      where: { status: "PENDING", createdAt: { lt: before } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /** One organization's orders, newest first — the account ledger. */
  async listByTenant(tenantId: string, limit: number): Promise<PaymentOrder[]> {
    return this.prisma.paymentOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** Paid, but the thing that was bought was never handed over. */
  async listPaidUnfulfilled(limit: number): Promise<PaymentOrder[]> {
    return this.prisma.paymentOrder.findMany({
      where: { status: "PAID", fulfilledAt: null },
      orderBy: { paidAt: "asc" },
      take: limit,
    });
  }
}
