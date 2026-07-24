import { logger } from "@nebutra/logger";
import {
  AI_TOKENS,
  API_CALLS,
  BANDWIDTH,
  COMPUTATION_TIME,
  getMetering,
  type PeriodType,
  STORAGE_BYTES,
} from "@nebutra/metering";
import { format } from "date-fns";
import type { Plan, RecordUsageInput, UsageType } from "../types";
import { DEFAULT_USAGE_PRICING } from "../types";
import { appendUsageLedgerEntry, buildUsageLedgerIdempotencyKey } from "./ledger";

// ============================================
// Types
// ============================================

export interface UsageRecord {
  id: string;
  organizationId: string;
  userId?: string;
  type: UsageType;
  quantity: bigint;
  unitCost?: number;
  totalCost?: number;
  resource?: string;
  metadata?: Record<string, unknown>;
  recordedAt: Date;
}

export interface UsageSummary {
  organizationId: string;
  period: string; // YYYY-MM
  usage: {
    type: UsageType;
    quantity: bigint;
    cost: number;
    limit: number; // -1 = unlimited
    percentUsed: number;
  }[];
  totalCost: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  remaining: bigint;
  limit: bigint;
  percentUsed: number;
  overage: bigint;
  overageCost: number;
}

// ============================================
// In-memory buffer for batching (production would use Redis)
// ============================================

const usageBuffer: Map<string, UsageRecord[]> = new Map();
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_MAX_SIZE = 100;

/**
 * Record usage event (buffered for performance)
 */
export function recordUsage(input: RecordUsageInput): void {
  const record: UsageRecord = {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    quantity: BigInt(input.quantity),
    resource: input.resource,
    metadata: input.metadata,
    recordedAt: new Date(),
  };

  // Calculate cost
  const pricing = DEFAULT_USAGE_PRICING.find((p) => p.type === input.type);
  if (pricing) {
    record.unitCost = pricing.pricePerUnit / pricing.unitSize;
    record.totalCost = Number(record.quantity) * record.unitCost;
  }

  // Add to buffer
  const key = input.organizationId;
  const buffer = usageBuffer.get(key) || [];
  buffer.push(record);
  usageBuffer.set(key, buffer);

  // Flush if buffer is full
  if (buffer.length >= BUFFER_MAX_SIZE) {
    flushUsageBuffer(key);
  }
}

/** Map legacy billing UsageType → @nebutra/metering meter id. */
function usageTypeToMeterId(type: UsageType): string {
  switch (type) {
    case "API_CALL":
      return API_CALLS.id;
    case "AI_TOKEN":
      return AI_TOKENS.id;
    case "STORAGE":
      return STORAGE_BYTES.id;
    case "COMPUTE":
      return COMPUTATION_TIME.id;
    case "BANDWIDTH":
      return BANDWIDTH.id;
    case "CUSTOM":
    default:
      return API_CALLS.id;
  }
}

/**
 * Flush usage buffer into the dual-write pipeline:
 * 1. `appendUsageLedgerEntry` (Postgres billing ledger)
 * 2. `metering.ingest` (analytics / ClickHouse or memory)
 *
 * Legacy `UsageRecord` Prisma model was removed; this closes TODO(#126).
 * Prefer calling `metering.ingest` + `appendUsageLedgerEntry` directly at
 * call sites; the buffer remains for batched `recordUsage(...)` callers.
 */
export async function flushUsageBuffer(organizationId?: string): Promise<UsageRecord[]> {
  const flushed: UsageRecord[] = [];

  if (organizationId) {
    const buffer = usageBuffer.get(organizationId) || [];
    flushed.push(...buffer);
    usageBuffer.delete(organizationId);
  } else {
    for (const [key, buffer] of usageBuffer) {
      flushed.push(...buffer);
      usageBuffer.delete(key);
    }
  }

  if (flushed.length === 0) {
    return flushed;
  }

  let metering: Awaited<ReturnType<typeof getMetering>> | null = null;
  try {
    metering = await getMetering();
  } catch (err) {
    logger.warn("[billing:flushUsageBuffer] metering provider unavailable", { err });
  }

  let ledgerOk = 0;
  let meterOk = 0;
  let failed = 0;

  for (const record of flushed) {
    const quantity = Number(record.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      failed += 1;
      continue;
    }

    const idempotencyKey = buildUsageLedgerIdempotencyKey({
      organizationId: record.organizationId,
      eventId: record.id,
      type: record.type,
      resource: record.resource,
      occurredAt: record.recordedAt,
    });

    try {
      await appendUsageLedgerEntry({
        organizationId: record.organizationId,
        idempotencyKey,
        eventId: record.id,
        ...(record.userId ? { userId: record.userId } : {}),
        source: "API",
        type: record.type,
        ...(record.resource ? { resource: record.resource } : {}),
        quantity,
        unit: "unit",
        ...(record.unitCost !== undefined ? { unitCost: record.unitCost } : {}),
        ...(record.totalCost !== undefined ? { totalCost: record.totalCost } : {}),
        currency: "USD",
        occurredAt: record.recordedAt,
        ingestVersion: "v1",
        metadata: {
          ...(record.metadata ?? {}),
          flushSource: "recordUsageBuffer",
        },
      });
      ledgerOk += 1;
    } catch (err) {
      failed += 1;
      logger.error("[billing:flushUsageBuffer] appendUsageLedgerEntry failed", {
        err,
        organizationId: record.organizationId,
        type: record.type,
        eventId: record.id,
      });
    }

    if (metering) {
      try {
        await metering.ingest({
          meterId: usageTypeToMeterId(record.type),
          tenantId: record.organizationId,
          value: quantity,
          timestamp: record.recordedAt.toISOString(),
          properties: {
            usageType: record.type,
            ...(record.resource ? { resource: record.resource } : {}),
            ...(record.userId ? { userId: record.userId } : {}),
            eventId: record.id,
          },
        });
        meterOk += 1;
      } catch (err) {
        logger.warn("[billing:flushUsageBuffer] metering.ingest failed", {
          err,
          organizationId: record.organizationId,
          type: record.type,
        });
      }
    }
  }

  logger.info("[billing:flushUsageBuffer] flushed buffer to ledger + metering", {
    total: flushed.length,
    ledgerOk,
    meterOk,
    failed,
  });

  return flushed;
}

/**
 * Check if usage is within limits
 */
export function checkUsageLimit(
  currentUsage: bigint,
  limit: bigint,
  requestedQuantity: bigint,
): UsageCheckResult {
  // -1 means unlimited
  if (limit === BigInt(-1)) {
    return {
      allowed: true,
      remaining: BigInt(-1),
      limit: BigInt(-1),
      percentUsed: 0,
      overage: BigInt(0),
      overageCost: 0,
    };
  }

  const afterUsage = currentUsage + requestedQuantity;
  const overage = afterUsage > limit ? afterUsage - limit : BigInt(0);
  const remaining = limit > currentUsage ? limit - currentUsage : BigInt(0);
  const percentUsed = Number((currentUsage * BigInt(100)) / limit);

  return {
    allowed: afterUsage <= limit || overage === BigInt(0),
    remaining,
    limit,
    percentUsed: Math.min(percentUsed, 100),
    overage,
    overageCost: 0, // Calculate based on pricing
  };
}

/**
 * Get usage limit for a plan and usage type
 */
export function getPlanUsageLimit(plan: Plan, type: UsageType): bigint {
  const pricing = DEFAULT_USAGE_PRICING.find((p) => p.type === type);
  if (!pricing) return BigInt(-1);

  const limit = pricing.includedInPlan[plan];
  return BigInt(limit);
}

/**
 * Calculate overage cost
 */
export function calculateOverageCost(type: UsageType, overageQuantity: bigint): number {
  const pricing = DEFAULT_USAGE_PRICING.find((p) => p.type === type);
  if (!pricing) return 0;

  const units = Number(overageQuantity) / pricing.unitSize;
  return units * pricing.pricePerUnit;
}

// ============================================
// Metering Integration — live usage from @nebutra/metering
// ============================================

/**
 * Options passed to {@link getUsage}.
 *
 * - `period` maps directly to `PeriodType` in `@nebutra/metering`
 *   (`hourly` | `daily` | `monthly`). We also accept the ergonomic alias
 *   `"month"` / `"day"` / `"hour"` used by the entitlements surface.
 */
export interface GetUsageOptions {
  period: PeriodType | "month" | "day" | "hour";
}

function resolvePeriod(period: GetUsageOptions["period"]): PeriodType {
  if (period === "month") return "monthly";
  if (period === "day") return "daily";
  if (period === "hour") return "hourly";
  return period;
}

/**
 * Read the current aggregated usage for an organization/meter from the metering
 * pipeline. Backed by `@nebutra/metering` — in production this reads from
 * ClickHouse, in tests from the in-memory provider injected via `setMetering`.
 *
 * Returns `0` when no events have been recorded or the meter is unknown to
 * the provider. Callers should treat the return value as authoritative for
 * quota / entitlement checks.
 */
export async function getUsage(
  organizationId: string,
  meterId: string,
  opts: GetUsageOptions,
): Promise<number> {
  try {
    const metering = await getMetering();
    const summary = await metering.getUsage(organizationId, meterId, resolvePeriod(opts.period));
    return summary?.value ?? 0;
  } catch (error) {
    logger.error("[billing:getUsage] Failed to read usage from metering", error);
    throw new Error(
      `Failed to read usage for tenant=${organizationId} meter=${meterId}: ${(error as Error).message}`,
    );
  }
}

/**
 * Get current period string (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  return format(new Date(), "yyyy-MM");
}

/**
 * Format usage for display
 */
export function formatUsage(quantity: bigint, type: UsageType): string {
  const pricing = DEFAULT_USAGE_PRICING.find((p) => p.type === type);
  if (!pricing) return quantity.toString();

  if (type === "STORAGE") {
    const gb = Number(quantity) / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = Number(quantity) / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  if (type === "AI_TOKEN") {
    const k = Number(quantity) / 1000;
    if (k >= 1) return `${k.toFixed(1)}K tokens`;
    return `${quantity} tokens`;
  }

  return `${quantity.toLocaleString()} ${pricing.unitName}s`;
}

// Start periodic buffer flush
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    flushUsageBuffer().catch((err: unknown) => logger.error("Usage buffer flush failed", err));
  }, BUFFER_FLUSH_INTERVAL);
}

if (typeof process !== "undefined") {
  const drainBuffer = () => {
    flushUsageBuffer().catch(() => {});
  };
  process.on("SIGTERM", drainBuffer);
  process.on("SIGINT", drainBuffer);
}
