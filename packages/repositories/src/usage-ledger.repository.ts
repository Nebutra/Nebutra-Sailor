import { Prisma, type PrismaClient, type UsageLedgerEntry } from "@nebutra/db";

/**
 * Shape accepted by {@link UsageLedgerRepository.claim}.
 *
 * Mirrors the fields required by the Prisma UsageLedgerEntry model but kept
 * local to the repository so callers don't have to import Prisma types.
 */
export interface ClaimUsageLedgerInput {
  organizationId: string;
  idempotencyKey: string;
  source?: "API" | "WORKFLOW" | "WEBHOOK" | "SYSTEM" | "BACKFILL";
  type: "API_CALL" | "AI_TOKEN" | "STORAGE" | "COMPUTE" | "BANDWIDTH" | "CUSTOM";
  quantity: number | bigint;
  unit?: string;
  currency?: string;
  occurredAt?: Date;
  ingestVersion?: string;
  eventId?: string;
  subscriptionId?: string;
  userId?: string;
  resource?: string;
  unitCost?: number;
  totalCost?: number;
  metadata?: Record<string, unknown>;
}

export type ClaimUsageLedgerResult =
  | { claimed: true; entry: UsageLedgerEntry }
  | { claimed: false; entry: UsageLedgerEntry };

/**
 * Repository for the UsageLedgerEntry table.
 *
 * Provides an atomic idempotent claim primitive that callers MUST use instead
 * of check-then-act (findUnique + create). Idempotency is enforced at the DB
 * layer via the @@unique([organizationId, idempotencyKey]) constraint declared
 * on the Prisma model — attempting to create a duplicate triggers a P2002 that
 * the repository converts into `{ claimed: false, entry: <first-write> }`.
 */
export class UsageLedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<UsageLedgerEntry | null> {
    return this.prisma.usageLedgerEntry.findUnique({ where: { id } });
  }

  async findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<UsageLedgerEntry | null> {
    return this.prisma.usageLedgerEntry.findUnique({
      where: {
        organizationId_idempotencyKey: { organizationId, idempotencyKey },
      },
    });
  }

  /**
   * Atomically claim a usage ledger row for (organizationId, idempotencyKey).
   *
   * Returns `{ claimed: true, entry }` when this caller won the race and the
   * row is newly-inserted, or `{ claimed: false, entry }` when the row was
   * already present — in that case the previously-stored row is returned
   * unchanged. Callers MUST NOT mutate the returned row on the false branch;
   * "trust first write" is the canonical contract.
   *
   * See docs/architecture/2026-04-18-event-flow.md for the broader idempotency
   * story across event-bus / queue / saga.
   */
  async claim(input: ClaimUsageLedgerInput): Promise<ClaimUsageLedgerResult> {
    const {
      organizationId,
      idempotencyKey,
      source = "API",
      type,
      quantity,
      unit = "unit",
      currency = "USD",
      occurredAt = new Date(),
      ingestVersion = "v1",
      eventId,
      subscriptionId,
      userId,
      resource,
      unitCost,
      totalCost,
      metadata = {},
    } = input;

    try {
      const entry = await this.prisma.usageLedgerEntry.create({
        data: {
          organizationId,
          idempotencyKey,
          source,
          type,
          quantity: typeof quantity === "bigint" ? quantity : BigInt(quantity),
          unit,
          currency,
          occurredAt,
          ingestVersion,
          metadata: metadata as Prisma.InputJsonValue,
          ...(eventId !== undefined && { eventId }),
          ...(subscriptionId !== undefined && { subscriptionId }),
          ...(userId !== undefined && { userId }),
          ...(resource !== undefined && { resource }),
          ...(unitCost !== undefined && { unitCost }),
          ...(totalCost !== undefined && { totalCost }),
        },
      });
      return { claimed: true, entry };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await this.prisma.usageLedgerEntry.findUnique({
          where: {
            organizationId_idempotencyKey: { organizationId, idempotencyKey },
          },
        });
        if (existing) {
          return { claimed: false, entry: existing };
        }
      }
      throw err;
    }
  }
}
