/**
 * Audit Logging System for Nebutra Services
 *
 * Records sensitive operations for:
 * - Security compliance (SOC 2, ISO 27001)
 * - Debugging
 * - User activity tracking
 * - Billing verification
 *
 * Exports:
 *   - This module: legacy `audit()` API + Prisma storage adapter (stable for
 *     internal callers; see `INTEGRATION_NOTES.md` for migration plan).
 *   - `@nebutra/audit/schema`: Zod schemas + `defineAction` + `ACTIONS`
 *   - `@nebutra/audit/middleware`: `auditLogger(req, ...)`, `withAudit(...)`
 *   - `@nebutra/audit/providers`: `getAuditProvider()`, provider classes
 */

import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";

export {
  type AuditLoggerDefaults,
  type AuditLoggerLogInput,
  type AuditRequestContext,
  auditLogger,
  type BoundAuditLogger,
  extractRequestContext,
  type WithAuditOptions,
  withAudit,
} from "./middleware";
export {
  type AuditFactoryConfig,
  type AuditProvider,
  type AuditProviderType,
  ClickHouseAuditProvider,
  createAuditProvider,
  getAuditProvider,
  MemoryAuditProvider,
  PostgresAuditProvider,
} from "./providers";
// Re-exports for the new schema/provider/middleware surface.
export * from "./schema";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.signup"
  | "user.password_change"
  | "user.email_change"
  | "user.delete"
  | "org.create"
  | "org.update"
  | "org.delete"
  | "org.member_add"
  | "org.member_remove"
  | "org.role_change"
  | "billing.subscription_create"
  | "billing.subscription_update"
  | "billing.subscription_cancel"
  | "billing.payment_success"
  | "billing.payment_failed"
  | "api.key_create"
  | "api.key_revoke"
  | "data.export"
  | "data.delete"
  | "admin.impersonate"
  | "admin.settings_change"
  | "custom";

/**
 * Legacy audit event shape.
 *
 * Prefer the Zod-validated `AuditEvent` from `@nebutra/audit/schema` for new
 * code. This interface is preserved for existing call sites and the legacy
 * `audit()` helper. See `INTEGRATION_NOTES.md` for migration guidance.
 */
export interface LegacyAuditEvent {
  id?: string;
  action: AuditAction;
  actorId: string;
  actorType: "user" | "system" | "api_key" | "admin";
  tenantId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  outcome: "success" | "failure" | "pending";
  reason?: string;
}

export interface AuditStorage {
  store: (event: LegacyAuditEvent) => Promise<void>;
  query: (filter: LegacyAuditQueryFilter) => Promise<LegacyAuditEvent[]>;
}

interface PrismaAuditLogClient {
  auditLog: {
    create: (data: { data: unknown }) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
}

export interface LegacyAuditQueryFilter {
  tenantId?: string;
  actorId?: string;
  action?: AuditAction;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface PrismaAuditLogRow {
  id?: string;
  action: AuditAction;
  userId: string;
  actorType: LegacyAuditEvent["actorType"];
  organizationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: string | Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  outcome: LegacyAuditEvent["outcome"];
  reason?: string | null;
  createdAt?: Date;
}

function parseAuditMetadata(
  metadata: PrismaAuditLogRow["metadata"],
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  if (typeof metadata !== "string") return metadata;

  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { value: metadata };
  }
}

function mapPrismaAuditRow(row: PrismaAuditLogRow): LegacyAuditEvent {
  const metadata = parseAuditMetadata(row.metadata);

  return {
    ...(row.id ? { id: row.id } : {}),
    action: row.action,
    actorId: row.userId,
    actorType: row.actorType,
    ...(row.organizationId ? { tenantId: row.organizationId } : {}),
    ...(row.entityType ? { targetType: row.entityType } : {}),
    ...(row.entityId ? { targetId: row.entityId } : {}),
    ...(metadata ? { metadata } : {}),
    ...(row.ipAddress ? { ipAddress: row.ipAddress } : {}),
    ...(row.userAgent ? { userAgent: row.userAgent } : {}),
    ...(row.createdAt ? { timestamp: row.createdAt } : {}),
    outcome: row.outcome,
    ...(row.reason ? { reason: row.reason } : {}),
  };
}

// ============================================
// In-Memory Storage (for development)
// ============================================

const memoryStorage: LegacyAuditEvent[] = [];

/** @internal — exposed for tests so they can reset the legacy in-memory buffer. */
export function __resetLegacyMemoryStorage(): void {
  memoryStorage.length = 0;
}

export const inMemoryStorage: AuditStorage = {
  store: async (event: LegacyAuditEvent) => {
    memoryStorage.push({
      ...event,
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || new Date(),
    });
  },
  query: async (filter: LegacyAuditQueryFilter) => {
    // Walk newest-to-oldest insertion order so that callers reading `logs[0]`
    // always see the most recently inserted match, even when timestamps tie at
    // millisecond resolution.
    let results = [...memoryStorage].reverse();

    if (filter.tenantId) {
      results = results.filter((e) => e.tenantId === filter.tenantId);
    }
    if (filter.actorId) {
      results = results.filter((e) => e.actorId === filter.actorId);
    }
    if (filter.action) {
      results = results.filter((e) => e.action === filter.action);
    }
    if (filter.targetType) {
      results = results.filter((e) => e.targetType === filter.targetType);
    }
    if (filter.targetId) {
      results = results.filter((e) => e.targetId === filter.targetId);
    }
    if (filter.startDate) {
      results = results.filter(
        (e) => e.timestamp && filter.startDate && e.timestamp >= filter.startDate,
      );
    }
    if (filter.endDate) {
      results = results.filter(
        (e) => e.timestamp && filter.endDate && e.timestamp <= filter.endDate,
      );
    }

    // Sort by timestamp descending; with stable sort, ties retain the
    // insertion-order-reversed sequence above (newest first).
    results.sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeB - timeA;
    });

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    return results.slice(offset, offset + limit);
  },
};

// ============================================
// Database Storage (using Prisma)
// ============================================

export function createPrismaStorage(prisma: PrismaAuditLogClient): AuditStorage {
  return {
    store: async (event: LegacyAuditEvent) => {
      // Field mapping: AuditEvent interface → Prisma AuditLog columns
      //   actorId    → userId          (Prisma model uses userId for the actor)
      //   tenantId   → organizationId  (Prisma model uses organizationId)
      //   targetType → entityType      (Prisma model uses entity* naming)
      //   targetId   → entityId
      //   actorType, outcome, reason → added in migration 20260316000000
      await prisma.auditLog.create({
        data: {
          id: event.id || crypto.randomUUID(),
          action: event.action,
          userId: event.actorId,
          actorType: event.actorType,
          organizationId: event.tenantId,
          entityType: event.targetType ?? "unknown",
          entityId: event.targetId,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          outcome: event.outcome,
          reason: event.reason,
          createdAt: event.timestamp || new Date(),
        },
      });
    },
    query: async (filter: LegacyAuditQueryFilter) => {
      const where: Record<string, unknown> = {};

      if (filter.tenantId) where.organizationId = filter.tenantId;
      if (filter.actorId) where.userId = filter.actorId;
      if (filter.action) where.action = filter.action;
      if (filter.targetType) where.entityType = filter.targetType;
      if (filter.targetId) where.entityId = filter.targetId;

      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) (where.createdAt as Record<string, Date>).gte = filter.startDate;
        if (filter.endDate) (where.createdAt as Record<string, Date>).lte = filter.endDate;
      }

      const results = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit || 100,
        skip: filter.offset || 0,
      });

      return (results as PrismaAuditLogRow[]).map(mapPrismaAuditRow);
    },
  };
}

// ============================================
// Audit Logger
// ============================================

let storage: AuditStorage = inMemoryStorage;

// Attach Prisma DB storage.
// AUDIT(no-tenant): audit logs are written for every tenant through a single
// shared storage adapter. Each AuditEvent carries its own organizationId/
// tenantId, so cross-tenant writes here are intentional.
try {
  setAuditStorage(createPrismaStorage(getSystemDb() as unknown as PrismaAuditLogClient));
} catch (e) {
  logger.warn("Prisma storage adapter failed to initialize, relying on in-memory audit logs", {
    error: e,
  });
}

export function setAuditStorage(newStorage: AuditStorage): void {
  storage = newStorage;
}

export async function audit(event: Omit<LegacyAuditEvent, "id" | "timestamp">): Promise<void> {
  const fullEvent: LegacyAuditEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  };

  try {
    await storage.store(fullEvent);
  } catch (error) {
    // Log via structured logger as fallback, but don't throw
    logger.error("Audit log storage failed", error, { event: fullEvent });
  }
}

export async function queryAuditLogs(filter: LegacyAuditQueryFilter): Promise<LegacyAuditEvent[]> {
  return storage.query(filter);
}

// ============================================
// Convenience Functions
// ============================================

export function auditUserLogin(
  userId: string,
  tenantId: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  return audit({
    action: "user.login",
    actorId: userId,
    actorType: "user",
    tenantId,
    outcome: success ? "success" : "failure",
    ...(ipAddress && { ipAddress }),
    ...(userAgent && { userAgent }),
  });
}

export function auditUserLogout(userId: string, tenantId: string): Promise<void> {
  return audit({
    action: "user.logout",
    actorId: userId,
    actorType: "user",
    tenantId,
    outcome: "success",
  });
}

export function auditRoleChange(
  adminId: string,
  tenantId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
): Promise<void> {
  return audit({
    action: "org.role_change",
    actorId: adminId,
    actorType: "admin",
    tenantId,
    targetType: "user",
    targetId: targetUserId,
    outcome: "success",
    metadata: { oldRole, newRole },
  });
}

export function auditBillingEvent(
  tenantId: string,
  action:
    | "billing.subscription_create"
    | "billing.subscription_update"
    | "billing.subscription_cancel"
    | "billing.payment_success"
    | "billing.payment_failed",
  metadata: Record<string, unknown>,
): Promise<void> {
  return audit({
    action,
    actorId: "system",
    actorType: "system",
    tenantId,
    outcome: action.includes("failed") ? "failure" : "success",
    metadata,
  });
}

export function auditApiKeyCreate(
  userId: string,
  tenantId: string,
  keyId: string,
  keyName: string,
): Promise<void> {
  return audit({
    action: "api.key_create",
    actorId: userId,
    actorType: "user",
    tenantId,
    targetType: "api_key",
    targetId: keyId,
    outcome: "success",
    metadata: { keyName },
  });
}

export function auditDataExport(
  userId: string,
  tenantId: string,
  exportType: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return audit({
    action: "data.export",
    actorId: userId,
    actorType: "user",
    tenantId,
    outcome: "success",
    metadata: { exportType, ...metadata },
  });
}

// ============================================
// Middleware for Hono
// ============================================

export function auditMiddleware() {
  return async (
    c: {
      req: { header: (name: string) => string | undefined };
      set: (key: string, value: unknown) => void;
    },
    next: () => Promise<void>,
  ) => {
    // Store audit context
    const ipAddress = c.req.header("x-forwarded-for") || c.req.header("x-real-ip");
    const userAgent = c.req.header("user-agent");

    c.set("auditContext", {
      tenantId: c.req.header("x-tenant-id"),
      ...(ipAddress && { ipAddress }),
      ...(userAgent && { userAgent }),
    });

    await next();
  };
}
