/**
 * /api/v1/ai/usage — Usage dashboard
 *
 * Aggregated AI usage and cost analytics for the current organization,
 * sourced from RequestLog rows. Supports summary, per-model, per-key
 * and time-series breakdowns over an arbitrary date range.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

const log = logger.child({ service: "usage" });

export const usageRoutes = new OpenAPIHono();
usageRoutes.use("*", requireAuth, requireOrganization);

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Parse & validate the from/to query params. Defaults to current billing
 * period (first of month UTC → now).
 */
function resolvePeriod(fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  const from = fromRaw ? new Date(fromRaw) : startOfCurrentMonth();
  const to = toRaw ? new Date(toRaw) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid from/to date");
  }

  return { from, to };
}

function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  // Prisma Decimal exposes toNumber(); stringified fallback handles plain strings
  const asNumber = Number(value.toString());
  return Number.isFinite(asNumber) ? asNumber : 0;
}

function bucketKey(date: Date, granularity: "hour" | "day"): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  if (granularity === "day") {
    return `${y}-${m}-${d}T00:00:00.000Z`;
  }
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:00:00.000Z`;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const PeriodQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const HistoryQuerySchema = PeriodQuerySchema.extend({
  granularity: z.enum(["hour", "day"]).optional().default("day"),
});

const PeriodSchema = z.object({
  from: z.string(),
  to: z.string(),
});

const SummarySchema = z.object({
  totalTokens: z.number(),
  totalCost: z.number(),
  requestCount: z.number(),
  from: z.string(),
  to: z.string(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

const ByModelSchema = z.object({
  data: z.array(
    z.object({
      model: z.string(),
      tokens: z.number(),
      cost: z.number(),
      requests: z.number(),
    }),
  ),
  period: PeriodSchema,
});

const ByKeySchema = z.object({
  data: z.array(
    z.object({
      apiKeyId: z.string(),
      name: z.string(),
      keyPrefix: z.string(),
      tokens: z.number(),
      cost: z.number(),
      requests: z.number(),
    }),
  ),
  period: PeriodSchema,
});

const HistorySchema = z.object({
  data: z.array(
    z.object({
      timestamp: z.string(),
      tokens: z.number(),
      cost: z.number(),
      requests: z.number(),
    }),
  ),
  period: PeriodSchema,
});

// ── Routes ────────────────────────────────────────────────────────────────────

const summaryRouteDef = createRoute({
  method: "get",
  path: "/summary",
  tags: ["Usage"],
  summary: "Aggregated usage for a billing period",
  request: { query: PeriodQuerySchema },
  responses: {
    200: {
      description: "Usage summary",
      content: { "application/json": { schema: SummarySchema } },
    },
    400: {
      description: "Invalid date range",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

usageRoutes.openapi(summaryRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const { from: fromRaw, to: toRaw } = c.req.valid("query");

  let period: { from: Date; to: Date };
  try {
    period = resolvePeriod(fromRaw, toRaw);
  } catch {
    return c.json({ error: "Bad Request", message: "Invalid from/to date" }, 400);
  }

  const where = {
    organizationId,
    createdAt: { gte: period.from, lte: period.to },
  };

  const db = getTenantDb(organizationId);
  const [aggregate, requestCount] = await Promise.all([
    db.requestLog.aggregate({
      where,
      _sum: { totalTokens: true, cost: true },
    }),
    db.requestLog.count({ where }),
  ]);

  return c.json(
    {
      totalTokens: aggregate._sum.totalTokens ?? 0,
      totalCost: decimalToNumber(aggregate._sum.cost),
      requestCount,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    },
    200,
  );
});

const byModelRouteDef = createRoute({
  method: "get",
  path: "/by-model",
  tags: ["Usage"],
  summary: "Usage breakdown by model",
  request: { query: PeriodQuerySchema },
  responses: {
    200: {
      description: "Per-model usage",
      content: { "application/json": { schema: ByModelSchema } },
    },
    400: {
      description: "Invalid date range",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

usageRoutes.openapi(byModelRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const { from: fromRaw, to: toRaw } = c.req.valid("query");

  let period: { from: Date; to: Date };
  try {
    period = resolvePeriod(fromRaw, toRaw);
  } catch {
    return c.json({ error: "Bad Request", message: "Invalid from/to date" }, 400);
  }

  const db = getTenantDb(organizationId);
  const grouped = await db.requestLog.groupBy({
    by: ["model"],
    where: {
      organizationId,
      createdAt: { gte: period.from, lte: period.to },
    },
    _sum: { totalTokens: true, cost: true },
    _count: { _all: true },
  });

  const data = grouped
    .map((row) => ({
      model: row.model,
      tokens: row._sum.totalTokens ?? 0,
      cost: decimalToNumber(row._sum.cost),
      requests: row._count._all,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  return c.json(
    {
      data,
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
    },
    200,
  );
});

const byKeyRouteDef = createRoute({
  method: "get",
  path: "/by-key",
  tags: ["Usage"],
  summary: "Usage breakdown by API key",
  request: { query: PeriodQuerySchema },
  responses: {
    200: { description: "Per-key usage", content: { "application/json": { schema: ByKeySchema } } },
    400: {
      description: "Invalid date range",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

usageRoutes.openapi(byKeyRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const { from: fromRaw, to: toRaw } = c.req.valid("query");

  let period: { from: Date; to: Date };
  try {
    period = resolvePeriod(fromRaw, toRaw);
  } catch {
    return c.json({ error: "Bad Request", message: "Invalid from/to date" }, 400);
  }

  const db = getTenantDb(organizationId);
  const grouped = await db.requestLog.groupBy({
    by: ["apiKeyId"],
    where: {
      organizationId,
      createdAt: { gte: period.from, lte: period.to },
      apiKeyId: { not: null },
    },
    _sum: { totalTokens: true, cost: true },
    _count: { _all: true },
  });

  const keyIds = grouped.map((g) => g.apiKeyId).filter((id): id is string => Boolean(id));

  const keyMeta = keyIds.length
    ? await db.aPIKey.findMany({
        where: { id: { in: keyIds }, organizationId },
        select: { id: true, name: true, keyPrefix: true },
      })
    : [];

  const metaById = new Map(keyMeta.map((k) => [k.id, k]));

  const data = grouped
    .filter((g): g is typeof g & { apiKeyId: string } => Boolean(g.apiKeyId))
    .map((row) => {
      const meta = metaById.get(row.apiKeyId);
      return {
        apiKeyId: row.apiKeyId,
        name: meta?.name ?? "(deleted)",
        keyPrefix: meta?.keyPrefix ?? "",
        tokens: row._sum.totalTokens ?? 0,
        cost: decimalToNumber(row._sum.cost),
        requests: row._count._all,
      };
    })
    .sort((a, b) => b.tokens - a.tokens);

  return c.json(
    {
      data,
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
    },
    200,
  );
});

const historyRouteDef = createRoute({
  method: "get",
  path: "/history",
  tags: ["Usage"],
  summary: "Time-series usage (hourly or daily buckets)",
  request: { query: HistoryQuerySchema },
  responses: {
    200: {
      description: "Usage history",
      content: { "application/json": { schema: HistorySchema } },
    },
    400: {
      description: "Invalid date range",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

usageRoutes.openapi(historyRouteDef, async (c) => {
  const tenant = c.get("tenant");
  const organizationId = tenant.organizationId as string;
  const { from: fromRaw, to: toRaw, granularity } = c.req.valid("query");

  let period: { from: Date; to: Date };
  try {
    period = resolvePeriod(fromRaw, toRaw);
  } catch {
    return c.json({ error: "Bad Request", message: "Invalid from/to date" }, 400);
  }

  // MVP: fetch logs in window and bucket in memory. Acceptable for typical
  // billing-period volumes; swap for Prisma raw SQL with date_trunc if this
  // becomes a hotspot.
  const db = getTenantDb(organizationId);
  const rows = await db.requestLog.findMany({
    where: {
      organizationId,
      createdAt: { gte: period.from, lte: period.to },
    },
    select: { createdAt: true, totalTokens: true, cost: true },
  });

  const buckets = new Map<string, { tokens: number; cost: number; requests: number }>();
  for (const row of rows) {
    const key = bucketKey(row.createdAt, granularity);
    const existing = buckets.get(key) ?? { tokens: 0, cost: 0, requests: 0 };
    buckets.set(key, {
      tokens: existing.tokens + (row.totalTokens ?? 0),
      cost: existing.cost + decimalToNumber(row.cost),
      requests: existing.requests + 1,
    });
  }

  const data = Array.from(buckets.entries())
    .map(([timestamp, agg]) => ({ timestamp, ...agg }))
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  log.debug("usage history computed", {
    organizationId,
    granularity,
    bucketCount: data.length,
    rowCount: rows.length,
  });

  return c.json(
    {
      data,
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
    },
    200,
  );
});
