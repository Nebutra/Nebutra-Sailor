/**
 * Audit Logging System for Nebutra Services
 *
 * Records sensitive operations for:
 * - Security compliance
 * - Debugging
 * - User activity tracking
 * - Billing verification
 */

import { logger } from "@nebutra/logger";
import { getSystemDb } from "@nebutra/db";

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

export interface AuditEvent {
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
  store: (event: AuditEvent) => Promise<void>;
  query: (filter: AuditQueryFilter) => Promise<AuditEvent[]>;
}

export interface AuditQueryFilter {
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

// ============================================
// In-Memory Storage (for development)
// ============================================

const memoryStorage: AuditEvent[] = [];

export const inMemoryStorage: AuditStorage = {
  store: async (event: AuditEvent) => {
    memoryStorage.push({
      ...event,
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || new Date(),
    });
  },
  query: async (filter: AuditQueryFilter) => {
    let results = [...memoryStorage];

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

    // Sort by timestamp descending
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

export function createPrismaStorage(prisma: {
  auditLog: {
    create: (data: { data: unknown }) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
}): AuditStorage {
  return {
    store: async (event: AuditEvent) => {
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
    query: async (filter: AuditQueryFilter) => {
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

      return results as unknown as AuditEvent[];
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
  setAuditStorage(createPrismaStorage(getSystemDb() as any));
} catch (e) {
  logger.warn("Prisma storage adapter failed to initialize, relying on in-memory audit logs", { error: e } as any);
}

export function setAuditStorage(newStorage: AuditStorage): void {
  storage = newStorage;
}

export async function audit(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
  const fullEvent: AuditEvent = {
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

export async function queryAuditLogs(filter: AuditQueryFilter): Promise<AuditEvent[]> {
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
  return async (c: any, next: () => Promise<void>) => {
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
