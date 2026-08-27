// =============================================================================
// PostgresAuditProvider — production-default Prisma-backed storage
// =============================================================================
// Persists audit events into the existing `audit_logs` table defined in
// `packages/platform/db/prisma/schema.prisma`. Field mapping:
//
//   AuditEvent (schema.ts)         → Prisma AuditLog model
//   ─────────────────────────────────────────────────────────────────────────
//   id                             → id
//   timestamp                      → createdAt
//   actor.id                       → userId
//   actor.type                     → actorType
//   tenantId                       → organizationId
//   action                         → action
//   resource.type                  → entityType
//   resource.id                    → entityId
//   resource.name                  → metadata.resourceName
//   outcome                        → outcome
//   severity                       → metadata.severity
//   context.ip                     → ipAddress
//   context.userAgent              → userAgent
//   context.requestId/sessionId/geo → metadata.context
//   changes.before                 → oldValue
//   changes.after                  → newValue
//   metadata                       → metadata.userMetadata
//
// The audit_logs table is APPEND-ONLY — see MIGRATION.md for the SQL that
// revokes UPDATE/DELETE from the application role.
// =============================================================================

import type { ActorType, AuditEvent, AuditQueryFilter, Outcome } from "../schema";
import type { AuditProvider } from "./types";

// Minimal interface — we only need these two methods. Decoupling from a full
// PrismaClient type keeps the package free of a hard `@prisma/client` import.
export interface PrismaAuditDelegate {
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

interface AuditLogRow {
  id: string;
  organizationId: string | null;
  userId: string | null;
  actorType: string | null;
  action: string;
  outcome: string | null;
  reason: string | null;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export class PostgresAuditProvider implements AuditProvider {
  readonly type = "postgres" as const;
  constructor(private readonly db: PrismaAuditDelegate) {}

  async log(event: AuditEvent): Promise<void> {
    const metadataBlob: Record<string, unknown> = {
      severity: event.severity,
    };
    if (event.resource.name) metadataBlob.resourceName = event.resource.name;
    if (event.context && Object.keys(event.context).length > 0) {
      metadataBlob.context = event.context;
    }
    if (event.metadata) metadataBlob.userMetadata = event.metadata;

    await this.db.auditLog.create({
      data: {
        id: event.id,
        organizationId: event.tenantId,
        userId: event.actor.id,
        actorType: event.actor.type,
        action: event.action,
        outcome: event.outcome,
        entityType: event.resource.type,
        entityId: event.resource.id,
        oldValue: event.changes?.before ?? null,
        newValue: event.changes?.after ?? null,
        ipAddress: event.context?.ip ?? null,
        userAgent: event.context?.userAgent ?? null,
        metadata: metadataBlob,
        createdAt: new Date(event.timestamp),
      },
    });
  }

  async query(filter: AuditQueryFilter): Promise<AuditEvent[]> {
    const where: Record<string, unknown> = {};
    if (filter.tenantId) where.organizationId = filter.tenantId;
    if (filter.actorId) where.userId = filter.actorId;
    if (filter.action) where.action = filter.action;
    if (filter.resourceType) where.entityType = filter.resourceType;
    if (filter.resourceId) where.entityId = filter.resourceId;
    if (filter.outcome) where.outcome = filter.outcome;
    if (filter.startDate || filter.endDate) {
      const range: Record<string, Date> = {};
      if (filter.startDate) range.gte = filter.startDate;
      if (filter.endDate) range.lte = filter.endDate;
      where.createdAt = range;
    }

    const rows = (await this.db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filter.limit ?? 100,
      skip: filter.offset ?? 0,
    })) as AuditLogRow[];

    return rows.map(rowToEvent);
  }

  async close(): Promise<void> {
    // The Prisma client lifecycle is owned by @nebutra/db — do NOT disconnect
    // here. Closing a shared client would break unrelated callers.
  }
}

function rowToEvent(row: AuditLogRow): AuditEvent {
  const meta = isObject(row.metadata) ? row.metadata : {};
  const severity = (typeof meta.severity === "string" ? meta.severity : "info") as
    | "info"
    | "warning"
    | "critical";
  const ctx = isObject(meta.context) ? meta.context : {};
  const userMeta = isObject(meta.userMetadata) ? meta.userMetadata : undefined;

  const event: AuditEvent = {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    actor: {
      id: row.userId ?? "unknown",
      type: (row.actorType ?? "system") as ActorType,
    },
    tenantId: row.organizationId ?? "unknown",
    action: row.action,
    resource: {
      type: row.entityType,
      id: row.entityId ?? "unknown",
      ...(typeof meta.resourceName === "string" ? { name: meta.resourceName } : {}),
    },
    outcome: (row.outcome ?? "success") as Outcome,
    severity,
    context: {
      ...(row.ipAddress ? { ip: row.ipAddress } : {}),
      ...(row.userAgent ? { userAgent: row.userAgent } : {}),
      ...(typeof ctx.requestId === "string" ? { requestId: ctx.requestId } : {}),
      ...(typeof ctx.sessionId === "string" ? { sessionId: ctx.sessionId } : {}),
      ...(isObject(ctx.geo) ? { geo: ctx.geo as { country?: string; region?: string } } : {}),
    },
    ...(isObject(row.oldValue) && isObject(row.newValue)
      ? { changes: { before: row.oldValue, after: row.newValue } }
      : {}),
    ...(userMeta ? { metadata: userMeta } : {}),
  };

  return event;
}
