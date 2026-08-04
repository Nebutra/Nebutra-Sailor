import { createHash } from "node:crypto";
import {
  type UsageLedgerEntryInput,
  UsageLedgerEntryInputSchema,
  type UsageLedgerSourceContract,
  type UsageTypeContract,
} from "@nebutra/contracts";
import {
  type BillingTenantDb,
  type InputJsonValue,
  isPrismaUniqueViolation,
  requireTenantDb,
} from "../db";

const DEFAULT_TAKE = 100;
const MAX_TAKE = 500;

export interface AppendUsageLedgerEntryResult {
  created: boolean;
  entryId: string;
}

export interface ListUsageLedgerEntriesInput {
  organizationId: string;
  from?: Date;
  to?: Date;
  source?: UsageLedgerSourceContract;
  type?: UsageTypeContract;
  take?: number;
}

function getClient(organizationId: string, client?: BillingTenantDb): BillingTenantDb {
  return client ?? requireTenantDb(organizationId);
}

export function buildUsageLedgerIdempotencyKey(input: {
  organizationId: string;
  eventId?: string;
  type: UsageTypeContract;
  resource?: string;
  occurredAt: Date;
}): string {
  const base = [
    input.organizationId,
    input.eventId ?? "manual",
    input.type,
    input.resource ?? "default",
    input.occurredAt.toISOString(),
  ].join(":");

  return createHash("sha256").update(base).digest("hex");
}

export async function appendUsageLedgerEntry(
  input: UsageLedgerEntryInput,
  options: { client?: BillingTenantDb } = {},
): Promise<AppendUsageLedgerEntryResult> {
  const payload = UsageLedgerEntryInputSchema.parse(input);
  const db = getClient(payload.organizationId, options.client);
  const metadata = payload.metadata as InputJsonValue;

  const existing = await db.usageLedgerEntry.findUnique({
    where: {
      tenantId_idempotencyKey: {
        tenantId: payload.organizationId,
        idempotencyKey: payload.idempotencyKey,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return { created: false, entryId: existing.id };
  }

  try {
    const created = await db.usageLedgerEntry.create({
      data: {
        tenantId: payload.organizationId,
        idempotencyKey: payload.idempotencyKey,
        source: payload.source,
        type: payload.type,
        quantity: BigInt(payload.quantity),
        unit: payload.unit,
        currency: payload.currency,
        occurredAt: payload.occurredAt,
        ingestVersion: payload.ingestVersion,
        metadata,
        ...(payload.eventId ? { eventId: payload.eventId } : {}),
        ...(payload.subscriptionId ? { subscriptionId: payload.subscriptionId } : {}),
        ...(payload.userId ? { userId: payload.userId } : {}),
        ...(payload.resource ? { resource: payload.resource } : {}),
        ...(payload.unitCost !== undefined ? { unitCost: payload.unitCost } : {}),
        ...(payload.totalCost !== undefined ? { totalCost: payload.totalCost } : {}),
      },
      select: { id: true },
    });

    return { created: true, entryId: created.id };
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      const duplicate = await db.usageLedgerEntry.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: payload.organizationId,
            idempotencyKey: payload.idempotencyKey,
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        return { created: false, entryId: duplicate.id };
      }
    }

    throw error;
  }
}

export async function listUsageLedgerEntries(
  input: ListUsageLedgerEntriesInput,
  options: { client?: BillingTenantDb } = {},
) {
  const db = getClient(input.organizationId, options.client);
  const take = Math.min(Math.max(input.take ?? DEFAULT_TAKE, 1), MAX_TAKE);

  return db.usageLedgerEntry.findMany({
    where: {
      tenantId: input.organizationId,
      ...(input.source ? { source: input.source } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.from || input.to
        ? {
            occurredAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { occurredAt: "desc" },
    take,
  });
}
