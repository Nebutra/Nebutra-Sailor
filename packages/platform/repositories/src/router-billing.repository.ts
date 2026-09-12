import { Prisma, type PrismaClient } from "@nebutra/db";

/**
 * The Router money spine's one database seam.
 *
 * Three things have to happen around a relayed request and each one is money:
 *
 * 1. **Reserve** the worst-case charge before the upstream call, so two
 *    concurrent calls on the same tenant cannot both be admitted against the
 *    same dollar. The reservation is an atomic conditional decrement of
 *    `credit_balances.balance` — DB-backed, therefore correct across
 *    instances, unlike an in-process counter or the cached balance read —
 *    **plus a `router_reservations` row written in the same transaction**. The
 *    decrement alone is money that moved with nothing saying it is a hold; a
 *    process death between admit and settle would leave the balance reduced,
 *    unexplained and unrecoverable. The row's lifetime brackets the money.
 * 2. **Settle** once the response has finished: write exactly one
 *    `UsageLedgerEntry`, return the unspent part of the reservation, record the
 *    `CreditTransaction`, and move the per-key spend counters — all inside a
 *    single `$transaction`, so a crash cannot leave a charge without a ledger
 *    row or a ledger row without a charge.
 * 3. **Release** the whole reservation when the request produced nothing
 *    billable (a non-2xx, or a 200 whose body carried an error). That path
 *    still writes a zero-cost ledger row: "we served you nothing" is a fact the
 *    customer is entitled to see.
 * 4. **Sweep** the holds nobody came back for. Any reservation past `expiresAt`
 *    is refunded and deleted — opportunistically for the tenant on their next
 *    admit, and globally by an hourly cron for the tenant who stopped calling.
 *    The delete is the lease: it happens first, in the same transaction, so two
 *    sweepers racing the same row refund it exactly once.
 *
 * Idempotency is the `@@unique([tenantId, idempotencyKey])` on
 * `usage_ledger_entries`. A settle that loses that race is a complete no-op:
 * the first writer already released the reservation and debited.
 *
 * Prices are USD, matching `CreditBalance.currency` and `UsageLedgerEntry`.
 */

/** A `model_configs` row, Decimals already converted to numbers. */
export interface RouterPriceRow {
  modelName: string;
  unit: string;
  currency: string;
  published: boolean;
  isActive: boolean;
  inputPerMTok: number | null;
  outputPerMTok: number | null;
  cacheReadPerMTok: number | null;
  cacheWritePerMTok: number | null;
  unitPrice: number | null;
}

/** Per-key spend state the guard needs, with the daily counter already aged. */
export interface RouterKeySpend {
  keyId: string;
  disabled: boolean;
  rateLimitRps: number;
  /** Whether this key's owner asked for prompt-derived request detail. */
  saveLogs: boolean;
  limitDaily: number | null;
  limitTotal: number | null;
  /** Zero when `costDailyResetAt` predates the current UTC day. */
  costDaily: number;
  costTotal: number;
}

/**
 * How long a hold may stand before the sweep treats it as stranded.
 *
 * The edge aborts an upstream call at 180 s (`AbortSignal.timeout(180_000)` in
 * `openai-edge.ts`), and settlement happens after the response body has
 * finished streaming to the client, which can add a slow reader's time on top.
 * Fifteen minutes is a ~5x margin over that worst case — long enough that a
 * live request is never swept out from under itself, short enough that a
 * crashed one returns the customer's money in minutes rather than days.
 */
export const RESERVATION_TTL_MS = 15 * 60 * 1000;

export interface RouterReserveInput {
  tenantId: string;
  /** The edge request id. Primary key of the hold, so a retry cannot double it. */
  requestId: string;
  keyId?: string | null;
  amount: number;
  now?: Date;
  /** Defaults to {@link RESERVATION_TTL_MS}. */
  ttlMs?: number;
}

export interface RouterReleaseInput {
  tenantId: string;
  requestId: string;
  amount: number;
}

export interface RouterSweepOptions {
  /** Restrict to one tenant — the opportunistic pass on the admit path. */
  tenantId?: string;
  now?: Date;
  /** Batch ceiling; defaults to 200. */
  limit?: number;
}

export interface RouterSweepResult {
  swept: number;
  refunded: number;
  /** Tenants whose balance moved — their credit cache must be invalidated. */
  tenantIds: string[];
}

export interface RouterSettleInput {
  tenantId: string;
  userId?: string | null;
  keyId: string;
  /** The edge request id — the `router_reservations` row this settle closes. */
  requestId: string;
  /** `router:<requestId>` — the idempotency key on the ledger row. */
  idempotencyKey: string;
  model: string;
  /** Billable quantity in the price row's unit (tokens, calls, images, …). */
  quantity: number;
  unit: string;
  unitCost: number;
  /** What the request actually cost. Zero for a refused or empty completion. */
  totalCost: number;
  currency: string;
  /** What was held at admit. The difference is returned to the balance. */
  reserved: number;
  metadata: Record<string, unknown>;
  occurredAt?: Date;
  now?: Date;
}

export type RouterSettleResult =
  | { settled: true; charged: number; refunded: number }
  /** Another writer already settled this request id. Nothing was moved. */
  | { settled: false; reason: "duplicate" };

function decimal(value: Prisma.Decimal | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** Midnight UTC of the day `at` falls in — the daily counter's epoch. */
export function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

export class RouterBillingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** The price row for a public model id, or null when the model is unknown. */
  async findPrice(modelName: string): Promise<RouterPriceRow | null> {
    const row = await this.prisma.modelConfig.findUnique({ where: { modelName } });
    if (!row) return null;
    return {
      modelName: row.modelName,
      unit: row.unit,
      currency: row.currency,
      published: row.published,
      isActive: row.isActive,
      inputPerMTok: decimal(row.inputPricePerMillion),
      outputPerMTok: decimal(row.outputPricePerMillion),
      cacheReadPerMTok: decimal(row.cacheReadPerMillion),
      cacheWritePerMTok: decimal(row.cacheWritePerMillion),
      unitPrice: decimal(row.unitPrice),
    };
  }

  /**
   * Every published, active price row.
   *
   * The public shelf used to quote the open model index while the spine charged
   * from this table, so a model could be advertised at zero and billed at fifty.
   * A storefront must quote the rate it will actually charge, which is this one.
   */
  async listPublishedPrices(): Promise<RouterPriceRow[]> {
    const rows = await this.prisma.modelConfig.findMany({
      where: { published: true, isActive: true },
      orderBy: { modelName: "asc" },
    });
    return rows.map((row) => ({
      modelName: row.modelName,
      unit: row.unit,
      currency: row.currency,
      published: row.published,
      isActive: row.isActive,
      inputPerMTok: decimal(row.inputPricePerMillion),
      outputPerMTok: decimal(row.outputPricePerMillion),
      cacheReadPerMTok: decimal(row.cacheReadPerMillion),
      cacheWritePerMTok: decimal(row.cacheWritePerMillion),
      unitPrice: decimal(row.unitPrice),
    }));
  }

  /**
   * Per-key spend state. `costDaily` is reported as 0 when the stored counter
   * belongs to an earlier UTC day — the row itself is reset lazily on the next
   * settle, so a key that is never used again never needs a sweep.
   */
  async getKeySpend(keyId: string, now: Date = new Date()): Promise<RouterKeySpend | null> {
    const row = await this.prisma.aPIKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        disabledAt: true,
        rateLimitRps: true,
        saveLogs: true,
        limitDaily: true,
        limitTotal: true,
        costDaily: true,
        costTotal: true,
        costDailyResetAt: true,
      },
    });
    if (!row) return null;
    const stale = !row.costDailyResetAt || row.costDailyResetAt < startOfUtcDay(now);
    return {
      keyId: row.id,
      disabled: row.disabledAt !== null,
      rateLimitRps: row.rateLimitRps,
      saveLogs: row.saveLogs,
      limitDaily: decimal(row.limitDaily),
      limitTotal: decimal(row.limitTotal),
      costDaily: stale ? 0 : Number(row.costDaily),
      costTotal: Number(row.costTotal),
    };
  }

  /**
   * Hold `amount` against the tenant balance **and record the hold**, in one
   * transaction. Returns false when the balance cannot cover it — that is the
   * refusal, and it is decided by the database, not by a number this process
   * read a moment ago; when it refuses, no reservation row is written either.
   *
   * `requestId` is the row's primary key, so a retried admit for the same
   * request collides on the insert, the whole transaction rolls back, and the
   * customer is charged one hold rather than two. The retry is told the hold
   * exists (`true`) because it does.
   *
   * A zero or negative amount is a no-op hold — no money moved, so there is
   * nothing to strand and no row to write (a free model still gets a ledger row
   * at settle).
   */
  async reserve(input: RouterReserveInput): Promise<boolean> {
    const amount = input.amount;
    if (!(amount > 0)) {
      const exists = await this.prisma.creditBalance.findUnique({
        where: { tenantId: input.tenantId },
        select: { id: true },
      });
      if (!exists) {
        await this.prisma.creditBalance
          .create({ data: { tenantId: input.tenantId, balance: 0, currency: "USD" } })
          .catch(() => undefined);
      }
      return true;
    }

    const now = input.now ?? new Date();
    const expiresAt = new Date(now.getTime() + (input.ttlMs ?? RESERVATION_TTL_MS));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const held = await tx.creditBalance.updateMany({
          where: { tenantId: input.tenantId, balance: { gte: new Prisma.Decimal(amount) } },
          data: { balance: { decrement: new Prisma.Decimal(amount) } },
        });
        if (held.count !== 1) return false;
        await tx.routerReservation.create({
          data: {
            id: input.requestId,
            tenantId: input.tenantId,
            apiKeyId: input.keyId ?? null,
            amount: new Prisma.Decimal(amount),
            createdAt: now,
            expiresAt,
          },
        });
        return true;
      });
    } catch (err) {
      // A duplicate request id means this request already holds money; the
      // rollback above is what stops the second hold.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return true;
      throw err;
    }
  }

  /**
   * Hand a reservation back untouched — the request never reached settle.
   *
   * The row delete is the lease: only the caller that removes the row returns
   * the money, so a release racing the expiry sweep refunds once.
   */
  async release(input: RouterReleaseInput): Promise<void> {
    if (!(input.amount > 0)) return;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.routerReservation.deleteMany({
        where: { id: input.requestId, tenantId: input.tenantId },
      });
      // No row: either this hold was zero-amount, or someone already refunded
      // it. Either way, incrementing here would be inventing money.
      if (claimed.count !== 1) return;
      await tx.creditBalance.updateMany({
        where: { tenantId: input.tenantId },
        data: { balance: { increment: new Prisma.Decimal(input.amount) } },
      });
    });
  }

  /**
   * Refund and delete every hold past its expiry, oldest first.
   *
   * Scoped to one tenant it is the opportunistic pass the guard runs on admit
   * (one indexed lookup on `(tenant_id, expires_at)`), which makes an active
   * customer whole on their very next call with no scheduled job. Unscoped it
   * is the cron, for the customer who stopped calling.
   *
   * Each row is its own transaction, so one failure cannot strand the batch,
   * and the refund is a `CreditTransaction` — a balance that changes without a
   * row explaining it is exactly the defect this table exists to end.
   */
  async sweepExpired(options: RouterSweepOptions = {}): Promise<RouterSweepResult> {
    const now = options.now ?? new Date();
    const rows = await this.prisma.routerReservation.findMany({
      where: {
        expiresAt: { lt: now },
        ...(options.tenantId ? { tenantId: options.tenantId } : {}),
      },
      orderBy: { expiresAt: "asc" },
      take: options.limit ?? 200,
    });

    const tenantIds = new Set<string>();
    let swept = 0;
    let refunded = 0;

    for (const row of rows) {
      const amount = Number(row.amount);
      const moved = await this.prisma.$transaction(async (tx) => {
        // Claim first. Whoever deletes the row owns the refund.
        const claimed = await tx.routerReservation.deleteMany({ where: { id: row.id } });
        if (claimed.count !== 1) return false;
        if (!(amount > 0)) return true;

        const balance = await tx.creditBalance.upsert({
          where: { tenantId: row.tenantId },
          create: {
            tenantId: row.tenantId,
            balance: new Prisma.Decimal(amount),
            currency: "USD",
          },
          update: { balance: { increment: new Prisma.Decimal(amount) } },
        });
        await tx.creditTransaction.create({
          data: {
            creditBalanceId: balance.id,
            type: "REFUND",
            amount: new Prisma.Decimal(amount),
            balanceAfter: balance.balance,
            description: "Router hold returned: the request never completed.",
            relatedId: `router:reservation:${row.id}`,
            metadata: {
              product: "router",
              reason: "reservation_expired",
              requestId: row.id,
              keyId: row.apiKeyId,
              heldAt: row.createdAt.toISOString(),
              expiredAt: row.expiresAt.toISOString(),
            },
          },
        });
        return true;
      });

      if (!moved) continue;
      swept += 1;
      refunded += Math.max(0, amount);
      tenantIds.add(row.tenantId);
    }

    return { swept, refunded, tenantIds: [...tenantIds] };
  }

  /**
   * One request, one transaction: ledger row, reservation release, credit
   * transaction, key counters.
   */
  async settle(input: RouterSettleInput): Promise<RouterSettleResult> {
    const now = input.now ?? new Date();
    const charged = Math.max(0, input.totalCost);
    const today = startOfUtcDay(now);
    let refunded = input.reserved - charged;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // The unique constraint is the idempotency check. It comes first so a
        // duplicate settle rolls back before touching a balance.
        await tx.usageLedgerEntry.create({
          data: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
            source: "API",
            type: "AI_TOKEN",
            resource: input.model,
            quantity: BigInt(Math.max(0, Math.round(input.quantity))),
            unit: input.unit,
            unitCost: input.unitCost,
            totalCost: charged,
            currency: input.currency,
            occurredAt: input.occurredAt ?? now,
            metadata: input.metadata as Prisma.InputJsonValue,
            ...(input.userId ? { userId: input.userId } : {}),
          },
        });

        // Close the hold. Deleting the row is also the check on whether the
        // money is still held: if the expiry sweep got there first the balance
        // has already been made whole, and returning `reserved` again would be
        // inventing money — only the charge is taken in that case.
        const claimed = await tx.routerReservation.deleteMany({
          where: { id: input.requestId, tenantId: input.tenantId },
        });
        const stillHeld = claimed.count === 1;
        refunded = (stillHeld ? input.reserved : 0) - charged;

        // Net effect on the balance: the held amount comes back, the real cost
        // goes out. Expressed as one signed increment so the row is touched once.
        const balance = await tx.creditBalance.upsert({
          where: { tenantId: input.tenantId },
          create: {
            tenantId: input.tenantId,
            balance: new Prisma.Decimal(refunded),
            currency: input.currency,
          },
          update: { balance: { increment: new Prisma.Decimal(refunded) } },
        });

        if (charged > 0) {
          await tx.creditTransaction.create({
            data: {
              creditBalanceId: balance.id,
              type: "USAGE",
              amount: new Prisma.Decimal(-charged),
              balanceAfter: balance.balance,
              description: `router usage ${input.model}`,
              relatedId: input.idempotencyKey,
              metadata: input.metadata as Prisma.InputJsonValue,
            },
          });
        }

        // Daily counter: a compare-and-set on the reset stamp. Exactly one
        // concurrent settle can win the reset; the losers increment.
        const reset = await tx.aPIKey.updateMany({
          where: {
            id: input.keyId,
            OR: [{ costDailyResetAt: null }, { costDailyResetAt: { lt: today } }],
          },
          data: {
            costDaily: new Prisma.Decimal(charged),
            costDailyResetAt: today,
            costTotal: { increment: new Prisma.Decimal(charged) },
          },
        });
        if (reset.count === 0) {
          await tx.aPIKey.updateMany({
            where: { id: input.keyId },
            data: {
              costDaily: { increment: new Prisma.Decimal(charged) },
              costTotal: { increment: new Prisma.Decimal(charged) },
            },
          });
        }

        return { settled: true as const, charged, refunded };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { settled: false, reason: "duplicate" };
      }
      throw err;
    }
  }
}
