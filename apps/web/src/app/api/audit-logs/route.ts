import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const QuerySchema = z.object({
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(50).optional(),
  userId: z.string().trim().max(120).optional(),
  outcome: z.enum(["success", "failure", "pending"]).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().catch(DEFAULT_LIMIT),
});

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
  metadata: unknown;
  createdAt: Date | string;
}

function clampLimit(raw: unknown): number {
  const parsed = QuerySchema.shape.limit.safeParse(raw);
  const value = parsed.success ? parsed.data : DEFAULT_LIMIT;
  return Math.min(Math.max(value, 1), MAX_LIMIT);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "audit_log:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!auth.orgId) {
    return NextResponse.json({ logs: [], nextCursor: null });
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    action: url.searchParams.get("action") ?? undefined,
    entityType: url.searchParams.get("entityType") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    outcome: url.searchParams.get("outcome") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const limit = clampLimit(url.searchParams.get("limit") ?? undefined);
  const { action, entityType, userId, outcome, startDate, endDate, cursor } = parsed.data;

  const startAt = parseDate(startDate);
  const endAt = parseDate(endDate);

  // organizationId is ALWAYS sourced from auth.orgId — never trust the caller.
  const where: Record<string, unknown> = {
    organizationId: auth.orgId,
  };

  if (action) where.action = { startsWith: action };
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;
  if (outcome) where.outcome = outcome;

  if (startAt || endAt) {
    where.createdAt = {
      ...(startAt ? { gte: startAt } : {}),
      ...(endAt ? { lte: endAt } : {}),
    };
  }

  try {
    const rows = (await db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })) as AuditLogRow[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    const logs = page.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      actorType: row.actorType,
      action: row.action,
      outcome: row.outcome,
      reason: row.reason,
      entityType: row.entityType,
      entityId: row.entityId,
      oldValue: row.oldValue,
      newValue: row.newValue,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      metadata: row.metadata,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : (row.createdAt as unknown as string),
    }));

    return NextResponse.json({ logs, nextCursor });
  } catch (error) {
    logger.error("[audit-logs] Failed to query", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
